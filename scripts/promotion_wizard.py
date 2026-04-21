#!/usr/bin/env python3
"""resume-cicd-lab promotion wizard (Lab 9).

Walks the student through promoting a release from one environment to
the next:

1. Pick source → target environment (only dev→stg and stg→prod are
   allowed; dev→prod is blocked by design).
2. Pick a release to promote — working-tree state first, then git
   history of the source env's manifests (newest first).
3. Render a unified diff of the two target-env files that would change.
4. On confirmation: create `promote/<target>-web-v<version>` branch,
   apply the snapshot, commit, push, and open a DRAFT PR titled
   `chore(<target>): promote web v<version>` so the lab-label workflow
   can apply `lab-7-complete` or `lab-9-complete` on merge.

English-only CLI. Matches the visual style of setup_repo.py and claim.py.
"""
from __future__ import annotations

import difflib
import json
import pathlib
import shutil
import subprocess
from typing import Optional

import questionary
import typer
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

from wizard.first_run import apply_locale_precedence
from wizard.i18n import _

from release_state import (
    ROOT,
    apply_release_snapshot,
    ecs_task_path,
    get_container,
    get_env_var,
    load_release_snapshot,
    read_json,
    static_site_path,
)


# ============================================================================
# Constants
# ============================================================================

PROMOTION_PAIRS: dict[str, tuple[str, ...]] = {
    "development": ("staging",),
    "staging": ("production",),
}

LAB_FOR_TARGET: dict[str, int] = {
    "development": 7,
    "staging": 9,
}

DEFAULT_HISTORY_LIMIT = 12


console = Console()


# ============================================================================
# Rich helpers — same glyph vocabulary as setup_repo.py / claim.py.
# ============================================================================


def panel(body: str, *, title: str = "", style: str = "cyan") -> Panel:
    return Panel(body, title=title or None, border_style=style, padding=(1, 2))


def step(text: str) -> None:
    console.print(f"\n[bold cyan]◆[/bold cyan] [bold]{text}[/bold]")


def ok(text: str) -> None:
    console.print(f"[green]◇[/green] {text}")


def info(text: str) -> None:
    console.print(f"[cyan]●[/cyan] {text}")


def warn(text: str) -> None:
    console.print(f"[yellow]▲[/yellow] {text}")


def err(text: str) -> None:
    console.print(f"[red]■[/red] {text}")


# ============================================================================
# Subprocess
# ============================================================================


def run(
    args: list[str], *, check: bool = True, capture: bool = True
) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=ROOT, check=check, capture_output=capture, text=True)


# ============================================================================
# Preflight
# ============================================================================


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        console.print(
            panel(
                f"[b]{name}[/b] is not on your PATH. Install it (see Lab 2) and try again.",
                title="Missing tool",
                style="red",
            )
        )
        raise typer.Exit(code=2)


def require_gh_auth() -> None:
    result = run(["gh", "auth", "status"], check=False)
    if result.returncode != 0:
        console.print(
            panel(
                "`gh` is installed but not authenticated. Run [b]gh auth login[/b] first.",
                title="gh not authenticated",
                style="red",
            )
        )
        raise typer.Exit(code=2)


def current_branch() -> str:
    return run(["git", "symbolic-ref", "--short", "HEAD"]).stdout.strip()


def require_main() -> None:
    if current_branch() != "main":
        console.print(
            panel(
                f"You're on [b]{current_branch()}[/b], not main. Promotion branches off main.\n\n"
                "Switch with [b]git checkout main[/b] and try again.",
                title="Wrong starting branch",
                style="red",
            )
        )
        raise typer.Exit(code=2)


def require_clean_tree() -> None:
    result = run(["git", "status", "--porcelain"])
    if result.stdout.strip():
        console.print(
            panel(
                "Your working tree has uncommitted changes. The promotion wizard "
                "creates a clean branch + commit; uncommitted changes would carry "
                "into the PR and confuse reviewers.\n\n"
                "Commit or stash them first, then re-run.",
                title="▲ dirty working tree",
                style="yellow",
            )
        )
        raise typer.Exit(code=2)


def remote_branch_exists(branch: str) -> bool:
    result = run(["git", "ls-remote", "--heads", "origin", branch])
    return bool(result.stdout.strip())


# ============================================================================
# Candidate collection
# ============================================================================


def snapshot_identity(snapshot: dict) -> tuple:
    return (
        snapshot["version"],
        snapshot["gitSha"],
        snapshot["artifactKey"],
        snapshot["image"],
    )


