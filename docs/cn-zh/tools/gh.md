> 🌐 [English](../../en/tools/gh.md) &nbsp;·&nbsp; [日本語](../../ja/tools/gh.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# gh —— GitHub CLI

`gh` 是 GitHub 官方的命令行客户端。凡是你在 GitHub 网页上点击的操作,`gh` 都能从终端完成 —— 往往更快,而且始终可脚本化。

## 为什么在这里

本课所有 PR 都是用 `gh` 开、看、合的。你不需要切换到浏览器去点「Merge」。每次合并省下 10–30 秒 × 约 20 次合并 —— 更重要的是,这是你在写 CI/CD 脚本查询 PR 状态、列出最近 run、触发 workflow dispatch 时会一直复用的模式。

## 这些 lab 用到的命令

| 命令 | 做什么 | 出现在 |
|---|---|---|
| `gh auth login` | 一次性的 device flow 登录 | README 开始之前 |
| `gh repo create <slug> --template <tpl> --public --clone` | 从 GitHub template 克隆 | README |
| `gh pr create --fill` | 用 branch + 最近 commit 开 PR | Lab 1, 2, 4, 5, 8, 9 |
| `gh pr merge <number> --squash --delete-branch` | 合并 + 删分支 | CI 绿后每个 lab |
| `gh pr ready <number>` | 把 draft PR 翻成 ready-for-review | Lab 9 |
| `gh pr list --state open --json ...` | 用 JSON 字段列 PR | Lab 5, 7 |
| `gh pr view --json title` | 拿当前 PR 的标题 | Lab 5(标题校验) |
| `gh pr checks <number>` | 看 PR 的 CI 检查状态 | Lab 4 验证 |
| `gh run watch` | 实时跟正在跑的 workflow | Lab 4, 6 |
| `gh run list --limit N` | 列最近 workflow run | Lab 6, 7 |
| `gh workflow run <file>.yml --ref <tag>` | 手动派发 workflow | Lab 6(兜底) |
| `gh variable list` | 列 repo 级 Actions Variables | Lab 3 验证 |
| `gh repo view --json nameWithOwner --jq .nameWithOwner` | 拿当前 repo 的 slug | Lab 3(审计) |
| `gh api <path>` | 通用 GitHub REST API 调用 | `setup_repo.py` 内部 |

## 这个 lab 教给你的「生产真相」

- **OIDC + `gh` + AWS CLI 是「零长期密钥」三件套**。`gh` 管 GitHub 一侧(Actions Variables、repo 设置、branch protection),AWS CLI 建 IAM 角色。整个链路没有长期密钥。
- **`--json` + `jq` 是脚本编写的样板**。`gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore("))'` 输出机器可读的内容,可以安全 pipe。远胜于 grep 人类可读文本。
- **分页器陷阱**。很多 `gh` 命令默认即使输出很短也进分页器 —— 落到 `(END)`,按 `q` 退出。单次:`GH_PAGER=cat gh ...`;持久:`gh config set pager cat`。

## 可迁移技能

`gh` + `--json` + `jq` 这套组合在任何支持结构化输出的现代 CLI 上都适用:AWS CLI(`--output json`)、kubectl(`-o json`)、Terraform(`-json`)、Helm、以及任何有水平的内部工具。练出这个肌肉之后,面对任何工具都能写脚本。

**简历切入点**:值得在「CI/CD 自动化」或「DevOps 工具链」这一行里点出来 —— 特别是不用 PAT(用 repo-scoped `GITHUB_TOKEN`)就能脚本化 PR 生命周期 + workflow dispatch 的能力。

## 相关

- [`git.md`](./git.md) —— 搭档工具
- [`aws.md`](./aws.md) —— `gh` 让 GitHub Actions 去 assume 的 IAM 角色
- [`jq.md`](./jq.md) —— 让 `gh --json` 真正能用的 JSON 工具
- [`concepts/github-setup.md`](../concepts/github-setup.md) —— branch protection + merge 策略
- [GitHub CLI 手册](https://cli.github.com/manual/) —— 完整命令参考
