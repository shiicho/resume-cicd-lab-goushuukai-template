> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-07-first-deploy.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-07-first-deploy.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 6](./lab-06-first-artifacts.md)

# Lab 7 — First Deploy

⏱ 10 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; first shipped commit

## Why

Ten minutes from now you'll have two live URLs serving the release you built in Lab 6 — one CloudFront-fronted static site, one ALB-fronted Fargate container. Same bits, different runtime. You ship them by reviewing and merging a bot-opened PR that touches exactly two manifest files.

That PR is your **deployment gate**. Merging it triggers two workflows:

- `Deploy Static Site` (watches `deploy/static/**`) — downloads the S3 zip, `aws s3 sync` to the site bucket, CloudFront invalidation
- `Deploy ECS Service` (watches `deploy/ecs/**`) — registers new task definition, forces new deployment, waits for services-stable

Both fire in parallel. Your resume goes live in both runtimes.

## Do

1. **Find the auto-opened PR** — titled `chore(development): promote web v0.2.0`. `gh pr list --search` doesn't reliably match title substrings with parentheses, so use `--json` + `jq` to filter directly:
   ```
   gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore(development): promote web v")) | "\(.number): \(.title)"'
   ```
   > 💡 Short output may still page — `q` exits. Permanent fix: [`tools/pager-config.md`](./tools/pager-config.md).

2. **Open the PR and review its diff.** Either view:
   ```
   gh pr view <number> --web    # opens in browser
   ```
   or inline in the terminal:
   ```
   gh pr diff <number>
   ```
   Two files should have changed:
   - `deploy/static/development/site.json`:
     - new `artifactKey` (the S3 zip path from Lab 6)
     - new `release.version` + `release.gitSha`
   - `deploy/ecs/development/task-definition.json`:
     - new `image` field (ECR URI with the digest from Lab 6, not a tag)
     - new `APP_VERSION` / `APP_COMMIT_SHA` env vars

   These two manifests are the **environment contract**. Changing them is how you deploy.

   > ⚠ **Promotion PR stuck on "Some checks haven't completed yet"?** Same bot-loop as Lab 5's release PR — one-time close + reopen:
   > ```
   > gh pr close <number>
   > ```
   > ```
   > gh pr reopen <number>
   > ```
   > After that, `--auto` in step 3 works as expected. Full background: [`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md).

3. **Merge the PR:**
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```

4. **Watch both deploy workflows in parallel:**
   ```
   gh run list --limit 5
   # both "Deploy Static Site" and "Deploy ECS Service" should be running
   ```
   > 💡 `gh run list` pages — `q` exits. Permanent fix: [`tools/pager-config.md`](./tools/pager-config.md).

5. **Get your deployed URL** — two URLs actually.

   CloudFront URL (static):
   ```
   jq -r .publicBaseUrl deploy/static/development/site.json
   ```
   ALB URL (ECS) — the ecs-app stack exports it as `ServiceUrl`:
   ```
   aws cloudformation describe-stacks \
     --stack-name resume-cicd-lab-dev-ecs-app \
     --query 'Stacks[0].Outputs[?OutputKey==`ServiceUrl`].OutputValue' \
     --output text --no-cli-pager
   ```

6. **Open both URLs.** Your resume is live in two completely different runtime environments (CDN-cached static + container-served Nginx). Compare the experience.

## Verify

- `gh run list` shows both Deploy workflows as `completed` `success`.
- Both URLs return HTTP 200 with your resume content.
- The HTML has the same content but is served from completely different infra paths.
- Your Lab 7 progress badge turns ✓ when the promotion PR merges.

## You just

Shipped your first release to a reviewable environment contract. Your resume content is live in two independent runtimes, from the same immutable artifacts. The git history now contains a full record of what was deployed when.

> ☕ Open both URLs in side-by-side browser windows. Same HTML, but the CloudFront one is cached at the edge closest to you while the ALB one serves from the region you picked. Feel the asymmetry you just built.

## Up next

[Lab 8 — Self-Proof Banner](./lab-08-self-proof-banner.md)
