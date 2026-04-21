> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-03-wire-the-lab.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-03-wire-the-lab.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 2](./lab-02-tools-and-dry-run.md)

# Lab 3 — Wire the Lab (dev only)

⏱ 25 min hands-on (+ CloudFormation wait) &nbsp;·&nbsp; 💰 **+$1.45/day starts here**

## Why

By the end of this lab your AWS account holds four real CloudFormation stacks, your first OIDC trust between GitHub and AWS, and its first $1.45/day on the clock. You'll edit two config fields, run the setup wizard, and watch CloudFormation do the heavy lifting. When this finishes, you have:

- OIDC trust between GitHub Actions and your AWS account (no long-lived keys)
- A shared artifact S3 bucket + ECR repository
- A per-environment S3+CloudFront static-site target
- A per-environment VPC + ALB + ECS Fargate runtime target

First-run scope is `development` only. The full promotion flow (dev→staging) comes in Lab 9; production is intentionally out-of-scope for these labs.

> vs _"deploy all three envs up front to save a trip"_ — you'd be paying for staging and prod idle for the next 2 hours while learning patterns you haven't seen yet. Dev-first keeps spend at $1.45/day instead of $5.40/day.

## Do

1. **Edit `config/project-setup.json`.** Open it in your editor. The `github.owner`/`github.repo` fields already point at your repo — you can verify with `grep -A2 '"github":' config/project-setup.json` if you want to see them.

   **Before you edit, see what's currently in the `aws` block:**
   ```
   jq .aws config/project-setup.json
   ```
   You'll see 6 fields. Two of them still need your choice:

   | Field | What to set | Example |
   |---|---|---|
   | `aws.resourceIdentifier` | short slug appended to AWS **resource** names (S3 / ECR / IAM / CloudFront) — lowercase + hyphens, ≤20 chars | `my-cicd-lab` |
   | `aws.region` | AWS region to deploy into | `ap-northeast-1` (default is fine) |

   After editing, the `aws` block should look like this (real JSON, nested — not the pseudo `"aws.region"` dotted form):
   ```json
   "aws": {
     "region": "ap-northeast-1",
     "stackPrefix": "resume-cicd-lab",
     "resourceProjectName": "resume",
     "resourceIdentifier": "my-cicd-lab",
     ...
   },
   ```

   **After saving, confirm your edit landed:**
   ```
   jq '{resourceIdentifier: .aws.resourceIdentifier, region: .aws.region}' config/project-setup.json
   ```
   You should see your two values (e.g., `"my-cicd-lab"` and `"ap-northeast-1"`) — no placeholder text left over.

   **Why only these two:**

   `resourceIdentifier` ends up inside every AWS resource name the wizard creates (S3 bucket, ECR repo, IAM role, CloudFront OAC, …). Pick something you'll recognize in the console. `resourceShortIdentifier` (default `cl`) is a separate shorter alias used only where AWS caps names at 32 chars — leave it alone unless two lab copies share an account + region.

   Stack names are not affected by `resourceIdentifier` — they come from `aws.stackPrefix`, which the Verify bullets below assume stays at its default. S3 bucket global uniqueness is handled for you by the templates (they append your 12-digit AWS account ID). Full breakdown: [`concepts/resource-naming.md`](./concepts/resource-naming.md).

   `aws.region` picks where every stack lands. Nothing else in the file needs editing; see [`concepts/infrastructure.md`](./concepts/infrastructure.md) for why the other defaults are sensible.

   Quick sanity check that `github.owner`/`github.repo` match your fork:
   ```
   GH_PAGER=cat gh repo view --json nameWithOwner --jq .nameWithOwner
   ```

2. **Run the setup wizard:**
   ```
   python3 scripts/setup_repo.py
   ```
   The wizard walks through 5 steps with live progress:
   - Step 1 Preflight — tool check + repo state (~5 sec)
   - Step 2 Scope — confirm `development only` (inline $/day shown per option)
   - Step 3 CloudFormation deploy — 4 stacks, ~8–12 min total (live Rich progress bar per stack)
   - Step 4 Manifest sync — rewrites `deploy/shared/`, `deploy/static/development/`, `deploy/ecs/development/` from real stack outputs
   - Step 5 GitHub settings — writes `AWS_REGION` + three role ARNs to Actions Variables, and applies branch protection on `main` (required status check: `summary`) so you can't merge a red or still-running PR from here on

   > 💡 **Step 3 is 8–12 real minutes of CloudFormation doing its thing — this is AWS's floor, not a setup bug.** Perfect window for a coffee refill. Also: AWS sends a subscription confirmation to your Lab 1 `safety.email` address (subject **AWS Notification - Subscription Confirmation**). Click **Confirm subscription** before the wizard finishes or the budget tripwire can't email you — the subscription will sit in `PendingConfirmation` forever.

3. **If a stack fails mid-flight**, the wizard prints a framed error panel. Read it, address the cause (usually an IAM-role name collision or a global-uniqueness clash on S3), then resume:
   ```
   python3 scripts/setup_repo.py resume
   ```
   This re-reads `.local/setup-repo-state.json` and retries only the failed stack.

4. **Inspect what the wizard rewrote.** Open these files and notice real values replaced the bootstrap placeholders:
   - `deploy/shared/delivery.json` — artifact bucket + ECR URI
   - `deploy/static/development/site.json` — site bucket, CloudFront ID, public URL
   - `deploy/ecs/development/task-definition.json` — image URI, execution role ARN, log group name, environment injection

5. **Open a claim PR for Lab 3, then merge it.**
   ```
   ./scripts/claim.py lab-3
   ```
   Note the PR number, then merge when CI is green:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## Verify

- In AWS Console → CloudFormation: four stacks in `CREATE_COMPLETE`:
  - `resume-cicd-lab-shared-oidc`
  - `resume-cicd-lab-shared-delivery`
  - `resume-cicd-lab-dev-static-site`
  - `resume-cicd-lab-dev-ecs-app`
- In GitHub → Settings → Secrets and variables → Actions → Variables tab: four variables present (`AWS_REGION`, `AWS_RELEASE_ROLE_ARN`, `AWS_STATIC_DEPLOY_ROLE_ARN`, `AWS_ECS_DEPLOY_ROLE_ARN`).
- SNS subscription confirmed — you clicked the email link. Headless check:
  ```
  aws sns list-subscriptions --no-cli-pager \
    --query 'Subscriptions[?contains(TopicArn, `budget-alerts`)].[Endpoint, SubscriptionArn]' \
    --output text
  ```
  `SubscriptionArn` should be an ARN, **not** `PendingConfirmation`. (The filter matches `budget-alerts`, not a stack-prefix string — the SNS topic name follows the resource-naming pattern `resume-shared-sns-budget-alerts-<resourceIdentifier>`, not the stack prefix, so `budget-alerts` is the stable literal across every student's fork.)
- 👀 **Visual check in the console.** Open `.local/console-links.md` (written by the wizard). It has clickable links to every resource this lab created — CloudFormation stacks, S3 buckets, ECR, ECS, CloudFront, Budgets, SNS topic, IAM roles. Good sanity check alongside the CLI verifications above.
- Running cost: ~$1.45/day (mostly NAT Gateway + ECS task idle + CloudFront + minimal S3).

## You just

Wired four CloudFormation stacks + OIDC federation + tracked manifests in under 15 minutes. Your GitHub Actions can now assume short-lived AWS roles — no keys, no rotation, no leaks possible.

## Up next

[Lab 4 — First Green Check](./lab-04-first-green-check.md)
