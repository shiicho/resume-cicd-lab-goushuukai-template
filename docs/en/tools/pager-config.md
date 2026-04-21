> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/pager-config.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/pager-config.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# Pager config — escape the `(END)` trap

All three CLIs these labs use (`gh`, `git`, `aws`) pipe their output through a pager by default. Even a one-line response often still lands at `(END)`, which looks like the command hung. It didn't — press `q` to exit, then configure it away permanently.

## Per-call escape

When you're already stuck and just need this one command to stop paging:

| CLI | Inline fix |
|---|---|
| `gh` | `GH_PAGER=cat gh ...` |
| `git` | `git --no-pager ...` |
| `aws` | append `--no-cli-pager` to the command |

## Persistent fix

Set once per machine, then forget. The README's [Before you start](../../../README.md#before-you-start) block runs the first two for you; add the `AWS_PAGER` line the first time AWS CLI paging bites you.

```
gh config set pager cat
```

```
git config --global core.pager cat
```

Then for AWS CLI, append to your shell rc so it applies to every new session (use `~/.bashrc` on bash):

```
echo 'export AWS_PAGER=""' >> ~/.zshrc
```

```
source ~/.zshrc
```

## Why this happens

`less` and friends are great when you're reading `man`-page volumes of text, but a modern terminal (tmux / iTerm2 / Alacritty / Ghostty) already gives you scroll-back. Paging a three-line response just creates friction. The configs above opt every session out.

## See also

- [`gh.md`](./gh.md) — GitHub CLI primer
- [`aws.md`](./aws.md) — AWS CLI primer
- [`git.md`](./git.md) — git primer
