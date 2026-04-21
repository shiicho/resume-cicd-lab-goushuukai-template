> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/jq.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/jq.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# jq — JSON query

`jq` is a command-line JSON processor. It takes JSON on stdin (or a file) and lets you filter, project, and transform with a tiny, very powerful expression language. Think of it as `sed` / `awk` for structured data.

## Why it's here

The labs lean on JSON everywhere: `config/project-setup.json`, `deploy/shared/delivery.json`, `deploy/static/development/site.json`, `deploy/ecs/development/task-definition.json`. Every "look up X" or "confirm Y" is probably a `jq` one-liner.

`gh --json` and `aws ... --output json` also pair with `jq` for last-mile shaping.

## Expressions these labs use

| Expression | What it does | Seen in |
|---|---|---|
| `jq .aws config/project-setup.json` | Drill into the `.aws` object | Lab 3 |
| `jq '{rid: .aws.resourceIdentifier, region: .aws.region}'` | Project selected fields into a new object | Lab 3 Verify |
| `jq -r .artifactBucket deploy/shared/delivery.json` | Raw string output (no JSON quotes) | Labs 6, 7 |
| `jq -r .publicBaseUrl deploy/static/development/site.json` | Raw URL | Lab 7 |
| `jq '.[] \| select(.title \| startswith("chore("))'` | Filter array elements by predicate | Labs 5, 7 |

Key flags:

- **`-r` / `--raw-output`** — strip JSON quotes. Use whenever piping into another command.
- **`-c` / `--compact-output`** — one line per record (good for `while read`).
- **`.` alone** — pretty-print input (sanity-check your JSON).

## Production truths this lab teaches

- **`jq` + a CLI's `--json` output is the universal scripting contract.** Shell scripts no longer parse human-readable text.
- **`-r` is almost always what you want.** Without it, `jq .name` returns `"resume-cicd-lab"` (with quotes); `jq -r .name` returns `resume-cicd-lab` (plain string). Plain strings pipe cleanly.
- **Filters compose with `|`.** Pipes inside the `jq` expression, not shell pipes. `.items | map(.id)` selects `items` then maps to IDs.

## Pitfalls

- **Backtick escaping in `aws --query`.** AWS CLI's JMESPath expressions use literal backticks for string delimiters, which clash with shell backticks. Use `--query "imageDetails[?imageTags != null].{tags:join(\`,\`, imageTags)}"` (escape backticks). See Lab 6.
- **Missing keys return `null`, not errors.** `jq .missing foo.json` on `{}` outputs `null` and exits 0. Double-check your query path if output looks empty.

## Try it

After Lab 5 ships a release, inspect the delivery manifest:

```
jq . deploy/shared/delivery.json
```

Then pick specific fields:

```
jq '{bucket: .artifactBucket, ecr: .ecrRepositoryUri}' deploy/shared/delivery.json
```

## Transferable skill highlight

If you can write `jq` filters confidently, you can hand-write ops scripts for any cloud (GCP, Azure all have JSON output) or tool (kubectl, terraform, helm). `jq` fluency is a multiplier.

**Resume angle**: "CI/CD + infrastructure automation" — specifically the ability to script GitHub + AWS operational flows against machine-readable state, not text-parsing.

## See also

- [`gh.md`](./gh.md) — `gh --json X,Y --jq '...'` pattern
- [`aws.md`](./aws.md) — AWS CLI `--query` is JMESPath (similar but distinct from `jq`); `jq` finishes the pipe
- [jq manual](https://jqlang.github.io/jq/manual/) — authoritative reference
