> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/github-setup.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/github-setup.md)

[← Back to README](../../../README.md)

# GitHub Setup

What `setup_repo.py` configures automatically — and the manual checklist if you need to reproduce it by hand.

## What the wizard configures

When you run `python3 scripts/setup_repo.py` (Lab 3), if `gh` is available and authenticated, it configures:

| Area | Setting | Value |
|---|---|---|
| Repo metadata | Name, description | From `config/project-setup.json` |
| Merge policy | Squash merge | only allowed mode |
| Merge policy | Delete branch on merge | enabled |
| Workflow perms | `GITHUB_TOKEN` permissions | contents + pull-requests (read-write) |
| Review auto-approval | Bot reviews | enabled (for Release Please + promotion PRs) |
| Branch protection | Required checks | `Validate / summary` |
| Branch protection | Require PR review | 1 approval |
| Branch protection | Dismiss stale reviews | on |
| Actions variables | `AWS_REGION` | From config |
| Actions variables | `AWS_RELEASE_ROLE_ARN` | From OIDC stack outputs |
| Actions variables | `AWS_STATIC_DEPLOY_ROLE_ARN` | From OIDC stack outputs |
| Actions variables | `AWS_ECS_DEPLOY_ROLE_ARN` | From OIDC stack outputs |

## Manual checklist (if `gh` is unavailable or you want to reproduce by hand)

### 1. Create the repo (if it doesn't exist)

```
gh repo create <owner>/<repo> --public --source=. --push
```

Or in the browser: New repository → match name from `config/project-setup.json` → Public → create.

> Default is `--public` because shields.io-rendered progress badges only work against public repos. Swap for `--private` if you accept badges always reading `0`; OIDC trust is scoped to the repo slug and does not change with visibility.

### 2. Merge policy

In GitHub → Settings → General → **Pull Requests**:

- ☐ Allow merge commits
- ☐ Allow rebase merging
- ☑ Allow squash merging
- ☑ Automatically delete head branches

### 3. Workflow permissions

In GitHub → Settings → Actions → General → **Workflow permissions**:

- ◉ Read and write permissions
- ☑ Allow GitHub Actions to create and approve pull requests

### 4. Branch protection on `main`

In GitHub → Settings → Branches → **Add branch ruleset**:

- Target: `main`
- ☑ Require a pull request before merging
  - ☑ Require approvals (1)
  - ☑ Dismiss stale pull request approvals
- ☑ Require status checks to pass before merging
  - Add: `Validate / summary`
- ☑ Require branches to be up to date before merging (optional but recommended)

### 5. Actions variables (not secrets)

In GitHub → Settings → Secrets and variables → Actions → **Variables** tab:

| Name | Source | Example |
|---|---|---|
| `AWS_REGION` | `config/project-setup.json` | `ap-northeast-1` |
| `AWS_RELEASE_ROLE_ARN` | CloudFormation stack output | `arn:aws:iam::123...:role/resume-cicd-lab-release-role` |
| `AWS_STATIC_DEPLOY_ROLE_ARN` | CloudFormation stack output | `arn:aws:iam::123...:role/resume-cicd-lab-static-deploy` |
| `AWS_ECS_DEPLOY_ROLE_ARN` | CloudFormation stack output | `arn:aws:iam::123...:role/resume-cicd-lab-ecs-deploy` |

These are **variables**, not secrets. The role ARNs are not sensitive — the trust policy on the role restricts which GitHub repo can assume it, so the ARN alone is useless to an attacker.

### 6. Verify

Push a trivial branch and open a PR. You should see:

- `Validate / summary` check listed as required
- The merge button disabled until the check passes
- Squash merge as the only green merge option
- After merge, the branch is automatically deleted

## Branch strategy

- **`main` is the only long-lived branch.** Production and local never diverge.
- **Feature branches are short-lived** (`feat/*`, `fix/*`, `docs/*`, `chore/*`). Open a PR, get a green check, squash-merge.
- **No `dev`, `stg`, `prd` branches.** Environment state lives in `deploy/`, not in branch names. This is why promotion is a file change in a PR, not a merge across environment branches.
- **Release Please manages a persistent "release PR".** It's automatically updated when you merge conventional commits; merge it when you want to cut a release.

## Workflow files overview

| Workflow | When | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | PR + push to main | Path-based validation lanes |
| `.github/workflows/release-please.yml` | push to main | Open/update release PR |
| `.github/workflows/release-assets.yml` | `web-v*` tag + workflow_dispatch | Build artifacts + auto-promote dev |
| `.github/workflows/deploy-static.yml` | push to main touching `deploy/static/**` | S3 sync + CloudFront invalidation |
| `.github/workflows/deploy-ecs.yml` | push to main touching `deploy/ecs/**` | Register task-def + update service |
| `.github/workflows/lab-label.yml` | PR merged | Apply `lab-N-complete` label on matching PRs |

## What NOT to add

- **Long-lived AWS access keys** as secrets. The whole point of the OIDC setup is to avoid this.
- **A `deploy-production` workflow that doesn't go through a promotion PR.** Promotion is the reviewable gate; workflows should only fire on merged manifest changes.
- **A separate CI tool (Circle / Buildkite / etc.).** Everything in this lab is intentionally single-platform (GitHub Actions) so the learner's mental model stays simple.

## See also

- [`architecture.md`](./architecture.md) — where the OIDC trust lives in AWS
- [`cicd-model.md`](./cicd-model.md) — why push-mode CD
- [`infrastructure.md`](./infrastructure.md) — what each CloudFormation stack contains
