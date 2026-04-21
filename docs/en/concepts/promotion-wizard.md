> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/promotion-wizard.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/promotion-wizard.md)

[← Back to README](../../../README.md)

# Promotion Wizard

`scripts/promotion_wizard.py` — how a release moves between environments without rebuilding.

## What it is for

Labs 6–7 auto-promote a release from a tag into the `development` environment via the `Build Release Assets` workflow. That's one-way and automatic.

Promotion beyond dev (→ staging, → production) is **operator-driven**, not automatic. You (or the instructor) explicitly decide which release goes to which environment. The wizard is the tool that makes this decision safe, reviewable, and fast.

The design rule: **promotion must never rebuild**. The artifact and image that ran in dev are the same artifact and image that will run in staging.

## What it does

Given a source environment (e.g., `development`) and a target (e.g., `staging`), the wizard:

1. Reads `deploy/static/<source>/site.json` and `deploy/ecs/<source>/task-definition.json` — finds the currently-deployed release in the source env.
2. Inspects the `git log` of those manifest files — finds past releases that were promoted to source (so you can roll forward or back).
3. Presents a picker of candidate releases (newest first) with `version / gitSha / dates / commit subject`.
4. Shows a **unified diff** of exactly what will change in the target manifests:
   - `artifactKey` + `release.version` + `release.gitSha` in the static site.json
   - `image` + env-var fields in the ECS task-definition.json
5. On confirmation, writes the target manifests and opens a **draft PR** via `gh pr create --draft`.

You then review the draft PR, flip to ready-for-review, and merge. The `Deploy Static Site` + `Deploy ECS Service` workflows fire on merge.

## Usage

```
python3 scripts/promotion_wizard.py
```

The wizard is fully interactive — arrow keys to pick source/target, arrow keys to pick release candidate, yes/no to confirm.

For scripted / non-interactive use:

```
python3 scripts/promotion_wizard.py \
  --source-env development \
  --target-env staging \
  --candidate-ref abc1234 \
  --yes
```

`--candidate-ref` takes a commit SHA from the source env's manifest history, or the literal `WORKTREE` to promote whatever's currently in your checked-out manifests. `--yes` skips the final confirmation.

## What the candidate list looks like

```
◇  Choose a release to promote (newest first)

    ●  0.2.0  abc1234  2026-04-17  "feat: add build-info banner"
    ○  0.1.3  fed9876  2026-04-16  "fix: env.js defaults"
    ○  0.1.2  aaa0000  2026-04-15  "chore: bump release-please"
```

Only releases that have been **deployed to the source environment** (visible in the git history of its manifest files) are candidates. This prevents you from promoting something that hasn't been tested in dev.

## What the diff preview looks like

```
◇  Preview — what changes in the target manifests

    deploy/static/staging/site.json
    - "artifactKey": "web/releases/web-v0.1.2+aaa0000/site.zip"
    + "artifactKey": "web/releases/web-v0.2.0+abc1234/site.zip"
    - "release": { "version": "0.1.2", "gitSha": "aaa0000" }
    + "release": { "version": "0.2.0", "gitSha": "abc1234" }

    deploy/ecs/staging/task-definition.json
    - "image": "...resume-cicd-lab-shared-ecr-web@sha256:aaa..."
    + "image": "...resume-cicd-lab-shared-ecr-web@sha256:abc..."
    - { "name": "APP_VERSION", "value": "0.1.2" }
    + { "name": "APP_VERSION", "value": "0.2.0" }

    Same artifactKey + same image digest as dev.
    Different target bucket, different CloudFront, different ECS service.
```

The key teaching moment is the **last two lines**: you literally see that the artifact identity is unchanged, and the environment-scope fields are different. This is the "immutable artifact, swappable environment" pattern in one diff.

## What the PR looks like

Title: `chore(staging): promote web v0.2.0`

Body (auto-generated):

```markdown
Promote one immutable web release from `development` to `staging`.

Static target:
- Artifact: s3://<bucket>/web/releases/web-v0.2.0+abc1234/site.zip

ECS target:
- Image: <ecr-uri>@sha256:abc...

Release:
- Version: 0.2.0
- Source commit: abc1234

Note: same artifactKey + same image digest as `development`.
Only the target environment's bucket / CloudFront / ECS service / env vars differ.
```

## Why draft PR, not direct push

- Gives you a chance to **review the change in GitHub's PR UI** (inline comments, diff highlighting, referenceable URL).
- Separates "I want to promote" from "we actually shipped the promotion."
- The reviewer who approves the PR is the deployment gate — manifests are the environment contract.

## Preview-then-confirm (default)

The wizard always runs in preview-then-confirm mode — it shows the candidate list and the unified diff of exactly what will change in the target manifests, then asks "Write these files + open draft PR to promote v{version} to {tgt_env}?". Answering **No** cancels without writing or opening a PR; answering **Yes** commits.

To skip the final confirmation (scripted or already-reviewed flows):

```
python3 scripts/promotion_wizard.py --yes
```

## When promotion_wizard.py is NOT the right tool

- **First deploy into a newly-created environment.** The source manifests are still at bootstrap placeholder values, so there's nothing real to promote. Run a release build (Lab 5) and let the auto-promotion to dev fire; then promote from dev.
- **Rollback.** The wizard will let you pick an older release as the candidate — use it. But an actual production rollback probably wants to use `git revert` on the promotion PR instead, which keeps the git history cleaner.
- **Emergency patch that only targets one environment.** If prod has a one-off patch that dev/staging don't, you've broken the "same artifact everywhere" invariant. Either get the patch into dev first (proper) or consider whether your environments should be strictly linear.

## See also

- [`cicd-model.md`](./cicd-model.md) — the whole release flow
- [`architecture.md`](./architecture.md) — where each environment lives in AWS
- [`Lab 9 — First Promotion`](../lab-09-first-promotion.md) — hands-on use
