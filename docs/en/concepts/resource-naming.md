> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/concepts/resource-naming.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/resource-naming.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Concept deep-dives](./README.md)

# Resource naming — the pattern behind every name you'll see

Lab 3 asks you to pick `aws.resourceIdentifier` and `aws.region`, and nothing else. This page explains why those are the only knobs, where your chosen slug ends up, and how the templates sidestep S3's global-uniqueness gotcha — useful after the fact if you ever wonder where a specific name came from.

## The naming pattern

Every AWS resource CloudFormation creates in this lab comes out of one template:

```
{resourceProjectName}-{envCode}-{kind}-{resourceIdentifier}[-{accountId}]
```

- `resourceProjectName` — default `resume`. Shared across environments.
- `envCode` — `shared`, `dev`, `stg`, `prod` depending on which stack.
- `kind` — what the resource is (`s3-site`, `ecr-web`, `iam-gh-release`, `cf-oac`, etc).
- `resourceIdentifier` — the slug **you pick** in Lab 3. Disambiguator inside your own account.
- `accountId` — appended to S3 bucket names only. Your 12-digit AWS account ID. Makes every bucket globally unique without effort on your part.

## Example outputs

With `resourceIdentifier: my-cicd-lab` and defaults everywhere else:

| Resource | Name | Why the suffix |
|---|---|---|
| S3 site bucket | `resume-dev-s3-site-my-cicd-lab-123456789012` | `-<accountId>` for global uniqueness |
| ECR repo | `resume-shared-ecr-web-my-cicd-lab` | account-scoped |
| IAM role | `resume-shared-iam-gh-release-my-cicd-lab` | account-scoped |
| CloudFront OAC | `resume-dev-cf-oac-my-cicd-lab` | account-scoped |

## S3 is globally unique — across every AWS account on Earth

Not "unique inside your account." If another account anywhere on the planet already owns `my-bucket`, your `CreateBucket` call fails with `BucketAlreadyExists`. That's why the templates always append `-${AWS::AccountId}` to S3 bucket names — your 12-digit account ID alone is enough to guarantee global uniqueness, without you having to invent a clever slug.

Non-S3 resources (ECR, IAM, CloudFront OAC, ALB) only need to be unique **within your AWS account + region**. Two lab copies in the same account need two different `resourceIdentifier` slugs; anything cross-account is already safe.

## Stack names come from a different field

`aws.stackPrefix` (default `resume-cicd-lab`) forms CloudFormation **stack names** (`resume-cicd-lab-shared-oidc`, `resume-cicd-lab-dev-ecs-app`, etc). It does NOT appear inside resource names. You can see the difference in the Verify bullet list of Lab 3: stack names start with `resume-cicd-lab-`; bucket/role/ECR names start with `resume-`.

Don't edit `stackPrefix` — the Verify bullets and the destroy wizard both key off the default.

## Why `aws.resourceShortIdentifier` exists

ALBs and target groups cap at 32 characters. A 20-char `resourceIdentifier` blows that limit immediately. The templates substitute `resourceShortIdentifier` (default `cl`, ≤5 chars) for those two resource types. You only need to set it if you're running two lab copies on the same AWS account + region — otherwise `cl` is fine forever.

## See also

- [`concepts/infrastructure.md`](./infrastructure.md) — the full CloudFormation stack layout
- [`config/project-setup.json`](../../../config/project-setup.json) — where these fields live
- [Lab 3 — Wire the Lab](../lab-03-wire-the-lab.md) — where you pick the values
