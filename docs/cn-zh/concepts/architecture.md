> 🌐 [English](../../en/concepts/architecture.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/architecture.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# 架构

一张图,然后讲每个部分。

## 全景图

![架构:你的机器 → GitHub Actions → AWS](../../diagrams/images/architecture.png)

<details>
<summary>文本版(ASCII)</summary>

```
   ┌────────────────────┐      ┌──────────────────────────────────────────┐
   │                    │      │        GitHub Actions (CI/CD)            │
   │    你的机器        │      │                                          │
   │                    │ push │  ┌─────────┐   merge   ┌────────────┐    │
   │  git + gh + aws    ├─────▶│  │Validate │──────────▶│ release-   │    │
   │  setup_repo.py     │      │  │(path    │  to main  │ please bot │    │
   │                    │      │  │ lanes)  │           │ opens PR   │    │
   └────────────────────┘      │  └─────────┘           └──────┬─────┘    │
                               │                               │ merge    │
                               │                       tag web-v*         │
                               │                               ▼          │
                               │  ┌──────────────────────────────────┐    │
                               │  │      Build Release Assets        │    │
                               │  │                                  │    │
                               │  │  OIDC → assumeRole (no keys)     │    │
                               │  │    ↓                             │    │
                               │  │  npm build → site.zip → S3       │    │
                               │  │  docker build → image → ECR      │    │
                               │  │    ↓                             │    │
                               │  │  open dev promotion PR           │    │
                               │  └──────────────────┬───────────────┘    │
                               │                     │ merge PR            │
                               │                     ▼                     │
                               │  ┌─────────────┐  ┌─────────────┐         │
                               │  │ Deploy      │  │ Deploy      │         │
                               │  │ Static Site │  │ ECS Service │         │
                               │  └──────┬──────┘  └──────┬──────┘         │
                               └─────────┼────────────────┼────────────────┘
                                         │                │
                                         ▼                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                          AWS Account                            │
   │                                                                 │
   │   ┌──────────────────────────┐   ┌──────────────────────────┐   │
   │   │  shared-delivery         │   │  shared-oidc             │   │
   │   │   • S3 artifact bucket   │   │   • GitHub OIDC provider │   │
   │   │   • ECR repo (web)       │   │   • 3 scoped roles       │   │
   │   └──────────────────────────┘   └──────────────────────────┘   │
   │                                                                 │
   │   ┌──────────────────────────┐   ┌──────────────────────────┐   │
   │   │  dev-static-site         │   │  dev-ecs-app             │   │
   │   │   • S3 site bucket       │   │   • VPC + 2 subnets      │   │
   │   │   • CloudFront dist      │   │   • ALB                  │   │
   │   │                          │   │   • ECS Fargate service  │   │
   │   └──────────────────────────┘   └──────────────────────────┘   │
   │                                                                 │
   │   [Lab 9 添加 staging 时会出现同样的一对]                        │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

</details>

## 每个部分

**你的机器**。跑 git + gh(GitHub CLI)+ aws(AWS CLI)+ `setup_repo.py`(向导)。这里从不放长期 AWS 密钥 —— 向导用你已有的 AWS 凭据(IAM Identity Center / AWS SSO)调 CloudFormation;GitHub Actions 用 OIDC 完成运行时访问。

**GitHub Actions**。5 个 workflow:

- `Validate` —— 基于路径的 lane(`web`、`deploy`、`infra`、`automation`)。每个 PR + 每次 push 到 main。
- `Release Please` —— 读 main 上的 conventional commit,开/更新 release PR。
- `Build Release Assets` —— `web-v*` tag 触发。把 site.zip 构到 S3,docker 镜像推到 ECR。开 dev promotion PR。
- `Deploy Static Site` —— 触碰 `deploy/static/**` 的 PR 合并时触发。S3 sync → CloudFront invalidation。
- `Deploy ECS Service` —— 触碰 `deploy/ecs/**` 的 PR 合并时触发。注册 task-def、更新 service、等稳定。

**OIDC 联合**。`shared-oidc` 栈创建一个被 `token.actions.githubusercontent.com` 信任的 OpenID Connect provider。三个受限 IAM 角色(release、static-deploy、ecs-deploy)只能被本仓库的 workflow assume。GitHub secrets 里没有长期密钥;token 按 job 签发,~1 小时失效。

**Shared delivery**。`shared-delivery` 栈创建:
- 一个站点 zip 的 S3 bucket(`<project>-shared-s3-artifact-<identifier>-<account>`),生命周期:30 天迁移到 Glacier,180 天过期。
- 一个 web 镜像的 ECR 仓库(`<project>-shared-ecr-web-<identifier>`),开启镜像扫描。生命周期:保留最新 20 个 tag 的镜像,untagged 7 天后删除。

共享面是故意为之 —— 产物在所有环境中是同一份产物。按环境存放产物违反「build once」原则。

**每个环境: static site**。`<env>-static-site` 栈创建:
- 一个私有 S3 站点 bucket(`<project>-<env>-s3-site-<identifier>-<account>`) —— 完全阻止公网访问,仅通过 CloudFront 提供内容。
- 一个 CloudFront Origin Access Control —— 授权 CloudFront 从私有 bucket 读。
- 一个 CloudFront 分发 —— price class `PriceClass_200`(US+EU+Asia 边缘;全球延迟足够,不为很少使用的边缘付费)。TTL 为 SPA 调优(HTML 短,资源长)。
- 一个 CloudFront function —— 处理 SPA 路由(把非资源路径重写为 `/index.html`)。

部署流程:`Deploy Static Site` workflow 从产物 bucket 下载 `site.zip`,解压,`aws s3 sync --delete` 到站点 bucket,`aws cloudfront create-invalidation --paths '/*'`。

**每个环境: ECS app**。`<env>-ecs-app` 栈创建:
- 一个 VPC,CIDR 来自 `config/project-setup.json`(dev 是 `10.40.0.0/16`,staging 是 `10.50.0.0/16`,prod 是 `10.60.0.0/16`)。
- 2 个公有子网跨 2 个 AZ。没有私有子网,没有 NAT Gateway —— 故意做的成本控制(NAT 空置也要每月 $32)。ECS 通过 VPC endpoint 从 ECR pull 镜像。
- 一个 Internet Gateway + 路由表。
- 一个 ALB(Application Load Balancer),HTTP:80 listener → target group(HTTP:8080)。
- 一个 ECS Fargate cluster + service + task definition。
- IAM 角色:
  - Task execution role —— ECR pull、CloudWatch Logs 写入。
  - Task role —— 空(给你 app 运行时访问 AWS 服务用;目前还不需要)。
- 一个 CloudWatch log group(`/aws/ecs/<project>-<env>-logs-web-<identifier>`)。

部署流程:`Deploy ECS Service` workflow 读取更新后的 `deploy/ecs/<env>/task-definition.json`,跑 `aws ecs register-task-definition`,然后 `aws ecs update-service --force-new-deployment --wait-for-service-stable`。

两个部署目标独立 —— 同一产物,不同运行时。Lab 7 会并行部署两者,方便你对比。

## 为什么是这个形状

- **CloudFormation,而不是 Terraform** —— 教学回路里少一套工具链。栈删除原子;[`Lab 10`](../lab-10-teardown.md) 的 teardown 是安全有保证的。
- **Push 模式,而不是 pull 模式** —— 每一步部署都在 GH Actions 日志可见。见 [`cicd-model.md`](./cicd-model.md)。
- **Manifest 驱动的状态** —— `deploy/*/*.json` 就是环境契约。每次部署都是一个可审查的 PR。
- **两个部署目标** —— 让你在 Lab 7 亲身感受差异,而不是在抽象中阅读。

## 更多细节

- [`infrastructure.md`](./infrastructure.md) —— 一栈一栈的清单、资源命名规则、如何添加 production
- [`cicd-model.md`](./cicd-model.md) —— push vs pull、release-please、提升语义
- [`github-setup.md`](./github-setup.md) —— 分支保护、合并策略、Actions 变量
