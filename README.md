> 🌐 **English** &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.cn-zh.md)

# resume-cicd-lab

Ship one React app to AWS two ways — S3 + CloudFront **and** ECS/Fargate — through a full release-and-promote pipeline you run hands-on in 11 labs.

> ⏱ ~2 hours hands-on &nbsp;·&nbsp; 💰 $1.45 – $2.90 / day while active &nbsp;·&nbsp; 🧹 $0 after Lab 10

- 🔗 **Live demo**: _ships during Lab 7 — your deployment will have its own URL_
- 🧭 **Architecture diagram**: [`docs/en/concepts/architecture.md`](docs/en/concepts/architecture.md)
- 🛠 **Tool primers** (opt-in): [`docs/en/tools/`](docs/en/tools/README.md) — one-page explainers for git, gh, aws, jq, python, node
- 📚 **Concept deep-dives**: [`docs/en/concepts/`](docs/en/concepts/) — CI/CD model, OIDC federation, promotion wizard, etc.

---

## Who this is for

✅ You know git and Docker, can read CloudFormation without help, and want to wire GitHub Actions → AWS without long-lived keys.  
✅ You want rationale ("why OIDC? why push-mode? why two deploy targets?"), not a click-through GUI tutorial.  
✅ You have an AWS account you control and can spend about **$5 total** on learning.  
❌ If you want a point-and-click guided UI, use [AWS Workshop Studio](https://catalog.workshops.aws/) instead.

The repo ships pre-configured with a working resume as the deployable payload. You'll ship **a real React app** through a real release pipeline, then (if you want) swap the resume content for your own.

## What you'll build

1. A GitHub Actions pipeline using **OIDC** (no long-lived AWS keys in secrets)
2. One React app compiled into **two immutable artifacts per release**: an S3 zip and an ECR image, built once and promoted across environments
3. A **tracked-manifest** model where every deploy is a reviewable pull request, not a click in the AWS console

## Why this way, not that

- **Why OIDC, not AWS access keys in secrets?** &nbsp;Short-lived tokens issued per workflow run expire in minutes; a leaked long-lived key is a breach. OIDC removes the rotation problem entirely.
- **Why push-mode CD, not Argo CD pull mode?** &nbsp;Every deploy step is visible in a GitHub Actions log. Pull-mode hides state reconciliation inside the cluster — great for production scale, worse for learning what each step does.
- **Why CloudFormation, not Terraform?** &nbsp;One fewer toolchain in the teaching loop. Stack deletion is atomic and guaranteed-safe — good for an AWS account you want to fully reset between runs.
- **Why two deploy targets (S3 and ECS), not one?** &nbsp;So you feel the difference personally in Lab 7 — same release, different runtimes, different trade-offs — instead of reading about it in the abstract.

---

## The labs

You do 11 labs in order. Each lab is short (read ≤30 sec, do 2–10 min, verify, celebrate) and ends in a merged pull request that records your progress.

| # | Title | Time | Cost | Action |
|---|---|---|---|---|
| 0 | [The Preview](docs/en/lab-00-preview.md) | 5 min | $0 | Scope the work; commit before you install anything |
| 1 | [Safety First — AWS Budgets](docs/en/lab-01-safety-first.md) | 5 min | $0 | Set `safety.email` in config; the budget tripwire deploys with Lab 3 |
| 2 | [Tools + Dry-Run the Exit](docs/en/lab-02-tools-and-dry-run.md) | 10 min | $0 | Install tooling; run `destroy --dry-run` against empty state |
| 3 | [Wire the Lab (dev only)](docs/en/lab-03-wire-the-lab.md) | 25 min | **+$1.45/day** | Edit 4 config fields; run the setup wizard; watch 4 CloudFormation stacks deploy |
| 4 | [First Green Check](docs/en/lab-04-first-green-check.md) | 5 min | $0 | Push a trivial change; watch CI run live in your terminal |
| 5 | [First Release Tag](docs/en/lab-05-first-release-tag.md) | 10 min | $0 | Merge a `feat:` commit; let Release Please cut `web-v0.1.0` |
| 6 | [First Artifacts (S3 + ECR)](docs/en/lab-06-first-artifacts.md) | 10 min | $0 | Inspect the S3 zip and ECR digest your tag produced |
| 7 | [First Deploy](docs/en/lab-07-first-deploy.md) | 10 min | $0 | Review the bot's promotion PR; merge; open your live URL |
| 8 | [Self-Proof Banner](docs/en/lab-08-self-proof-banner.md) | 15 min | $0 | Add a build-info banner — your site now **proves** what it was built by |
| 9 | [First Promotion (dev → staging)](docs/en/lab-09-first-promotion.md) | 20 min | **+$1.45/day** | Run the promotion wizard; same artifact, different environment |
| 10 | [The Teardown](docs/en/lab-10-teardown.md) | 10 min | **-$2.90/day** | `destroy --dry-run`, typed-scope confirm, back to $0 |
| 11 | [Ship the Loop (GitHub App)](docs/en/lab-11-bonus-github-app.md) _(bonus)_ | 15 min | $0 | Retire the Lab 5 / Lab 7 close + reopen with a GitHub App — optional, pure GitHub |

**Total hands-on**: ~2h 10min (excludes AWS stack-create wait, excludes the optional Lab 11 bonus).
**Peak daily spend** (after Lab 9): $2.90/day until Lab 10 zeros it.
**Final state** (after Lab 10): account back to $0/day, local git history preserved.

---

## Your progress

Every lab ends in a merged PR. On merge, [`.github/workflows/lab-label.yml`](.github/workflows/lab-label.yml) applies a `lab-N-complete` label, and the badge below reads that label's count. **All `0` = not started** · **all `1` = done**.

[![Lab 0](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-0-complete+is%3Amerged&label=Lab%200&style=flat-square&color=gold&cacheSeconds=60)](docs/en/lab-00-preview.md)
[![Lab 1](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-1-complete+is%3Amerged&label=Lab%201&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/en/lab-01-safety-first.md)
[![Lab 2](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-2-complete+is%3Amerged&label=Lab%202&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/en/lab-02-tools-and-dry-run.md)
[![Lab 3](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-3-complete+is%3Amerged&label=Lab%203&style=flat-square&color=gold&cacheSeconds=60)](docs/en/lab-03-wire-the-lab.md)
[![Lab 4](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-4-complete+is%3Amerged&label=Lab%204&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/en/lab-04-first-green-check.md)
[![Lab 5](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-5-complete+is%3Amerged&label=Lab%205&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/en/lab-05-first-release-tag.md)
[![Lab 6](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-6-complete+is%3Amerged&label=Lab%206&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/en/lab-06-first-artifacts.md)
[![Lab 7](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-7-complete+is%3Amerged&label=Lab%207&style=flat-square&color=gold&cacheSeconds=60)](docs/en/lab-07-first-deploy.md)
[![Lab 8](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-8-complete+is%3Amerged&label=Lab%208&style=flat-square&color=gold&cacheSeconds=60)](docs/en/lab-08-self-proof-banner.md)
[![Lab 9](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-9-complete+is%3Amerged&label=Lab%209&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/en/lab-09-first-promotion.md)
[![Lab 10](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-10-complete+is%3Amerged&label=Lab%2010&style=flat-square&color=gold&cacheSeconds=60)](docs/en/lab-10-teardown.md)

Labs 0, 3, 6, 10 end in a claim PR you open with `./scripts/claim.py lab-N`. The others produce their own feature, release, or deploy PR — the workflow recognizes both shapes and applies the label either way.

## Picking up again?

Badges above are idempotent — if you stopped mid-run yesterday, nothing decayed. Find your spot with a single command:

```
./scripts/where-was-i.py
```

Prints your last completed lab + the next lab's doc pointer + (where relevant) any auto-opened PR that's probably still waiting for you.

---

## Before you start

**If you received this repo as a `.tar.gz`** (not a direct clone), extract it and cd in first:

```
mkdir -p ~/Projects
tar -xzf ~/Downloads/handoff.tar.gz -C ~/Projects
cd ~/Projects/resume-cicd-lab
```

Create your own GitHub repo and push the seeded commit (the tar ships with an initial commit already staged, so `--source=. --push` just works):

```
gh repo create <owner>/<name> --public --source=. --push
```

> **Why `--public`?** The progress badges render via shields.io, which queries GitHub's unauthenticated search API — that API can't see private repos, so private-repo badges always read `0`. Public also makes: the packager's resume content (you can swap it after Lab 7), your `safety.email`, your AWS role ARN (contains your AWS account ID), and Actions workflow logs all world-readable. AWS access is still safe — OIDC trust is scoped to the exact repo slug and AWS role; visibility does not change the security boundary. If you prefer private, swap `--public` for `--private` here; the badges will read `0` but your label progress is still queryable locally via `./scripts/where-was-i.py`.

One-time install of the Python deps the lab CLIs use:

```
pip install --user -r scripts/requirements.txt
```

One-time: turn off default CLI pagers so short outputs don't strand you at `(END)`:

```
gh config set pager cat
git config --global core.pager cat
# For AWS CLI: add `export AWS_PAGER=""` to your ~/.zshrc or ~/.bashrc.
# Per-call alternative: `--no-cli-pager` (lab docs already use this where needed).
```

> **UI language.** The first wizard you run (`claim.py` / `setup_repo.py` / `promotion_wizard.py`) asks whether to use English, 日本語, or 中文 — auto-detected from `$LANG` and persisted to `config/project-setup.json`. Override on any invocation with `--locale en` / `--locale ja` / `--locale zh-CN`. Commands, flags, and JSON keys stay English in every locale; only panels, prompts, and celebration text localize.

> Lab 3 walks you through four config fields — `github.owner`/`github.repo` (retarget OIDC from the packager's slug to yours), plus `aws.resourceIdentifier` and `aws.region`. No separate setup step.
>
> Assumes `python3` ≥ 3.10 and `pip` are already on your PATH. If `pip install --user` installs into a directory not on your PATH, rerun with `python3 -m pip install --user -r scripts/requirements.txt`.
>
> Lab 0's claim PR auto-retargets the packager's slug to yours in two places: the README progress-badge URLs (so your merged lab labels flip the grid in the right repo from the start) and `config/project-setup.json`'s `github.owner`/`github.repo` (so Lab 3's OIDC trust policy binds to your repo). Lab 3 only asks you to choose `aws.resourceIdentifier` and `aws.region`.

---

## Start here

👉 **[Lab 0 — The Preview](docs/en/lab-00-preview.md)**

Lab 0 is just reading + a claim PR. It takes 5 minutes and decides whether you want to commit the next two hours. No AWS touched until Lab 3.

## If you need to stop early

Lab 10 is self-contained. At any point you can jump to it:

```
./scripts/setup_repo.py destroy --dry-run    # preview what will be deleted
./scripts/setup_repo.py destroy               # apply after reviewing the preview
```

Or see [Lab 10 — The Teardown](docs/en/lab-10-teardown.md).

---

## Repo layout

```
resume-cicd-lab/
├── app/                      ← the React SPA (the resume, deployed)
├── config/                   ← project-setup.json — the file you edit in Lab 3
├── deploy/                   ← tracked manifests — the contract between CI and AWS
│   ├── shared/               ← artifact bucket + ECR repo
│   ├── static/<env>/         ← S3 + CloudFront targets per environment
│   └── ecs/<env>/            ← ECS task-def + service per environment
├── infra/cloudformation/     ← pure CFN templates (4 stacks per environment)
├── scripts/                  ← setup_repo.py (wizard), promotion_wizard.py, claim.py, where-was-i.py, watch-pipeline.sh; wizard/ + locales/ for UI i18n
├── .github/workflows/        ← Validate, Release Please, Build Release, Deploy Static/ECS
└── docs/                     ← lab files + concept docs (en / ja / cn-zh)
```

---

## Notes

- The wizard CLIs (`claim.py` / `setup_repo.py` / `promotion_wizard.py`) localize their UI prose — panels, prompts, celebrations — to en / ja / zh-CN. Commands, flags, JSON keys, and subprocess output from AWS / CloudFormation / GitHub stay English; they're part of the CLI's API surface (Git's porcelain/plumbing rule). See the UI-language note in [Before you start](#before-you-start).
- Guiding docs (this README, the 11 labs, concept docs) are translated to **日本語** and **简体中文** — see the language picker above.
- This is a pre-production learning artifact. Do not use the generated infrastructure to host anything you care about keeping online. Lab 10 tears it all down.
