> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/aws.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/aws.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# aws — AWS CLI v2

AWS's official command-line client. Every AWS service — S3, EC2, CloudFormation, ECR, IAM, Service Quotas — is reachable through `aws <service> <verb>`. You installed v2 in Lab 2 (`aws --version` shows `2.x.y`).

## Why it's here

This course provisions real AWS resources. You'll use `aws` for three jobs:
1. **Identity / sanity checks** — "who am I?", "is this the right account / region?"
2. **Read-only inspection** — list CloudFormation stacks, S3 artifacts, ECR images, VPC/IGW counts
3. **Quota management** — request a VPC / IGW quota bump before Lab 9

CloudFormation stack creation itself is driven by `setup_repo.py` (which shells out to `aws cloudformation deploy`) — you don't need to hand-write those calls.

## Commands these labs use

| Command | What it does | Seen in |
|---|---|---|
| `aws sts get-caller-identity` | Who am I / which account? | Lab 0 sanity check |
| `aws cloudformation list-stacks --query ...` | List stacks by status | Lab 3 Verify, Lab 10 Verify |
| `aws cloudformation describe-stacks --stack-name ...` | Get stack outputs (e.g., ALB DNS) | Lab 7 |
| `aws s3 ls s3://<bucket>/<path>/` | List S3 objects under a prefix | Lab 6 |
| `aws ecr describe-images --repository-name ... --query ...` | List images + digests in ECR | Lab 6 |
| `aws ec2 describe-vpcs --query 'length(Vpcs)'` | Count VPCs in the region | Lab 9 |
| `aws ec2 describe-internet-gateways --query ...` | Count IGWs | Lab 9 |
| `aws service-quotas request-service-quota-increase` | Request a quota bump | Lab 9 |
| `aws service-quotas list-requested-service-quota-change-history-by-quota` | Track quota-request status | Lab 9 |

## Production truths this lab teaches

- **`--query` + `--output text` beats grep on JSON.** `--query` uses JMESPath — a query language for JSON. Same tool, same syntax, across every AWS service. See Lab 3 / 6 / 7 for examples.
- **`--no-cli-pager`** must be inline on every command or you'll hit the `(END)` trap. Permanent fix: `export AWS_PAGER=""` in your shell rc.
- **Service quotas are real.** AWS defaults are conservative (5 VPCs / 5 IGWs per region). On a shared account this can catch you; request increases proactively in Lab 9 — the command pattern is a career skill.
- **`aws sts get-caller-identity`** is the first thing you run when things look weird. "Oh, I'm in the wrong account" has saved many hours.

## VPC + IGW quota preflight (Lab 9's foot-gun)

AWS defaults to **5 VPCs and 5 Internet Gateways per region**. Lab 9's staging `ecs-app` stack adds +1 of each — if your region is already at 4, staging will fail mid-apply with `ServiceLimitExceeded`. Check your headroom first, and raise the quota if you need to.

Count what you have in the region Lab 3 picked (swap `ap-northeast-1` for your region):

```
aws ec2 describe-vpcs --region ap-northeast-1 --query 'length(Vpcs)' --no-cli-pager
```

```
aws ec2 describe-internet-gateways --region ap-northeast-1 --query 'length(InternetGateways)' --no-cli-pager
```

If either returns `4` or more, request a bump to `10`. AWS auto-approves these small increases within minutes.

VPC quota:

```
aws service-quotas request-service-quota-increase --service-code vpc \
  --quota-code L-F678F1CE --desired-value 10 --region ap-northeast-1
```

Internet Gateway quota:

```
aws service-quotas request-service-quota-increase --service-code vpc \
  --quota-code L-A4707A72 --desired-value 10 --region ap-northeast-1
```

Watch a pending request:

```
aws service-quotas list-requested-service-quota-change-history-by-quota \
  --service-code vpc --quota-code L-F678F1CE --region ap-northeast-1 --no-cli-pager
```

The quota-code values (`L-F678F1CE` = VPCs, `L-A4707A72` = IGWs) are region-agnostic AWS identifiers — same values work in every region.

## Profiles, if you use them

If you juggle multiple AWS accounts, configure named profiles (`aws configure --profile <name>`) and invoke with `--profile <name>` on each command, or `export AWS_PROFILE=<name>` in your shell. This lab assumes a default single-profile setup — if yours is different, add `--profile <name>` to every command below.

## Transferable skill highlight

Every mid-sized SaaS has AWS CLI v2 in its toolbox. The combo of `--query` (JMESPath) + `--output text` + careful `--region` scoping is how you write ops scripts that are predictable, idempotent, and CI-friendly.

**Resume angle**: "AWS operational tooling" or "infrastructure automation" — specifically the ability to script multi-service read/write flows (CloudFormation + IAM + ECR + S3) without a browser.

## See also

- [`jq.md`](./jq.md) — AWS's `--query` is JSON-in, JSON-out; `jq` finishes the pipe
- [`concepts/infrastructure.md`](../concepts/infrastructure.md) — what each CloudFormation stack contains
- [`concepts/architecture.md`](../concepts/architecture.md) — the AWS-side topology
- [AWS CLI v2 reference](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/index.html) — full service list
