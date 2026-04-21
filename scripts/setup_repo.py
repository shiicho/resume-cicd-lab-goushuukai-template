#!/usr/bin/env python3
"""resume-cicd-lab setup wizard.

Provision, promote, and destroy the AWS training environment. AWS
operations are shelled out to the `aws` CLI. UI prose is localized
(en / ja / zh-CN) via `scripts/locales/` — commands, flags, JSON
keys, and log output stay English so scripts remain portable.
"""
from __future__ import annotations

import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Annotated, Callable, Iterable, Optional
from urllib.parse import urlparse

import questionary
import typer
from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.table import Table
from rich.text import Text

from wizard.first_run import apply_locale_precedence
from wizard.i18n import _, current_locale
from wizard.locale_detect import docs_dir


# ============================================================================
# Constants
# ============================================================================

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT / "config" / "project-setup.json"
LOCAL_STATE_PATH = ROOT / ".local" / "setup-repo-state.json"
CONSOLE_LINKS_PATH = ROOT / ".local" / "console-links.md"

ENVIRONMENTS: tuple[str, ...] = ("development", "staging", "production")
ENVIRONMENT_CODES: dict[str, str] = {
    "development": "dev",
    "staging": "stg",
    "production": "prd",
}

SUCCESS_STACK_STATUSES = {"CREATE_COMPLETE", "UPDATE_COMPLETE", "IMPORT_COMPLETE"}

# Per-resource status strings used to colour live CloudFormation events
# streamed during stack deploys.
_RESOURCE_STATUS_COMPLETE = {
    "CREATE_COMPLETE",
    "UPDATE_COMPLETE",
    "DELETE_COMPLETE",
    "IMPORT_COMPLETE",
}
_RESOURCE_STATUS_IN_PROGRESS = {
    "CREATE_IN_PROGRESS",
    "UPDATE_IN_PROGRESS",
    "DELETE_IN_PROGRESS",
    "UPDATE_ROLLBACK_IN_PROGRESS",
    "ROLLBACK_IN_PROGRESS",
    "IMPORT_IN_PROGRESS",
}
_RESOURCE_STATUS_FAILED = {
    "CREATE_FAILED",
    "UPDATE_FAILED",
    "DELETE_FAILED",
    "UPDATE_ROLLBACK_FAILED",
    "ROLLBACK_FAILED",
}

# How often we poll `describe-stack-events` during a running deploy.
# 3s balances responsiveness vs API call count (a 10-min deploy = ~200 calls).
CFN_EVENT_POLL_SECONDS = 3.0

GITHUB_REMOTE_PATTERNS = (
    re.compile(r"^git@github\.com:(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$"),
    re.compile(r"^https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?$"),
    re.compile(r"^ssh://git@github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?$"),
)

EXPECTED_GITHUB_VARIABLES = (
    "AWS_REGION",
    "AWS_RELEASE_ROLE_ARN",
    "AWS_STATIC_DEPLOY_ROLE_ARN",
    "AWS_ECS_DEPLOY_ROLE_ARN",
)

# Daily cost estimates per environment — hardcoded for teaching clarity.
# NAT-less topology (public subnets only) keeps ECS + ALB + CloudFront + S3
# at roughly this rate while the env is running.
COST_PER_ENV_PER_DAY: dict[str, float] = {
    "development": 1.45,
    "staging": 1.45,
    "production": 1.45,
}

STALE_STATE_THRESHOLD = timedelta(hours=12)

# Scope literals the user types to confirm destroy. Never prefix-matched;
# the string is compared exactly to defeat muscle-memory "yes".
SCOPE_LITERAL_PREFIX = "destroy "

# Lab 10 "✦ LINE DECOMMISSIONED" receipt — the `You just` summaries from
# docs/en/lab-00-preview.md through lab-10-teardown.md, condensed. The
# receipt fires only on full teardown (include_shared=True).
LIFECYCLE_RECEIPT_LINES: tuple[tuple[str, str], ...] = (
    ("Lab 0 ", "scoped the commitment before making it"),
    ("Lab 1 ", "wired a free tripwire across AWS"),
    ("Lab 2 ", "rehearsed the emergency exit"),
    ("Lab 3 ", "wired 4 stacks + OIDC without a long-lived key"),
    ("Lab 4 ", "earned your first green check"),
    ("Lab 5 ", "cut your first semantic release"),
    ("Lab 6 ", "produced two immutable artifacts from one tag"),
    ("Lab 7 ", "shipped to a reviewable environment contract"),
    ("Lab 8 ", "gave your resume a self-declaring credential"),
    ("Lab 9 ", "promoted one release through two envs, unchanged"),
    ("Lab 10", "owned an AWS environment from birth to death"),
)


# ============================================================================
# Rich console + style
# ============================================================================

console = Console()


def panel(body: str, *, title: str = "", style: str = "cyan") -> Panel:
    return Panel(body, title=title or None, border_style=style, padding=(1, 2))


def info(text: str) -> None:
    console.print(f"[cyan]●[/cyan] {text}")


def warn(text: str) -> None:
    console.print(f"[yellow]▲[/yellow] {text}")


def err(text: str) -> None:
    console.print(f"[red]■[/red] {text}")


def ok(text: str) -> None:
    console.print(f"[green]◇[/green] {text}")


def step(text: str) -> None:
    console.print(f"\n[bold cyan]◆[/bold cyan] [bold]{text}[/bold]")


def hr() -> None:
    console.print("─" * 78, style="dim")


# ============================================================================
# Typer app
# ============================================================================

app = typer.Typer(
    name="setup_repo",
    help="resume-cicd-lab setup wizard. Default action is the interactive flow.",
    no_args_is_help=False,
    add_completion=False,
    rich_markup_mode="rich",
)


# ============================================================================
# I/O primitives
# ============================================================================


def run(
    args: list[str],
    *,
    cwd: pathlib.Path | None = None,
    check: bool = True,
    capture: bool = False,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        cwd=cwd,
        check=check,
        capture_output=capture,
        text=True,
    )


def run_text(args: list[str], *, cwd: pathlib.Path | None = None, check: bool = True) -> str:
    result = run(args, cwd=cwd, check=check, capture=True)
    return (result.stdout or "").strip()


def run_json(args: list[str], *, cwd: pathlib.Path | None = None) -> object:
    return json.loads(run_text(args, cwd=cwd))


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def read_json(path: pathlib.Path) -> dict:
    return json.loads(path.read_text())


def read_json_if_exists(path: pathlib.Path) -> dict | None:
    return read_json(path) if path.exists() else None


