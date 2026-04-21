> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-11-bonus-github-app.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-11-bonus-github-app.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 10](./lab-10-teardown.md)

# Lab 11 — Bonus: Ship the Loop (GitHub App)

⏱ 15 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; pure GitHub, no AWS

## Why

Lab 5 and Lab 7 taught you a one-time workaround: close + reopen the bot-opened PR so CI fires as a user event. That's the correct pedagogy — you watched GitHub's bot-loop safety rule *happen to you*, then fixed it with two clicks. But it is not what real teams ship.

GitHub's official rule (quoted verbatim from [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)):

> "events triggered by the `GITHUB_TOKEN`, with the exception of `workflow_dispatch` and `repository_dispatch`, will not create a new workflow run."

Related security context: [Using the GITHUB_TOKEN in a workflow](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow).

The industry fix is to stop acting as the default `GITHUB_TOKEN` bot for the commands that open PRs. Install a GitHub App, mint a short-lived installation token on each run, pass that token to `release-please` and `peter-evans/create-pull-request`. Now the PRs are opened by the App — not `GITHUB_TOKEN` — so the bot-loop rule does not apply and `ci.yml`'s `pull_request` trigger fires naturally. No close + reopen. No `workflow_dispatch` chains. Just a green check on the rollup.

This bonus lab wires that up. Do it if your fork will see real use; skip it if you just want the course badge.

> vs _keep close + reopen forever_ — fine for learning, painful at scale. A real release pipeline opens 2 bot PRs per release (release-please + promotion); manually unblocking each one is the friction the App removes.  
>
> vs _use a Personal Access Token (PAT)_ — simplest to wire, worst hygiene: the PAT inherits a user's full scope, never auto-rotates, and is a single point of compromise for that user's identity. GitHub Apps are scoped per-repo, auto-mint short-lived installation tokens, and carry no user identity.

## Prereqs

- You've finished Lab 7 (release + promotion flow exercised at least once so you've *seen* the bot-loop trap)
- `gh` authenticated as you; admin on the fork
- Nothing deployed is required — this lab is pure GitHub, $0

## Do

