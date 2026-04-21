> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-06-first-artifacts.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-06-first-artifacts.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 5](./lab-05-first-release-tag.md)

# Lab 6 — First Artifacts (S3 + ECR)

⏱ 10 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; build once, deploy many

## Why

Your Lab 5 tag just produced two things in parallel: a static site zip sitting in S3 and a container image sitting in ECR — same release, two shapes. In this lab you open both, confirm the bits exist, and learn to point at them by name. From here on every deploy references those exact artifacts; nothing is rebuilt per environment.

- A **static `site.zip`** uploaded to the shared S3 artifact bucket (for the CloudFront/S3 deploy target)
- A **container image** pushed to ECR with two tags (the release tag and the commit SHA) (for the ECS/Fargate deploy target)

You'll see the trade-off personally when you deploy both in Lab 7. This is the "build once, deploy many" principle — the opposite of per-environment rebuilds.

> vs _building per environment_ — every rebuild introduces the possibility of environmental drift (different node version, different timestamp, different lockfile resolution). Build-once forces immutability — the bits that ran in dev are the bits that will run in prod.

## Do

1. **Watch the build auto-start.** The moment the release PR merged, `release-please.yml` finished, saw that a new tag landed, and dispatched `release-assets.yml` for you via `gh workflow run` (see the `dispatch-release-assets` job at the bottom of `.github/workflows/release-please.yml`). Takes ~3–4 minutes total. List it, then attach:
   ```
   gh run list --workflow="Build Release Assets" --limit 1
   ```
   ```
   gh run watch
   ```
   > 💡 `gh run list` pages even for one line — `q` exits. Permanent fix: [`tools/pager-config.md`](./tools/pager-config.md).

   > **Why the auto-dispatch**: GitHub's safety rule blocks a tag pushed by the built-in `GITHUB_TOKEN` from firing downstream `push: tags` workflows — no bot-on-bot loops. But the same rule explicitly permits `workflow_dispatch` events from the same token. So Release Please still pushes the tag, and a second job in the same workflow calls `gh workflow run release-assets.yml --ref $tag` to hand off. No PAT, no GitHub App, no extra secrets.
   >
   > If the list is empty (repo setting was off, or `actions: write` got stripped), fall back to manual dispatch:
   > ```
   > latest_tag=$(git ls-remote --tags origin 'web-v*' | awk -F'refs/tags/' '{print $2}' | sort -V | tail -1)
   > ```
   > ```
   > gh workflow run release-assets.yml --ref "${latest_tag}" -f version="${latest_tag#web-v}"
   > ```

2. **Inspect the S3 artifact** — list the new zip:
   ```
   ARTIFACT_BUCKET=$(jq -r .artifactBucket deploy/shared/delivery.json)
   ```
   ```
   aws s3 ls "s3://${ARTIFACT_BUCKET}/web/releases/" --recursive
   ```
   You'll see a path like `web/releases/web-v0.2.0+<short_sha>/site.zip`. The key uses both the tag and the SHA so a replay can never collide.

3. **Inspect the ECR image** — list images in your repo. The `[?imageTags != null]` filter drops any untagged images left over from retries. `imageTags` is a list (each image has two tags), so we flatten it to a comma-joined string before asking for `--output table` — otherwise AWS CLI's table formatter errors with "Row should have 2 elements, instead it has 1":
   ```
   ECR_REPO=$(jq -r .ecrRepositoryUri deploy/shared/delivery.json | sed 's|.*/||')
   ```
   ```
   aws ecr describe-images --repository-name "${ECR_REPO}" \
     --query 'imageDetails[?imageTags != null].{tags:join(`,`, imageTags), digest:imageDigest}' \
     --output table --no-cli-pager
   ```
   You'll see **two tags** pointing to the same digest:
   - `web-v0.2.0` (the release tag)
   - `sha-<short_sha>` (the commit SHA)

4. **Note the digest** — `sha256:...`. This is the cryptographic identity of your image. It's what Lab 7's deploy will pin. Copy it; you'll see the same value in `deploy/ecs/development/task-definition.json` in the next lab.

5. **Open a claim PR for Lab 6, then merge it.**
   ```
   ./scripts/claim.py lab-6
   ```
   The script prints the PR number. Merge when CI is green:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## Verify

- S3 listing shows `site.zip` under your release tag path.
- ECR listing shows two tags (`web-v*` and `sha-*`) pointing to the same digest.
- In the GitHub Actions logs for Build Release Assets, the `Update development release state` step succeeded (this is what kicks off Lab 7's PR).
- 👀 **Console sanity check.** `.local/console-links.md` (wizard-generated) has clickable links to your S3 artifact bucket + ECR repo — see the new zip and both image tags live in the console, side-by-side with the CLI output above.

## You just

Produced two immutable artifacts from one release tag. The same bits are now addressable two ways (S3 key + ECR digest). Every environment in Lab 7 and Lab 9 will reference these exact artifacts — no rebuilds, no drift.

> ☕ That `sha256:...` digest is the same hash Docker would compute locally on the image. Pull it down (`docker pull <ecr-uri>@<digest>`) if you want to feel the build-once-deploy-many claim in your hands.

## Up next

[Lab 7 — First Deploy](./lab-07-first-deploy.md)
