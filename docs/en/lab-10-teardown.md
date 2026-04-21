> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-10-teardown.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-10-teardown.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 9](./lab-09-first-promotion.md)

# Lab 10 — The Teardown

⏱ 10 min &nbsp;·&nbsp; 💰 **−$2.90/day** (stops billing) &nbsp;·&nbsp; full lifecycle complete

## Why

Ten minutes from now your AWS account is back to $0/day — every stack gone, every bucket empty, every ECR image purged, by your own hand. Same wizard as Lab 3, opposite direction. That's ownership of the full lifecycle, not just the fun bits.

The destroy path has a dry-run preview, a typed-scope confirmation (no muscle-memory `y`), and up-front data-loss warnings. You'll see all three.

> vs _"leave it running a few more days to experiment"_ — one forgotten weekend = $20+. You can rebuild from scratch in ~15 minutes via Lab 3's wizard any time.

## Do

1. **Dry-run first** — always. Read the output carefully:
   ```
   python3 scripts/setup_repo.py destroy --dry-run
   ```
   You'll see:
   - Stacks to delete (6 — all dev + all staging + shared)
   - Estimated cost stopped ($2.90/day)
   - Data-loss warnings (S3 artifact bucket content, ECR images)
   - What will NOT be touched (GitHub repo, Actions variables, local git worktree)

2. **Real destroy** — invoke without the `--dry-run` flag:
   ```
   python3 scripts/setup_repo.py destroy
   ```
   The wizard re-renders the dry-run summary, then prompts:
   ```
   ▲  Type the scope to confirm:
       destroy resume-cicd-lab-all
   ```
   Type it letter-by-letter (tab-complete is disabled for this field).

3. **Watch the destroy progress.** The wizard uses `aws cloudformation wait stack-delete-complete`. S3 buckets are emptied first, then deleted. ECR images are force-deleted. Total duration: ~5–10 minutes.

4. **Verify in AWS Console.** Navigate to:
   - CloudFormation → Stacks → should show `DELETE_COMPLETE` for all 6 stacks (or the stacks are gone entirely)
   - S3 → Buckets → only your personal buckets should remain (no `resume-cicd-lab-*`)
   - ECR → Repositories → no `resume-cicd-lab-*` repos
   - EC2 → Load Balancers → no lab ALBs; VPC → only default VPC

5. **Open a final claim PR for Lab 10, then merge it.** The merge is what lands the `lab-10-complete` label that flips your final badge.
   ```
   ./scripts/claim.py lab-10
   ```
   Note the PR number, then merge when CI is green:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## Verify

- **Zero `resume-cicd-lab-*` resources** across AWS. Check the Console, or headless from your terminal:
  ```
  aws cloudformation list-stacks \
    --query "StackSummaries[?starts_with(StackName, 'resume-cicd-lab') && StackStatus!='DELETE_COMPLETE'].StackName" \
    --output text --no-cli-pager
  ```
  Empty output = clean.
- AWS Budgets → no `*-daily-cap` budget remains. Destroy removed it along with its SNS topic + email subscription (all lived inside `bootstrap-shared`).
- GitHub repo, Actions variables, and this cloned repo all untouched.
- Your Lab 10 progress badge turns ✓ — all 11 badges now green. (Shields.io caches ~5 min — wait if the badge seems stuck.)
- `cat .local/setup-repo-state.json 2>/dev/null` shows empty or file removed.
- 👀 **Post-destroy sweep.** Open `.local/console-links.md` one last time — every CloudFormation / S3 / ECR link should 404, and the region-wide lists (ECS clusters, CloudFront distributions, Budgets) should show none under your resource prefix. Proof nothing leaked.

## You just

Owned an AWS environment from birth to death — provisioned, shipped, promoted, torn down. Full CI/CD lifecycle: ~2 hours, $3–6 spend.

> ☕ Next Saturday, run `python3 scripts/setup_repo.py` again. You'll rebuild the whole thing in ~15 minutes now that the wizard is a known command — muscle memory on day 7 is the point.

## Up next

Rebuild from scratch (`setup_repo.py destroy` + re-run, ~15 min cycle) to internalize the flow. See [`cicd-model.md`](./concepts/cicd-model.md) for going further — adding production, swapping the app, comparing with pull-mode.

Or take the optional bonus — [Lab 11 — Ship the Loop (GitHub App)](./lab-11-bonus-github-app.md) retires the Lab 5 / Lab 7 close + reopen dance with the industry-standard fix (~15 min, pure GitHub, no AWS).
