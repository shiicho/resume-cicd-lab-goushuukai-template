> 🌐 [English](../../en/tools/jq.md) &nbsp;·&nbsp; [日本語](../../ja/tools/jq.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# jq —— JSON 查询

`jq` 是一个命令行 JSON 处理器。从 stdin(或文件)拿 JSON,用一套小而强的表达式语言做过滤、投影、转换。可以把它看成结构化数据版的 `sed` / `awk`。

## 为什么在这里

这些 lab 里到处是 JSON:`config/project-setup.json`、`deploy/shared/delivery.json`、`deploy/static/development/site.json`、`deploy/ecs/development/task-definition.json`。文档里「确认 X」「查一下 Y」基本都是 `jq` 的一行式。

另外 `gh --json` 和 `aws ... --output json` 也都跟 `jq` 搭配做最后的整形。

## 这些 lab 用到的表达式

| 表达式 | 做什么 | 出现在 |
|---|---|---|
| `jq .aws config/project-setup.json` | 钻进 `.aws` 对象 | Lab 3 |
| `jq '{rid: .aws.resourceIdentifier, region: .aws.region}'` | 把选定字段投影成新对象 | Lab 3 验证 |
| `jq -r .artifactBucket deploy/shared/delivery.json` | 纯字符串输出(不带 JSON 引号) | Lab 6, 7 |
| `jq -r .publicBaseUrl deploy/static/development/site.json` | 纯 URL | Lab 7 |
| `jq '.[] \| select(.title \| startswith("chore("))'` | 按谓词过滤数组 | Lab 5, 7 |

关键 flag:

- **`-r` / `--raw-output`** —— 去掉 JSON 引号。要 pipe 给下一个命令时几乎一定要用。
- **`-c` / `--compact-output`** —— 每条记录一行(配合 `while read`)。
- **`.`(只这一个字符)** —— pretty-print 输入(验证 JSON 有效性)。

## 这个 lab 教给你的「生产真相」

- **`jq` + CLI 的 `--json` 输出是万金油的脚本契约**。shell 脚本再也不用解析人类可读文本。
- **`-r` 几乎就是你想要的**。不加 `-r`,`jq .name` 输出 `"resume-cicd-lab"`(带引号);加 `-r`,输出 `resume-cicd-lab`(纯字符串)。纯字符串能干净地 pipe。
- **过滤用 `|` 组合**。这是 `jq` 表达式里的 pipe,不是 shell pipe。`.items | map(.id)` 先选 `items` 再 map 成 id。

## 陷阱

- **`aws --query` 里的反引号转义**。AWS CLI 的 JMESPath 用反引号做字符串分隔符,会跟 shell 反引号冲突。用 `--query "imageDetails[?imageTags != null].{tags:join(\`,\`, imageTags)}"`(转义反引号)。Lab 6 有例子。
- **键不存在时返回 `null`,不是报错**。`jq .missing foo.json` 对 `{}` 输出 `null` 并 exit 0。输出空的时候先怀疑你的查询路径。

## 试一下

Lab 5 跑完发布后,看一下 delivery manifest:

```
jq . deploy/shared/delivery.json
```

然后挑字段:

```
jq '{bucket: .artifactBucket, ecr: .ecrRepositoryUri}' deploy/shared/delivery.json
```

## 可迁移技能

`jq` 能自信地写,意味着你能给任何云(GCP、Azure 都有 JSON 输出)或工具(kubectl、terraform、helm)手写运维脚本。`jq` 流利度是乘数。

**简历切入点**:「CI/CD + 基础设施自动化」—— 特别是能不靠文本解析、直接拿机器可读状态把 GitHub + AWS 运维流脚本化的能力。

## 相关

- [`gh.md`](./gh.md) —— `gh --json X,Y --jq '...'` 模式
- [`aws.md`](./aws.md) —— AWS CLI 的 `--query` 是 JMESPath(和 `jq` 类似但有别);`jq` 把 pipe 收尾
- [jq 手册](https://jqlang.github.io/jq/manual/) —— 经典参考
