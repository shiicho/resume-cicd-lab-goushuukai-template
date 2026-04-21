> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/bot-loop-workaround.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/bot-loop-workaround.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Concept deep-dives](./README.md)

# Bot-loop workaround: close + reopen

You hit this in Lab 5 (the Release PR) and again in Lab 7 (the Promotion PR) — `summary` never turns green, `--auto` refuses to merge, and nothing is actually wrong with the code. This page explains the rule, the one-time fix, and the permanent fix.

## The rule

Workflows triggered using the built-in `GITHUB_TOKEN` do NOT fire downstream workflows. It's a safety feature, documented at [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow).

In this repo:
- Release Please opens its PR as `github-actions[bot]` → the `Validate` workflow's `pull_request` trigger doesn't fire → required `summary` check never appears → branch protection won't let you merge.
- `release-assets.yml` opens the promotion PR the same way → same stall.

## The one-time fix

Close the PR and immediately reopen it. GitHub treats `pull_request.reopened` as a user action, so workflows run normally:

```
gh pr close <number>
```

```
gh pr reopen <number>
```

After that, `gh pr merge <number> --auto --squash --delete-branch` merges the moment `summary` goes green. You do this dance once per Release PR and once per Promotion PR — that's the whole cost.

## The permanent fix — Lab 11 bonus

Create a GitHub App, mint installation tokens in the two offending workflows, have them open PRs as the App instead of as `GITHUB_TOKEN`. Workflows triggered by App-owned events are treated as user actions and bypass this rule entirely.

[Lab 11 — Ship the Loop (GitHub App)](../lab-11-bonus-github-app.md) walks the full setup in ~15 minutes: create the App, install it on your repo, store credentials, patch the two workflows. One-time install, permanent fix.

## Why the rule exists

Without it, a workflow could open a PR that triggers a workflow that opens a PR — runaway recursion. GitHub's rule kills that at the source. The cost: two-click theatre until you wire up the App.

## See also

- [release-please-action issue #922](https://github.com/googleapis/release-please-action/issues/922) — the original trap report, complete with the workaround and alternative auth strategies.
- [Lab 5 — First Release Tag](../lab-05-first-release-tag.md) — where this first bites.
- [Lab 7 — First Deploy](../lab-07-first-deploy.md) — where it bites again.
- [Lab 11 — Ship the Loop (GitHub App)](../lab-11-bonus-github-app.md) — the industry-standard fix.
