> 🌐 [English](../en/lab-03-wire-the-lab.md) &nbsp;·&nbsp; [日本語](../ja/lab-03-wire-the-lab.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 2](./lab-02-tools-and-dry-run.md)

# Lab 3 — Wire the Lab (dev only)

⏱ 动手 25 分钟(+ CloudFormation 等待) &nbsp;·&nbsp; 💰 **+$1.45/日 从这里开始**

## 为什么

这个 lab 结束时,你的 AWS 账号里会有 4 个真实的 CloudFormation 栈、第一份 GitHub↔AWS OIDC 信任、以及每天 $1.45 的开销。你要改两个配置字段、跑一次 setup 向导,剩下的交给 CloudFormation 去埋头工作。完成时你会拥有:

- GitHub Actions 与 AWS 账号之间的 OIDC 信任(没有长期凭据)
- 一个共享的产物 S3 bucket + ECR 仓库
- 每个环境的 S3+CloudFront 静态站点目标
- 每个环境的 VPC + ALB + ECS Fargate 运行时目标

首次运行的范围是 `development` only。完整的提升流(dev→staging)在 Lab 9;production 刻意不在本 lab 范围内。

> vs _「一次性把 3 个环境全开起来少跑一趟」_ —— 那你会为 staging 和 prod 空耗接下来的 2 小时,学的东西还没用上。先 dev 能把花费控制在 $1.45/日,而不是 $5.40/日。

## 做什么

1. **编辑 `config/project-setup.json`**。用编辑器打开。`github.owner`/`github.repo` 已经指向了你自己的 repo —— 想看的话 `grep -A2 '"github":' config/project-setup.json` 可以核对。

   **改之前,先瞄一眼现在的 `aws` 块:**
   ```
   jq .aws config/project-setup.json
   ```
   你会看到 6 个字段。其中两个需要你自己选:

   | 字段 | 填什么 | 例子 |
   |---|---|---|
   | `aws.resourceIdentifier` | 附加到 AWS **资源**名(S3 / ECR / IAM / CloudFront)末尾的短 slug —— 小写 + 连字符,不超过 20 字符 | `my-cicd-lab` |
   | `aws.region` | 要部署到哪个 AWS region | `ap-northeast-1`(默认就行) |

   改完之后,`aws` 块应该长这样(真正的嵌套 JSON,不是 `"aws.region"` 这种伪点号写法):
   ```json
   "aws": {
     "region": "ap-northeast-1",
     "stackPrefix": "resume-cicd-lab",
     "resourceProjectName": "resume",
     "resourceIdentifier": "my-cicd-lab",
     ...
   },
   ```

   **保存后,确认改动生效:**
   ```
   jq '{resourceIdentifier: .aws.resourceIdentifier, region: .aws.region}' config/project-setup.json
   ```
   你应该看到你填的那两个值(比如 `"my-cicd-lab"` 和 `"ap-northeast-1"`),没有任何占位符字符留下。

   **为什么只有这两个:**

   `resourceIdentifier` 会被写进向导创建的几乎每一个 AWS 资源名里(S3 bucket、ECR repo、IAM role、CloudFront OAC 等)。选一个你能在 AWS 控制台里一眼认出的 slug。`resourceShortIdentifier`(默认 `cl`)是 AWS 限 32 字符的地方(ALB、target group)才用的另一个别名 —— 只在同一账号 + region 里跑两份 lab 时才需要动。

   栈名不受 `resourceIdentifier` 影响 —— 它们来自 `aws.stackPrefix`,Verify 列表也预设它保持默认。S3 桶名的全球唯一性模板已经帮你处理了(末尾追加 12 位的 AWS 账号 ID)。完整拆解: [`concepts/resource-naming.md`](./concepts/resource-naming.md)。

   `aws.region` 决定所有 stack 落在哪个区。其他字段都有合理默认,不用动(原因见 [`concepts/infrastructure.md`](./concepts/infrastructure.md))。

   想简单核对 `github.owner`/`github.repo` 跟你的 fork 一致没?
   ```
   GH_PAGER=cat gh repo view --json nameWithOwner --jq .nameWithOwner
   ```

