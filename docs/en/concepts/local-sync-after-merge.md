> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/local-sync-after-merge.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/local-sync-after-merge.md)

[← Back to README](../../../README.md)

# Local sync after merge — why `git pull` matters

You just ran `gh pr merge <n> --squash --delete-branch`, saw `✓ Squashed and merged`, and assumed your local `main` was now caught up.

It isn't. Open `README.md` locally and nothing you pushed is there. This page explains why, what to do, and the production convention for keeping local and remote aligned.

---

## Why your local `main` is behind

`gh pr merge` runs on **GitHub's server**. It takes your branch, creates a **new squash commit** on `origin/main`, and deletes the branch. Your laptop finds out about none of this until you ask.

```
Before merge:
  feat/claim-lab-0 (local) ──push──▶ origin/claim/lab-0
                                          │
                                          └──── PR opened on GitHub ────────┐
                                                                             │
  main (local)  ═══════════════════▶ origin/main                             │
                 same commit                                                  │
                                                                             │
After `gh pr merge 1 --squash --delete-branch`:                              │
                                                                             ▼
  origin/main  ═══════════════════▶ [NEW squash commit]  ◀── merge happened server-side
                                          (SHA X — your retarget + whatever else was in the PR)
  main (local)  ═══════════════════▶ [same old commit]
                                          (SHA Y — still at pre-merge state)
  origin/claim/lab-0 ───────────gone───────┘
  feat/claim-lab-0 (local) ─────gone─── (--delete-branch nukes local and remote)
```

Two things worth staring at:

1. **The squash commit is a *new* SHA**, not the one you pushed. `git merge-base --is-ancestor feat/claim-lab-0 origin/main` would return false even semantically the same content landed — because git identifies commits by SHA, not content.
2. **Local `main` is untouched**. `gh` intentionally does not modify your working tree or checked-out branches during a remote-only operation.

## What to run

```
git fetch origin main   # inspect: how far behind am I?
git pull                # apply: fast-forward local main to origin/main
```

Why fetch first? Because fetch is safe (it only updates remote-tracking refs like `origin/main`, never your working tree). It lets you see the drift before you sync:

```
git log --oneline HEAD..origin/main   # commits on remote you don't have yet
git log --oneline origin/main..HEAD   # commits on local not yet pushed
```

For a claim PR you just merged, the first returns 1 line (your squash commit), the second returns empty. Then `git pull` fast-forwards cleanly.

If you're a rebase-linear-history team, `git pull --rebase` instead. For this lab it doesn't matter — local has no in-flight commits post-merge.

## Why doesn't `gh pr merge` auto-pull?

Because client state and server state are **intentionally separate** in git. Some reasons that justify the separation:

- **Your working tree may have uncommitted changes.** An auto-pull after every merge could drop you into a merge conflict at the worst moment. Explicit `git pull` lets you choose when.
- **You may be on a different branch locally.** `gh pr merge` on a release PR while you're sitting in `feat/next-thing` shouldn't touch your local `main` without asking.
- **Tooling stays composable.** `gh` does remote ops. `git` does local ops. Gluing them together with `&&` is a user choice, not a tool assumption.

The cost of this safety: you have to remember to `git pull`. That's the deal.

## Production conventions (what real teams do)

Three near-universal patterns on any team that ships code via pull requests:

### 1. Pull before you branch

```
git checkout main
git pull --rebase origin main
git checkout -b feat/next-thing
```

Branching from a stale `main` means your PR's diff is polluted with commits you didn't write (and you'll hit conflicts at rebase time). The three-line warm-up fixes both.

### 2. Pull after merging your own PR

Exactly your scenario. `gh pr merge ...` → `git pull`. This keeps your local tip matching the squash commit on `origin/main`, so your next `git log` shows what actually shipped (not what you pushed).

### 3. `git fetch --prune` periodically

```
git fetch --prune
```

Updates every remote-tracking ref and removes ones whose remote branch is gone. Doesn't touch your working tree. Good to run whenever you return to a repo after being away for a day — your shell prompt / IDE then shows accurate "behind remote by N" indicators.

### The anti-pattern: auto-pull

Some shells auto-fetch on `cd`, and some teams alias `checkout main` to include a pull. Be careful: on a fresh `main` switch with dirty working tree, this can drop you into a merge conflict you didn't ask for. Manual `git pull` is boring but predictable.

---

## In this lab

Every time you see `✓ Squashed and merged pull request …`, run:

```
git pull
```

That's it. The claim-PR labs (0, 3, 6, 10) have the retarget / manifest / config changes that `claim.py` staged — you want those on local `main` before Lab 3's setup wizard reads them. The feat-PR labs (1, 2, 4, 5, 7, 8, 9) also benefit from the same habit, even when the content change is small.

If you forget and Lab N's command complains about missing files or stale config, that's usually the cue: `git pull`, then retry.

---

[← Back to README](../../../README.md)
