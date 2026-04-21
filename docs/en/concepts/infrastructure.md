> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/infrastructure.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/infrastructure.md)

[← Back to README](../../../README.md)

# Infrastructure

Stack-by-stack inventory of the CloudFormation templates in [`infra/cloudformation/`](../../infra/cloudformation/).

## The 4 stack types

| Template | Stack name | Count | Purpose |
|---|---|---|---|
| `bootstrap-shared.yaml` | `resume-cicd-lab-shared-oidc` | 1 | GitHub OIDC provider + scoped roles for release/static-deploy/ecs-deploy |
| `shared-delivery.yaml` | `resume-cicd-lab-shared-delivery` | 1 | S3 artifact bucket + ECR repo |
| `static-site.yaml` | `resume-cicd-lab-<env>-static-site` | 1 per env | Private S3 bucket + CloudFront distribution |
| `ecs-app.yaml` | `resume-cicd-lab-<env>-ecs-app` | 1 per env | VPC + ALB + ECS Fargate cluster/service |

## `shared-oidc` — the trust boundary

**Created once, reused across every environment.**

Resources:

- **OpenID Connect Provider** — registers `https://token.actions.githubusercontent.com` as a trust source (or reuses an existing provider if `aws.existingGitHubOidcProviderArn` is set in `config/project-setup.json`).
- **Three scoped IAM roles**:
  - `<prefix>-release-role` — trust: only the GitHub repo + only when the `ref` matches `refs/tags/web-v*`. Permissions: S3 PutObject on the artifact bucket, ECR PushImage on the web repo.
  - `<prefix>-static-deploy` — trust: only the GitHub repo + only when ref is `main`. Permissions: S3 Sync on each per-env site bucket, CloudFront invalidation on each distribution.
  - `<prefix>-ecs-deploy` — trust: same as above. Permissions: ECS RegisterTaskDefinition + UpdateService + PassRole on task roles.

Why three roles, not one: least-privilege. A leaked `release-role` can publish artifacts but can't trigger deploys. A leaked `static-deploy` can't push new images to ECR. The blast radius of any single leak is small.

## `shared-delivery` — the artifact plane

**Created once, reused across every environment.**

Resources:

- **S3 artifact bucket** (`<project>-shared-s3-artifact-<identifier>-<account>`) — stores `web/releases/<tag>+<sha>/site.zip`. Lifecycle: transition to Glacier after 30 days; expiration at 180 days.
- **ECR repository** (`<project>-shared-ecr-web-<identifier>`) — stores the container image. Image scanning enabled. Lifecycle: keep last 20 tagged images; delete untagged after 7 days.

Single shared plane is deliberate — the artifact IS the same artifact across all environments. Per-env artifact storage would violate the "build once" principle.

## `<env>-static-site` — the S3 + CloudFront target

**One per environment.**

Resources:

- **Private S3 site bucket** (`<project>-<env>-s3-site-<identifier>-<account>`) — public access fully blocked. Content served only via CloudFront.
- **CloudFront Origin Access Control** — authorizes CloudFront to read the private bucket.
- **CloudFront distribution** — price class `PriceClass_200` (US+EU+Asia edges; enough for global latency without paying for rarely-used edges). TTLs tuned for SPA (HTML short, assets long).
- **CloudFront function** — handles SPA routing (rewrites non-asset paths to `/index.html`).

The deploy flow: `Deploy Static Site` workflow downloads `site.zip` from the artifact bucket, unzips, `aws s3 sync --delete` to the site bucket, `aws cloudfront create-invalidation --paths '/*'`.

## `<env>-ecs-app` — the ECS + Fargate target

**One per environment.**

Resources:

- **VPC** with CIDR per `config/project-setup.json` (`10.40.0.0/16` for dev, `10.50.0.0/16` for staging, `10.60.0.0/16` for prod).
- **2 public subnets** across 2 AZs. No private subnets, no NAT Gateway — that's intentional cost control (NAT is $32/month idle). ECS pulls the image from ECR via VPC endpoints.
- **Internet Gateway** + route table.
- **ALB** (Application Load Balancer) with HTTP:80 listener → target group (HTTP:8080).
- **ECS Fargate cluster** + **service** + **task definition**.
- **IAM roles**:
  - Task execution role — ECR pull, CloudWatch Logs write.
  - Task role — empty (for your app's runtime access to AWS services; nothing needed yet).
- **CloudWatch log group** (`/aws/ecs/<project>-<env>-logs-web-<identifier>`).

The deploy flow: `Deploy ECS Service` workflow reads the updated `deploy/ecs/<env>/task-definition.json`, runs `aws ecs register-task-definition`, then `aws ecs update-service --force-new-deployment --wait-for-service-stable`.

## Structured naming

Every AWS resource follows: `{resourceProjectName}-{environment}-{aws-resource-code}-{identifier}`.

Examples:

- `resume-shared-ecr-web-<identifier>` — shared ECR repo
- `resume-dev-ecs-service-<identifier>` — dev ECS service
- `resume-dev-s3-site-<identifier>-<account>` — dev site bucket (account ID appended for S3 global uniqueness)

Environment codes are abbreviated: `dev` / `stg` / `prd`. Shared resources use `shared`.

Two config fields control the naming:

- `aws.stackPrefix` — base for CloudFormation stack names (e.g., `resume-cicd-lab`)
- `aws.resourceProjectName` / `resourceIdentifier` / `resourceShortIdentifier` — parts of the resource naming pattern

The "short identifier" exists because some AWS resource names have short length limits (ALB names ≤ 32 chars, target group names ≤ 32 chars). For those, the short form is used instead.

## Adding production

The lab flow stops at staging (Lab 9). If you want to try production:

1. **Check the production VPC CIDR** (default `10.60.0.0/16`, defined in `config/project-setup.json` under `environments.production.vpcCidr`) doesn't collide with anything else in your AWS account. All three environments are defined as templates; scope is chosen at runtime.

2. **Apply with production included:**
   ```
   python3 scripts/setup_repo.py apply --scope development,staging,production
   ```
   This adds `resume-cicd-lab-prd-static-site` and `resume-cicd-lab-prd-ecs-app`. Cost rises to ~$4.35/day (dev + staging + prod).

3. Promote:
   ```
   python3 scripts/promotion_wizard.py
   # source: staging  target: production
   ```

4. **Clean up soon.** Prod is $1.45/day more than the lab flow budgeted for. Destroy when you're done experimenting.

## Why CloudFormation, not Terraform

- **One fewer toolchain** in the teaching loop. Terraform requires state management, provider config, lock files — learning that alongside CI/CD dilutes focus.
- **Stack deletion is atomic.** CloudFormation `delete-stack` is guaranteed by the service to clean up its resources. Terraform state can get out of sync with reality.
- **The templates are readable.** CloudFormation YAML is verbose but straightforward — no HCL quirks, no module resolution.

Trade-offs: CloudFormation is slower to deploy, has worse syntax ergonomics, and drift detection is weaker. For a production platform, Terraform is usually the better pick. For this lab, CloudFormation is the simpler pick.

## See also

- [`architecture.md`](./architecture.md) — the high-level topology
- [`cicd-model.md`](./cicd-model.md) — how the stacks connect to the release flow
- [`github-setup.md`](./github-setup.md) — the GitHub side of the OIDC trust
