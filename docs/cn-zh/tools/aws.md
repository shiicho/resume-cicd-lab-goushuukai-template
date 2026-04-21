> 🌐 [English](../../en/tools/aws.md) &nbsp;·&nbsp; [日本語](../../ja/tools/aws.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# aws —— AWS CLI v2

AWS 官方命令行客户端。所有 AWS 服务 —— S3、EC2、CloudFormation、ECR、IAM、Service Quotas —— 都可以通过 `aws <service> <verb>` 访问。Lab 2 里装 v2(`aws --version` 输出 `2.x.y`)。

## 为什么在这里

本课要 provision 真实的 AWS 资源。`aws` 你会用它做三件事:

1. **身份 / 常识检查** —— 「我是谁?」「现在是哪个账号 / 区域?」
2. **只读检查** —— 列 CloudFormation 栈、S3 产物、ECR 镜像、VPC/IGW 数量
3. **配额管理** —— Lab 9 之前申请 VPC / IGW 配额增加

CloudFormation 栈创建本身由 `setup_repo.py` 驱动(内部 shell out 到 `aws cloudformation deploy`),所以你不需要手写这些调用。

## 这些 lab 用到的命令

| 命令 | 做什么 | 出现在 |
|---|---|---|
| `aws sts get-caller-identity` | 我是谁 / 哪个账号? | Lab 0 常识 |
| `aws cloudformation list-stacks --query ...` | 按状态列栈 | Lab 3 验证、Lab 10 验证 |
| `aws cloudformation describe-stacks --stack-name ...` | 拿栈的 outputs(例如 ALB DNS) | Lab 7 |
| `aws s3 ls s3://<bucket>/<path>/` | 列 S3 前缀下的对象 | Lab 6 |
| `aws ecr describe-images --repository-name ... --query ...` | 列 ECR 的镜像 + digest | Lab 6 |
| `aws ec2 describe-vpcs --query 'length(Vpcs)'` | 数当前区域的 VPC | Lab 9 |
| `aws ec2 describe-internet-gateways --query ...` | 数 IGW | Lab 9 |
| `aws service-quotas request-service-quota-increase` | 申请配额增加 | Lab 9 |
| `aws service-quotas list-requested-service-quota-change-history-by-quota` | 看配额申请进度 | Lab 9 |

## 这个 lab 教给你的「生产真相」

- **`--query` + `--output text` 比 grep JSON 强**。`--query` 用 JMESPath —— 一门 JSON 查询语言。同样的语法跨所有 AWS 服务。Lab 3 / 6 / 7 的例子可以参考。
- **`--no-cli-pager`** 要内联在每条命令上,不然会踩 `(END)` 陷阱。持久方案:在 `~/.zshrc` / `~/.bashrc` 里加 `export AWS_PAGER=""`。
- **Service Quotas 是真实的**。AWS 默认比较保守(每区域 5 VPC / 5 IGW)。共享账号下会卡你,所以 Lab 9 里提前申请增加。`request-service-quota-increase` + `list-requested-service-quota-change-history` 这一对是职业技能。
- **`aws sts get-caller-identity`** 是事情诡异时第一个要打的命令。「哦,我在错的账号里」救过很多小时。

## VPC + IGW 配额预检(Lab 9 的坑)

AWS 每区域默认给你 **5 个 VPC 和 5 个 Internet Gateway**。Lab 9 的 staging `ecs-app` 栈各会加 1 —— 如果你那个区域已经到 4,Lab 9 apply 到一半就会撞上 `ServiceLimitExceeded`。先查一下水位,不够就申请增加。

查 Lab 3 选定区域的现有数量(把 `ap-northeast-1` 换成你的区域):

```
aws ec2 describe-vpcs --region ap-northeast-1 --query 'length(Vpcs)' --no-cli-pager
```

```
aws ec2 describe-internet-gateways --region ap-northeast-1 --query 'length(InternetGateways)' --no-cli-pager
```

任一返回 `4` 或更多,就申请增到 `10`。这种小幅增加 AWS 几分钟内自动批。

VPC 配额:

```
aws service-quotas request-service-quota-increase --service-code vpc \
  --quota-code L-F678F1CE --desired-value 10 --region ap-northeast-1
```

Internet Gateway 配额:

```
aws service-quotas request-service-quota-increase --service-code vpc \
  --quota-code L-A4707A72 --desired-value 10 --region ap-northeast-1
```

看在处理中的申请:

```
aws service-quotas list-requested-service-quota-change-history-by-quota \
  --service-code vpc --quota-code L-F678F1CE --region ap-northeast-1 --no-cli-pager
```

quota-code 是跨 region 通用的 AWS 标识(`L-F678F1CE` 是 VPC、`L-A4707A72` 是 IGW)—— 换 region 这两个值不变。

## 如果你用 profile

如果你管着多个 AWS 账号,配置命名 profile(`aws configure --profile <name>`),每条命令带 `--profile <name>`,或者在 shell 里 `export AWS_PROFILE=<name>`。本课预设是默认单 profile —— 你的情况不同就给下面所有命令加 `--profile <name>`。

## 可迁移技能

中等以上规模的 SaaS 里 AWS CLI v2 都是标配。`--query`(JMESPath)+ `--output text` + 认真的 `--region` 范围限制,是写可预测、幂等、CI 友好的运维脚本的套路。

**简历切入点**:「AWS 运维工具」或「基础设施自动化」—— 特别是能不开浏览器就脚本化多服务(CloudFormation + IAM + ECR + S3)的读写流。

## 相关

- [`jq.md`](./jq.md) —— AWS 的 `--query` 是 JSON in/out,`jq` 把 pipe 收尾
- [`concepts/infrastructure.md`](../concepts/infrastructure.md) —— 每个 CloudFormation 栈里装了什么
- [`concepts/architecture.md`](../concepts/architecture.md) —— AWS 一侧的拓扑
- [AWS CLI v2 参考](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/index.html) —— 完整服务列表
