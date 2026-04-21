> 🌐 [English](../../en/concepts/bot-loop-workaround.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/bot-loop-workaround.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 概念深读](./README.md)

# bot-loop 绕行:close + reopen

你会在 Lab 5(Release PR)和 Lab 7(Promotion PR)踩到这个 —— `summary` 一直不绿,`--auto` 死活不肯合,但你的代码完全没问题。这篇说清楚规则、一次性修复、以及永久修复。

## 规则

用内置的 `GITHUB_TOKEN` 触发的 workflow **不会** 触发下游的 workflow。这是一条安全规则,正式写在 [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)。

在这个 repo 里:
- Release Please 以 `github-actions[bot]` 身份开 PR → `Validate` workflow 的 `pull_request` 触发器不发火 → 必需的 `summary` check 永远不出现 → branch protection 不让你合。
- `release-assets.yml` 以同样方式开 promotion PR → 同样卡住。

## 一次性修复

close 再 reopen。GitHub 把 `pull_request.reopened` 当作「用户操作」,workflow 就能正常跑:

```
gh pr close <number>
```

```
gh pr reopen <number>
```

之后 `gh pr merge <number> --auto --squash --delete-branch` 会在 `summary` 一绿的瞬间合并。每个 Release PR 一次,每个 Promotion PR 一次 —— 成本就这么多。

## 永久修复 —— Lab 11 彩蛋

造一个 GitHub App,在两个被卡的 workflow 里用 installation token,让 PR 以 App 身份而不是 `GITHUB_TOKEN` 身份打开。App 触发的 workflow 被当作「用户操作」,完全绕过这条规则。

[Lab 11 —— 把循环做成生产级(GitHub App)](../lab-11-bonus-github-app.md) 用 ~15 分钟走完整个配置: 造 App、装到 repo、存凭据、改两个 workflow。一次性配置,从此 close + reopen 的仪式彻底消失。

## 这条规则为什么存在

没有这条规则的话,一个 workflow 开 PR → 那个 PR 触发 workflow → 又开 PR……无限递归。GitHub 从根上把这种死循环切掉了。代价是在你接上 App 之前,两次点击的手工活。

## 相关

- [release-please-action issue #922](https://github.com/googleapis/release-please-action/issues/922) —— 最早报告这个陷阱的 issue,包含 workaround 和另类认证策略。
- [Lab 5 —— First Release Tag](../lab-05-first-release-tag.md) —— 第一次咬人。
- [Lab 7 —— First Deploy](../lab-07-first-deploy.md) —— 再咬一次。
- [Lab 11 —— Ship the Loop (GitHub App)](../lab-11-bonus-github-app.md) —— 行业标准修复。
