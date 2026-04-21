> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/git.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/git.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# git — version control

The distributed version-control tool this whole lab is built on. You probably already know it; this primer is a refresher for the commands you'll meet in the 11 labs.

## Why it's here

Every lab is a `feat:` / `chore:` commit on a branch + a PR. `git` is the tool that creates the branch, records the commit, pushes to the remote, and pulls the merge back. It's also the audit log — two years from now you can `git log deploy/static/development/site.json` and see every release that landed on dev.

## Commands these labs use

| Command | What it does | Seen in |
|---|---|---|
| `git checkout -b <branch>` | Create + switch to a new branch | Labs 1, 2, 4, 5, 8, 9 |
| `git commit -am "msg"` | Stage tracked changes + commit | Labs 1, 4, 5, 8 |
| `git add <path>` | Stage a specific path | Labs 2, 8 |
| `git commit -m "msg"` | Commit (requires prior `git add`) | Labs 2, 8 |
| `git push -u origin HEAD` | Push current branch, set upstream | Lab 1 |
| `git push -u origin <branch>` | Push a specific branch | Labs 2, 4, 5, 8 |
| `git pull` | Fetch + fast-forward from remote `main` | Every lab after merge |
| `git fetch --tags` | Pull tags only | Lab 5 |
| `git diff <path>` | Show unstaged changes | Labs 1, 2, 5 |
| `git tag --list '<pattern>'` | List tags matching a glob | Lab 5 |
| `git checkout main` | Switch back to main | Lab 9 |

## Production truths this lab teaches

- **Always `git pull` after your own PR merges.** `gh pr merge` runs on GitHub's server — your local `main` doesn't move until you pull. Skip this and the next branch you create is based on stale code. See [`concepts/local-sync-after-merge.md`](../concepts/local-sync-after-merge.md).
- **Squash-merge is the branch-protection default.** Every merge collapses into one commit on `main` — cleaner history, easier revert via `git revert <sha>`.
- **Commit-message format is load-bearing.** The `type(scope): subject` convention (`feat`, `fix`, `chore`, `docs`, …) is what Release Please parses in Lab 5 to decide version bumps. `docs:` never bumps; `fix:` bumps patch; `feat:` bumps minor.

## Pager trap

`git log`, `git diff`, `git tag --list` drop output into `less` even on 1-line results. Hit `q` to exit. Inline `git --no-pager <cmd>` avoids it; `git config --global core.pager cat` persists across shells.

## If this is your first week with git

- 90% of the labs use: `branch`, `commit`, `push`, `pull`, `merge`. Master those first.
- You won't need `rebase`, `reset --hard`, or `cherry-pick` for this course.
- When in doubt: `git status` shows what's staged, modified, or untracked.

## See also

- [`concepts/local-sync-after-merge.md`](../concepts/local-sync-after-merge.md) — why `git pull` after every merge, with ASCII state diagrams
- [Pro Git book (free online)](https://git-scm.com/book) — authoritative reference
