> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/README.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/README.md)

[← Back to README](../../../README.md)

# Tool primers

Short primers on each CLI you'll meet in this course. **Opt-in** — skip any you already know. None of these are required reading to finish the labs; they're here so if a command looks unfamiliar, you have a one-page explainer to land on.

**Start here if you're setting up fresh:**

- [`install.md`](./install.md) — install the 6 CLIs per OS + log in (macOS / Linux / Windows)
- [`pager-config.md`](./pager-config.md) — escape the `(END)` trap once, forever

**Per-CLI primer:**

- [`git.md`](./git.md) — version control (branch, commit, push, pull)
- [`gh.md`](./gh.md) — GitHub CLI (PRs, runs, variables, API)
- [`aws.md`](./aws.md) — AWS CLI v2 (sts, cloudformation, s3, ecr, service-quotas)
- [`jq.md`](./jq.md) — JSON query (filters, projection, pipe-friendly output)
- [`python.md`](./python.md) — Python 3 + pip (for the lab wizards)
- [`node.md`](./node.md) — Node 22 + npm (for the web app + CI parity)

## Which of these are "production-worthy"?

Two of these tools are ones you'll reach for every day of your career after this course:

1. **`gh` + `jq`** together — machine-readable GitHub state from the terminal. Transferable to kubectl, AWS CLI, and any modern CLI that supports `--json`. **Resume-worthy** as "CI/CD automation tooling."
2. **`aws` CLI v2** with `--query` + `--output` — same pattern, different system. Every AWS engineer uses this daily. **Resume-worthy** as "AWS operational tooling."

The rest (`git`, `python`, `node`) are table stakes — cited only if the role explicitly asks.

## See also

- [`concepts/`](../concepts/) — deep design docs (push-mode CD, OIDC federation, immutable artifacts)
- Root [README](../../../README.md) — course overview + lab index
