> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-00-preview.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-00-preview.md)

[← Back to README](../../README.md)

# Lab 0 — The Preview

⏱ 5 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; no AWS yet

## Why

Before you spend two hours and a few dollars, spend five minutes deciding whether this is the right use of your Saturday morning. Labs 1–10 will ask you to install CLI tools, run a wizard, and provision real AWS resources. Lab 0 asks you to do none of that — just scope the work and open a claim PR.

> vs _"jump straight in and see what happens"_ — cheap for small commitments; expensive when your commitment is "I'll spend the next two hours and ~$5 on this."

## Do

1. **Read the scope line** at the top of the [README](../../README.md). Internalize: ~2h hands-on, $1.45–$2.90/day while active, $0 after Lab 10.

2. **Skim the 11 labs table** (also in the README). For each lab row, read only the "Action" column. That's the full outline of what you're about to do.

3. **Read the [`Why this way, not that`](../../README.md#why-this-way-not-that) section** once. This is the load-bearing rationale for the whole course. If any bullet doesn't make sense now, it will by Lab 7.

4. **Open your shell.** Confirm you know how to find:
   - your AWS account ID (`aws sts get-caller-identity --query Account --output text --no-cli-pager` — if this fails, Lab 2 will fix it. The `--no-cli-pager` flag keeps AWS CLI v2 from paging the 1-line output through `less`, which would strand you at `(END)`.)
   - your GitHub handle
   - this repo's local path: `pwd` should be the repo root

5. **Open a claim PR, then merge it.** This marks "I previewed Lab 0" on your progress badge grid.
   ```
   ./scripts/claim.py lab-0
   ```
   The script creates a branch, makes an empty-change commit with a signed message, and opens a PR — it prints the PR URL and number when it finishes. Lab 0 has no CI to wait on (branch protection lands in Lab 3), so merge right away:
   ```
   gh pr merge <number> --squash --delete-branch
   ```
   ```
   git pull
   ```
   > 💡 Every lab closes with a variation of this ritual. [`concepts/pr-workflow.md`](./concepts/pr-workflow.md) is the one-page reference you can come back to — claim vs feat PRs, why each flag, why `git pull` matters.

## Verify

- You can answer, without looking back: _"What's the worst-case daily AWS cost this lab flow could run at, and what command stops it?"_
  - Answer: $2.90/day (during Lab 9). Stop: `./scripts/setup_repo.py destroy`.
- Your progress badge for Lab 0 turns ✓ after you merge the claim PR **and** run `git pull`.

## You just

Previewed the entire commitment before touching your AWS account. Now the rest of the labs are choices you made, not defaults you stumbled into.

> ☕ The rest of the course pairs well with a warm mug. By the time it cools, you'll have your first stack up.

> 💡 **First merged PR landed, README still shows the old slug locally?** `gh pr merge` is a remote operation — your local `main` is still at the pre-claim commit. Run `git pull` to sync. Read [`concepts/local-sync-after-merge.md`](./concepts/local-sync-after-merge.md) for the "why" and the three patterns real teams use to keep local and remote aligned. Do this after **every** merge in the rest of the labs.

## Up next

[Lab 1 — Safety First: AWS Budgets](./lab-01-safety-first.md)