def write_json(path: pathlib.Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def require(condition: bool, message: str) -> None:
    if not condition:
        err(message)
        raise typer.Exit(code=1)


# ============================================================================
# Config + paths
# ============================================================================


def load_config(path: pathlib.Path) -> dict:
    require(path.exists(), f"config not found: {path}")
    data = read_json(path)
    require(isinstance(data, dict), "config must be a JSON object")
    for section in ("project", "github", "aws", "release", "staticSite", "ecs", "environments"):
        require(section in data, f"config missing section: {section}")
    for field in ("slug", "displayName", "description"):
        require(field in data["project"], f"config missing project.{field}")
    for field in ("owner", "repo", "visibility"):
        require(field in data["github"], f"config missing github.{field}")
    for field in ("region", "stackPrefix", "resourceProjectName", "resourceIdentifier", "resourceShortIdentifier"):
        require(field in data["aws"], f"config missing aws.{field}")
    require(isinstance(data["environments"], dict), "config environments must be an object")
    for env_name, env_config in data["environments"].items():
        require(env_name in ENVIRONMENTS, f"config environment unknown: {env_name}")
        for field in ("vpcCidr", "publicSubnet1Cidr", "publicSubnet2Cidr", "desiredCount"):
            require(field in env_config, f"config missing environments.{env_name}.{field}")
    return data


def github_repo_slug(config: dict) -> str:
    return f"{config['github']['owner']}/{config['github']['repo']}"


def stack_name(config: dict, kind: str, env_name: str | None = None) -> str:
    prefix = config["aws"]["stackPrefix"]
    if kind == "bootstrap":
        return f"{prefix}-shared-oidc"
    if kind == "delivery":
        return f"{prefix}-shared-delivery"
    require(env_name in ENVIRONMENTS, f"stack_name requires env for kind={kind}")
    env_code = ENVIRONMENT_CODES[env_name]
    if kind == "static":
        return f"{prefix}-{env_code}-static-site"
    if kind == "ecs":
        return f"{prefix}-{env_code}-ecs-app"
    raise ValueError(f"unknown stack kind: {kind}")


def delivery_path() -> pathlib.Path:
    return ROOT / "deploy" / "shared" / "delivery.json"


def static_site_path(env_name: str) -> pathlib.Path:
    return ROOT / "deploy" / "static" / env_name / "site.json"


def ecs_service_path(env_name: str) -> pathlib.Path:
    return ROOT / "deploy" / "ecs" / env_name / "service.json"


def ecs_task_path(env_name: str) -> pathlib.Path:
    return ROOT / "deploy" / "ecs" / env_name / "task-definition.json"


def environment_code(env_name: str) -> str:
    require(env_name in ENVIRONMENT_CODES, f"unknown environment: {env_name}")
    return ENVIRONMENT_CODES[env_name]


def parse_environments(value: str | None) -> list[str]:
    if not value:
        return list(ENVIRONMENTS)
    selected = [item.strip() for item in value.split(",") if item.strip()]
    require(bool(selected), "at least one environment must be selected")
    for env_name in selected:
        require(env_name in ENVIRONMENTS, f"unknown environment: {env_name}")
    return selected


def daily_cost_for(env_names: Iterable[str]) -> float:
    return round(sum(COST_PER_ENV_PER_DAY[env] for env in env_names), 2)


# ============================================================================
# CLI status detection
# ============================================================================

# (tool name) → (version-flag args, regex capturing major+minor, (min_major, min_minor)).
# Floors match docs/en/lab-02-tools-and-dry-run.md's stated requirements. Tools
# without a floor (git, gh, jq) parse+display their version but pass any value.
TOOL_VERSION_SPEC: dict[str, tuple[list[str], str, tuple[int, int] | None]] = {
    "git": (["--version"], r"git version (\d+)\.(\d+)", None),
    "python3": (["--version"], r"Python (\d+)\.(\d+)", (3, 10)),
    "node": (["--version"], r"v(\d+)\.(\d+)", (22, 0)),
    "npm": (["--version"], r"(\d+)\.(\d+)", (10, 0)),
    "jq": (["--version"], r"jq[- ](\d+)\.(\d+)", None),
    "aws": (["--version"], r"aws-cli/(\d+)\.(\d+)", (2, 0)),
    "gh": (["--version"], r"gh version (\d+)\.(\d+)", None),
}


def _probe_tool_version(tool: str) -> tuple[tuple[int, int] | None, str | None]:
    """Return ((major, minor), raw_version_string) for a tool. On failure or
    missing binary, returns (None, None). Raw string is the first line of the
    tool's --version output so the table can display what the user actually has."""
    if tool not in TOOL_VERSION_SPEC or not command_exists(tool):
        return None, None
    args, pattern, _ = TOOL_VERSION_SPEC[tool]
    try:
        raw = run([tool, *args], capture=True, check=False).stdout or ""
    except (FileNotFoundError, OSError):
        return None, None
    first_line = raw.splitlines()[0].strip() if raw else ""
    match = re.search(pattern, raw)
    if not match:
        return None, first_line or None
    return (int(match.group(1)), int(match.group(2))), first_line


def detect_cli_status() -> dict[str, dict[str, object]]:
    git_ok = command_exists("git")
    python_ok = command_exists("python3")
    node_ok = command_exists("node")
    npm_ok = command_exists("npm")
    jq_ok = command_exists("jq")
    aws_ok = command_exists("aws")
    gh_ok = command_exists("gh")

    def authed(cmd: list[str]) -> bool | None:
        if not command_exists(cmd[0]):
            return None
        try:
            return run(cmd, capture=True, check=False).returncode == 0
        except FileNotFoundError:
            return None

    def version_entry(tool: str) -> dict[str, object]:
        parsed, raw = _probe_tool_version(tool)
        floor = TOOL_VERSION_SPEC[tool][2]
        version_ok: bool | None
        if parsed is None:
            version_ok = None if floor is None else False
        elif floor is None:
            version_ok = True
        else:
            version_ok = parsed >= floor
        return {"version": raw, "version_ok": version_ok, "parsed": parsed, "floor": floor}

    base: dict[str, dict[str, object]] = {
        "git": {"available": git_ok, "authenticated": None},
        "python3": {"available": python_ok, "authenticated": None},
        "node": {"available": node_ok, "authenticated": None},
        "npm": {"available": npm_ok, "authenticated": None},
        "jq": {"available": jq_ok, "authenticated": None},
        "aws": {"available": aws_ok, "authenticated": authed(["aws", "sts", "get-caller-identity"])},
        "gh": {"available": gh_ok, "authenticated": authed(["gh", "auth", "status"])},
    }
    for tool, entry in base.items():
        if entry["available"]:
            entry.update(version_entry(tool))
        else:
            entry.update({"version": None, "version_ok": None, "parsed": None, "floor": TOOL_VERSION_SPEC[tool][2]})
    return base


def github_cli_ready() -> bool:
    status = detect_cli_status()["gh"]
    return bool(status["available"] and status["authenticated"])


def render_tool_table(status: dict[str, dict[str, object]]) -> Table:
    table = Table(title=_("Tool status"), title_style="bold", show_header=True, header_style="dim")
    table.add_column(_("Tool"), style="bold")
    table.add_column(_("Available"))
    table.add_column(_("Version"))
    table.add_column(_("Authenticated"))
    for name, s in status.items():
        avail = "[green]ok[/green]" if s["available"] else "[red]missing[/red]"
        # Version column: shows raw version + floor status when a floor exists.
        # "x.y (need ≥ a.b)" in red when below floor; "x.y ≥ a.b" green when meeting
        # floor; "x.y" plain when no floor; "—" when not available or unparseable.
        floor: tuple[int, int] | None = s.get("floor")  # type: ignore[assignment]
        parsed: tuple[int, int] | None = s.get("parsed")  # type: ignore[assignment]
        raw_version: str | None = s.get("version")  # type: ignore[assignment]
        version_ok = s.get("version_ok")
        version_cell: str
        if not s["available"]:
            version_cell = "—"
        elif parsed is None:
            version_cell = f"[yellow]{raw_version or '?'}[/yellow]"
        else:
            shown = f"{parsed[0]}.{parsed[1]}"
            if floor is None:
                version_cell = shown
            elif version_ok:
                version_cell = f"[green]{shown} ≥ {floor[0]}.{floor[1]}[/green]"
            else:
                version_cell = f"[red]{shown} (need ≥ {floor[0]}.{floor[1]})[/red]"
        authed: str
        if s["authenticated"] is None:
            authed = "—"
        elif s["authenticated"]:
            authed = "[green]ok[/green]"
        else:
            authed = "[red]not authenticated[/red]"
        table.add_row(name, avail, version_cell, authed)
    return table


# ============================================================================
# GitHub remote + repo operations
# ============================================================================


def detect_github_oidc_provider_arn() -> str:
    if not github_cli_ready():
        return ""
    try:
        providers = run_json(
            ["aws", "iam", "list-open-id-connect-providers", "--output", "json"],
        )
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return ""
    for entry in providers.get("OpenIDConnectProviderList", []):
        arn = entry.get("Arn", "")
        if "token.actions.githubusercontent.com" in arn:
            return arn
    return ""


def preferred_github_protocol() -> str:
    ssh_ok = command_exists("ssh-add")
    if not ssh_ok:
        return "https"
    result = run(["ssh", "-T", "-o", "BatchMode=yes", "git@github.com"], check=False, capture=True)
    if "successfully authenticated" in (result.stderr or "").lower():
        return "ssh"
    return "https"


def parse_github_remote_slug(url: str) -> str | None:
    for pattern in GITHUB_REMOTE_PATTERNS:
        m = pattern.match(url.strip())
        if m:
            return f"{m.group('owner')}/{m.group('repo')}"
    return None


def origin_url_for(owner: str, repo: str) -> str:
    protocol = preferred_github_protocol()
    if protocol == "ssh":
        return f"git@github.com:{owner}/{repo}.git"
    return f"https://github.com/{owner}/{repo}.git"


def ensure_origin_remote(owner: str, repo: str) -> str:
    desired_url = origin_url_for(owner, repo)
    existing = run(["git", "remote", "get-url", "origin"], cwd=ROOT, check=False, capture=True)
    if existing.returncode != 0:
        run(["git", "remote", "add", "origin", desired_url], cwd=ROOT)
    else:
        current = (existing.stdout or "").strip()
        if parse_github_remote_slug(current) != f"{owner}/{repo}":
            run(["git", "remote", "set-url", "origin", desired_url], cwd=ROOT)
    return desired_url


def repo_exists(slug: str) -> bool:
    if not github_cli_ready():
        return False
    return run(["gh", "repo", "view", slug], check=False, capture=True).returncode == 0


def maybe_create_repo(config: dict) -> bool:
    slug = github_repo_slug(config)
    if repo_exists(slug):
        return False
    require(config["github"].get("createRepo", True), f"repo {slug} missing and createRepo=false")
    args = [
        "gh",
        "repo",
        "create",
        slug,
        f"--{config['github'].get('visibility', 'private')}",
        "--description",
        config["project"].get("description", ""),
    ]
    run(args)
    return True


def configure_branch_protection(config: dict) -> None:
    """Enable branch protection on `main` so students can't merge a red or
    pending PR. Required status check: `summary` (the gate job in
    `.github/workflows/ci.yml` that transitively requires every
    validate-* lane). `enforce_admins=False` lets you bypass in
    recovery scenarios.

    Idempotent: the PUT endpoint overwrites whatever exists.
    Verify-and-shout: after the PUT we GET it back. If the required
    check isn't present, we render a framed red error panel with
    re-apply instructions. Past silent failures (scope mismatches,
    tokens missing `repo` or `admin:org`) left students with the
    lab working but no protection in place — easy to miss, hard to
    debug later.
    """
    slug = github_repo_slug(config)
    payload = {
        "required_status_checks": {
            "strict": True,  # branch must be up-to-date with main before merge
            "contexts": ["summary"],
        },
        "enforce_admins": False,
        "required_pull_request_reviews": None,
        "restrictions": None,
        "allow_force_pushes": False,
        "allow_deletions": False,
        "required_linear_history": False,
        "required_conversation_resolution": False,
    }
    proc = subprocess.run(
        [
            "gh",
            "api",
            "-X",
            "PUT",
            f"/repos/{slug}/branches/main/protection",
            "--input",
            "-",
        ],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        check=False,
    )
    put_err = (proc.stderr or "").strip()

    # Verify. GET the protection back and confirm `summary` is in the
    # required-checks list. If GET 404s or the check is missing, the PUT
    # silently failed — surface it loudly.
    verify = subprocess.run(
        ["gh", "api", f"/repos/{slug}/branches/main/protection"],
        text=True,
        capture_output=True,
        check=False,
    )
    verified = False
    if verify.returncode == 0:
        try:
            got = json.loads(verify.stdout)
            contexts = got.get("required_status_checks", {}).get("contexts", []) or []
            verified = "summary" in contexts
        except json.JSONDecodeError:
            verified = False

    if not verified:
        reason = put_err or (verify.stderr or "").strip() or "unknown error"
        console.print(
            panel(
                f"[bold red]Branch protection on `main` did not stick.[/bold red]\n\n"
                f"Slug: [cyan]{slug}[/cyan]\n"
                f"API response: [dim]{reason}[/dim]\n\n"
                "Common causes:\n"
                "  • Your `gh` token lacks the `repo` (and, for orgs, `admin:org`) scope.\n"
                "    Fix: [cyan]gh auth refresh -s admin:org,repo[/cyan]\n"
                "  • The repo is a fork without admin rights on the base.\n"
                "  • The branch doesn't exist yet — an empty repo has no `main` to protect.\n\n"
                "Re-apply after fixing:\n"
                "  [cyan]python3 scripts/setup_repo.py sync-github[/cyan]\n\n"
                "Without this, students can merge red PRs — the whole CI gate is bypassed.",
                title="[bold]⚠ BRANCH PROTECTION MISSING[/bold]",
                style="red",
            )
        )
    else:
        ok(f"branch protection on main: verified (required check: `summary`, strict=true)")


def configure_repo_settings(config: dict) -> None:
    slug = github_repo_slug(config)
    topics = config["github"].get("topics", [])
    desc = config["project"].get("description", "")

    run(
        [
            "gh",
            "repo",
            "edit",
            slug,
            "--description",
            desc,
            "--enable-issues=true",
            "--enable-merge-commit=false",
            "--enable-rebase-merge=false",
            "--enable-squash-merge=true",
            "--delete-branch-on-merge=true",
            # --enable-auto-merge lets students queue 'gh pr merge <n> --auto
            # --squash --delete-branch': GitHub merges the PR automatically the
            # moment required checks pass. Without this flag, --auto errors out
            # and students have to watch/retry after every push.
            "--enable-auto-merge",
        ],
        check=False,
    )
    configure_branch_protection(config)
    if topics:
        run(["gh", "repo", "edit", slug, "--add-topic", ",".join(topics)], check=False)
    run(
        [
            "gh",
            "api",
            "--silent",
            "-X",
            "PUT",
            f"/repos/{slug}/actions/permissions/workflow",
            "-f",
            "default_workflow_permissions=write",
            "-F",
            "can_approve_pull_request_reviews=true",
        ],
        check=False,
    )


# ============================================================================
# CloudFormation stack operations
# ============================================================================


def stack_exists(config: dict, name: str) -> bool:
    result = run(
        [
            "aws",
            "cloudformation",
            "describe-stacks",
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
        ],
        check=False,
        capture=True,
    )
    return result.returncode == 0


def live_stacks_for(config: dict) -> list[str]:
    """Return names of live stacks matching this project's stackPrefix.

    Used by the stale-state banner to verify whether the state file's
    recorded run still reflects real cost in AWS, rather than just
    estimating from a timestamp.
    """
    prefix = config["aws"]["stackPrefix"]
    region = config["aws"]["region"]
    result = run(
        ["aws", "cloudformation", "describe-stacks", "--region", region],
        check=False,
        capture=True,
    )
    if result.returncode != 0:
        return []
    try:
        data = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return []
    return sorted(
        s["StackName"]
        for s in data.get("Stacks", [])
        if s.get("StackName", "").startswith(prefix)
        and s.get("StackStatus") in SUCCESS_STACK_STATUSES
    )


def describe_stack_status(config: dict, name: str) -> str:
    result = run(
        [
            "aws",
            "cloudformation",
            "describe-stacks",
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
            "--query",
            "Stacks[0].StackStatus",
            "--output",
            "text",
        ],
        check=False,
        capture=True,
    )
    return (result.stdout or "").strip()


def wait_for_stack_completion(config: dict, name: str, existed_before: bool) -> None:
    # `aws cloudformation deploy` with --no-fail-on-empty-changeset returns
    # immediately on no-op changesets without transitioning the stack status,
    # so the stack stays at its previous terminal state (CREATE_COMPLETE or
    # UPDATE_COMPLETE) rather than entering *_IN_PROGRESS. If we see a
    # terminal success status here, skip the waiter — otherwise `wait
    # stack-update-complete` polls for up to an hour expecting a transition
    # that will never happen.
    status = describe_stack_status(config, name)
    if status in SUCCESS_STACK_STATUSES:
        return
    waiter = "stack-update-complete" if existed_before else "stack-create-complete"
    result = run(
        [
            "aws",
            "cloudformation",
            "wait",
            waiter,
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
        ],
        check=False,
        capture=True,
    )
    status = describe_stack_status(config, name)
    if status not in SUCCESS_STACK_STATUSES:
        err(f"stack {name} did not reach a success status (current: {status})")
        raise typer.Exit(code=1)


def _short_resource_type(raw: str) -> str:
    """`AWS::ECS::Cluster` → `ECS::Cluster`, `AWS::CloudFormation::Stack` → `CFN::Stack`."""
    parts = raw.split("::")
    if len(parts) >= 3 and parts[0] == "AWS":
        # Drop the AWS prefix; compress CloudFormation → CFN
        service = "CFN" if parts[1] == "CloudFormation" else parts[1]
        return f"{service}::{'::'.join(parts[2:])}"
    return raw


def _format_event_line(event: dict) -> Text:
    """Render one CFN stack event as a Rich Text row.

    Layout:  `HH:MM:SS  <icon> <STATUS>        <ResourceType>        <LogicalId>  <reason>`
    """
    ts = (event.get("Timestamp") or "")[11:19] or "--:--:--"
    status = event.get("ResourceStatus") or "UNKNOWN"
    rtype = _short_resource_type(event.get("ResourceType") or "")
    lid = event.get("LogicalResourceId") or ""
    reason = event.get("ResourceStatusReason") or ""

    if status in _RESOURCE_STATUS_COMPLETE:
        icon, colour = "✓", "green"
    elif status in _RESOURCE_STATUS_FAILED:
        icon, colour = "✗", "red"
    elif status in _RESOURCE_STATUS_IN_PROGRESS:
        icon, colour = "○", "cyan"
    else:
        icon, colour = "•", "yellow"

    line = Text()
    line.append(f"     {ts}  ", style="dim")
    line.append(f"{icon} ", style=colour)
    line.append(f"{status:22}", style=colour)
    line.append(f" {rtype:28}", style="bold")
    line.append(f" {lid}")
    if reason and status in _RESOURCE_STATUS_FAILED:
        line.append(f"  {reason}", style="red")
    return line


def _fetch_stack_events(config: dict, name: str) -> list[dict]:
    """Return all stack events ordered chronologically (oldest first).
    Empty list on any error or if the stack has not yet been created."""
    result = run(
        [
            "aws",
            "cloudformation",
            "describe-stack-events",
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
            "--output",
            "json",
        ],
        check=False,
        capture=True,
    )
    if result.returncode != 0:
        return []
    try:
        data = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return []
    # API returns newest-first; reverse for chronological streaming.
    return list(reversed(data.get("StackEvents", [])))


def _stream_stack_events_until(
    config: dict,
    name: str,
    proc: subprocess.Popen,
    baseline_event_ids: set[str],
) -> None:
    """Poll `describe-stack-events` every CFN_EVENT_POLL_SECONDS and
    `console.print` each new event line until `proc` exits. Events whose
    EventId is in `baseline_event_ids` are considered historical and
    suppressed (so re-runs / updates only show the new activity)."""
    seen_ids: set[str] = set(baseline_event_ids)
    while proc.poll() is None:
        for event in _fetch_stack_events(config, name):
            event_id = event.get("EventId")
            if not event_id or event_id in seen_ids:
                continue
            seen_ids.add(event_id)
            console.print(_format_event_line(event))
        time.sleep(CFN_EVENT_POLL_SECONDS)
    # Final drain — pick up any events that landed between last poll and exit.
    for event in _fetch_stack_events(config, name):
        event_id = event.get("EventId")
        if not event_id or event_id in seen_ids:
            continue
        seen_ids.add(event_id)
        console.print(_format_event_line(event))


def deploy_stack(
    config: dict,
    *,
    stack_name_value: str,
    template_name: str,
    parameters: dict[str, str | int],
    capabilities: Iterable[str] = (),
) -> None:
    """Deploy a CloudFormation stack with live per-resource event output.

    We run `aws cloudformation deploy` in the background (stdout/stderr
    captured so its own 'Waiting for...' lines don't scramble our
    progress bar) and simultaneously poll `describe-stack-events` every
    few seconds, printing each new event as `HH:MM:SS ○ STATUS
    ResourceType LogicalId`. Students watch the stack build itself
    rather than stare at an opaque spinner for 10 minutes."""
    existed_before = stack_exists(config, stack_name_value)

    # Snapshot the event IDs that predate this deploy so we only print
    # what happens *during* it. Fresh stacks get an empty baseline.
    baseline_event_ids: set[str] = {
        event["EventId"]
        for event in _fetch_stack_events(config, stack_name_value)
        if event.get("EventId")
    } if existed_before else set()

    args = [
        "aws",
        "cloudformation",
        "deploy",
        "--region",
        config["aws"]["region"],
        "--stack-name",
        stack_name_value,
        "--template-file",
        str(ROOT / "infra" / "cloudformation" / template_name),
        "--no-fail-on-empty-changeset",
    ]
    if capabilities:
        args.extend(["--capabilities", *capabilities])
    if parameters:
        args.append("--parameter-overrides")
        args.extend(f"{key}={value}" for key, value in parameters.items())

    # stdout=DEVNULL silences "Waiting for changeset to be created..." etc.
    # stderr captured for the failure path.
    proc = subprocess.Popen(
        args,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        _stream_stack_events_until(config, stack_name_value, proc, baseline_event_ids)
    except KeyboardInterrupt:
        proc.terminate()
        raise

    if proc.returncode != 0:
        stderr_bytes = proc.stderr.read() if proc.stderr else b""
        stderr_text = (stderr_bytes or b"").decode("utf-8", errors="replace").strip()
        err(f"aws cloudformation deploy failed for {stack_name_value} (exit {proc.returncode})")
        if stderr_text:
            console.print(stderr_text)
        raise subprocess.CalledProcessError(proc.returncode, args, stderr=stderr_bytes)

    # Belt-and-suspenders terminal check — on no-op changesets the deploy
    # returns 0 instantly, so the event stream saw nothing. Confirm the
    # stack is in a success state.
    wait_for_stack_completion(config, stack_name_value, existed_before)


def describe_stack_outputs(config: dict, name: str) -> dict[str, str]:
    result = run_json(
        [
            "aws",
            "cloudformation",
            "describe-stacks",
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
            "--query",
            "Stacks[0].Outputs",
            "--output",
            "json",
        ]
    )
    return {entry["OutputKey"]: entry["OutputValue"] for entry in (result or [])}


def deployed_outputs(config: dict, env_names: Iterable[str]) -> dict[str, dict[str, str]]:
    outputs = {
        "bootstrap": describe_stack_outputs(config, stack_name(config, "bootstrap")),
        "delivery": describe_stack_outputs(config, stack_name(config, "delivery")),
    }
    for env_name in env_names:
        outputs[f"static:{env_name}"] = describe_stack_outputs(config, stack_name(config, "static", env_name))
        outputs[f"ecs:{env_name}"] = describe_stack_outputs(config, stack_name(config, "ecs", env_name))
    return outputs


def all_required_stacks_exist(config: dict, env_names: Iterable[str]) -> bool:
    names = [stack_name(config, "bootstrap"), stack_name(config, "delivery")]
    for env_name in env_names:
        names.append(stack_name(config, "static", env_name))
        names.append(stack_name(config, "ecs", env_name))
    return all(stack_exists(config, n) for n in names)


def planned_stack_list(config: dict, env_names: Iterable[str]) -> list[tuple[str, str, dict[str, str | int], Iterable[str]]]:
    """Return the ordered (name, template, parameters, capabilities) list that apply will deploy."""
    oidc_provider_arn = config["aws"].get("existingGitHubOidcProviderArn") or detect_github_oidc_provider_arn()
    bootstrap_parameters: dict[str, str | int] = {
        "ProjectName": config["project"]["slug"],
        "ResourceProjectName": config["aws"]["resourceProjectName"],
        "ResourceIdentifier": config["aws"]["resourceIdentifier"],
        "GitHubOrg": config["github"]["owner"],
        "GitHubRepoName": config["github"]["repo"],
        "DailyCap": str(config["safety"]["dailyCap"]),
        "SafetyEmail": config["safety"]["email"],
    }
    if oidc_provider_arn:
        bootstrap_parameters["ExistingGitHubOidcProviderArn"] = oidc_provider_arn

    plan: list[tuple[str, str, dict[str, str | int], Iterable[str]]] = [
        (stack_name(config, "bootstrap"), "bootstrap-shared.yaml", bootstrap_parameters, ("CAPABILITY_NAMED_IAM",)),
        (
            stack_name(config, "delivery"),
            "shared-delivery.yaml",
            {
                "ProjectName": config["project"]["slug"],
                "ResourceProjectName": config["aws"]["resourceProjectName"],
                "ResourceIdentifier": config["aws"]["resourceIdentifier"],
            },
            (),
        ),
    ]
    for env_name in env_names:
        env_config = config["environments"][env_name]
        plan.append(
            (
                stack_name(config, "static", env_name),
                "static-site.yaml",
                {
                    "ProjectName": config["project"]["slug"],
                    "ResourceProjectName": config["aws"]["resourceProjectName"],
                    "ResourceIdentifier": config["aws"]["resourceIdentifier"],
                    "Environment": env_name,
                    "EnvironmentCode": environment_code(env_name),
                    "PriceClass": config["staticSite"]["priceClass"],
                    "DefaultRootObject": config["staticSite"]["defaultRootObject"],
                },
                (),
            )
        )
        plan.append(
            (
                stack_name(config, "ecs", env_name),
                "ecs-app.yaml",
                {
                    "ProjectName": config["project"]["slug"],
                    "ResourceProjectName": config["aws"]["resourceProjectName"],
                    "ResourceIdentifier": config["aws"]["resourceIdentifier"],
                    "ResourceShortIdentifier": config["aws"]["resourceShortIdentifier"],
                    "Environment": env_name,
                    "EnvironmentCode": environment_code(env_name),
                    "VpcCidr": env_config["vpcCidr"],
                    "PublicSubnet1Cidr": env_config["publicSubnet1Cidr"],
                    "PublicSubnet2Cidr": env_config["publicSubnet2Cidr"],
                    "DesiredCount": env_config["desiredCount"],
                    "Cpu": config["ecs"]["cpu"],
                    "Memory": config["ecs"]["memory"],
                    "ContainerPort": config["ecs"]["containerPort"],
                    "HealthCheckPath": config["ecs"]["healthCheckPath"],
                    "BootstrapImageUri": config["ecs"]["bootstrapImageUri"],
                },
                ("CAPABILITY_NAMED_IAM",),
            )
        )
    return plan


def deploy_infrastructure(
    config: dict,
    env_names: Iterable[str],
    *,
    resume_completed: set[str] | None = None,
) -> dict[str, dict[str, str]]:
    completed = set(resume_completed or ())
    plan = planned_stack_list(config, env_names)

    total = len(plan)
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold]{task.description}"),
        BarColumn(bar_width=None),
        TextColumn("[dim]{task.fields[status]}"),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    ) as progress:
        overall = progress.add_task(f"CloudFormation deploy ({total} stacks)", total=total, status="")
        for idx, (name, template, parameters, capabilities) in enumerate(plan, start=1):
            progress.update(overall, description=f"[{idx}/{total}] {name}", status="deploying")
            if name in completed:
                progress.update(overall, advance=1, status="already complete")
                continue
            try:
                deploy_stack(
                    config,
                    stack_name_value=name,
                    template_name=template,
                    parameters=parameters,
                    capabilities=capabilities,
                )
            except (subprocess.CalledProcessError, typer.Exit):
                progress.update(overall, status=f"FAILED on {name}")
                save_state_snapshot({"step": "apply", "failed_stack": name, "completed": sorted(completed)})
                render_failure_panel(name, config)
                raise
            completed.add(name)
            save_state_snapshot({"step": "apply", "completed": sorted(completed)})
            progress.update(overall, advance=1, status="ok")

    return deployed_outputs(config, env_names)


