> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-09-first-promotion.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-09-first-promotion.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 8](./lab-08-self-proof-banner.md)

# Lab 9 — First Promotion (dev → staging)

⏱ 20 min hands-on (+ CloudFormation wait) &nbsp;·&nbsp; 💰 **+$1.45/day** &nbsp;·&nbsp; peak $2.90/day reached here

## Why

Twenty minutes from now, the same artifact serving dev will also be serving staging — not a rebuild, the same S3 zip and the same ECR digest referenced by a second set of manifests. You'll watch the `diff` command prove it before anything touches AWS.

What changes between dev and staging: the target bucket, the CloudFront distribution, the VPC, the ALB, the ECS cluster. Those are the **environment**. The artifact is not the environment.

You'll see this in a unified diff before you write anything.

> vs _rebuild for staging_ — common anti-pattern; every rebuild is a chance for drift. Build-once-promote-many is the whole point of immutable artifacts.

## Do

1. **Check VPC + Internet Gateway headroom first — this is the foot-gun of Lab 9.** AWS defaults every region to 5 VPCs and 5 IGWs. Staging adds +1 of each, so a shared account at 4 will fail mid-apply with `ServiceLimitExceeded` a good 5-10 minutes in — painful to hit after the wait.
   ```
   aws ec2 describe-vpcs --region ap-northeast-1 --query 'length(Vpcs)' --no-cli-pager
   ```
   ```
   aws ec2 describe-internet-gateways --region ap-northeast-1 --query 'length(InternetGateways)' --no-cli-pager
   ```
   If either returns 4+, raise the quota to 10 before running apply — AWS auto-approves these small increases within minutes. Commands + how to track a pending request: [`tools/aws.md`](./tools/aws.md#vpc--igw-quota-preflight-lab-9s-foot-gun).

2. **Expand scope to dev + staging and apply.** The config defines all three environments as templates; scope is selected at runtime. Expand:
   ```
   python3 scripts/setup_repo.py apply --scope development,staging
   ```
   The wizard detects existing dev stacks (unchanged) and adds only staging's 2 stacks (`resume-cicd-lab-stg-static-site` + `resume-cicd-lab-stg-ecs-app`). Shared stacks are unchanged. Cost rises to $2.90/day (dev $1.45 + staging $1.45).

3. **Commit the synced staging manifests**, then return to main — `promotion_wizard.py` refuses to run with a dirty tree (it would sweep the uncommitted changes into the promotion PR and confuse reviewers):
   ```
   git checkout -b chore/lab-9-staging-provisioned
   ```
   ```
   git commit -am "chore(lab-9): record staging stack outputs"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   Note the PR number, then merge and return to main:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

4. **Run the promotion wizard:**
   ```
   python3 scripts/promotion_wizard.py
   ```
   The wizard walks you through:
   - Source → Target selection (pick `development → staging`)
   - Candidate release picker (newest first; reads git history of `deploy/static/development/site.json`)
   - **Unified diff preview** of what will change in `deploy/static/staging/site.json` and `deploy/ecs/staging/task-definition.json`
   - Write + open draft PR (`gh pr create --draft` handles the PR mechanics)

5. **Review the draft PR.** Carefully read the diff:
   - `artifactKey` — **identical** to what's currently in dev
   - `image` digest — **identical** to what's currently in dev
   - `siteBucket` / `cloudFrontDistributionId` — **different** (staging resources)
   - `environment` variables in the task-definition — **different** (staging URL, APP_ENV=staging)

6. **Flip the draft to ready-for-review, merge, and sync local:**
   ```
   gh pr ready <number>
   ```
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

7. **Watch the deploys.** Same workflows as Lab 7, but for staging this time. Your staging URL comes up.

## Verify

- Staging URL responds; self-proof banner shows `env: staging` in its footer.
- **Proof of immutable artifact.** Run:
  ```
  diff deploy/static/development/site.json deploy/static/staging/site.json
  ```
  `artifactKey` should **not** appear in the output — its absence *is* the proof. Same value in both files means `diff` hides it. Only env-specific fields (`environment`, `publicBaseUrl`, `siteBucket`, `cloudFrontDistributionId`, `cloudFormationStack`) differ. Same check for the ECS task-definitions:
  ```
  diff deploy/ecs/development/task-definition.json deploy/ecs/staging/task-definition.json
  ```
  `image` (the ECR digest) should not appear; only `APP_ENV`, `APP_BASE_URL`, `APP_HOSTNAME`, family/cluster/role ARNs change.
- Your Lab 9 progress badge turns ✓ when the promotion PR merges.
- 👀 **Console sanity check.** `.local/console-links.md` (wizard-regenerates on staging add-on) now has links to BOTH dev and staging resources — CloudFormation stacks, ALBs, CloudFront distros. Nice for side-by-side compare of the two environments pointing at the same artifact.

## You just

Promoted one release through two environments without rebuilding. Proved the immutability claim with your own eyes (same artifactKey, same image digest, different env config). This is the pattern real production promotion uses.

> ☕ What `diff` *didn't* print is the point — identical `artifactKey` and `image` lines are hidden because they're equal across dev and staging. The invisible equality is the whole contract.

## Up next

[Lab 10 — The Teardown](./lab-10-teardown.md)
