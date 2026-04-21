#!/usr/bin/env python3
"""resume-cicd-lab progress-claim helper.

Student-facing CLI used for Labs 0, 1, 3, 6, 10 — the labs whose core
action is not naturally a pull request. Creates branch `claim/lab-N`,
commits any already-modified tracked files (or an empty commit if the
tree is clean), pushes, and opens a PR via `gh`. On merge,
`.github/workflows/lab-label.yml` applies `lab-N-complete` and the
README progress badge flips green.

The other labs (2, 4, 5, 7, 8, 9) already produce their own feature,
release, or deploy PR; claim.py is not used for those — the lab-label
workflow matches those PRs by branch or title.
"""
from __future__ import annotations

import json
import pathlib
import re
import shutil
import subprocess
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel

from wizard.first_run import apply_locale_precedence
from wizard.i18n import _, current_locale
from wizard.locale_detect import docs_dir


CLAIM_LABS: frozenset[int] = frozenset({0, 1, 3, 6, 10})

TEMPLATE_SLUG = "shiicho/resume-cicd-lab-goushuukai-template"
README_FILES = ("README.md", "README.ja.md", "README.cn-zh.md")
CONFIG_REL_PATH = "config/project-setup.json"

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / CONFIG_REL_PATH

console = Console()


# ============================================================================
# Rich helpers — same glyph vocabulary as setup_repo.py for visual continuity.
# ============================================================================


def panel(body: str, *, title: str = "", style: str = "cyan") -> Panel:
    return Panel(body, title=title or None, border_style=style, padding=(1, 2))


def step(text: str) -> None:
    console.print(f"\n[bold cyan]◆[/bold cyan] [bold]{text}[/bold]")


# ============================================================================
# Subprocess
# ============================================================================


def run(
    args: list[str],
    *,
    check: bool = True,
    capture: bool = True,
) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=ROOT, check=check, capture_output=capture, text=True)


# ============================================================================
# Preflight
# ============================================================================


def parse_lab(token: str) -> int:
    m = re.fullmatch(r"lab-(\d+)", token)
    if not m:
        console.print(
            panel(
                f"[b]{token}[/b] is not a valid lab identifier. "
                "Use [b]lab-N[/b] form — for example, [b]lab-0[/b] or [b]lab-10[/b].",
                title="Invalid argument",
                style="red",
            )
        )
        raise typer.Exit(code=2)
    n = int(m.group(1))
    if n not in CLAIM_LABS:
        allowed = ", ".join(f"lab-{i}" for i in sorted(CLAIM_LABS))
        console.print(
            panel(
                f"Lab {n} is not a claim-PR lab. The lab-label workflow already "
                "awards its badge when the relevant feature, release, or deploy "
                "PR merges — no claim PR is needed.\n\n"
                f"Claim-PR labs: [b]{allowed}[/b].",
                title="Not a claim-PR lab",
                style="yellow",
            )
        )
        raise typer.Exit(code=2)
    return n


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        console.print(
            panel(
                f"[b]{name}[/b] is not installed or not on your PATH. "
                "Install it (see Lab 2) and try again.",
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


def require_git_repo() -> None:
    result = run(["git", "rev-parse", "--is-inside-work-tree"], check=False)
    if result.returncode != 0:
        console.print(
            panel(
                _("Not inside a git repository.") + " Run claim.py from the repo root.",
                title="Wrong directory",
                style="red",
            )
        )
        raise typer.Exit(code=2)


def require_origin() -> None:
    result = run(["git", "remote"], check=False)
    if "origin" not in result.stdout.split():
        console.print(
            panel(
                "No `origin` remote configured. The claim PR cannot be pushed.",
                title="No remote",
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
                f"You're on [b]{current_branch()}[/b], not [b]main[/b]. "
                "Claims branch off main so the PR diff is scoped cleanly.\n\n"
                "Switch with [b]git checkout main[/b] and try again.",
                title="Wrong starting branch",
                style="red",
            )
        )
        raise typer.Exit(code=2)


def modified_tracked_files() -> list[str]:
    result = run(["git", "diff", "--name-only"])
    return [line for line in result.stdout.splitlines() if line.strip()]


def untracked_files() -> list[str]:
    result = run(["git", "ls-files", "--others", "--exclude-standard"])
    return [line for line in result.stdout.splitlines() if line.strip()]


def remote_branch_exists(branch: str) -> bool:
    result = run(["git", "ls-remote", "--heads", "origin", branch])
    return bool(result.stdout.strip())


def detect_origin_slug() -> str | None:
    """Return `owner/repo` for the `origin` remote, or None if unparseable."""
    result = run(["git", "remote", "get-url", "origin"], check=False)
    if result.returncode != 0:
        return None
    url = result.stdout.strip()
    # HTTPS: https://github.com/owner/repo[.git] or SSH: git@github.com:owner/repo[.git]
    m = re.search(r"[:/]([^:/\s]+)/([^/\s]+?)(?:\.git)?/?$", url)
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2)}"


