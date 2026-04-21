> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-08-self-proof-banner.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-08-self-proof-banner.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 7](./lab-07-first-deploy.md)

# Lab 8 — Self-Proof Banner

⏱ 15 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; resume proves itself

## Why

Your deployed site renders your resume. A hiring manager visits it and sees the content — fine. But they have no way to know the site itself is a CI/CD demonstration.

The `PipelineBanner.tsx` component already shipped with this repo adds a subtle footer strip on desktop (or a small floating pill in the bottom-right on mobile) that reads the pipeline's own metadata and declares:

> `staging · web-v0.2.0 · abc1234 · shipped 14:22 JST · ℹ pipeline info`

Clicking `ℹ` opens a Dialog laid out as three hop cards — **Source → Build → Artifact** — each carrying an attestation pip. Your Lab 8 write populates the **Artifact** card with release tag, build time, artifact key, and optional image digest; **Source** + **Build** stay partially filled ("source repo n/a", "workflow run · —") until a future lab extends `pipeline-info.json` with commit + workflow-run fields.

Right now it renders **BOOTSTRAP red** — no `/pipeline-info.json` exists yet. Your Lab 8 work is the workflow step that writes it. After the next release the banner flips red→live.

> vs _a separate pipeline dashboard page_ — interviewers rarely click secondary nav; the footer stays always-on.  
> vs _a bold header badge_ — the resume shouldn't feel like a demo; the footer keeps the resume-first framing.

## Do

1. **See the BOOTSTRAP state locally.** From the **repo root**, install the app's dependencies (first time only), then start the Vite dev server:
   ```
   npm ci --prefix app                 # first time only; installs app/node_modules (~30 sec)
   ```
   ```
   npm run dev --prefix app
   ```
   Open `http://localhost:5173`. On desktop (≥1280 px) a red footer strip reads `⚠ BOOTSTRAP — pipeline hasn't shipped yet`; on mobile it collapses to a red floating pill in the bottom-right corner. Click `ℹ` (or tap the pill itself) to open the Dialog's bootstrap explanation, then stop the server (`Ctrl-C`).

   > 💡 `ENOENT` / `Cannot find module 'vite'` / `could not determine executable to run` all mean the same thing: you're either outside the repo root or `npm ci` hasn't been run yet. `--prefix app` resolves paths relative to your current directory, so both preconditions matter.

2. **Skim the component** to see the `fetch('/pipeline-info.json')` call and the three-way load state:
   ```
   less app/src/components/PipelineBanner.tsx
   ```

3. **Add the workflow step.** Edit `.github/workflows/release-assets.yml`. Insert this step between `Derive release metadata` and `Package static site`:
   ```yaml
   - name: Write pipeline-info.json into the artifact
     run: |
       cat > app/public/pipeline-info.json <<EOF
       {
         "releaseTag":     "${{ steps.meta.outputs.release_tag }}",
         "shortSha":       "${{ steps.meta.outputs.short_sha }}",
         "buildTimestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
         "artifactKey":    "${{ steps.meta.outputs.artifact_key }}"
       }
       EOF
   ```
   (The banner also surfaces `buildDurationSec` and `imageSha` if present — the 4-field version is fine for Lab 8.)

4. **Also add a one-line comment in `app/src/components/PipelineBanner.tsx`** so the same PR touches `app/` and Release Please sees a reason to bump the `web` component version. Example: next to the `fetch('/pipeline-info.json')` call, add `// wired by release-assets.yml "Write pipeline-info.json" step`. Release Please's config scopes the `web` component to `app/**` only — a pure `.github/workflows/` change won't trigger a version bump, so Lab 8 would otherwise never produce a new release and the banner would never flip.

5. **Commit + push + PR:**
   ```
   git checkout -b feat/lab-8-self-proof-banner
   ```
   ```
   git add .github/workflows/release-assets.yml app/src/components/PipelineBanner.tsx
   ```
   ```
   git commit -m "feat(web): wire pipeline-info.json into release build"
   ```
   ```
   git push -u origin feat/lab-8-self-proof-banner
   ```
   ```
   gh pr create --fill
   ```

