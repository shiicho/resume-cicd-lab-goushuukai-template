> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/cicd-model.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/cicd-model.md)

[← Back to README](../../../README.md)

# The CI/CD Model

Why this repo deploys the way it does, not the other way.

## The release flow at a glance

```
  feat: commit on main
         │
         ▼
  Release Please opens a "release PR"
         │ merge
         ▼
  Tag  web-v0.2.0  pushed
         │
         ▼
  Build Release Assets:
     ├─ site.zip       → S3 artifact bucket
     └─ container image → ECR (digest-pinned)
         │
         ▼
  Auto-opens  chore(development): promote web v0.2.0  PR
         │ merge
         ▼
  Deploy Static Site  +  Deploy ECS Service  (parallel)
         │
         ▼
  dev environment live
         │
         ▼
  promotion_wizard.py  (dev → staging)
         │
         ▼
  chore(staging): promote web v0.2.0  PR  → merge → deploys to staging
```

## Push mode vs pull mode

This repo is **push-mode**. After a merge, GitHub Actions directly calls AWS to update the environment. You see every `aws s3 sync`, every `aws ecs update-service` call in the workflow log.

**Pull mode** (Argo CD, Flux) works differently: a controller runs inside your cluster, watches a git repository, pulls manifest changes, and reconciles cluster state. Deploys are "eventually consistent" rather than step-by-step.

Why push for this lab:

- Every deploy step is **visible in a GH Actions log** — great for learning what each step does.
- **Fewer moving parts** — no controller to install, no cluster service to manage.
- **Tighter feedback loop** — deploy happens immediately on merge, not on next reconcile cycle.

Why pull would be better if this were production:

- **Drift detection** — the controller continuously reconciles; if someone hand-edits AWS, it's reverted.
- **Multi-cluster** — one git repo can drive many clusters without cross-account credentials on the CI side.
- **Rollback** — revert the git commit and the controller rolls the cluster back; no workflow rerun needed.

Either model is valid. This repo picks push because it's pedagogically superior, not because it's universally better.

Further reading: [Aviator: Pull vs Push GitOps](https://www.aviator.co/blog/choosing-between-pull-vs-push-based-gitops/)

## Release Please: semantic versioning by commit message

[Release Please](https://github.com/googleapis/release-please) reads conventional commits on `main` and maintains a "release PR" that bumps the version + CHANGELOG.

| Commit type | Version bump |
|---|---|
| `feat:` or `feat(scope):` | minor (0.1.0 → 0.2.0) |
| `fix:` or `fix(scope):` | patch (0.1.0 → 0.1.1) |
| `feat!:` or `BREAKING CHANGE:` in body | major (0.1.0 → 1.0.0) |
| `chore:`, `docs:`, `refactor:` | no bump |

The repo is configured in [`release-please-config.json`](../../release-please-config.json) and the manifest in [`.release-please-manifest.json`](../../.release-please-manifest.json). Tags are prefixed `web-v` so this repo could add other release-tracked packages later without tag collision.

## The "build once, deploy many" principle

Lab 6 produces two artifacts from one release:

- **S3 zip** — immutable, keyed by `web/releases/<tag>+<sha>/site.zip`
- **ECR image** — immutable, addressable by `sha256:...` digest

Every environment references these exact artifacts. Dev, staging, and (eventually) prod all point to the same zip + same digest after promotion. Rebuilding per environment is an anti-pattern — every rebuild is a chance for environmental drift (different node version, different timestamp, different lockfile resolution).

## Manifest-driven deploy

The `deploy/` directory is the **environment contract**. Each `site.json` and `task-definition.json` names which artifact should be running in that environment.

- Change a manifest = change what's deployed.
- Change comes via a reviewable PR.
- Deploy workflow watches the path and fires on merge.
- History of manifest changes IS the history of deploys.

This is **GitOps-lite**: state in git, pushed to the cloud on merge. Pull-mode GitOps would have a controller actively reconciling cluster state against these manifests; this repo skips that layer to keep things visible.

## Promotion = copying a manifest

Promoting a release from dev to staging does not rebuild. It copies the `artifactKey` and `image` fields from `deploy/static/development/site.json` into `deploy/static/staging/site.json`. Same for the ECS task-definition.

The `promotion_wizard.py` automates this copy + opens a draft PR. See [`promotion-wizard.md`](./promotion-wizard.md) for the details.

## Why no long-lived AWS keys

GitHub Actions authenticates to AWS via **OIDC federation**:

1. Workflow starts; GitHub issues an OIDC token for the specific job.
2. Workflow calls `aws-actions/configure-aws-credentials@v4` with a role ARN.
3. AWS STS verifies the OIDC token against the trust policy on that role (which restricts to this repo).
4. STS issues temporary AWS credentials (expire in ~1 hour).
5. Workflow calls AWS APIs with those credentials.

Compared to storing an `AWS_ACCESS_KEY_ID` as a GitHub secret:

- **No rotation** — tokens are per-job, expire in ~1 hour.
- **No leakage risk** — a leaked token is useless 1 hour later.
- **Scoped to repo** — the IAM role trust policy restricts which repo (and optionally which branch) can assume it.

Further reading: [GitHub: Security hardening with OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## See also

- [`architecture.md`](./architecture.md) — the full infra topology
- [`promotion-wizard.md`](./promotion-wizard.md) — details on the promotion flow
- [`infrastructure.md`](./infrastructure.md) — stack-by-stack inventory
- [`scripts/watch-pipeline.sh`](../../scripts/watch-pipeline.sh) — `./scripts/watch-pipeline.sh` (or `--once` for a single snapshot) joins the pieces above — per-env release state, shared artifacts, open PRs, recent workflow runs — into one auto-refreshing "release travel" view. Handy during Labs 7 and 9 when deploys are in flight across two workflows.
