> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/gh.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/gh.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# gh — GitHub CLI

`gh` is GitHub's official command-line client. Anything you'd click in the GitHub web UI, `gh` can do from your terminal — often faster and always scriptable.

## Why it's here

Every PR in this course is opened, watched, and merged through `gh`. You never switch to the browser to click "Merge". That saves 10–30 seconds per merge × ~20 merges — and it's the pattern you'll reuse forever when you write CI/CD scripts that query PR state, list recent runs, or trigger workflow dispatches.

## Commands these labs use

| Command | What it does | Seen in |
|---|---|---|
| `gh auth login` | One-time device-flow login | README Before-you-start |
| `gh repo create <slug> --template <tpl> --public --clone` | Clone from a GitHub template | README |
| `gh pr create --fill` | Open PR using branch + last commit | Labs 1, 2, 4, 5, 8, 9 |
| `gh pr merge <number> --squash --delete-branch` | Merge + delete branch | Every lab after CI green |
| `gh pr ready <number>` | Flip a draft PR to ready-for-review | Lab 9 |
| `gh pr list --state open --json ...` | List PRs with JSON fields | Labs 5, 7 |
| `gh pr view --json title` | Get the current PR's title | Lab 5 (title-verify callout) |
| `gh pr checks <number>` | Show CI check status for a PR | Lab 4 Verify |
| `gh run watch` | Live-tail the currently-running workflow | Labs 4, 6 |
| `gh run list --limit N` | List recent workflow runs | Labs 6, 7 |
| `gh workflow run <file>.yml --ref <tag>` | Manually dispatch a workflow | Lab 6 (fallback) |
| `gh variable list` | List repo-level Actions Variables | Lab 3 Verify |
| `gh repo view --json nameWithOwner --jq .nameWithOwner` | Get current repo's `owner/name` slug | Lab 3 (audit) |
| `gh api <path>` | Generic GitHub REST API call | Used internally by `setup_repo.py` |

## Production truths this lab teaches

- **OIDC + `gh` + AWS CLI is the no-secret trio.** `gh` manages the GitHub side (Actions Variables, repo settings, branch protection); AWS CLI creates the IAM roles. No long-lived keys anywhere.
- **`--json` + `jq` is the scripting pattern.** `gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore("))'` gives machine-readable output that's safe to pipe. Far better than screen-scraping text.
- **Pager trap.** Many `gh` commands page by default even on short output — drop to `(END)`, `q` exits. Inline `GH_PAGER=cat gh ...` avoids it; `gh config set pager cat` persists across shells.

## Transferable skill highlight

The `gh` + `--json` + `jq` pattern is transferable to every modern CLI that supports structured output: AWS CLI (`--output json`), kubectl (`-o json`), Terraform (`-json`), Helm, and any custom internal tool worth its salt. Once you've built this muscle, you can script against any of them.

**Resume angle**: worth calling out in a "CI/CD automation" or "DevOps tooling" line — specifically the ability to script PR lifecycle + workflow dispatch without a PAT (using repo-scoped `GITHUB_TOKEN`).

## See also

- [`git.md`](./git.md) — the companion tool
- [`aws.md`](./aws.md) — the IAM role `gh` lets GitHub Actions assume
- [`jq.md`](./jq.md) — the JSON tool that makes `gh --json` actually useful
- [`concepts/github-setup.md`](../concepts/github-setup.md) — branch protection + merge policy
- [GitHub CLI manual](https://cli.github.com/manual/) — full command reference