6. **The three-PR cascade — this is where CI/CD becomes real.**

   One line of code you just wrote flows to your live site through **three separate pull requests**, each a distinct decision gate answering a different question. Understand these three gates and the rest of the platform makes sense:

   ![The three-PR cascade: feat PR → Release PR → Promotion PR → live site](../diagrams/images/three-pr-cascade.png)

   <details>
   <summary>Text fallback (ASCII)</summary>

   ```
   [1] feat PR        ─merge─▶  main
                                 ├─▶  Release Please wakes up
   [2] Release PR     ─merge─▶  tag web-v0.X.0
                                 ├─▶  release-assets.yml builds artifact
   [3] Promotion PR   ─merge─▶  live site (dev deploys)
   ```

   </details>

   | # | Opened by | Decision | Diff shape | On merge |
   |---|---|---|---|---|
   | 1 | You | Is this code correct? | Source files | Release Please wakes up |
   | 2 | `github-actions[bot]` (Release Please) | Is `main` ready to be called version X? | Version bumps + CHANGELOG | Tag cuts → artifact builds |
   | 3 | `github-actions[bot]` (release-assets) | Is version X ready to run in dev? | `artifactKey` + image digest only | Dev deploys |

   Each gate is independent. Reject (2) and the code stays on `main` without a release. Reject (3) and the artifact exists in S3 + ECR but nothing deploys. **That separation is the whole point** — in Lab 9 you'll reuse the artifact from (3) to deploy to staging without rebuilding, by merging a *fourth* PR that changes only staging's manifests. That's only possible because versioning (2) and deployment (3) are separate PRs.

   **(1/3) Your feat PR** — the one you just opened.
   - Contents: the `release-assets.yml` step + the one-line comment in `PipelineBanner.tsx`.
   - Merge when CI is green, then return to main:
     ```
     gh pr merge <n> --auto --squash --delete-branch
     ```
     ```
     git checkout main
     ```
     ```
     git pull
     ```

   **(2/3) Release Please PR** — auto-opens within ~30 seconds of (1) merging.
   - Title: `chore(main): release web 0.X.0`. Author: `github-actions[bot]`.
   - Diff: version bumps in `.release-please-manifest.json` + `app/package.json`, new section in `app/CHANGELOG.md` with your commit subject.
   - Same bot-loop as Lab 5 — close + reopen to unstick CI, then merge ([`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md)):
     ```
     gh pr close <n>
     ```
     ```
     gh pr reopen <n>
     ```
     ```
     gh pr merge <n> --auto --squash --delete-branch
     ```
     ```
     git pull
     ```
   - On merge: tag `web-v0.X.0` is cut → `release-assets.yml` fires on the tag → builds your `site.zip` (with `pipeline-info.json` baked in) + new ECR image → auto-opens PR (3).

   **(3/3) Promotion PR** — auto-opens when (2)'s build finishes (~3–4 min).
   - Title: `chore(development): promote web v0.X.0`. Author: `github-actions[bot]`.
   - Diff: **pure deployment intent — zero code changes.** New `artifactKey` + `release.version` in `deploy/static/development/site.json`, new image digest in `deploy/ecs/development/task-definition.json`. The manifests *are* the deploy contract.
   - Merge:
     ```
     gh pr merge <n> --auto --squash --delete-branch
     ```
     ```
     git pull
     ```
   - On merge: `deploy-static.yml` + `deploy-ecs.yml` fire in parallel. Your new `/pipeline-info.json` lands on dev.

7. **Reload your deployed URL.** The footer flips red → live: release tag, short SHA, build time, artifact key. The first time this browser sees a valid `/pipeline-info.json`, the Dialog auto-opens once and a 24 h border-beam rings the strip/pill — the design reinforcing the red→live moment. Click `ℹ` anytime to reopen the three-hop proof Dialog.

## Verify

- Deployed site shows the footer strip at the bottom of every page.
- Click `ℹ` opens the Dialog: the **Artifact** hop is fully populated (release tag, SHA, build time, artifact key); **Source** + **Build** hops stay partially filled until `pipeline-info.json` carries the richer v2 schema.
- A bootstrap-state URL (no release yet) still shows **red**.
- Your Lab 8 progress badge turns ✓ when the new release merges and deploys.

## You just

Gave your deployed resume a self-declaring credential. Every visitor who cares to look can verify — from the artifact itself — that this was produced by a real CI/CD pipeline, not a manual upload. The product and the proof are now the same artifact.

> ☕ Right-click the footer → **View source**. The `/pipeline-info.json` fetch and the release tag in the DOM are the postcards your CI/CD pipeline just wrote to every visitor's browser.

## Up next

[Lab 9 — First Promotion (dev → staging)](./lab-09-first-promotion.md)