def retarget_readme_badges(from_slug: str, to_slug: str) -> list[str]:
    """Replace `from_slug` with `to_slug` across all README files. Returns
    the files actually changed. No-op when nothing matches (idempotent)."""
    changed: list[str] = []
    for name in README_FILES:
        path = ROOT / name
        if not path.exists():
            continue
        original = path.read_text(encoding="utf-8")
        updated = original.replace(from_slug, to_slug)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed.append(name)
    return changed


def retarget_config_slug(from_slug: str, to_slug: str) -> bool:
    """If `config/project-setup.json`'s `github.owner/repo` pair equals
    `from_slug`, rewrite it to `to_slug`. Returns True if the file was
    modified. No-op if the file is missing, unparseable, or already
    retargeted (or manually edited to something else)."""
    path = ROOT / CONFIG_REL_PATH
    if not path.exists():
        return False
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    gh = data.get("github")
    if not isinstance(gh, dict):
        return False
    current = f"{gh.get('owner', '')}/{gh.get('repo', '')}"
    if current != from_slug:
        return False
    new_owner, new_repo = to_slug.split("/", 1)
    gh["owner"] = new_owner
    gh["repo"] = new_repo
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return True


# ============================================================================
# Command
# ============================================================================


def main(
    lab: str = typer.Argument(
        ...,
        help="Lab identifier. Claim-PR labs: lab-0, lab-1, lab-3, lab-6, lab-10.",
    ),
    locale: Optional[str] = typer.Option(
        None,
        "--locale",
        help="UI language: en, ja, or zh-CN. Overrides config.ui.locale and $LANG.",
    ),
) -> None:
    """Open a claim PR recording that you've completed a non-PR lab."""
    apply_locale_precedence(flag=locale, config_path=CONFIG_PATH)
    n = parse_lab(lab)
    require_tool("git")
    require_tool("gh")
    require_git_repo()
    require_gh_auth()
    require_origin()
    require_main()

    branch = f"claim/lab-{n}"
    if remote_branch_exists(branch):
        console.print(
            panel(
                f"Remote branch [b]{branch}[/b] already exists — you may have "
                "already opened a claim PR for this lab.\n\n"
                f"Check with: [b]gh pr list --head {branch}[/b]",
                title="Already claimed",
                style="yellow",
            )
        )
        raise typer.Exit(code=1)

    step(f"Lab {n} claim — preparing branch {branch}")

    run(["git", "fetch", "origin", "main"], check=False, capture=False)

    modified_before = modified_tracked_files()
    untracked = untracked_files()

    if untracked:
        preview = "\n".join(f"  • {p}" for p in untracked[:8])
        if len(untracked) > 8:
            preview += f"\n  … and {len(untracked) - 8} more"
        console.print(
            panel(
                "Untracked files are present — they will NOT be included in "
                f"the claim PR:\n\n{preview}",
                title="Untracked (left in place)",
                style="yellow",
            )
        )

    run(["git", "checkout", "-b", branch, "origin/main"])

    retargeted: list[str] = []
    origin_slug = detect_origin_slug()
    if n == 0 and origin_slug and origin_slug != TEMPLATE_SLUG:
        retargeted = retarget_readme_badges(TEMPLATE_SLUG, origin_slug)
        if retarget_config_slug(TEMPLATE_SLUG, origin_slug):
            retargeted.append(CONFIG_REL_PATH)
        if retargeted:
            step(
                f"Retargeted {len(retargeted)} file(s) → {origin_slug} "
                f"(README badges + config/project-setup.json's github.owner/repo — "
                f"so both your progress grid and OIDC trust policy bind to this "
                f"repo, not the packager's template)"
            )

    if modified_before or retargeted:
        run(["git", "add", "-u"])

    files_in_commit = len(set(modified_before) | set(retargeted))
    if n == 0 and retargeted:
        commit_detail = (
            f"Claiming Lab 0 complete.\n\n"
            f"Auto-retargeted slug references from `{TEMPLATE_SLUG}` to "
            f"`{origin_slug}`:\n"
            f"- README badge URLs (all 3 locales)\n"
            f"- `config/project-setup.json`'s `github.owner`/`github.repo` "
            "(load-bearing for Lab 3's OIDC trust policy)\n\n"
            f"Files updated: {', '.join(retargeted)}\n\n"
            "Merging triggers `.github/workflows/lab-label.yml`, which "
            "applies `lab-0-complete` and flips the Lab 0 progress badge."
        )
        commit_args = [
            "git",
            "commit",
            "-m",
            f"chore(lab-{n}): claim completion",
            "-m",
            commit_detail,
        ]
    elif files_in_commit > 0:
        commit_detail = (
            f"Claiming Lab {n} complete.\n\n"
            f"Included {files_in_commit} tracked-file change(s) from the "
            "working tree (typically the Lab 3 wizard's manifest + config "
            "rewrites; empty commit for Labs 1 / 6 / 10).\n\n"
            f"Merging triggers `.github/workflows/lab-label.yml`, which "
            f"applies `lab-{n}-complete` and flips the progress badge."
        )
        commit_args = [
            "git",
            "commit",
            "-m",
            f"chore(lab-{n}): claim completion",
            "-m",
            commit_detail,
        ]
    else:
        commit_detail = (
            f"Claiming Lab {n} complete. Empty commit — this lab's action "
            "was not a code change, so the PR exists solely as a progress "
            "marker.\n\n"
            f"Merging triggers `.github/workflows/lab-label.yml`, which "
            f"applies `lab-{n}-complete` and flips the progress badge."
        )
        commit_args = [
            "git",
            "commit",
            "--allow-empty",
            "-m",
            f"chore(lab-{n}): claim completion",
            "-m",
            commit_detail,
        ]

    run(commit_args)
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

    pr_body = (
        f"Claiming Lab {n} complete.\n\n"
        f"Merging this PR applies the `lab-{n}-complete` label via "
        "`.github/workflows/lab-label.yml`, which flips the Lab "
        f"{n} progress badge in the README grid.\n\n"
        "**Merge with:** `gh pr merge <number> --auto --squash --delete-branch` "
        "(squash-merge is the only mode allowed by branch protection; "
        "`--auto` queues the merge and GitHub performs it the moment the "
        "required `summary` check turns green, so you don't need to babysit CI)."
    )

    pr_result = run(
        [
            "gh",
            "pr",
            "create",
            "--title",
            f"chore(lab-{n}): claim completion",
            "--body",
            pr_body,
            "--head",
            branch,
            "--base",
            "main",
        ]
    )
    pr_url = pr_result.stdout.strip()

    console.print()
    doc_dir = docs_dir(current_locale())
    auto_merge_hint = _("Auto-merge when CI is green:")
    if n == 0:
        # Lab 0 anchor — "✦ BLUEPRINT FILED". The other five anchors live
        # elsewhere (Lab 3/10 in setup_repo.py panels, Lab 7/8 in the
        # anchor-celebration workflow). Rhythm claim labs use the panel
        # below.
        console.print(
            panel(
                f"Scope acknowledged. 2 hours. ~$5. Full lifecycle.\n\n"
                f"PR: [bold]{pr_url}[/bold]\n\n"
                f"{auto_merge_hint}\n"
                f"  [dim]gh pr merge <number> --auto --squash --delete-branch[/dim]\n"
                f"Then sync local:    [dim]git pull origin main[/dim]\n"
                f"(`--auto` waits for the required `summary` check, no babysitting.\n"
                f" Why two commands? [cyan]docs/{doc_dir}/concepts/local-sync-after-merge.md[/cyan])\n\n"
                f"Next: [cyan]Lab 1 — Safety First[/cyan]\n"
                f"      docs/{doc_dir}/lab-01-safety-first.md",
                title="[bold]✦ BLUEPRINT FILED[/bold]",
                style="bright_green",
            )
        )
    else:
        console.print(
            panel(
                f"PR opened: [b]{pr_url}[/b]\n\n"
                f"{auto_merge_hint}\n"
                "  [dim]gh pr merge <number> --auto --squash --delete-branch[/dim]\n"
                "Then sync local:\n"
                "  [dim]git pull origin main[/dim]\n"
                "(`--auto` waits for the required `summary` check, so you don't\n"
                f" need to watch CI. Why two commands? [cyan]docs/{doc_dir}/concepts/local-sync-after-merge.md[/cyan])\n\n"
                f"On merge, [bold green]lab-{n}-complete[/bold green] is applied "
                f"and your Lab {n} progress badge turns green.",
                title=_("Lab {n} claim PR opened").format(n=n),
                style="green",
            )
        )

    run(["git", "checkout", "main"], check=False)


if __name__ == "__main__":
    typer.run(main)
