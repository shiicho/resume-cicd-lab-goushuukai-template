> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-04-first-green-check.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-04-first-green-check.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 3](./lab-03-wire-the-lab.md)

# Lab 4 — First Green Check

⏱ 5 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; CI alive

## Why

In five minutes you'll have your first green `summary` check — pushed from your machine, run by GitHub Actions, confirming the wiring you laid in Lab 3 actually holds. CI is the quiet half of CI/CD; you want to see it run, not just trust that it runs.

The four lanes (web, deploy, infra, automation) are defined in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). Path filters in the `detect-changes` job decide which lanes run based on what you touched.

This is also the first workflow run that exercises the OIDC trust you provisioned in Lab 3 — GitHub Actions assumes an AWS role using a short-lived token, no long-lived keys. If you want the visual of how that handshake works: [`concepts/oidc-federation.md`](./concepts/oidc-federation.md) (6 steps, 3 min).

> vs _"skip CI and just merge to main"_ — you'd be building the habit that makes production outages. Treat green checks as non-negotiable from Lab 4 forward.

## Do

1. **Create a branch, append a blank line to `app/src/main.tsx`, commit, and push:**
   ```
   git checkout -b feat/lab-4-first-green
   ```
   ```
   echo "" >> app/src/main.tsx
   ```
   ```
   git commit -am "chore: first CI touch"
   ```
   ```
   git push -u origin feat/lab-4-first-green
   ```
   (A whitespace-only change is enough — `app/**` is watched by the `web` lane.)

2. **Open a PR:**
   ```
   gh pr create --fill
   ```
   Note the PR number printed.

3. **Watch the run from your terminal** — no tab switching needed:
   ```
   gh run watch
   ```
   You'll see:
   - `detect-changes` fires first
   - only `validate-web` runs (the `app/**` path filter picks only the `web` lane; `deploy`, `infra`, and `automation` all skip)
   - `summary` job gates the whole workflow

   Typical run time: ~2–3 minutes.

4. **After green, merge the PR and sync local.** Squash-merge is the only allowed path (configured in Lab 3's wizard):
   ```
   gh pr merge --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

   > 💡 **Why `--auto`?** Branch protection requires the `summary` check to pass before merge. Without `--auto`, an early `gh pr merge` errors with `X Pull request is not mergeable: the base branch policy prohibits the merge`. With it, GitHub queues the merge and performs it the moment checks go green. Every lab from here uses the same pattern — and [`concepts/pr-workflow.md`](./concepts/pr-workflow.md) is the one-page reference for why each flag exists and why `git pull` matters after every merge.

## Verify

- `gh pr checks <number>` shows `pass` on `Validate / summary`.
- Your Lab 4 progress badge turns ✓ after merge.

## You just

Earned your first green check from a real CI pipeline you built yourself. Path-based lanes proved they only fire for relevant changes. From here on, every PR runs through this gate.

## Up next

[Lab 5 — First Release Tag](./lab-05-first-release-tag.md)
