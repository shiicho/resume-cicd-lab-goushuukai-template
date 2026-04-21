> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/pr-workflow.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/pr-workflow.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Concept deep-dives](./README.md)

# PR workflow — the merge ritual

Every lab ends in a merged pull request. Two PR shapes appear across the course, and both close the same way. Knowing this ritual once means each lab only has to tell you the parts that are unique.

## Two PR shapes

### Claim PRs — Labs 0, 3, 6, 10

`claim.py` does branching, commit, and open in one step. You only need to merge and sync.

```
./scripts/claim.py lab-N
```

Note the PR number printed, then merge and sync:

```
gh pr merge <number> --auto --squash --delete-branch
```

```
git pull
```

**Lab 0 is the one exception** — branch protection doesn't exist yet (it lands in Lab 3), so you can merge immediately without the `--auto` queue. Every claim PR after Lab 0 uses `--auto`.

### Feat / chore / fix PRs — Labs 1, 2, 4, 5, 8, 9

The standard git flow: branch → edit → commit → push → open → merge.

```
git checkout -b feat/lab-N-short-name
```

Edit + save whatever the lab asks you to edit, then:

```
git commit -am "feat(scope): terse subject"
```

```
git push -u origin HEAD
```

```
gh pr create --fill
```

Note the PR number, then merge and sync when CI is green:

```
gh pr merge <number> --auto --squash --delete-branch
```

```
git checkout main
```

```
git pull
```

## Why each flag

- **`--squash`** — collapses the PR's commits into one, which then lands on `main`. Keeps history linear and readable. Also the only shape Release Please (Lab 5) can parse — it reads the squash-commit subject line for conventional-commit type (`feat:` / `fix:` / `chore:`).
- **`--delete-branch`** — deletes the remote branch after merge. The local copy stays until you run `git branch -d feat/lab-N-*` yourself, but that's fine; `git pull` on `main` ignores it.
- **`--auto`** — tells GitHub "merge as soon as required checks go green." Without it, an early merge attempt errors with `X Pull request is not mergeable: the base branch policy prohibits the merge`. With it, you can run the command immediately after `gh pr create` and walk away.

## Why `git pull` after every merge

`gh pr merge` is a remote operation. It rewrites `origin/main`, but your local `main` still points at the pre-merge commit until you run `git pull`. Skip it and the next `claim.py` or `git checkout -b` forks from a stale base — CI will reject the resulting PR as behind.

Deeper dive: [`concepts/local-sync-after-merge.md`](./local-sync-after-merge.md) walks the three patterns real teams use to stay synced (squash-merge + pull, rebase-and-sync, and plain merge).

## Branch names the Lab Progress workflow recognizes

Your PR has to match one of these shapes for the `lab-N-complete` label (and its badge) to flip:

| Shape | Matches | Used in |
|---|---|---|
| `claim/lab-N` | `claim.py` output | Labs 0, 3, 6, 10 |
| `feat/lab-N-*` | Feature branches | Labs 1, 2, 4, 8, 9 |
| `chore/lab-N-*` / `docs/lab-N-*` / `fix/lab-N-*` | Non-feat PRs referencing a lab | Any lab |
| `release-please--*` | Release Please's release PR | Lab 5 |
| Title matches `chore(<env>): promote` | Promotion PRs | Labs 7, 9 |

Mismatch = no label, no badge. The full regex is in [`.github/workflows/lab-label.yml`](../../../.github/workflows/lab-label.yml).

## Bot-opened PRs get stuck first time

Release Please (Lab 5) and the release-assets promotion workflow (Lab 7, Lab 8, Lab 9) both open PRs via `GITHUB_TOKEN`. Those PRs don't auto-trigger CI, so `--auto` can't merge them until you unstick the check. See [`concepts/bot-loop-workaround.md`](./bot-loop-workaround.md) — it's a close + reopen one-liner per bot PR.

## See also

- [`concepts/local-sync-after-merge.md`](./local-sync-after-merge.md) — why `git pull` matters after every merge
- [`concepts/bot-loop-workaround.md`](./bot-loop-workaround.md) — why some PRs need close + reopen
- [`concepts/github-setup.md`](./github-setup.md) — the branch protection rules these flags respect
- [`tools/gh.md`](../tools/gh.md) — primer for every `gh` command referenced here