def render_failure_panel(failed: str, config: dict) -> None:
    console.print()
    console.print(
        panel(
            f"Stack failed: [bold]{failed}[/bold]\n\n"
            f"Next steps:\n"
            f"  1. Inspect:  [cyan]aws cloudformation describe-stack-events "
            f"--region {config['aws']['region']} --stack-name {failed}[/cyan]\n"
            f"  2. Fix the conflict.\n"
            f"  3. Resume:   [cyan]python3 scripts/setup_repo.py resume[/cyan]\n\n"
            f"Resume reads [dim].local/setup-repo-state.json[/dim] and retries only "
            f"the failed stack + remaining stacks.",
            title="■ apply failed",
            style="red",
        )
    )


# ============================================================================
# Manifest sync
# ============================================================================


def current_release_defaults(config: dict) -> tuple[str, str]:
    release = config["release"]
    return release["bootstrapVersion"], release["bootstrapGitSha"]


def image_placeholder(repository_uri: str) -> str:
    return f"{repository_uri}@sha256:{'0' * 64}"


def hostname_for(url: str) -> str:
    return urlparse(url).netloc or url


def sync_manifests(config: dict, outputs: dict[str, dict[str, str]], env_names: Iterable[str]) -> None:
    delivery_outputs = outputs["delivery"]
    write_json(
        delivery_path(),
        {
            "artifactBucket": delivery_outputs["ArtifactBucketName"],
            "ecrRepositoryName": delivery_outputs["EcrRepositoryName"],
            "ecrRepositoryUri": delivery_outputs["EcrRepositoryUri"],
            "cloudFormationStack": stack_name(config, "delivery"),
        },
    )

    bootstrap_version, bootstrap_git_sha = current_release_defaults(config)
    default_artifact_key = f"web/releases/{bootstrap_version}/{bootstrap_git_sha}/site.zip"
    repository_uri = delivery_outputs["EcrRepositoryUri"]

    for env_name in env_names:
        site_file = static_site_path(env_name)
        site_data = read_json_if_exists(site_file) or {}
        site_release = site_data.get("release", {})
        site_outputs = outputs[f"static:{env_name}"]
        write_json(
            site_file,
            {
                "environment": env_name,
                "publicBaseUrl": site_outputs["SiteUrl"],
                "artifactBucket": delivery_outputs["ArtifactBucketName"],
                "artifactKey": site_data.get("artifactKey", default_artifact_key),
                "siteBucket": site_outputs["SiteBucketName"],
                "cloudFrontDistributionId": site_outputs["DistributionId"],
                "release": {
                    "version": site_release.get("version", bootstrap_version),
                    "gitSha": site_release.get("gitSha", bootstrap_git_sha),
                },
                "cloudFormationStack": stack_name(config, "static", env_name),
            },
        )

        ecs_outputs = outputs[f"ecs:{env_name}"]
        service_url = ecs_outputs["ServiceUrl"]
        app_hostname = hostname_for(service_url)
        task_file = ecs_task_path(env_name)
        task_data = read_json_if_exists(task_file) or {}
        existing_container = (task_data.get("containerDefinitions") or [{}])[0]
        existing_image = existing_container.get("image", "")
        if existing_image and existing_image.split("@", 1)[0] == repository_uri:
            synced_image = existing_image
        else:
            synced_image = image_placeholder(repository_uri)

        existing_env_vars = {
            entry.get("name"): entry.get("value")
            for entry in existing_container.get("environment", [])
            if isinstance(entry, dict)
        }
        app_version = existing_env_vars.get("APP_VERSION", bootstrap_version)
        app_commit_sha = existing_env_vars.get("APP_COMMIT_SHA", bootstrap_git_sha)

        write_json(
            ecs_service_path(env_name),
            {
                "environment": env_name,
                "cluster": ecs_outputs["ClusterName"],
                "service": ecs_outputs["ServiceName"],
                "waitForSteadyState": True,
                "cloudFormationStack": stack_name(config, "ecs", env_name),
            },
        )

        write_json(
            task_file,
            {
                "family": ecs_outputs["TaskFamily"],
                "networkMode": "awsvpc",
                "requiresCompatibilities": ["FARGATE"],
                "cpu": str(config["ecs"]["cpu"]),
                "memory": str(config["ecs"]["memory"]),
                "executionRoleArn": ecs_outputs["TaskExecutionRoleArn"],
                "taskRoleArn": ecs_outputs["TaskRoleArn"],
                "containerDefinitions": [
                    {
                        "name": "web",
                        "image": synced_image,
                        "essential": True,
                        "portMappings": [
                            {
                                "containerPort": int(config["ecs"]["containerPort"]),
                                "hostPort": int(config["ecs"]["containerPort"]),
                                "protocol": "tcp",
                            }
                        ],
                        "environment": [
                            {"name": "APP_ENV", "value": env_name},
                            {"name": "APP_VERSION", "value": app_version},
                            {"name": "APP_HOSTNAME", "value": app_hostname},
                            {"name": "APP_BASE_URL", "value": service_url},
                            {"name": "APP_COMMIT_SHA", "value": app_commit_sha},
                        ],
                        "logConfiguration": {
                            "logDriver": "awslogs",
                            "options": {
                                "awslogs-group": ecs_outputs["LogGroupName"],
                                "awslogs-region": config["aws"]["region"],
                                "awslogs-stream-prefix": "ecs",
                            },
                        },
                    }
                ],
            },
        )