2. **运行 setup 向导:**
   ```
   python3 scripts/setup_repo.py
   ```
   向导会带着你走 5 步,有实时进度:
   - Step 1 Preflight — 工具检查 + repo 状态(~5 秒)
   - Step 2 Scope — 确认 `development only`(每个选项都显示日花费)
   - Step 3 CloudFormation deploy — 4 个栈,合计 ~8–12 分钟(每栈一条 Rich 进度条)
   - Step 4 Manifest sync — 用实栈输出重写 `deploy/shared/`、`deploy/static/development/`、`deploy/ecs/development/`
   - Step 5 GitHub 设置 — 把 `AWS_REGION` + 3 个角色 ARN 写进 Actions Variables,并给 `main` 打开分支保护(必需状态检查:`summary`)。此后 CI 红的或还在跑的 PR 都不能被合进 main

   > 💡 **Step 3 是 CloudFormation 真的在工作的 8–12 分钟 —— 这是 AWS 的下限,不是你的 setup 有问题**。正好可以去冲杯咖啡。同时: AWS 会往你 Lab 1 填的 `safety.email` 发一封订阅确认邮件(主题 **AWS Notification - Subscription Confirmation**)。在向导跑完之前点一下 **Confirm subscription**,否则预算告警发不出来 —— 订阅会永远卡在 `PendingConfirmation`。

3. **如果某个栈中途失败**,向导会打印一个带框的错误面板。读一读,处理根因(通常是 IAM 角色名冲突,或者 S3 全局唯一性冲突),然后恢复:
   ```
   python3 scripts/setup_repo.py resume
   ```
   它会重读 `.local/setup-repo-state.json`,只重试失败的那一步。

4. **检查向导重写了什么**。打开以下文件,看到真实值替换了 bootstrap 占位:
   - `deploy/shared/delivery.json` — 产物 bucket + ECR URI
   - `deploy/static/development/site.json` — site bucket、CloudFront ID、public URL
   - `deploy/ecs/development/task-definition.json` — image URI、execution role ARN、log group name、环境变量注入

5. **打开 Lab 3 的 claim PR,然后把它合上。**
   ```
   ./scripts/claim.py lab-3
   ```
   记下 PR 编号,CI 绿了就合:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## 验证

- AWS Console → CloudFormation:4 个栈都在 `CREATE_COMPLETE`:
  - `resume-cicd-lab-shared-oidc`
  - `resume-cicd-lab-shared-delivery`
  - `resume-cicd-lab-dev-static-site`
  - `resume-cicd-lab-dev-ecs-app`
- GitHub → Settings → Secrets and variables → Actions → Variables 页签:4 个变量存在(`AWS_REGION`、`AWS_RELEASE_ROLE_ARN`、`AWS_STATIC_DEPLOY_ROLE_ARN`、`AWS_ECS_DEPLOY_ROLE_ARN`)。
- SNS 订阅已确认 —— 邮件里的链接点过了。无头检查:
  ```
  aws sns list-subscriptions --no-cli-pager \
    --query 'Subscriptions[?contains(TopicArn, `budget-alerts`)].[Endpoint, SubscriptionArn]' \
    --output text
  ```
  `SubscriptionArn` 应该是一个 ARN,**不是** `PendingConfirmation`。(过滤器匹配的是 `budget-alerts`,不是 stack 前缀 —— SNS topic 名是 `resume-shared-sns-budget-alerts-<resourceIdentifier>` 这种格式,里面不包含 stack 前缀;`budget-alerts` 是每个学员 fork 都有的固定字段。)
- 👀 **控制台里做一次肉眼确认**。打开 `.local/console-links.md`(向导写出来的),里头有本 lab 创建的每个资源的可点击链接 —— CloudFormation 栈、S3 bucket、ECR、ECS、CloudFront、Budgets、SNS、IAM 角色。和上面的 CLI 检查对照着看,心里更踏实。
- 运行成本:~$1.45/日(主要是 NAT Gateway + ECS task idle + CloudFront + 极少量 S3)。

## 你刚刚做到的

在 15 分钟以内把 4 个 CloudFormation 栈 + OIDC 联合 + tracked manifest 全接上。现在你的 GitHub Actions 能 assume 短期 AWS 角色 —— 没有密钥、不需要轮换、不可能泄漏。

## 下一个

[Lab 4 — First Green Check](./lab-04-first-green-check.md)
