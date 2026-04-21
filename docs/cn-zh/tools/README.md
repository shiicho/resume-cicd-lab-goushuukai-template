> 🌐 [English](../../en/tools/README.md) &nbsp;·&nbsp; [日本語](../../ja/tools/README.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# 工具入门

本课程用到的每个 CLI 的一页速览。**可选** —— 已经会的跳过就行。做完这些 lab 不需要读这里;它们放在这里是为了:如果你看到一条不熟悉的命令,有一页解释可以跳进去。

**从零开始搭环境就从这里入:**

- [`install.md`](./install.md) —— 按 OS 装 6 个 CLI + 登录(macOS / Linux / Windows)
- [`pager-config.md`](./pager-config.md) —— 一劳永逸逃出 `(END)` 陷阱

**每个 CLI 的入门:**

- [`git.md`](./git.md) —— 版本控制(branch、commit、push、pull)
- [`gh.md`](./gh.md) —— GitHub CLI(PR、run、variables、API)
- [`aws.md`](./aws.md) —— AWS CLI v2(sts、cloudformation、s3、ecr、service-quotas)
- [`jq.md`](./jq.md) —— JSON 查询(过滤、投影、pipe 友好)
- [`python.md`](./python.md) —— Python 3 + pip(用于 lab 的向导)
- [`node.md`](./node.md) —— Node 22 + npm(Web 应用 + CI 对齐)

## 这里面哪些是「能上生产」的?

这个课结束后,你职业生涯里几乎每天要用的两个:

1. **`gh` + `jq`** 组合 —— 从终端拿到机器可读的 GitHub 状态。可迁移到 kubectl、AWS CLI、任何支持 `--json` 的现代 CLI。**简历价值**:「CI/CD 自动化工具」。
2. **`aws` CLI v2** + `--query` + `--output` —— 相同的模式在另一套系统上。AWS 工程师每天都用。**简历价值**:「AWS 运维工具」。

其余(`git`、`python`、`node`)是前提知识水平 —— 仅在职位明确要求时写出来。

## 相关

- [`concepts/`](../concepts/) —— 深度设计文档(push 模式 CD、OIDC 联邦、不可变产物)
- 根 [README](../../../README.cn-zh.md) —— 课程概览 + lab 索引
