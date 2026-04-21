> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-01-safety-first.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-01-safety-first.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 0](./lab-00-preview.md)

# Lab 1 — Safety First: Arm the Tripwire

⏱ 5 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; safety net

## Why

The single biggest reason engineers abandon AWS tutorials is a $40 forgotten-NAT-Gateway bill. You decide the safety threshold **now**, with calm hands, before there's anything running. Never configure a budget while panicking.

AWS Budgets has been free since October 2020 — using one is negligent-not-to. It's a tripwire that fires per-day, before your month-end bill arrives.

> vs _"I'll remember to destroy when I'm done"_ — you will not remember at 2 AM when you realize you left the ECS service running. Budgets remembers for you.  
> vs _AWS Cost Explorer_ — detects damage after the fact (next-day granularity). Budgets fires as the threshold is crossed.

## How it's wired

Lab 1 does not touch AWS. You configure two values in `config/project-setup.json`; the `bootstrap-shared` CloudFormation stack in Lab 3 deploys the budget + SNS topic + email subscription for you. Same stack = atomic teardown when you run Lab 10.

## Do

1. **Open [`config/project-setup.json`](../../config/project-setup.json).** Before editing, peek at the current `safety` section:
   ```
   jq .safety config/project-setup.json
   ```
   You should see `dailyCap: 10` and an empty `email`:
   ```json
   {
     "dailyCap": 10,
     "email": ""
   }
   ```

2. **Set `safety.email`** to an inbox you actually check. SNS will email you when spend crosses 80% and 100% of the cap. You will need to confirm the subscription from your inbox **once** during Lab 3.

3. **Keep `dailyCap: 10`** unless you have a reason to change it. Peak spend across this lab flow is $2.90/day (Lab 9), so $10 is comfortable headroom while still catching anything runaway.

   **Confirm your edits landed.** Save, then run:
   ```
   jq .safety config/project-setup.json
   ```
   Now `email` should hold your address and `dailyCap` should be your chosen number.

4. **Commit + open a PR.** Branch name must start with `feat/lab-1-` so the Lab Progress workflow picks it up:
   ```
   git checkout -b feat/lab-1-safety
   ```
   ```
   git commit -am "feat(safety): configure budget tripwire"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   Note the PR number printed.

5. **Merge the PR and sync local** when CI is green:
   ```
   gh pr merge <number> --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

## Verify

- Your Lab 1 progress badge turns ✓ after merge.
- `grep -A2 '"safety"' config/project-setup.json` shows your email and cap.
- The `bootstrap-shared` stack in Lab 3 will surface your email as a CFN parameter when it plans — that's the same value landing in AWS.

## You just

Armed the tripwire. The budget doesn't exist in AWS yet — it lands atomically with Lab 3's first stack, and dies atomically with Lab 10's destroy. One safety net, managed as code, no forgotten-to-delete budget lingering after teardown.

## Up next

[Lab 2 — Tools + Dry-Run the Exit](./lab-02-tools-and-dry-run.md)
