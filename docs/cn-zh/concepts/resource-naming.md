> 🌐 [English](../../en/concepts/resource-naming.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/resource-naming.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 概念深读](./README.md)

# 资源命名 —— 你看到的每个名字背后的那套模式

Lab 3 让你填的只有 `aws.resourceIdentifier` 和 `aws.region` 两个。这一页解释「为什么只需要这两个」、「你填的 slug 到底会出现在哪里」、「模板是怎么绕过 S3 的全局唯一性陷阱的」。事后要是在控制台里看到某个具体名字想知道它从哪来的,就过来查。

## 命名模板

CloudFormation 在本课里建的每个 AWS 资源都是从这一条模板拼出来的:

```
{resourceProjectName}-{envCode}-{kind}-{resourceIdentifier}[-{accountId}]
```

- `resourceProjectName` —— 默认 `resume`,跨环境共享。
- `envCode` —— `shared`、`dev`、`stg`、`prod`,看是哪个栈。
- `kind` —— 资源种类(`s3-site`、`ecr-web`、`iam-gh-release`、`cf-oac` 等)。
- `resourceIdentifier` —— **你自己** 在 Lab 3 填的 slug,用于在你自己的账号里区分。
- `accountId` —— 只追加在 S3 桶名末尾。12 位 AWS 账号 ID,一出手就锁死全局唯一性。

## 实际输出

填 `resourceIdentifier: my-cicd-lab`,其他保持默认:

| 资源 | 名字 | 末尾那段的用途 |
|---|---|---|
| S3 site 桶 | `resume-dev-s3-site-my-cicd-lab-123456789012` | `-<accountId>` 换全局唯一 |
| ECR repo | `resume-shared-ecr-web-my-cicd-lab` | 账号内唯一即可 |
| IAM 角色 | `resume-shared-iam-gh-release-my-cicd-lab` | 账号内唯一即可 |
| CloudFront OAC | `resume-dev-cf-oac-my-cicd-lab` | 账号内唯一即可 |

## S3 是全局唯一 —— 跨地球上所有 AWS 账号

不是「你账号内唯一」。地球上任意一个账号已经拿了 `my-bucket`,你的 `CreateBucket` 就会以 `BucketAlreadyExists` 失败。模板的解法是始终在 S3 桶名末尾追加 `-${AWS::AccountId}` —— 你 12 位的账号 ID 本身就保证全局唯一了,不需要你自己想一个花哨的 slug。

非 S3 资源(ECR、IAM、CloudFront OAC、ALB)只需要在 **AWS 账号 + region 内** 唯一。同一个账号里跑两份 lab,就每份填不同的 `resourceIdentifier`;跨账号本来就安全。

## 栈名来自另一个字段

`aws.stackPrefix`(默认 `resume-cicd-lab`)决定 CloudFormation **栈名**(`resume-cicd-lab-shared-oidc`、`resume-cicd-lab-dev-ecs-app` 等)。它 **不会** 出现在资源名里。Lab 3 的 Verify 列表一看就分得出:栈名都以 `resume-cicd-lab-` 开头,桶 / 角色 / ECR 名都以 `resume-` 开头。

`stackPrefix` 不要改 —— Verify 列表和 destroy 向导都假定它是默认值。

## `aws.resourceShortIdentifier` 为什么存在

ALB 和 target group 的名字最多 32 个字符。20 字符的 `resourceIdentifier` 一塞进去就爆。模板对这两种资源改用 `resourceShortIdentifier`(默认 `cl`,5 字符以内)。只有你在同一个账号 + region 里跑两份 lab 时才需要动 —— 否则保持 `cl` 永远没问题。

## 相关

- [`concepts/infrastructure.md`](./infrastructure.md) —— 完整 CloudFormation 栈布局
- [`config/project-setup.json`](../../../config/project-setup.json) —— 这些字段住在哪里
- [Lab 3 —— Wire the Lab](../lab-03-wire-the-lab.md) —— 填值的地方