# ============================================================================
# GitHub Actions variables
# ============================================================================


def set_repo_variable(slug: str, name: str, value: str) -> None:
    run(["gh", "variable", "set", name, "-R", slug, "-b", value])


def delete_repo_variable(slug: str, name: str) -> None:
    run(["gh", "variable", "delete", name, "-R", slug], check=False, capture=True)


def sync_github_variables(config: dict, outputs: dict[str, dict[str, str]]) -> None:
    slug = github_repo_slug(config)
    bootstrap = outputs["bootstrap"]
    set_repo_variable(slug, "AWS_REGION", config["aws"]["region"])
    set_repo_variable(slug, "AWS_RELEASE_ROLE_ARN", bootstrap["ReleaseRoleArn"])
    set_repo_variable(slug, "AWS_STATIC_DEPLOY_ROLE_ARN", bootstrap["StaticDeployRoleArn"])
    set_repo_variable(slug, "AWS_ECS_DEPLOY_ROLE_ARN", bootstrap["EcsDeployRoleArn"])


def write_console_links_file(
    config: dict,
    outputs: dict[str, dict[str, str]],
    env_names: Iterable[str],
) -> None:
    """Write .local/console-links.md with clickable GitHub + AWS console URLs
    for every resource the wizard touched. Regenerated on every apply / resume
    / sync-github so it always reflects the current scope.
    """
    env_list = list(env_names)
    slug = github_repo_slug(config)
    region = config["aws"]["region"]
    bootstrap = outputs["bootstrap"]
    delivery = outputs["delivery"]
    account_id = bootstrap["ReleaseRoleArn"].split(":")[4]

    def role_name_of(arn: str) -> str:
        return arn.rsplit("/", 1)[-1]

    def cfn_stack_link(name: str) -> str:
        return (
            f"https://{region}.console.aws.amazon.com/cloudformation/home?region={region}"
            f"#/stacks/stackinfo?stackId={name}"
        )

    def log_group_link(group_name: str) -> str:
        encoded = group_name.replace("/", "$252F")
        return (
            f"https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}"
            f"#logsV2:log-groups/log-group/{encoded}"
        )

    stack_bootstrap = stack_name(config, "bootstrap")
    stack_delivery = stack_name(config, "delivery")
    prefix = config["aws"]["stackPrefix"]

    lines: list[str] = []
    lines.append("# Console links")
    lines.append("")
    lines.append(
        f"_Generated by `scripts/setup_repo.py` — scope: **{', '.join(env_list)}**"
        f" · region: **{region}** · account: `{account_id}`_"
    )
    lines.append("")
    lines.append(
        "> Regenerated on every apply / resume / sync-github. Gitignored. "
        "Click any link to inspect the resource in the browser, alongside the "
        "CLI checks in each lab's Verify section."
    )
    lines.append("")

    # GitHub
    lines.append("## GitHub")
    lines.append("")
    lines.append(f"- [Repository home](https://github.com/{slug})")
    lines.append(f"- [Branch protection](https://github.com/{slug}/settings/branches) — `summary` required, strict=true")
    lines.append(f"- [Actions Variables](https://github.com/{slug}/settings/variables/actions) — `AWS_REGION` + 3 role ARNs")
    lines.append(f"- [Actions runs](https://github.com/{slug}/actions)")
    lines.append(f"- [Pull requests](https://github.com/{slug}/pulls)")
    lines.append(f"- [Releases](https://github.com/{slug}/releases)")
    lines.append("")

    # CloudFormation
    lines.append("## CloudFormation")
    lines.append("")
    lines.append(
        f"- [All stacks (filter by `{prefix}`)](https://{region}.console.aws.amazon.com/"
        f"cloudformation/home?region={region}#/stacks?filteringStatus=active&filteringText={prefix})"
    )
    lines.append(f"- [`{stack_bootstrap}`]({cfn_stack_link(stack_bootstrap)})")
    lines.append(f"- [`{stack_delivery}`]({cfn_stack_link(stack_delivery)})")
    for env_name in env_list:
        stack_static = stack_name(config, "static", env_name)
        stack_ecs = stack_name(config, "ecs", env_name)
        lines.append(f"- [`{stack_static}`]({cfn_stack_link(stack_static)})")
        lines.append(f"- [`{stack_ecs}`]({cfn_stack_link(stack_ecs)})")
    lines.append("")

    # Storage + registry
    lines.append("## Storage + registry")
    lines.append("")
    artifact_bucket = delivery["ArtifactBucketName"]
    ecr_name = delivery["EcrRepositoryName"]
    lines.append(
        f"- [S3 artifact bucket — `{artifact_bucket}`](https://{region}.console.aws.amazon.com/"
        f"s3/buckets/{artifact_bucket}?region={region}&tab=objects)"
    )
    lines.append(
        f"- [ECR web repo — `{ecr_name}`](https://{region}.console.aws.amazon.com/"
        f"ecr/repositories/private/{account_id}/{ecr_name}?region={region})"
    )
    for env_name in env_list:
        site_bucket = outputs[f"static:{env_name}"]["SiteBucketName"]
        lines.append(
            f"- [S3 site bucket ({env_name}) — `{site_bucket}`]("
            f"https://{region}.console.aws.amazon.com/s3/buckets/{site_bucket}"
            f"?region={region}&tab=objects)"
        )
    lines.append("")

    # Runtime (per env)
    lines.append("## Runtime")
    lines.append("")
    for env_name in env_list:
        ecs_out = outputs[f"ecs:{env_name}"]
        static_out = outputs[f"static:{env_name}"]
        cluster = ecs_out["ClusterName"]
        service = ecs_out["ServiceName"]
        dist_id = static_out["DistributionId"]
        lines.append(f"### `{env_name}`")
        lines.append("")
        lines.append(
            f"- [ECS cluster — `{cluster}`](https://{region}.console.aws.amazon.com/"
            f"ecs/v2/clusters/{cluster}?region={region})"
        )
        lines.append(
            f"- [ECS service — `{service}`](https://{region}.console.aws.amazon.com/"
            f"ecs/v2/clusters/{cluster}/services/{service}/health?region={region})"
        )
        lines.append(
            f"- [CloudFront distribution — `{dist_id}`]("
            f"https://console.aws.amazon.com/cloudfront/v4/home?region={region}#/distributions/{dist_id})"
        )
        lines.append(
            f"- [CloudWatch logs — `{ecs_out['LogGroupName']}`]({log_group_link(ecs_out['LogGroupName'])})"
        )
        lines.append(
            f"- Public URLs: [CloudFront]({static_out['SiteUrl']}) · [ALB]({ecs_out['ServiceUrl']})"
        )
        lines.append("")

    # Safety + identity
    lines.append("## Safety + identity")
    lines.append("")
    lines.append("- [AWS Budgets (us-east-1)](https://us-east-1.console.aws.amazon.com/billing/home#/budgets)")
    budget_name = bootstrap.get("BudgetName")
    if budget_name:
        lines.append(f"  - Budget: `{budget_name}` (`${config['safety']['dailyCap']}/day` cap)")
    sns_topic_arn = bootstrap.get("BudgetAlertTopicArn")
    if sns_topic_arn:
        encoded = sns_topic_arn.replace(":", "%3A")
        lines.append(
            f"- [SNS topic (budget alerts)](https://{region}.console.aws.amazon.com/"
            f"sns/v3/home?region={region}#/topic/{encoded})"
        )
        lines.append(f"  - Subscription email: `{config['safety']['email']}`")
    lines.append("- IAM roles (global):")
    for label, arn in (
        ("Release role", bootstrap["ReleaseRoleArn"]),
        ("Static-deploy role", bootstrap["StaticDeployRoleArn"]),
        ("ECS-deploy role", bootstrap["EcsDeployRoleArn"]),
    ):
        rn = role_name_of(arn)
        lines.append(
            f"  - [{label} — `{rn}`](https://us-east-1.console.aws.amazon.com/iam/home"
            f"#/roles/details/{rn})"
        )
    lines.append(
        "- [IAM OIDC providers (global)](https://us-east-1.console.aws.amazon.com/iam/home#/identity_providers)"
    )
    lines.append("")

    CONSOLE_LINKS_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONSOLE_LINKS_PATH.write_text("\n".join(lines))


