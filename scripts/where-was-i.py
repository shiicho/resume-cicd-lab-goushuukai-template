#!/usr/bin/env python3
"""where-was-i.py — "Picking up again" helper.

Prints the last completed lab + a pointer to the next lab's doc by
inspecting `lab-N-complete` labels on merged PRs (applied by the
`.github/workflows/lab-label.yml` workflow).

    ./scripts/where-was-i.py

Exits 0 on success. Requires `gh` authenticated in the current repo.
"""
from __future__ import annotations

import datetime
import json
import pathlib
import re
import shutil
import subprocess
import sys

from rich.console import Console
from rich.panel import Panel


ROOT = pathlib.Path(__file__).resolve().parents[1]

NEXT_LAB_POINTER: dict[int, tuple[str, str | None]] = {
    0: ("Lab 1 — Safety First", "docs/en/lab-01-safety-first.md"),
    1: ("Lab 2 — Tools + Dry-Run", "docs/en/lab-02-tools-and-dry-run.md"),
    2: ("Lab 3 — Wire the Lab", "docs/en/lab-03-wire-the-lab.md"),
    3: ("Lab 4 — First Green Check", "docs/en/lab-04-first-green-check.md"),
    4: ("Lab 5 — First Release Tag", "docs/en/lab-05-first-release-tag.md"),
    5: ("Lab 6 — First Artifacts", "docs/en/lab-06-first-artifacts.md"),
    6: ("Lab 7 — First Deploy", "docs/en/lab-07-first-deploy.md"),
    7: ("Lab 8 — Self-Proof Banner", "docs/en/lab-08-self-proof-banner.md"),
    8: ("Lab 9 — First Promotion", "docs/en/lab-09-first-promotion.md"),
    9: ("Lab 10 — The Teardown", "docs/en/lab-10-teardown.md"),
    10: ("Full lifecycle complete", None),
}

console = Console()


def panel(body: str, *, title: str = "", style: str = "cyan") -> Panel:
    return Panel(body, title=title or None, border_style=style, padding=(1, 2))


def err(text: str) -> None:
    console.print(f"[red]■[/red] {text}")


def run_text(args: list[str], *, check: bool = True) -> str:
    result = subprocess.run(
        args, cwd=ROOT, check=check, capture_output=True, text=True
    )
    return (result.stdout or "").strip()


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        err(f"{name} is not on your PATH.")
        sys.exit(2)


def fetch_lab_entries() -> list[tuple[int, int, str, str]]:
    """
    Return (lab_number, pr_number, pr_title, pr_merged_at) for every merged PR
    carrying a `lab-N-complete` label. 50 most recent merged PRs is plenty for
    an 11-lab course.
    """
    raw = run_text(
        [
            "gh", "pr", "list",
            "--state", "merged",
            "--limit", "50",
            "--json", "number,title,labels,mergedAt",
        ]
    )
    if not raw:
        return []
    prs = json.loads(raw)
    results: list[tuple[int, int, str, str]] = []
    for pr in prs:
        for lbl in pr.get("labels") or []:
            m = re.match(r"^lab-(\d+)-complete$", lbl.get("name", ""))
            if m:
                results.append(
                    (int(m.group(1)), pr["number"], pr["title"], pr.get("mergedAt", ""))
                )
                break
    return results


def format_ago(iso_ts: str) -> str:
    if not iso_ts:
        return "(unknown time)"
    try:
        merged = datetime.datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
    except ValueError:
        return iso_ts
    now = datetime.datetime.now(datetime.timezone.utc)
    delta = now - merged
    if delta.days >= 2:
        return f"{delta.days} days ago"
    if delta.days == 1:
        return "yesterday"
    hours = delta.seconds // 3600
    if hours >= 1:
        return f"{hours} hours ago"
    return "just now"


def main() -> int:
    require_tool("git")
    require_tool("gh")

    entries = fetch_lab_entries()
    if not entries:
        console.print(
            panel(
                "No `lab-N-complete` labels yet — you haven't started.\n\n"
                "Start at [cyan]Lab 0[/cyan]: [dim]docs/en/lab-00-preview.md[/dim]\n"
                "First command:              [dim]./scripts/claim.py lab-0[/dim]",
                title="Picking up again?",
                style="yellow",
            )
        )
        return 0

    # Highest lab number wins — trust the label, not the sequence.
    lab_n, pr_num, _pr_title, merged_at = max(entries, key=lambda e: e[0])
    ago = format_ago(merged_at)
    next_info = NEXT_LAB_POINTER.get(lab_n)

    if next_info is None or next_info[1] is None:
        console.print(
            panel(
                f"You finished [bold]Lab {lab_n}[/bold] · {ago} (PR #{pr_num})\n\n"
                "[bold green]Full lifecycle complete.[/bold green] "
                "Nothing more to do — your resume has shipped.",
                title="◇ lifecycle done",
                style="bright_green",
            )
        )
        return 0

    next_title, next_doc = next_info
    body_lines = [
        f"You finished [bold]Lab {lab_n}[/bold] · {ago} (PR #{pr_num})",
        "",
        f"Next: [cyan]{next_title}[/cyan]",
        f"      [dim]{next_doc}[/dim]",
    ]

    # Hints for labs whose next step involves an auto-opened PR or a
    # scope-expansion command the student may have forgotten.
    if lab_n == 5:
        body_lines.extend(
            [
                "",
                "Release Please should have opened a release PR:",
                "  [dim]gh pr list --search 'release-please in:head' --limit 1[/dim]",
            ]
        )
    elif lab_n == 6:
        body_lines.extend(
            [
                "",
                "The auto-opened dev promotion PR is probably waiting:",
                "  [dim]gh pr list --search 'chore(development) in:title' --limit 1[/dim]",
            ]
        )
    elif lab_n == 8:
        body_lines.extend(
            [
                "",
                "Lab 9 expands scope to staging:",
                "  [dim]python3 scripts/setup_repo.py apply --scope development,staging[/dim]",
            ]
        )

    console.print(
        panel("\n".join(body_lines), title="Picking up again?", style="cyan")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