def git_history_rows(env_name: str) -> list[tuple[str, str, str]]:
    site_rel = f"deploy/static/{env_name}/site.json"
    task_rel = f"deploy/ecs/{env_name}/task-definition.json"
    result = run(
        [
            "git",
            "log",
            "--date=short",
            "--format=%H\t%ad\t%s",
            "--",
            site_rel,
            task_rel,
        ]
    )
    rows: list[tuple[str, str, str]] = []
    for line in result.stdout.splitlines():
        parts = line.split("\t", 2)
        if len(parts) == 3:
            rows.append((parts[0], parts[1], parts[2]))
    return rows


def collect_candidates(
    source_env: str, target_env: str, limit: int
) -> list[dict]:
    target_snapshot = load_release_snapshot(target_env)
    target_identity = snapshot_identity(target_snapshot)
    seen: set = set()
    candidates: list[dict] = []

    def maybe_append(snapshot: dict, *, source_ref: str, source_date: str, source_subject: str) -> None:
        identity = snapshot_identity(snapshot)
        if identity == target_identity or identity in seen:
            return
        seen.add(identity)
        candidates.append(
            {
                "snapshot": snapshot,
                "sourceRef": source_ref,
                "sourceDate": source_date,
                "sourceSubject": source_subject,
            }
        )

    maybe_append(
        load_release_snapshot(source_env),
        source_ref="WORKTREE",
        source_date="working-tree",
        source_subject=f"current {source_env} manifest state",
    )

    for commit_sha, commit_date, subject in git_history_rows(source_env):
        if len(candidates) >= limit:
            break
        try:
            snapshot = load_release_snapshot(source_env, git_ref=commit_sha)
        except subprocess.CalledProcessError:
            continue
        maybe_append(
            snapshot,
            source_ref=commit_sha,
            source_date=commit_date,
            source_subject=subject,
        )

    return candidates


# ============================================================================
# Diff preview
# ============================================================================


def _build_new_site(target_env: str, snapshot: dict) -> dict:
    site = read_json(static_site_path(target_env))
    site["artifactBucket"] = snapshot["artifactBucket"]
    site["artifactKey"] = snapshot["artifactKey"]
    site["release"] = {
        "version": snapshot["version"],
        "gitSha": snapshot["gitSha"],
    }
    return site


def _build_new_task(target_env: str, snapshot: dict) -> dict:
    task = read_json(ecs_task_path(target_env))
    container = get_container(task)
    container["image"] = snapshot["image"]
    get_env_var(container, "APP_VERSION")["value"] = snapshot["appVersion"]
    get_env_var(container, "APP_COMMIT_SHA")["value"] = snapshot["appCommitSha"]
    return task


def _file_diff(path: pathlib.Path, new_content: dict) -> Optional[str]:
    current = path.read_text(encoding="utf-8")
    new_text = json.dumps(new_content, indent=2, ensure_ascii=False) + "\n"
    if current == new_text:
        return None
    rel = path.relative_to(ROOT).as_posix()
    diff_iter = difflib.unified_diff(
        current.splitlines(keepends=True),
        new_text.splitlines(keepends=True),
        fromfile=f"a/{rel}",
        tofile=f"b/{rel}",
    )
    return "".join(diff_iter)


def preview_diff(target_env: str, snapshot: dict) -> list[tuple[str, str]]:
    """Return [(relative_path, diff_text), ...] for files that would change."""
    result: list[tuple[str, str]] = []
    new_site = _build_new_site(target_env, snapshot)
    site_diff = _file_diff(static_site_path(target_env), new_site)
    if site_diff:
        result.append((static_site_path(target_env).relative_to(ROOT).as_posix(), site_diff))
    new_task = _build_new_task(target_env, snapshot)
    task_diff = _file_diff(ecs_task_path(target_env), new_task)
    if task_diff:
        result.append((ecs_task_path(target_env).relative_to(ROOT).as_posix(), task_diff))
    return result


# ============================================================================
# Environment / candidate selection helpers
# ============================================================================


def choose_source_env(explicit: Optional[str]) -> str:
    allowed = tuple(PROMOTION_PAIRS.keys())
    if explicit:
        if explicit not in allowed:
            err(f"--source-env {explicit!r} is not promotable (allowed: {', '.join(allowed)})")
            raise typer.Exit(code=2)
        info(f"source: {explicit}")
        return explicit
    selection = questionary.select(
        "Promote FROM which environment?",
        choices=list(allowed),
    ).ask()
    if selection is None:
        warn("cancelled.")
        raise typer.Exit(code=1)
    return selection