def delete_github_variables(config: dict) -> None:
    if not github_cli_ready():
        return
    slug = github_repo_slug(config)
    for name in EXPECTED_GITHUB_VARIABLES:
        delete_repo_variable(slug, name)


# ============================================================================
# Destroy + cleanup
# ============================================================================


def _parallel_destroy(
    config: dict,
    stacks: list[tuple[str, str]],
    *,
    wave_label: str,
) -> None:
    """Delete `stacks` concurrently with a per-stack Rich progress row.

    Each stack gets its own task line showing spinner + elapsed time, so the
    student sees simultaneous progress instead of a single opaque spinner.
    Worker count is capped at the number of stacks (no idle workers), and
    delete_stack swallows CFN errors — any stack that survives the wait is
    picked up by the post-loop stuck_stacks check.
    """
    if not stacks:
        return
    max_workers = max(1, len(stacks))
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold]{task.description}"),
        BarColumn(bar_width=None),
        TextColumn("[dim]{task.fields[status]}"),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    ) as progress:
        tasks_by_stack: dict[str, int] = {}
        for _env, name in stacks:
            tasks_by_stack[name] = progress.add_task(
                f"[{wave_label}] {name}", total=None, status="queued"
            )
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            def _run(stack_name: str) -> tuple[str, bool]:
                progress.update(tasks_by_stack[stack_name], status="deleting")
                ok_flag = delete_stack(config, stack_name)
                return stack_name, ok_flag
            futures = [pool.submit(_run, name) for _env, name in stacks]
            for future in as_completed(futures):
                stack_name, deleted = future.result()
                remaining = stack_exists(config, stack_name)
                if remaining:
                    progress.update(
                        tasks_by_stack[stack_name],
                        status="[red]stuck[/red]",
                        completed=1,
                        total=1,
                    )
                else:
                    progress.update(
                        tasks_by_stack[stack_name],
                        status="deleted" if deleted else "already gone",
                        completed=1,
                        total=1,
                    )


def delete_stack(config: dict, name: str) -> bool:
    if not stack_exists(config, name):
        return False
    run(
        [
            "aws",
            "cloudformation",
            "delete-stack",
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
        ]
    )
    run(
        [
            "aws",
            "cloudformation",
            "wait",
            "stack-delete-complete",
            "--region",
            config["aws"]["region"],
            "--stack-name",
            name,
        ],
        check=False,
    )
    return True


def s3_bucket_exists(name: str) -> bool:
    if not name:
        return False
    return run(["aws", "s3api", "head-bucket", "--bucket", name], check=False, capture=True).returncode == 0


def empty_and_delete_s3_bucket(bucket_name: str) -> bool:
    if not bucket_name or not s3_bucket_exists(bucket_name):
        return False
    run(["aws", "s3", "rm", f"s3://{bucket_name}", "--recursive"], check=False, capture=True)
    while True:
        versions = run_json(["aws", "s3api", "list-object-versions", "--bucket", bucket_name])
        objects = []
        for entry in (versions.get("Versions", []) or []):
            objects.append({"Key": entry["Key"], "VersionId": entry["VersionId"]})
        for entry in (versions.get("DeleteMarkers", []) or []):
            objects.append({"Key": entry["Key"], "VersionId": entry["VersionId"]})
        if not objects:
            break
        for start in range(0, len(objects), 1000):
            chunk = {"Objects": objects[start : start + 1000], "Quiet": True}
            with tempfile.NamedTemporaryFile("w", delete=False) as handle:
                json.dump(chunk, handle)
                temp_path = handle.name
            try:
                run(
                    [
                        "aws",
                        "s3api",
                        "delete-objects",
                        "--bucket",
                        bucket_name,
                        "--delete",
                        f"file://{temp_path}",
                    ],
                    check=False,
                    capture=True,
                )
            finally:
                pathlib.Path(temp_path).unlink(missing_ok=True)
    run(["aws", "s3", "rb", f"s3://{bucket_name}", "--force"], check=False, capture=True)
    return True


def empty_ecr_repository(config: dict, repository_name: str) -> bool:
    """Drain an ECR repository until list-images returns empty.

    One batch-delete-image call isn't always enough for multi-arch images.
    `docker buildx build --push --platform amd64,arm64` creates a manifest
    list plus per-arch images. A single batch call can leave per-arch images
    behind as "untagged" entries because ECR processes the manifest delete
    before the per-arch digests are considered deletable. Symptom: the
    shared-delivery stack's DELETE_STACK fails with
      "The repository with name ... cannot be deleted because it still
       contains images"
    even though the wizard already ran `cleanup_shared_delivery_repository`.

    Loop up to 5 times, deleting everything list-images returns each pass.
    """
    if not repository_name:
        return False
    result = run(
        [
            "aws",
            "ecr",
            "describe-repositories",
            "--region",
            config["aws"]["region"],
            "--repository-names",
            repository_name,
        ],
        check=False,
        capture=True,
    )
    if result.returncode != 0:
        return False
    for _pass in range(5):
        images = run_json(
            [
                "aws",
                "ecr",
                "list-images",
                "--region",
                config["aws"]["region"],
                "--repository-name",
                repository_name,
            ]
        )
        ids = images.get("imageIds", []) or []
        if not ids:
            return True
        with tempfile.NamedTemporaryFile("w", delete=False) as handle:
            json.dump(ids, handle)
            temp_path = handle.name
        try:
            run(
                [
                    "aws",
                    "ecr",
                    "batch-delete-image",
                    "--region",
                    config["aws"]["region"],
                    "--repository-name",
                    repository_name,
                    "--image-ids",
                    f"file://{temp_path}",
                ],
                check=False,
                capture=True,
            )
        finally:
            pathlib.Path(temp_path).unlink(missing_ok=True)
    # Final check — if something still persists after 5 passes, return False
    # so the caller knows to surface it as a stuck stack.
    final = run_json(
        [
            "aws",
            "ecr",
            "list-images",
            "--region",
            config["aws"]["region"],
            "--repository-name",
            repository_name,
        ]
    )
    return not (final.get("imageIds") or [])


def cleanup_retained_buckets(env_names: Iterable[str], *, include_shared: bool) -> list[str]:
    deleted: list[str] = []
    if include_shared:
        delivery = read_json_if_exists(delivery_path()) or {}
        if empty_and_delete_s3_bucket(delivery.get("artifactBucket", "")):
            deleted.append(delivery["artifactBucket"])
    for env_name in env_names:
        site = read_json_if_exists(static_site_path(env_name)) or {}
        if empty_and_delete_s3_bucket(site.get("siteBucket", "")):
            deleted.append(site["siteBucket"])
    return deleted


def cleanup_shared_delivery_repository(config: dict) -> str | None:
    delivery = read_json_if_exists(delivery_path()) or {}
    name = delivery.get("ecrRepositoryName", "")
    if empty_ecr_repository(config, name):
        return name
    return None


