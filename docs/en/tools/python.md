> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/python.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/python.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# python — Python 3

The lab's wizards (`setup_repo.py`, `promotion_wizard.py`, `claim.py`) are written in Python 3. Lab 2's validator enforces a floor (≥ 3.10).

## Why it's here

Python is the connective tissue for the lab's CLI UX. It gives us:

- **Interactive CLI UX** — live progress bars, typed-scope confirmations, paneled errors. Shell scripts can't match this.
- **Cross-platform** — one codebase runs on macOS, Linux, and (via WSL) Windows.
- **Easy AWS integration** — either via `boto3` or shelling out to the `aws` CLI.

## The lab's dependency set

From `scripts/requirements.txt`:

- **`typer`** — CLI framework (click under the hood)
- **`rich`** — terminal rendering (progress bars, panels, tables, colored output)
- **`questionary`** — interactive pickers (arrow-key selection)

One-time install (Lab 2 or README Before-you-start):

```
pip install --user -r scripts/requirements.txt
```

## What the lab scripts look like

| Script | What it does |
|---|---|
| `scripts/setup_repo.py` | Apply wizard: validates tools, scopes environments, deploys 4–6 CloudFormation stacks with live event streaming, syncs `deploy/*` manifests, sets GitHub Actions Variables + branch protection. |
| `scripts/setup_repo.py destroy` | Same script, destroy flow: dry-run preview, typed-scope confirmation, teardown with per-stack progress. |
| `scripts/promotion_wizard.py` | Source → target picker + unified diff + draft-PR creation for cross-env promotion (see [`concepts/promotion-wizard.md`](../concepts/promotion-wizard.md)). |
| `scripts/claim.py` | Lab progress marker: opens a `claim/lab-N` branch + empty-change PR that the `lab-label` workflow tags on merge. |

## Production truths this lab teaches

- **Rich + Typer is an underrated CLI UX stack.** A wizard with progress bars + colored panels + typed confirmations makes destroy feel like real infrastructure — because that's how tools like k6, Vault, or Terraform Cloud CLI already feel.
- **`subprocess.Popen` with `stdout=DEVNULL` + `stderr=PIPE` + a separate event-polling loop** is how you show live CloudFormation events while keeping `aws` CLI's noisy "Waiting for changeset…" out of your rendered panel. See `setup_repo.py`'s `deploy_stack()`.
- **Dry-run is a code pattern, not a flag.** Build every destructive tool as "preview that could also apply" — default to preview. See `setup_repo.py destroy --dry-run`.

## Transferable skill highlight

**Building interactive CLI wizards with Python + Rich** is a genuinely production-worthy skill. DevOps platforms, internal developer-productivity tools, and CI/CD utilities all reach for it.

**Resume angle**: If you understand `setup_repo.py`'s pattern well enough to replicate it, that's real **ツール作成** (tool creation) — cite it under "built a Python-Rich CLI for CloudFormation orchestration with live event streaming + typed-scope destroy confirmation."

## See also

- [`concepts/promotion-wizard.md`](../concepts/promotion-wizard.md) — deep-dive on one of the wizards
- [Rich docs](https://rich.readthedocs.io/) — the library behind the lab's UI
- [Typer docs](https://typer.tiangolo.com/) — command definition + parsing
