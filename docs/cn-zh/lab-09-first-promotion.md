> 🌐 [English](../en/lab-09-first-promotion.md) &nbsp;·&nbsp; [日本語](../ja/lab-09-first-promotion.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 8](./lab-08-self-proof-banner.md)

# Lab 9 — First Promotion (dev → staging)

⏱ 动手 20 分钟(+ CloudFormation 等待) &nbsp;·&nbsp; 💰 **+$1.45/日** &nbsp;·&nbsp; 达到峰值 $2.90/日

## 为什么

20 分钟后,给 dev 上线的那份产物也会在 staging 上线 —— 不是重构建,而是同一份 S3 zip 和同一个 ECR digest 被第二份 manifest 引用。还没碰 AWS 的时候,`diff` 命令就会把这件事证明给你看。

> vs _为 staging 重构建_ —— 常见反模式;每次重构建都有漂移的机会。「Build-once-promote-many」就是不可变产物的全部意义。

## 做什么

1. **先检查 VPC + Internet Gateway 配额空间 —— 这是 Lab 9 的坑**。AWS 每区域默认 5 VPC + 5 IGW。staging 各 +1,所以共享账号已经到 4 的时候,apply 5–10 分钟后会撞上 `ServiceLimitExceeded` —— 等了这么久才失败,很不划算。
   ```
   aws ec2 describe-vpcs --region ap-northeast-1 --query 'length(Vpcs)' --no-cli-pager
   ```
   ```
   aws ec2 describe-internet-gateways --region ap-northeast-1 --query 'length(InternetGateways)' --no-cli-pager
   ```
   任何一个返回 4 或以上,apply 之前先申请提到 10 —— AWS 对这种小幅增长几分钟内自动批准。申请命令和追踪待处理请求的方法,都在 [`tools/aws.md`](./tools/aws.md) 的「VPC + IGW 配额预检」一节里。

2. **把 scope 扩到 dev + staging,再 apply**。config 从一开始就把三个环境都定义成了模板;scope 是在运行时选的。扩展:
   ```
   python3 scripts/setup_repo.py apply --scope development,staging
   ```
   向导会识别出已有的 dev 栈(不动),只新增 staging 的两个栈(`resume-cicd-lab-stg-static-site` + `resume-cicd-lab-stg-ecs-app`)。共享栈保持不变。花费涨到 $2.90/日(dev $1.45 + staging $1.45)。

3. **提交同步后的 staging 配置,回到 main** —— `promotion_wizard.py` 工作树不干净会拒绝执行(避免未提交改动被顺手扫进 promotion PR 让 reviewer 糊涂):
   ```
   git checkout -b chore/lab-9-staging-provisioned
   ```
   ```
   git commit -am "chore(lab-9): record staging stack outputs"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   记下 PR 编号,合并并回到 main:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

4. **运行提升向导:**
   ```
   python3 scripts/promotion_wizard.py
   ```
   向导带你走这些步骤:
   - Source → Target 选择(选 `development → staging`)
   - Candidate release picker(新到旧;读 `deploy/static/development/site.json` 的 git 历史)
   - **Unified diff 预览** —— `deploy/static/staging/site.json` 和 `deploy/ecs/staging/task-definition.json` 里会变什么
   - 写入并开 draft PR(`gh pr create --draft` 处理 PR 机制)

5. **审阅 draft PR**。仔细读 diff:
   - `artifactKey` —— 和当前 dev **完全相同**
   - `image` digest —— 和当前 dev **完全相同**
   - `siteBucket` / `cloudFrontDistributionId` —— **不同**(staging 的资源)
   - task-definition 里的 `environment` 变量 —— **不同**(staging 的 URL、APP_ENV=staging)

6. **把 draft 翻成 ready-for-review,合并,同步本地:**
   ```
   gh pr ready <number>
   ```
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

7. **看部署**。和 Lab 7 相同的 workflow,只不过这回是 staging。staging URL 会上来。

## 验证

- staging URL 有响应;self-proof banner 的页脚显示 `env: staging`。
- **不可变产物的证明**。跑:
  ```
  diff deploy/static/development/site.json deploy/static/staging/site.json
  ```
  `artifactKey` **不应该** 出现在输出里 —— 它的缺席就是证明。两个文件的值相同,`diff` 会把它隐藏掉。差里只会出现环境相关字段(`environment`、`publicBaseUrl`、`siteBucket`、`cloudFrontDistributionId`、`cloudFormationStack`)。ECS task-definition 同样的检查:
  ```
  diff deploy/ecs/development/task-definition.json deploy/ecs/staging/task-definition.json
  ```
  `image`(ECR digest)不应该出现;只有 `APP_ENV`、`APP_BASE_URL`、`APP_HOSTNAME`、family/cluster/role ARN 会变。
- promotion PR 合并后 Lab 9 的进度徽章变 ✓。
- 👀 **控制台肉眼确认**。`.local/console-links.md`(staging 追加时向导重新生成过)现在有 dev 和 staging **两边** 资源的链接 —— CloudFormation 栈、ALB、CloudFront 分发。两个环境指向同一份产物,并排看一下很清爽。

## 你刚刚做到的

不重构建,把一次发布跨两个环境做了提升。用自己的眼睛证明了不变性声明(同一个 artifactKey、同一个 image digest、不同的环境配置)。这就是真实生产提升用的模式。

> ☕ `diff` **没印出来** 的那几行才是重点 —— `artifactKey` 和 `image` 在 dev 和 staging 里是一致的,所以被隐藏了。那份看不见的等号,就是契约本身。

## 下一个

[Lab 10 — The Teardown](./lab-10-teardown.md)