def plan_destroy(config: dict, env_names: list[str]) -> dict:
    """Collect what destroy would remove, in deletion order (reverse of create)."""
    include_shared = set(env_names) == set(ENVIRONMENTS) or len(env_names) == len(ENVIRONMENTS)
    env_stacks: list[tuple[str, str]] = []
    for env_name in env_names:
        env_stacks.append((env_name, stack_name(config, "ecs", env_name)))
        env_stacks.append((env_name, stack_name(config, "static", env_name)))
    stacks_to_delete: list[tuple[str, str, str]] = []
    for env_name, name in env_stacks:
        if stack_exists(config, name):
            status = describe_stack_status(config, name)
            stacks_to_delete.append((env_name, name, status))
    if include_shared:
        for kind in ("delivery", "bootstrap"):
            name = stack_name(config, kind)
            if stack_exists(config, name):
                stacks_to_delete.append(("shared", name, describe_stack_status(config, name)))

    # data-loss surfaces
    buckets: list[tuple[str, str, int]] = []
    if include_shared:
        delivery = read_json_if_exists(delivery_path()) or {}
        name = delivery.get("artifactBucket", "")
        if s3_bucket_exists(name):
            buckets.append(("shared-artifact", name, _count_bucket_objects(name)))
    for env_name in env_names:
        site = read_json_if_exists(static_site_path(env_name)) or {}
        name = site.get("siteBucket", "")
        if s3_bucket_exists(name):
            buckets.append((env_name + "-site", name, _count_bucket_objects(name)))
    ecr_images: list[tuple[str, int]] = []
    if include_shared:
        delivery = read_json_if_exists(delivery_path()) or {}
        name = delivery.get("ecrRepositoryName", "")
        if name:
            count = _count_ecr_images(config, name)
            if count >= 0:
                ecr_images.append((name, count))

    # Cost stopped is what you actually stop billing for — compute from
    # *existing* env-scoped stacks, not the nominal scope arg. On an empty
    # state (Lab 2's dry-run), zero stacks → $0 stopped, not the hypothetical
    # full-stack cost that confused students into thinking they were billing
    # for resources they hadn't deployed yet.
    deployed_env_names = {
        env for env, _name, _status in stacks_to_delete if env != "shared"
    }
    return {
        "stacks": stacks_to_delete,
        "buckets": buckets,
        "ecr_images": ecr_images,
        "env_names": env_names,
        "include_shared": include_shared,
        "daily_cost_stopped": daily_cost_for(deployed_env_names) if deployed_env_names else 0.0,
        "stack_prefix": config["aws"]["stackPrefix"],
    }


def _count_bucket_objects(bucket: str) -> int:
    if not bucket:
        return 0
    try:
        result = run_text(
            ["aws", "s3api", "list-objects-v2", "--bucket", bucket, "--query", "length(Contents)", "--output", "text"],
            check=False,
        )
        return int(result) if result and result != "None" else 0
    except (ValueError, subprocess.CalledProcessError):
        return 0


def _count_ecr_images(config: dict, repository: str) -> int:
    if not repository:
        return -1
    try:
        return int(
            run_text(
                [
                    "aws",
                    "ecr",
                    "list-images",
                    "--region",
                    config["aws"]["region"],
                    "--repository-name",
                    repository,
                    "--query",
                    "length(imageIds)",
                    "--output",
                    "text",
                ],
                check=False,
            )
            or "0"
        )
    except ValueError:
        return -1


def render_destroy_plan(plan: dict, *, dry_run: bool) -> None:
    header = "destroy --dry-run" if dry_run else "destroy"
    console.print()
    console.print(Text(f"┌  {header}", style="bold red" if not dry_run else "bold"))
    console.print(Text("│", style="dim"))

    if dry_run:
        console.print(f"[cyan]●[/cyan] No changes will be made. This is a preview.")
    stacks_tbl = Table(title=f"Stacks ({len(plan['stacks'])})", show_header=True, header_style="bold")
    stacks_tbl.add_column("Stack")
    stacks_tbl.add_column("Scope")
    stacks_tbl.add_column("Status")
    for env_name, name, status in plan["stacks"]:
        stacks_tbl.add_row(name, env_name, status)
    console.print(stacks_tbl)

    if plan["buckets"]:
        buckets_tbl = Table(title=f"S3 buckets to empty + delete ({len(plan['buckets'])})", show_header=True, header_style="bold")
        buckets_tbl.add_column("Role")
        buckets_tbl.add_column("Bucket")
        buckets_tbl.add_column("Objects")
        for role, name, count in plan["buckets"]:
            buckets_tbl.add_row(role, name, str(count))
        console.print(buckets_tbl)

    if plan["ecr_images"]:
        ecr_tbl = Table(title="ECR repositories to purge", show_header=True, header_style="bold")
        ecr_tbl.add_column("Repository")
        ecr_tbl.add_column("Images")
        for name, count in plan["ecr_images"]:
            ecr_tbl.add_row(name, str(count))
        console.print(ecr_tbl)

    data_loss_count = sum(c for _, _, c in plan["buckets"]) + sum(c for _, c in plan["ecr_images"])
    if data_loss_count > 0:
        warn(f"Data loss warning: {data_loss_count} objects/images will be permanently deleted.")

    console.print(
        panel(
            "- GitHub repository and commits: [green]untouched[/green]\n"
            "- GitHub Actions variables: [yellow]deleted[/yellow] when shared scope is destroyed\n"
            "- AWS Budgets alert + SNS subscription: [yellow]deleted[/yellow] when shared scope is destroyed (they live inside bootstrap-shared)\n"
            "- Local git worktree and .local/ state: [green]untouched[/green] during --dry-run",
            title="What will NOT be touched",
            style="dim",
        )
    )

    console.print(
        panel(
            f"Estimated cost stopped: [bold green]${plan['daily_cost_stopped']:.2f}/day[/bold green]",
            title="Cost impact",
            style="green",
        )
    )

def _render_wait_eta(plan: dict) -> None:
    """ETA + 'grab a coffee' hint for the destroy flow. Called from
    cmd_destroy AFTER the typed-scope confirmation succeeds, so students
    don't see 'we'll tell you when it's done' before they've kicked
    anything off. Stacks delete in two parallel waves (env, then shared);
    wait is bounded by the slowest stack in each wave (ECS ~7-10 min,
    static-site ~4-6 min, shared ~2-4 min).
    """
    if not plan["stacks"]:
        return
    has_ecs = any("ecs" in name for _, name, _ in plan["stacks"])
    low = 8 if has_ecs else 4
    high = 15 if has_ecs else 8
    _render_coffee_panel(
        f"[bold]~{low}–{high} min typical[/bold] for {len(plan['stacks'])} stacks "
        f"(parallel teardown of env + shared waves)."
    )


def _render_apply_wait_eta(env_names: list[str], stack_count: int) -> None:
    """ETA + 'grab a coffee' hint for the apply flow. Called AFTER the
    'Continue?' confirmation. CFN deploys run sequentially in the wizard:
    bootstrap-shared (~2-3 min) → shared-delivery (~1-2 min) → per-env
    static-site (~4-6 min, CloudFront is the slow part) + ecs-app
    (~7-10 min, VPC + ALB + ECS service-stable).
    """
    if stack_count == 0:
        return
    if stack_count <= 4:        # dev only
        low, high = 8, 12
    elif stack_count <= 6:      # dev + staging
        low, high = 14, 20
    else:                        # dev + staging + prod
        low, high = 20, 30
    _render_coffee_panel(
        f"[bold]~{low}–{high} min typical[/bold] for {stack_count} stacks "
        f"(sequential deploy: shared → {', '.join(env_names)})."
    )


def _render_coffee_panel(header: str) -> None:
    """Shared coffee-break panel used by both apply and destroy wait hints."""
    # Pull translated string out of the f-string so the apostrophe in
    # "we'll"/"it's" doesn't collide with Python <3.12 f-string rules
    # (backslash escapes are not allowed inside f-string expressions).
    coffee_line = _("Grab a coffee — we'll tell you when it's done.")
    console.print(
        panel(
            f"{header}\n☕ {coffee_line}",
            title=_("Estimated wait"),
            style="cyan",
        )
    )


def typed_scope_confirm(plan: dict) -> bool:
    env_names = plan["env_names"]
    if plan["include_shared"]:
        suffix = "all"
    elif set(env_names) == {"development"}:
        suffix = "dev"
    elif set(env_names) == {"development", "staging"}:
        suffix = "dev-stg"
    elif set(env_names) == {"staging"}:
        suffix = "stg"
    elif set(env_names) == {"production"}:
        suffix = "prd"
    else:
        suffix = "-".join(ENVIRONMENT_CODES[e] for e in env_names)
    literal = f"{SCOPE_LITERAL_PREFIX}{plan['stack_prefix']}-{suffix}"

    console.print()
    warn(_("This is destructive. Type the exact scope below to confirm:"))
    console.print(f"   [bold red]{literal}[/bold red]")
    console.print(f"   [dim](letter-by-letter; not 'y' or 'yes')[/dim]")
    answer = questionary.text("Scope:", qmark="◆").ask()
    if answer is None:
        return False
    return answer.strip() == literal


# ============================================================================
# State file management
# ============================================================================


def save_state_snapshot(snapshot: dict) -> None:
    LOCAL_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    base = read_json_if_exists(LOCAL_STATE_PATH) or {}
    base.update(snapshot)
    base["updatedAt"] = datetime.now(tz=timezone.utc).isoformat()
    LOCAL_STATE_PATH.write_text(json.dumps(base, indent=2) + "\n")


def load_state() -> dict:
    return read_json_if_exists(LOCAL_STATE_PATH) or {}


def clear_state() -> None:
    if LOCAL_STATE_PATH.exists():
        LOCAL_STATE_PATH.unlink()