1. **Create a GitHub App.** Open [github.com/settings/apps/new](https://github.com/settings/apps/new). Fill in:

   | Field | Value |
   |---|---|
   | GitHub App name | `<owner>-cicd-lab-bot` (globally unique; pick anything) |
   | Homepage URL | your fork's URL (e.g., `https://github.com/<owner>/<repo>`) |
   | Webhook → Active | **uncheck** (this App doesn't need webhooks) |
   | Where can this GitHub App be installed? | **Only on this account** |

   Under **Repository permissions**, grant:

   | Permission | Access | Why |
   |---|---|---|
   | Contents | Read & write | push release branches, update manifests |
   | Pull requests | Read & write | open the release + promotion PRs |
   | Actions | Read & write | trigger workflows (kept as defense-in-depth) |
   | Workflows | Read & write | edit `.github/workflows/*` if release-please touches them |
   | Metadata | Read-only (default, don't remove) | base requirement |

   Click **Create GitHub App** at the bottom.

2. **Generate a private key.** On the App's settings page, scroll to **Private keys → Generate a private key**. A `.pem` file downloads to your computer. Treat it like a password — don't commit it anywhere.

3. **Install the App on your fork.** In the App's left sidebar, **Install App → pick your fork → Install**. On the install screen, choose **Only select repositories** and tick your fork only.

4. **Note the App ID.** Back on the App's settings page (top of **General**), find the numeric **App ID** (looks like `123456`). Copy it.

5. **Save the two secrets to the fork.** From the repo directory:
   ```
   gh secret set APP_ID --body "<paste-app-id-here>"
   ```
   ```
   gh secret set APP_PRIVATE_KEY < ~/Downloads/<app-name>.<date>.private-key.pem
   ```
   > 💡 The second line uses stdin redirection — `gh secret set <name> <<< "<value>"` would mangle newlines in the `.pem` and make the key unusable. `<` from a file preserves newlines correctly.

   Verify:
   ```
   gh secret list | grep -E '^(APP_ID|APP_PRIVATE_KEY)'
   ```
   You should see both names (values masked).

6. **Patch `.github/workflows/release-please.yml`.** Add an App-token step before `release-please`, then swap the token reference. Apply this diff by hand:

   ```diff
    jobs:
      release-please:
        runs-on: ubuntu-latest
        outputs:
          releases_created: ${{ steps.release-please.outputs.releases_created }}
          prs_created: ${{ steps.release-please.outputs.prs_created }}
          tag_name: ${{ steps.release-please.outputs['app--tag_name'] }}
          pr_head_branch: ${{ fromJSON(steps.release-please.outputs.pr || '{}').headBranchName }}
        steps:
   +      - name: Mint installation token
   +        id: app-token
   +        uses: actions/create-github-app-token@v1
   +        with:
   +          app-id: ${{ secrets.APP_ID }}
   +          private-key: ${{ secrets.APP_PRIVATE_KEY }}
   +
          - name: Run release please
            id: release-please
            uses: googleapis/release-please-action@v4
            with:
   -          token: ${{ github.token }}
   +          token: ${{ steps.app-token.outputs.token }}
              config-file: release-please-config.json
              manifest-file: .release-please-manifest.json
   ```

7. **Patch `.github/workflows/release-assets.yml`.** Same swap for the promotion-PR step:

   ```diff
          - name: Create development promotion PR
            id: promotion-pr
            if: steps.meta.outputs.promote_to_development == 'true'
            uses: peter-evans/create-pull-request@v6
            with:
   -          token: ${{ github.token }}
   +          token: ${{ steps.app-token.outputs.token }}
              base: main
   ```
   And add the App-token step at the top of the `steps:` list (above `Checkout`):
   ```diff
        steps:
   +      - name: Mint installation token
   +        id: app-token
   +        uses: actions/create-github-app-token@v1
   +        with:
   +          app-id: ${{ secrets.APP_ID }}
   +          private-key: ${{ secrets.APP_PRIVATE_KEY }}
   +
          - name: Checkout
            uses: actions/checkout@v4
   ```

8. **(Optional) Remove the dispatch-ci workaround jobs.** With the App wired, these jobs are no longer doing anything useful — the PR now fires `ci.yml` on open:
   - Delete the `dispatch-ci-on-release-pr` job at the bottom of `release-please.yml`.
   - Delete the `Dispatch Validate on the promotion PR branch` step at the bottom of `release-assets.yml`.

   Keeping them is harmless (they produce a duplicate check-run on commit level). Removing them is cleaner.

9. **Commit, PR, merge.** The workflow edits themselves need a PR (so CI validates them):
   ```
   git checkout -b chore/bonus-github-app
   ```
   ```
   git commit -am "chore: use GitHub App for release-please + promotion PRs"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   Note the PR number. This PR is opened by *you*, not the bot, so CI fires normally — merge it when green:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

10. **Test it.** Trigger a release by making any trivial `feat:` commit on `main` (you can follow Lab 5's flow):
    ```
    git checkout -b feat/bonus-test
    ```
    ```
    echo "" >> app/src/main.tsx
    ```
    ```
    git commit -am "feat: test App-minted release pipeline"
    ```
    ```
    git push -u origin HEAD && gh pr create --fill
    ```
    Merge it. Release Please will open the release PR — **watch it auto-run CI without close+reopen**. When that PR merges, the promotion PR also auto-runs. You're done.

## Verify

- **Bot-opened PR runs CI natively.** After a release, the Release Please PR (opened by your App) has the full `Validate → summary` check rollup within ~30s — no `gh pr close && gh pr reopen` needed. Check via:
  ```
  gh pr view <release-pr-number> --json statusCheckRollup --jq '.statusCheckRollup[] | {name, conclusion}'
  ```
- **Triggering actor is your App**, not `github-actions[bot]`:
  ```
  gh run list --workflow=Validate --limit 1 --json event,triggeringActor
  ```
  `event` is `pull_request`, `triggeringActor.login` is `<app-name>[bot]`.
- **Secrets are present but values are never echoed** in Actions logs (GitHub masks them automatically).

## You just

Replaced a teaching-grade workaround with the industry-standard fix. Your release pipeline is now genuinely hands-free — bot PRs fire CI, auto-merge works on the first try, and there is no two-click theater between a tag and a deploy. This is how real teams ship.

If you ever rotate the App's key, regenerate the `.pem` on the App's settings page and re-run the `gh secret set APP_PRIVATE_KEY < ...` line — no workflow edits needed.

## Rollback (if you decide against the App)

1. Revert the two workflow edits (git revert the bonus PR)
2. Settings → Installed GitHub Apps → your App → **Uninstall**
3. Optionally delete the App itself from [github.com/settings/apps](https://github.com/settings/apps)
4. Delete the two secrets:
   ```
   gh secret delete APP_ID
   ```
   ```
   gh secret delete APP_PRIVATE_KEY
   ```

Back to close + reopen life.

## Up next

That's the course. Every badge on the [README](../../README.md) should now be green. From here:

- **Rebuild the lab** with `python3 scripts/setup_repo.py destroy` then `python3 scripts/setup_repo.py` to cement the flow in muscle memory.
- **Go deeper** with [`concepts/cicd-model.md`](./concepts/cicd-model.md) — adding production, swapping the app, comparing with pull-mode.
- **Keep the repo** as a working reference the next time you wire GitHub Actions → AWS. Everything here is copy-pasteable into real work.

[← Back to README](../../README.md)