def choose_target_env(source_env: str, explicit: Optional[str]) -> str:
    allowed = PROMOTION_PAIRS[source_env]
    if explicit:
        if explicit not in allowed:
            err(f"--target-env {explicit!r} is not valid from {source_env} (allowed: {', '.join(allowed)})")
            raise typer.Exit(code=2)
        info(f"target: {explicit}")
        return explicit
    if len(allowed) == 1:
        info(f"target: {allowed[0]} (only valid target from {source_env})")
        return allowed[0]
    selection = questionary.select(
        f"Promote TO which environment (from {source_env})?",
        choices=list(allowed),
    ).ask()
    if selection is None:
        warn("cancelled.")
        raise typer.Exit(code=1)
    return selection


def render_state_table(source_env: str, source_snap: dict, target_env: str, target_snap: dict) -> Table:
    table = Table(show_header=True, header_style="dim")
    table.add_column("Env", style="bold")
    table.add_column("Version")
    table.add_column("Git SHA", no_wrap=True)
    table.add_column("Artifact key")
    for env_name, snap in ((source_env, source_snap), (target_env, target_snap)):
        table.add_row(
            env_name,
            f"v{snap['version']}",
            snap["gitSha"][:12],
            snap["artifactKey"],
        )
    return table


def candidate_choice_title(candidate: dict) -> str:
    snap = candidate["snapshot"]
    digest = snap["image"].split("@", 1)[-1]
    short_digest = digest[:19] if digest.startswith("sha256:") else digest[:12]
    subject = candidate["sourceSubject"]
    if len(subject) > 44:
        subject = subject[:41] + "…"
    return (
        f"v{snap['version']:<8} "
        f"{candidate['sourceDate']:<12} "
        f"{short_digest:<20} "
        f"{subject}"
    )


def choose_candidate(
    candidates: list[dict], explicit_ref: Optional[str]
) -> dict:
    if explicit_ref:
        for cand in candidates:
            ref = cand["sourceRef"]
            if ref == explicit_ref or (ref != "WORKTREE" and ref.startswith(explicit_ref)):
                info(f"candidate: {candidate_choice_title(cand)}")
                return cand
        err(f"--candidate-ref {explicit_ref!r} is not in the candidate list")
        raise typer.Exit(code=2)
    choices = [questionary.Choice(title=candidate_choice_title(c), value=c) for c in candidates]
    selection = questionary.select(
        "Which release do you want to promote?",
        choices=choices,
    ).ask()
    if selection is None:
        warn("cancelled.")
        raise typer.Exit(code=1)
    return selection


# ============================================================================
# Entry point
# ============================================================================


