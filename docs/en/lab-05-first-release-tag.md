> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-05-first-release-tag.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-05-first-release-tag.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 4](./lab-04-first-green-check.md)

# Lab 5 — First Release Tag

⏱ 10 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; first semantic release

## Why

By the end of this lab you'll have your first release tag on `main` — cut by a bot, from a conventional-commit message you wrote. The tag is what triggers Lab 6's artifact build and Lab 7's deploy, so everything downstream hangs off this one merge.

> vs _manual `git tag v0.1.0 && git push --tags`_ — works, but leaves no record of what changed and drifts between repos. Release Please enforces the rule by being the rule.

## Do

1. **Make a `feat:` commit** — any user-visible change under `app/**` qualifies. Four sub-steps:

   **a) Create the branch:**
   ```
   git checkout -b feat/lab-5-release-content
   ```

   **b) Open the resume-content file and see what's there.** Open `app/src/features/resume/data/resume-projects.ts` in your editor. Find the **first** `responsibilities: [` line — it opens an array of quoted bullets describing what was done on that project. You'll add one new bullet at the top of this array.

   **c) Insert one new bullet about this pipeline.** On the line immediately below the first `responsibilities: [` (before any existing bullets), paste the line below. Match the 6-space indent that the surrounding bullets already use:
   ```typescript
         'Deployed via GitHub Actions OIDC to AWS (CloudFormation + ECS + S3 + CloudFront)',
   ```
   Save, then confirm: `git diff app/src/features/resume/data/resume-projects.ts` should show exactly one `+` line (your new bullet) — nothing else.

   **d) Commit, push, and open the PR:**
   ```
   git commit -am "feat(resume): add talking point about release pipeline"
   ```
   ```
   git push -u origin feat/lab-5-release-content
   ```
   ```
   gh pr create --fill
   ```
   Note the PR number printed.
   If `gh pr create` errors with "could not find any commits between origin/main and feat/lab-5-release-content", sub-step (c) didn't save — reopen the file, confirm your new bullet sits inside the `responsibilities: [` array, save again, and retry.

   > ⚠ **Verify the PR title before merging.** Release Please reads the squash-commit message on `main` in `type(scope): subject` format. If `gh pr create --fill` fell back to the branch name (e.g., `feat/lab 5 release content`), Release Please silently skips your commit from the CHANGELOG. Check + fix if needed:
   > ```
   > gh pr view --json title --jq .title
   > ```
   > ```
   > gh pr edit --title "feat(resume): add talking point about release pipeline"
   > ```
   > 💡 Output stuck at `(END)`? Press `q`. For the permanent fix see [`tools/pager-config.md`](./tools/pager-config.md).

2. **Merge the PR and sync local** (after CI is green):
   ```
   gh pr merge --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

3. **Wait for Release Please** — `.github/workflows/release-please.yml` runs on every push to `main` and opens (or updates) a release PR when it detects new `feat:` / `fix:` commits. Takes ~30 seconds.

4. **Review the release PR.** It's auto-titled something like `chore(main): release web 0.2.0`. Grab its number — you'll need it in step 5:
   ```
   gh pr list --state open --head 'release-please--branches--main--components--web' --json number,title
   ```
   > 💡 Stuck at `(END)`? [`tools/pager-config.md`](./tools/pager-config.md) has the fix.

   Read the diff:
   - `.release-please-manifest.json` version bumped
   - `app/CHANGELOG.md` now has a new section with your commit message
   - `app/package.json` version bumped

   > ⚠ **Release PR stuck on "Some checks haven't completed yet" forever? This is expected — not a bug in your setup.** Bot-opened PRs don't auto-trigger `pull_request` workflows — that's a GitHub safety rule. One-time unstick:
   > ```
   > gh pr close <release-pr-number>
   > ```
   > ```
   > gh pr reopen <release-pr-number>
   > ```
   > After that, the `--auto` flag in step 5 merges as expected. Full explanation + the permanent fix: [`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md). The permanent fix is the optional [Lab 11 bonus](./lab-11-bonus-github-app.md).

5. **Merge the release PR, then sync local.** This is the moment the tag is cut. Pass the number from step 4 (you're on `main` locally, so `gh pr merge` without a number can't infer which PR to merge):
   ```
   gh pr merge <release-pr-number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

6. **Verify the tag** — Release Please creates a tag of the form `web-v<version>`:
   ```
   git fetch --tags
   ```
   ```
   git tag --list 'web-v*'
   ```
   > 💡 `git tag --list` pages even for one line — `q` exits. Permanent fix: [`tools/pager-config.md`](./tools/pager-config.md).

## Verify

- `git tag --list 'web-v*'` shows your tag (e.g., `web-v0.2.0`).
- GitHub → Releases tab shows an auto-generated release entry.
- `app/CHANGELOG.md` has an entry for the new version.
- Your Lab 5 progress badge turns ✓ when the release PR merges.

## You just

Cut your first semantic release via a bot, not by hand. This tag is a permanent, auditable record of what shipped and when — it will still be there two years from now when you need to roll back.

> 🤔 **Pause for a second before Lab 6.** You touched `app/**` in Lab 4 too, and nothing released. Same path, same release config, same component — different outcome. Why?
>
> <details>
> <summary>Think for a moment, then open this for the answer.</summary>
>
> Release Please doesn't watch for *file changes* in `app/**` — it watches for *commit subjects*. The rule is [Conventional Commits](https://www.conventionalcommits.org/):
>
> - `feat:` → minor version bump (0.1.0 → 0.2.0)
> - `fix:` → patch version bump (0.1.0 → 0.1.1)
> - `chore:`, `docs:`, `refactor:`, `style:`, `test:`, `perf:`, `build:`, `ci:` → **no version bump**
>
> Lab 4's commit was `chore: first CI touch`. Release Please saw it, shrugged, and went back to sleep. Lab 5's `feat(resume): …` is what opened the release PR.
>
> Two orthogonal rules, both have to align: the path filter (`app/**`) scopes *which component* releases; the commit type decides *whether a release happens at all*.
>
> Worth getting into muscle memory — `chore:` for non-user-visible work (README tweaks, CI config, internal refactors) keeps the version number meaningful.
> </details>

> ☕ Open your repo's **Releases** tab in the browser. The bot just published a proper release page with your commit in the changelog — no one had to write it.

## Up next

[Lab 6 — First Artifacts (S3 + ECR)](./lab-06-first-artifacts.md)
