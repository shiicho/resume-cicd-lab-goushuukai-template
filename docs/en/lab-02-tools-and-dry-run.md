> 🌐 **English** &nbsp;·&nbsp; [日本語](../ja/lab-02-tools-and-dry-run.md) &nbsp;·&nbsp; [简体中文](../cn-zh/lab-02-tools-and-dry-run.md)

[← Back to README](../../README.md) &nbsp;·&nbsp; [← Lab 1](./lab-01-safety-first.md)

# Lab 2 — Tools + Dry-Run the Exit

⏱ 10 min &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; know the exit before you enter

## Why

Most tutorials teach "destroy" at the end, as a footnote. That's backwards. If you don't trust the destroy path, you'll leave things running out of fear of breaking something. We rehearse destroy **now**, while there's nothing to destroy — so when you actually need it (Lab 10 or in a panic), you've seen the output before.

> vs _"the CLI will tell me what I need as I go"_ — it will, but not in a way that reassures you. Dry-runs on empty state reassure you without any blast radius.

## Do

1. **Install the toolchain** (skip what you already have):
   - `git` (any recent version)
   - `python3` ≥ 3.10
   - `node` 22 + `npm` 10 (matches CI)
   - `aws` CLI v2 (`aws --version` shows 2.x.y)
   - `gh` (GitHub CLI — `gh auth login` completed)
   - `jq` (used by several scripts for JSON parsing)

   OS-specific install commands + the `gh auth login` / `aws configure` steps: [`tools/install.md`](./tools/install.md).

   Then install the Python packages the wizards use (skip if you ran the README's [Before you start](../../README.md#before-you-start) already):
   ```
   pip install --user -r scripts/requirements.txt
   ```
   (typer + rich + questionary — the CLI UX layer)

2. **Run the tool validator** — this is the canonical check that all downstream scripts will use:
   ```
   python3 scripts/setup_repo.py validate-tools
   ```
   Output is a Rich table with `Tool | Available | Version | Authenticated` columns (column headers localize to your UI language — ja: `ツール | 利用可能 | バージョン | 認証済み`; zh-CN: `工具 | 可用 | 版本 | 已认证`). `Available` should read `ok` on every row; `Version` should be green for `python3`, `node`, `npm`, `aws` (each meets its doc-required floor — `3.10` / `22.0` / `10.0` / `2.0`); `Authenticated` should be `ok` on `aws` + `gh`. The validator exits non-zero if any tool is `missing` **or** a floor-checked tool is below its floor (e.g. Python 3.9, node 18) — install or upgrade the tool and re-run until all green. After the all-green table you'll see a `✓ Toolchain ready` panel pointing to Lab 2's next command.

3. **Dry-run the exit command against empty state.** Nothing is deployed yet, so this is guaranteed safe:
   ```
   python3 scripts/setup_repo.py destroy --dry-run
   ```
   Read the output. On empty state (right now) you'll see:
   - a **"Stacks (N)"** table — `N=0` since nothing is deployed yet. In Lab 10 this fills with every stack the apply created.
   - an **"ECR repositories to purge"** table — the repos destroy would empty. They don't exist yet, but the table shows their expected names so you recognize them later.
   - a **"What will NOT be touched"** block — your GitHub repo, Actions variables, and local git worktree are always preserved.
   - a **"Cost impact"** box with "Estimated cost stopped" — on empty state this reads `$0.00/day` (nothing deployed = nothing to stop). In Lab 10 after Lab 9 has shipped, the same box will read `$2.90/day` — what this command is about to save.

   The "Data loss warning" block only appears when there's real data at risk (S3 objects, ECR images) — you'll see it in Lab 10, not here.

4. **Open a PR** that documents your tool versions as proof. A `docs/` change is enough to trigger the `Validate` workflow. Four sub-steps:

   **a) Create the branch:**
   ```
   git checkout -b feat/lab-2-tools
   ```

   **b) Collect your tool versions first** — run each command and note the version string it prints. You'll type these into the doc in (c):
   ```
   git --version
   ```
   ```
   python3 --version
   ```
   ```
   node --version
   ```
   ```
   npm --version
   ```
   ```
   aws --version
   ```
   ```
   gh --version | head -1
   ```
   ```
   jq --version
   ```

   **c) Hand-edit this lab's doc to record them.** Open `docs/en/lab-02-tools-and-dry-run.md` in your editor, scroll to the very end of the file (past the `[Lab 3 — Wire the Lab (dev only)](./lab-03-wire-the-lab.md)` link on the last line), and append a new section. Replace each `<…>` placeholder with the value you read in (b):
   ```markdown

   ## My environment

   Recorded <YYYY-MM-DD>:

   - `git --version` → <git version>
   - `python3 --version` → <python3 version>
   - `node --version` → <node version>
   - `npm --version` → <npm version>
   - `aws --version` → <aws version>
   - `gh --version` → <gh version>
   - `jq --version` → <jq version>
   ```
   Save, then confirm your edit worked: `git diff docs/en/lab-02-tools-and-dry-run.md` should show your new `## My environment` section appended (around 10 new `+` lines) — nothing removed, nothing else changed.

   **d) Stage, commit, push, open the PR:**
   ```
   git add docs/en/lab-02-tools-and-dry-run.md
   ```
   ```
   git commit -m "docs(lab-2): record my tool versions"
   ```
   ```
   git push -u origin feat/lab-2-tools
   ```
   ```
   gh pr create --fill
   ```
   Note the PR number printed. If `gh pr create` fails with "could not find any commits between origin/main and feat/lab-2-tools", your edit in (c) didn't save — reopen the file, confirm `## My environment` is at the very bottom, save again, and retry.

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

- `validate-tools` exits 0 with every tool listed as `ok`.
- `destroy --dry-run` exits 0 with the banner "No changes will be made. This is a preview." and a `Stacks (0)` table.
- Your PR passes the `Validate / summary` check.
- Your Lab 2 progress badge turns ✓ when the PR merges.

## You just

Proved your toolchain is complete and rehearsed the emergency exit when the stakes are zero. From here on, destroy is a known command, not a scary one.

## Up next

[Lab 3 — Wire the Lab (dev only)](./lab-03-wire-the-lab.md)