def main(
    source_env: Optional[str] = typer.Option(
        None,
        "--source-env",
        help="Source environment (development or staging). Prompts interactively if omitted.",
    ),
    target_env: Optional[str] = typer.Option(
        None,
        "--target-env",
        help="Target environment (staging or production). Prompts interactively if omitted.",
    ),
    candidate_ref: Optional[str] = typer.Option(
        None,
        "--candidate-ref",
        help="Specific commit SHA or 'WORKTREE' to promote non-interactively.",
    ),
    limit: int = typer.Option(
        DEFAULT_HISTORY_LIMIT,
        "--limit",
        min=1,
        help="Maximum number of git-history candidates to inspect.",
    ),
    yes: bool = typer.Option(
        False,
        "--yes",
        "-y",
        help="Skip the final 'write + open PR?' confirmation.",
    ),
    locale: Optional[str] = typer.Option(
        None,
        "--locale",
        help="UI language: en, ja, or zh-CN. Overrides config.ui.locale and $LANG.",
    ),
) -> None:
    """Promote a release from dev → stg or stg → prod. Opens a draft PR."""
    apply_locale_precedence(flag=locale, config_path=ROOT / "config" / "project-setup.json")
    console.print(Text("┌  resume-cicd-lab promotion wizard", style="bold"))
    console.print()

    # Preflight
    require_tool("git")
    require_tool("gh")
    require_gh_auth()
    require_main()
    require_clean_tree()

    # 1. Source env
    step("Source environment")
    src_env = choose_source_env(source_env)

    # 2. Target env
    step("Target environment")
    tgt_env = choose_target_env(src_env, target_env)

    # 3. Current state
    step("Current state")
    src_snap = load_release_snapshot(src_env)
    tgt_snap = load_release_snapshot(tgt_env)
    console.print(render_state_table(src_env, src_snap, tgt_env, tgt_snap))

    # 4. Candidate picker
    step("Candidate releases")
    candidates = collect_candidates(src_env, tgt_env, limit)
    if not candidates:
        console.print(
            panel(
                f"No promotable snapshots found from [b]{src_env}[/b] to "
                f"[b]{tgt_env}[/b] — target already matches the source's latest.",
                title="Nothing to promote",
                style="yellow",
            )
        )
        raise typer.Exit(code=0)
    candidate = choose_candidate(candidates, candidate_ref)
    snapshot = candidate["snapshot"]

    # 5. Diff preview
    step("Unified diff preview")
    diffs = preview_diff(tgt_env, snapshot)
    if not diffs:
        console.print(
            panel(
                f"Target manifests already encode this release — no files would change.",
                title="No-op",
                style="yellow",
            )
        )
        raise typer.Exit(code=0)
    for rel_path, diff_text in diffs:
        info(rel_path)
        console.print(Syntax(diff_text, "diff", theme="ansi_dark", word_wrap=False))

    # 6. Confirm
    version = snapshot["version"]
    branch = f"promote/{tgt_env}-web-v{version}"
    title = f"chore({tgt_env}): promote web v{version}"

    if remote_branch_exists(branch):
        console.print(
            panel(
                f"Remote branch [b]{branch}[/b] already exists. Close or merge the "
                f"existing promotion PR first, then re-run.",
                title="▲ already promoting",
                style="yellow",
            )
        )
        raise typer.Exit(code=1)

    if not yes:
        step("Confirm")
        confirmed = questionary.confirm(
            f"Write these files + open draft PR to promote v{version} to {tgt_env}?",
            default=True,
        ).ask()
        if confirmed is not True:
            warn("cancelled.")
            raise typer.Exit(code=1)

    # 7. Branch + write + commit + push
    step("Branch + manifests + commit + push")
    run(["git", "fetch", "origin", "main"], check=False, capture=False)
    run(["git", "checkout", "-b", branch, "origin/main"])
    apply_release_snapshot(snapshot, tgt_env)
    run(
        [
            "git",
            "add",
            f"deploy/static/{tgt_env}/site.json",
            f"deploy/ecs/{tgt_env}/task-definition.json",
        ]
    )
    digest = snapshot["image"].split("@", 1)[-1]
    short_digest = digest[:19] if digest.startswith("sha256:") else digest[:12]
    body = (
        f"Promote `web v{version}` ({snapshot['gitSha'][:12]}) from "
        f"**{src_env}** to **{tgt_env}**.\n\n"
        f"- artifactKey (unchanged across envs): `{snapshot['artifactKey']}`\n"
        f"- image digest (unchanged across envs): `{short_digest}…`\n\n"
        f"Merging fires the `Deploy Static Site` + `Deploy ECS Service` "
        f"workflows for `{tgt_env}`. The lab-label workflow also applies "
        f"`lab-{LAB_FOR_TARGET[tgt_env]}-complete` so the Lab "
        f"{LAB_FOR_TARGET[tgt_env]} progress badge turns green."
    )
    run(["git", "commit", "-m", title, "-m", body])
    push_result = run(["git", "push", "-u", "origin", branch], check=False, capture=False)
    if push_result.returncode != 0:
        console.print(
            panel(
                f"`git push` failed (exit {push_result.returncode}).\n\n"
                f"Common causes: no write permission on origin, network issue, "
                f"or upstream branch already exists.\n\n"
                f"The local branch [b]{branch}[/b] is in place. Retry with:\n"
                f"  [dim]git push -u origin {branch}[/dim]",
                title="push failed",
                style="red",
            )
        )
        raise typer.Exit(code=1)
    ok(f"pushed: {branch}")

    # 8. Draft PR
    step("Draft PR")
    pr_result = run(
        [
            "gh",
            "pr",
            "create",
            "--draft",
            "--base",
            "main",
            "--head",
            branch,
            "--title",
            title,
            "--body",
            body,
        ]
    )
    pr_url = pr_result.stdout.strip()

    console.print()
    ready_title = _("{env} promotion ready").format(env=tgt_env)
    console.print(
        panel(
            f"Draft PR opened: [b]{pr_url}[/b]\n\n"
            "Review the diff carefully, then flip it ready + merge:\n"
            "  [dim]gh pr ready <number>[/dim]\n"
            "  [dim]gh pr merge <number> --squash --delete-branch[/dim]\n\n"
            f"On merge, the lab-label workflow applies "
            f"[bold green]lab-{LAB_FOR_TARGET[tgt_env]}-complete[/bold green] "
            f"and the progress badge turns green.",
            title=f"◇ {ready_title}",
            style="green",
        )
    )

    run(["git", "checkout", "main"], check=False)


if __name__ == "__main__":
    typer.run(main)