def stale_state_banner() -> None:
    """Warn if a previous wizard run is stale (≥12h old).

    Tries to verify against live AWS state — if stacks are still up, the
    banner shows exactly which stacks and a precise accrued-cost figure.
    If stacks are gone, the state file is cleaned up silently. If we can't
    reach AWS (not authenticated yet, no config, network down), falls back
    to a soft estimate-based warning.
    """
    state = load_state()
    updated_at_raw = state.get("updatedAt")
    if not updated_at_raw:
        return
    try:
        updated_at = datetime.fromisoformat(updated_at_raw)
    except ValueError:
        return
    age = datetime.now(tz=timezone.utc) - updated_at
    if age < STALE_STATE_THRESHOLD:
        return

    hours = int(age.total_seconds() // 3600)
    scope = state.get("scope") or "unknown"
    approx_cost = state.get("dailyCost", 1.45)
    est_accrued = round(age.total_seconds() / 86400 * approx_cost, 2)

    # Try to confirm against live AWS state.
    live: list[str] = []
    verified = False
    try:
        config = load_config(DEFAULT_CONFIG_PATH)
        live = live_stacks_for(config)
        verified = True
    except (typer.Exit, json.JSONDecodeError, KeyError, OSError):
        verified = False

    if live:
        live_list = "\n".join(f"  • {name}" for name in live)
        console.print(
            panel(
                f"Previous run was [bold]{hours}[/bold] hours ago (scope: "
                f"[cyan]{scope}[/cyan]).\n\n"
                f"AWS confirms [bold red]{len(live)}[/bold red] live stack"
                f"{'s' if len(live) != 1 else ''} still running:\n"
                f"{live_list}\n\n"
                f"Accrued so far: [bold yellow]~${est_accrued:.2f}[/bold yellow].\n"
                f"Tear down now: [cyan]setup_repo.py destroy[/cyan]",
                title="▲ stacks still running",
                style="red",
            )
        )
        return

    if verified:
        # AWS reached, zero matching stacks — state is truly stale, clean up.
        try:
            LOCAL_STATE_PATH.unlink()
        except FileNotFoundError:
            pass
        info(
            f"Previous deploy state is {hours}h old, but AWS shows no live "
            "lab stacks. Cleaned up stale state file."
        )
        return

    # Couldn't verify — soft warning.
    console.print(
        panel(
            f"The last wizard run was [bold]{hours}[/bold] hours ago (scope: "
            f"[cyan]{scope}[/cyan]).\n"
            f"If stacks are still deployed, accrued cost is roughly "
            f"[bold yellow]${est_accrued:.2f}[/bold yellow].\n"
            f"Run [cyan]destroy --dry-run[/cyan] to check, or "
            f"[cyan]destroy[/cyan] to tear down.",
            title="▲ stale state detected",
            style="yellow",
        )
    )


# ============================================================================
# Safety config validation — fail fast if Lab 1 wasn't completed
# ============================================================================


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def require_safety_config(config: dict) -> None:
    """Verify safety.email is set and looks valid before provisioning.

    Lab 1 asks the student to set safety.email in config/project-setup.json.
    Without it, bootstrap-shared stack creation will fail on the email
    parameter pattern — we fail earlier with a clearer message.
    """
    safety = config.get("safety") or {}
    email = (safety.get("email") or "").strip()
    if not email or not EMAIL_RE.match(email):
        console.print(
            panel(
                "[b]safety.email[/b] in config/project-setup.json is empty or invalid.\n\n"
                "Lab 1 asks you to set this before Lab 3 provisions the\n"
                "bootstrap-shared stack (which deploys the daily budget alert).\n\n"
                "Open [cyan]config/project-setup.json[/cyan], set:\n"
                "  [dim]\"safety\": {\"dailyCap\": 10, \"email\": \"you@example.com\"}[/dim]\n"
                "commit the change, open the Lab 1 PR, then retry.",
                title="▲ Lab 1 not complete",
                style="red",
            )
        )
        raise typer.Exit(code=2)

    try:
        daily_cap = float(safety.get("dailyCap", 0))
    except (TypeError, ValueError):
        daily_cap = 0.0
    if daily_cap < 0.01:
        console.print(
            panel(
                "[b]safety.dailyCap[/b] in config/project-setup.json must be a\n"
                "positive number. Default is 10 (USD/day).",
                title="▲ invalid daily cap",
                style="red",
            )
        )
        raise typer.Exit(code=2)


# ============================================================================
# Typer subcommands
# ============================================================================

ConfigPath = Annotated[Optional[pathlib.Path], typer.Option("--config", help="Path to project-setup.json")]
ScopeOption = Annotated[Optional[str], typer.Option("--scope", help="Comma-separated env list (e.g. 'development,staging')")]


def _config(path: Optional[pathlib.Path]) -> dict:
    return load_config(path or DEFAULT_CONFIG_PATH)


@app.command("validate-tools")
def cmd_validate_tools() -> None:
    """Check that required external tools are installed, version-compatible, and authenticated."""
    status = detect_cli_status()
    console.print(render_tool_table(status))
    for key in ("git", "python3", "aws"):
        require(bool(status[key]["available"]), f"{key} is required")
    require(bool(status["aws"]["authenticated"]), "aws CLI is not authenticated (run `aws sso login`)")
    # Version floors — prevents "validate-tools says ok, then a downstream
    # script breaks on Python 3.9 syntax or node 18 bundler output." Doc
    # requirements live in docs/*/lab-02-tools-and-dry-run.md and are
    # codified in TOOL_VERSION_SPEC.
    for key, entry in status.items():
        if not entry["available"]:
            continue
        floor = entry.get("floor")
        if floor is None:
            continue
        if entry.get("version_ok") is False:
            parsed = entry.get("parsed")
            have = f"{parsed[0]}.{parsed[1]}" if parsed else "(unparseable)"
            require(
                False,
                f"{key} version {have} is below required {floor[0]}.{floor[1]}. "
                f"Upgrade {key} before continuing.",
            )
    # All green — render the R1 toolchain-ready ceremony. First guaranteed
    # win of the course; previously this command exited silently after the
    # table and students had no cue that they were ready for Lab 2.
    _render_toolchain_ready_panel(status)


def _render_toolchain_ready_panel(status: dict[str, dict[str, object]]) -> None:
    """After validate-tools all-green, render the 'you're ready' panel.

    Shows a tool/auth count as proof, a locale-aware pointer to Lab 2,
    and the next command to copy-paste. Matches the R1 ceremony spec in
    the wizard i18n design memo.
    """
    tool_count = sum(1 for s in status.values() if s["available"])
    auth_count = sum(1 for s in status.values() if s["authenticated"] is True)
    doc_dir = docs_dir(current_locale())
    next_hint = _("Next: Lab {n} — {title}").format(
        n=2, title="Tools + Dry-Run the Exit"
    )
    first_cmd_label = _("First command:")
    body = (
        f"{tool_count}/7 tools installed · {auth_count}/2 authenticated\n\n"
        f"{next_hint}\n"
        f"      docs/{doc_dir}/lab-02-tools-and-dry-run.md\n\n"
        f"{first_cmd_label}  [cyan]python3 scripts/setup_repo.py destroy --dry-run[/cyan]"
    )
    title_text = _("Toolchain ready")
    console.print(
        panel(
            body,
            title=f"[bold]✓ {title_text}[/bold]",
            style="bright_green",
        )
    )


@app.command("validate-config")
def cmd_validate_config(config_path: ConfigPath = None) -> None:
    """Validate config/project-setup.json shape + required fields."""
    config = _config(config_path)
    ok(f"config valid: {github_repo_slug(config)} in {config['aws']['region']}")


@app.command("print-plan")
def cmd_print_plan(config_path: ConfigPath = None, scope: ScopeOption = None) -> None:
    """Print what apply would do, without doing anything."""
    config = _config(config_path)
    env_names = parse_environments(scope)
    tbl = Table(title="Apply plan", show_header=True, header_style="bold")
    tbl.add_column("#")
    tbl.add_column("Stack")
    tbl.add_column("Template")
    for idx, (name, template, _, _) in enumerate(planned_stack_list(config, env_names), start=1):
        tbl.add_row(str(idx), name, template)
    console.print(tbl)
    console.print(
        panel(
            f"Scope: [bold]{', '.join(env_names)}[/bold]\n"
            f"Estimated cost while active: [bold yellow]${daily_cost_for(env_names):.2f}/day[/bold yellow]",
            title="Scope",
            style="cyan",
        )
    )


@app.command("apply")
def cmd_apply(config_path: ConfigPath = None, scope: ScopeOption = None) -> None:
    """Provision stacks, sync manifests, write GH vars. Non-interactive."""
    _apply(config_path=config_path, scope_arg=scope, interactive=False, resume=False)


@app.command("resume")
def cmd_resume(config_path: ConfigPath = None) -> None:
    """Resume a partially-failed apply (reads .local state)."""
    state = load_state()
    if state.get("step") != "apply":
        err("no resumable state found. Run `apply` or the wizard from scratch.")
        raise typer.Exit(code=1)
    scope = ",".join(state.get("env_names") or [])
    _apply(config_path=config_path, scope_arg=scope, interactive=False, resume=True)


@app.command("destroy")
def cmd_destroy(
    config_path: ConfigPath = None,
    scope: ScopeOption = None,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Preview what would be destroyed; do nothing.")] = False,
    yes: Annotated[bool, typer.Option("--yes", help="Skip typed-scope confirmation (still shows 3-second countdown).")] = False,
) -> None:
    """Tear down stacks. Use --dry-run first; confirms by typed scope."""
    config = _config(config_path)
    env_names = parse_environments(scope)
    plan = plan_destroy(config, env_names)
    render_destroy_plan(plan, dry_run=dry_run)

    if dry_run:
        console.print()
        console.print(Text("└  To actually run destroy:  ", style="bold") + Text("./scripts/setup_repo.py destroy", style="cyan"))
        return

    confirmed = True if yes else typed_scope_confirm(plan)
    if not confirmed:
        console.print("\n[red]■[/red] destroy cancelled.")
        return

    # Now the teardown is actually happening — show the wait ETA here, not
    # during the plan preview. Appearing before confirmation made it read
    # like "destroy already running, go get coffee" which misled students.
    _render_wait_eta(plan)

    if yes:
        for seconds in (3, 2, 1):
            console.print(f"[yellow]▲[/yellow] Starting in {seconds}... (ctrl-c to abort)")
            time.sleep(1)

    env_names_list = plan["env_names"]
    include_shared = plan["include_shared"]
    env_stacks = [(env, name) for env, name, _ in plan["stacks"] if env != "shared"]
    shared_stacks = [(env, name) for env, name, _ in plan["stacks"] if env == "shared"]

    # Pre-stack data cleanup:
    #   * ECR — AWS::ECR::Repository in shared-delivery has no DeletionPolicy:
    #     Retain, so CFN tries to delete it and fails if images are present.
    #   * S3 buckets — every AWS::S3::Bucket in the stacks has DeletionPolicy:
    #     Retain (intentional: prevents accidental data loss on re-deploy).
    #     Cleanup emptying + bucket removal must be explicit. Doing it BEFORE
    #     stack-delete avoids the scary DELETE_SKIPPED status that students see
    #     in the CFN console mid-destroy, and makes the sequence "empty data
    #     → release stacks" obvious on the wizard log.
    if include_shared:
        cleanup_shared_delivery_repository(config)
    cleanup_retained_buckets(env_names_list, include_shared=include_shared)

    # Stack deletes run in two parallel waves:
    #   Wave 1 — env stacks (dev-ecs, dev-static, stg-ecs, stg-static).
    #     CloudFormation templates have no cross-stack exports; env stacks are
    #     independent within and across envs. Parallel delete cuts typical
    #     teardown from ~35 min to ~10 min on dev+staging.
    #   Wave 2 — shared stacks (shared-delivery, shared-oidc), after env
    #     stacks are gone so runtime references (ECR pull, assume-role) are
    #     already released.
    # delete_stack swallows errors (wait --region ... returns non-zero on
    # stuck stacks without raising); the post-loop stuck_stacks check below
    # surfaces any residual stacks for the student.
    _parallel_destroy(config, env_stacks, wave_label="env stacks")
    if shared_stacks:
        _parallel_destroy(config, shared_stacks, wave_label="shared stacks")

    if include_shared:
        delete_github_variables(config)

    # Guard the success receipt: verify no planned stacks remain before
    # claiming "Account back to $0/day". Previously the panel printed
    # unconditionally even when a DELETE_FAILED stack was still live.
    stuck_stacks = [name for _, name, _ in plan["stacks"] if stack_exists(config, name)]
    if include_shared:
        clear_state()

    console.print()
    if stuck_stacks:
        console.print(
            panel(
                f"[bold]Destroy did not complete cleanly.[/bold]\n\n"
                f"Stacks still live in AWS:\n"
                + "\n".join(f"  • {n}" for n in stuck_stacks)
                + "\n\n"
                f"Inspect:\n"
                f"  aws cloudformation describe-stack-events --region "
                f"{config['aws']['region']} --stack-name <stack>\n\n"
                f"Fix the cause (typically: a resource in the stack that CFN "
                f"cannot delete while non-empty — manually empty it, then "
                f"re-run destroy).",
                title="[bold]■ destroy incomplete[/bold]",
                style="red",
            )
        )
    elif include_shared:
        receipt = "\n".join(
            f"  [cyan]{label}[/cyan]  {line}" for label, line in LIFECYCLE_RECEIPT_LINES
        )
        console.print(
            panel(
                f"[bold]Account back to $0/day.[/bold]\n"
                f"0 stacks · 0 buckets · 0 ECR repos.\n\n"
                f"[bold]The receipt:[/bold]\n{receipt}\n\n"
                f"Rebuild any time in ~15 min via [cyan]python3 scripts/setup_repo.py[/cyan].",
                title="[bold]✦ LINE DECOMMISSIONED[/bold]",
                style="bright_green",
            )
        )
    else:
        removed_stacks = len(plan["stacks"]) - len(stuck_stacks)
        obj_count = sum(c for _, _, c in plan["buckets"])
        img_count = sum(c for _, c in plan["ecr_images"])
        removed_line = _(
            "Removed: {n} stacks · {o} S3 objects · {i} ECR images"
        ).format(n=removed_stacks, o=obj_count, i=img_count)
        cost_line = _("Cost stopped: ${x}/day").format(
            x=f"{plan['daily_cost_stopped']:.2f}"
        )
        come_back_label = _("To come back later:")
        scope_flag = ",".join(env_names_list)
        title_text = _("Environment peacefully gone")
        console.print(
            panel(
                f"{removed_line}\n\n"
                f"{cost_line}\n\n"
                f"{come_back_label}\n"
                f"  [cyan]python3 scripts/setup_repo.py apply --scope {scope_flag}[/cyan]\n\n"
                f"Shared stacks still live — run destroy with full scope to reach $0/day.",
                title=f"◇ {title_text}",
                style="green",
            )
        )


@app.command("sync-github")
def cmd_sync_github(config_path: ConfigPath = None, scope: ScopeOption = None) -> None:
    """Re-sync GitHub Actions variables from current stack outputs."""
    config = _config(config_path)
    env_names = parse_environments(scope)
    require(github_cli_ready(), "gh CLI is not available or not authenticated")
    require(
        all_required_stacks_exist(config, env_names),
        "required stacks are not all deployed; run apply first",
    )
    outputs = deployed_outputs(config, env_names)
    sync_github_variables(config, outputs)
    write_console_links_file(config, outputs, env_names)
    ok("GitHub Actions variables synced + .local/console-links.md refreshed")


@app.command("sync-manifests")
def cmd_sync_manifests(config_path: ConfigPath = None, scope: ScopeOption = None) -> None:
    """Re-sync deploy/ manifests from current stack outputs."""
    config = _config(config_path)
    env_names = parse_environments(scope)
    require(
        all_required_stacks_exist(config, env_names),
        "required stacks are not all deployed; run apply first",
    )
    outputs = deployed_outputs(config, env_names)
    sync_manifests(config, outputs, env_names)
    write_console_links_file(config, outputs, env_names)
    ok("manifests synced from live stack outputs + .local/console-links.md refreshed")


# ============================================================================
# Apply orchestration (shared by apply, resume, and the interactive wizard)
# ============================================================================


def _apply(
    *,
    config_path: Optional[pathlib.Path],
    scope_arg: Optional[str],
    interactive: bool,
    resume: bool,
) -> None:
    config = _config(config_path)
    require_safety_config(config)
    env_names = parse_environments(scope_arg)
    daily = daily_cost_for(env_names)

    if interactive:
        console.print(
            panel(
                f"Scope: [bold]{', '.join(env_names)}[/bold]\n"
                f"Stacks: [bold]{len(planned_stack_list(config, env_names))}[/bold]\n"
                f"Running cost while active: [bold yellow]${daily:.2f}/day[/bold yellow]\n\n"
                f"Destroy is one command away: [cyan]python3 scripts/setup_repo.py destroy[/cyan]",
                title="About to deploy",
                style="cyan",
            )
        )
        if questionary.select(
            "Continue?",
            choices=[
                questionary.Choice("Yes — deploy now", value=True),
                questionary.Choice("No — cancel", value=False),
            ],
            default=True,
        ).ask() is not True:
            console.print("[yellow]▲[/yellow] apply cancelled.")
            return

    # Now the deploy is actually starting — show the wait ETA here, not
    # during the pre-confirm preview. Same rationale as the destroy flow:
    # 'we'll tell you when it's done' before confirmation misled students
    # into thinking deploy was already running.
    _render_apply_wait_eta(env_names, len(planned_stack_list(config, env_names)))

    save_state_snapshot({"step": "apply", "env_names": env_names, "dailyCost": daily, "scope": ",".join(env_names)})
    state = load_state()
    completed = set(state.get("completed") or []) if resume else set()

    step(f"Deploying {len(planned_stack_list(config, env_names))} stacks")
    outputs = deploy_infrastructure(config, env_names, resume_completed=completed)

    step("Syncing deploy/ manifests from stack outputs")
    sync_manifests(config, outputs, env_names)
    ok("manifests written")

    if github_cli_ready():
        step("Writing GitHub Actions variables")
        sync_github_variables(config, outputs)
        ok("4 variables synced")
    else:
        warn("gh CLI not ready; skipping Actions variable sync. Run `sync-github` later.")

    step("Writing .local/console-links.md")
    write_console_links_file(config, outputs, env_names)
    ok(f"console links ready → {CONSOLE_LINKS_PATH.relative_to(ROOT)}")

    save_state_snapshot({"step": "apply-complete", "env_names": env_names, "dailyCost": daily})

    console.print()
    stack_count = len(planned_stack_list(config, env_names))
    # Scope-aware "Next:" hint. A first-time dev apply is in the middle of
    # Lab 3 (more steps + claim PR left); a dev+staging expansion came from
    # Lab 9 step 2 (promotion wizard is the next action, not Lab 4); a full
    # three-env apply is beyond the lab flow entirely.
    env_set = set(env_names)
    doc_dir = docs_dir(current_locale())
    if env_set == {"development"}:
        next_hint = (
            "Next: [cyan]finish Lab 3[/cyan] — inspect the synced manifests, then\n"
            "      [cyan]./scripts/claim.py lab-3[/cyan] to record progress.\n"
            f"      docs/{doc_dir}/lab-03-wire-the-lab.md"
        )
    elif env_set == {"development", "staging"}:
        next_hint = (
            "Next: [cyan]finish Lab 9[/cyan] — commit the synced staging manifests on\n"
            "      a [cyan]chore/lab-9-staging-provisioned[/cyan] branch, merge that PR,\n"
            "      then [cyan]python3 scripts/promotion_wizard.py[/cyan].\n"
            f"      docs/{doc_dir}/lab-09-first-promotion.md"
        )
    elif env_set == set(ENVIRONMENTS):
        next_hint = (
            "Next: production is now live (beyond the core lab flow).\n"
            f"      See [cyan]docs/{doc_dir}/concepts/cicd-model.md[/cyan] for promotion-to-prod patterns."
        )
    else:
        next_hint = f"Next: scope = [bold]{', '.join(env_names)}[/bold]"
    console.print(
        panel(
            f"[bold]{stack_count} CloudFormation stacks live.[/bold]\n"
            f"OIDC trust: GitHub Actions ↔ your AWS account.\n"
            f"Running cost: [bold yellow]${daily:.2f}/day[/bold yellow]\n"
            f"Environments: [bold]{', '.join(env_names)}[/bold]\n\n"
            f"[dim]  ┌─────┐    ┌──────────┐    ┌──────────────────┐[/dim]\n"
            f"[dim]  │ GH  │───▶│  shared  │───▶│ per-env          │[/dim]\n"
            f"[dim]  │ OIDC│    │  delivery│    │ static + ECS     │[/dim]\n"
            f"[dim]  └─────┘    └──────────┘    └──────────────────┘[/dim]\n\n"
            f"{next_hint}\n\n"
            f"👀 [dim]Visual check:[/dim] open [cyan].local/console-links.md[/cyan] for one-click links into every resource above.\n\n"
            f"To stop billing: [cyan]python3 scripts/setup_repo.py destroy[/cyan]",
            title="[bold]✦ ASSEMBLY LINE WIRED[/bold]",
            style="bright_green",
        )
    )


# ============================================================================
# Interactive wizard (default entry point)
# ============================================================================


def wizard() -> None:
    console.print(Text("┌  resume-cicd-lab setup wizard", style="bold"))
    console.print()
    stale_state_banner()

    step("Preflight — tool check")
    status = detect_cli_status()
    console.print(render_tool_table(status))
    require(bool(status["git"]["available"]), "git CLI is required")
    require(bool(status["aws"]["available"]), "aws CLI is required")
    require(bool(status["python3"]["available"]), "python3 is required")
    require(bool(status["aws"]["authenticated"]), "aws CLI is not authenticated")

    config = load_config(DEFAULT_CONFIG_PATH)

    step("Scope")
    choices = [
        questionary.Choice(
            title=f"development only         ≈ ${daily_cost_for(['development']):.2f}/day  (recommended first run)",
            value=["development"],
        ),
        questionary.Choice(
            title=f"dev + staging             ≈ ${daily_cost_for(['development', 'staging']):.2f}/day  (enables Lab 9 promotion)",
            value=["development", "staging"],
        ),
        questionary.Choice(
            title=f"dev + staging + prod      ≈ ${daily_cost_for(list(ENVIRONMENTS)):.2f}/day  (beyond the lab flow)",
            value=list(ENVIRONMENTS),
        ),
    ]
    env_names = questionary.select("Which environments?", choices=choices).ask()
    if env_names is None:
        console.print("[yellow]▲[/yellow] cancelled.")
        return

    require_safety_config(config)

    if github_cli_ready():
        step("GitHub repo")
        if questionary.select(
            "Create or connect the GitHub repo now?",
            choices=[
                questionary.Choice("Yes — connect (repo already exists)", value=True),
                questionary.Choice("No — skip (I'll set it up later)", value=False),
            ],
            default=True,
        ).ask() is True:
            maybe_create_repo(config)
            ensure_origin_remote(config["github"]["owner"], config["github"]["repo"])
            configure_repo_settings(config)
            ok(f"repo ready: {github_repo_slug(config)}")
    else:
        warn("gh CLI not ready; skipping repo step. Run `sync-github` later.")

    _apply(config_path=None, scope_arg=",".join(env_names), interactive=True, resume=False)
    console.print(Text("└  wizard complete", style="bold green"))


@app.callback(invoke_without_command=True)
def _default(
    ctx: typer.Context,
    locale: Optional[str] = typer.Option(
        None,
        "--locale",
        help="UI language: en, ja, or zh-CN. Overrides config.ui.locale and $LANG.",
    ),
) -> None:
    # Precedence: --locale flag > config.ui.locale > $LC_*/LANG > en.
    # First run with no flag and no persisted choice prompts interactively
    # (TTY) or silently persists the auto-detected default (non-TTY).
    apply_locale_precedence(flag=locale, config_path=DEFAULT_CONFIG_PATH)
    if ctx.invoked_subcommand is None:
        wizard()


# ============================================================================
# Entry point
# ============================================================================


def main() -> None:
    app()


if __name__ == "__main__":
    main()
