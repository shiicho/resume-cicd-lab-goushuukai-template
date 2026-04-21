> 🌐 [English](../../en/concepts/infrastructure.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/infrastructure.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# 基础设施

[`infra/cloudformation/`](../../infra/cloudformation/) 里 CloudFormation 模板的一栈一栈清单。

## 4 种栈

| 模板 | 栈名 | 数量 | 用途 |
|---|---|---|---|
| `bootstrap-shared.yaml` | `resume-cicd-lab-shared-oidc` | 1 | GitHub OIDC provider + release/static-deploy/ecs-deploy 的受限角色 |
| `shared-delivery.yaml` | `resume-cicd-lab-shared-delivery` | 1 | S3 产物 bucket + ECR repo |
| `static-site.yaml` | `resume-cicd-lab-<env>-static-site` | 每环境 1 | 私有 S3 bucket + CloudFront 分发 |
| `ecs-app.yaml` | `resume-cicd-lab-<env>-ecs-app` | 每环境 1 | VPC + ALB + ECS Fargate cluster/service |

## `shared-oidc` —— 信任边界

**只创建一次,跨所有环境复用。**

资源:

- **OpenID Connect Provider** —— 把 `https://token.actions.githubusercontent.com` 注册为信任源(或者如果 `config/project-setup.json` 里 `aws.existingGitHubOidcProviderArn` 已设,就复用已有 provider)。
- **三个受限 IAM 角色**:
  - `<prefix>-release-role` —— 信任:仅本 GitHub 仓库 + 仅当 `ref` 匹配 `refs/tags/web-v*` 时。权限:往产物 bucket PutObject,往 web repo PushImage。
  - `<prefix>-static-deploy` —— 信任:仅本 GitHub 仓库 + 仅当 ref 为 `main` 时。权限:对每环境 site bucket 做 S3 Sync,对每个分发做 CloudFront invalidation。
  - `<prefix>-ecs-deploy` —— 信任:同上。权限:ECS RegisterTaskDefinition + UpdateService + 对 task 角色 PassRole。

为什么三个角色而不是一个:最小权限。`release-role` 泄露了只能发产物,不能触发部署。`static-deploy` 泄露了没法给 ECR 推新镜像。单点泄露的爆炸半径很小。

## `shared-delivery` —— 产物层

**只创建一次,跨所有环境复用。**

资源:

- **S3 产物 bucket**(`<project>-shared-s3-artifact-<identifier>-<account>`) —— 存放 `web/releases/<tag>+<sha>/site.zip`。生命周期:30 天迁移到 Glacier;180 天过期。
- **ECR 仓库**(`<project>-shared-ecr-web-<identifier>`) —— 存放容器镜像。开启镜像扫描。生命周期:保留最近 20 个打 tag 的镜像;untagged 7 天后删除。

单一共享层是故意的 —— 跨所有环境产物就是 **同一份产物**。按环境存产物会违反「build once」原则。

## `<env>-static-site` —— S3 + CloudFront 目标

**每个环境 1 个。**

资源:

- **私有 S3 site bucket**(`<project>-<env>-s3-site-<identifier>-<account>`) —— 完全阻止公网访问。只通过 CloudFront 提供内容。
- **CloudFront Origin Access Control** —— 授权 CloudFront 读私有 bucket。
- **CloudFront 分发** —— price class `PriceClass_200`(US+EU+Asia 边缘;全球延迟够用,不为很少用到的边缘付费)。TTL 为 SPA 调优(HTML 短、静态资源长)。
- **CloudFront function** —— 处理 SPA 路由(把非资源路径重写为 `/index.html`)。

部署流程:`Deploy Static Site` workflow 从产物 bucket 下载 `site.zip`,解压,`aws s3 sync --delete` 到 site bucket,`aws cloudfront create-invalidation --paths '/*'`。

## `<env>-ecs-app` —— ECS + Fargate 目标

**每个环境 1 个。**

资源:

- **VPC**,CIDR 来自 `config/project-setup.json`(dev `10.40.0.0/16`,staging `10.50.0.0/16`,prod `10.60.0.0/16`)。
- **2 个公有子网,跨 2 个 AZ**。无私有子网、无 NAT Gateway —— 这是故意的成本控制(NAT 空置也要 $32/月)。ECS 通过 VPC endpoint 从 ECR pull 镜像。
- **Internet Gateway** + 路由表。
- **ALB**(Application Load Balancer)HTTP:80 listener → target group(HTTP:8080)。
- **ECS Fargate cluster** + **service** + **task definition**。
- **IAM 角色**:
  - Task execution role —— ECR pull、CloudWatch Logs 写。
  - Task role —— 空(给你 app 在运行时访问 AWS 服务;暂时不需要)。
- **CloudWatch log group**(`/aws/ecs/<project>-<env>-logs-web-<identifier>`)。

部署流程:`Deploy ECS Service` workflow 读更新后的 `deploy/ecs/<env>/task-definition.json`,跑 `aws ecs register-task-definition`,然后 `aws ecs update-service --force-new-deployment --wait-for-service-stable`。

## 结构化命名

所有 AWS 资源遵循:`{resourceProjectName}-{environment}-{aws-resource-code}-{identifier}`。

例:

- `resume-shared-ecr-web-<identifier>` —— 共享 ECR repo
- `resume-dev-ecs-service-<identifier>` —— dev ECS service
- `resume-dev-s3-site-<identifier>-<account>` —— dev site bucket(为 S3 全局唯一附加账号 ID)

环境代码是缩写:`dev` / `stg` / `prd`。共享资源用 `shared`。

命名由两个 config 字段控制:

- `aws.stackPrefix` —— CloudFormation 栈名的基础(例:`resume-cicd-lab`)
- `aws.resourceProjectName` / `resourceIdentifier` / `resourceShortIdentifier` —— 资源命名模式的各部分

「short identifier」存在是因为一些 AWS 资源名有长度上限(ALB 名 ≤ 32 字符,target group 名 ≤ 32 字符)。在那些地方使用短形式。

## 加 production

Lab 流停在 staging(Lab 9)。想试试 production:

1. **确认 production 的 VPC CIDR**(默认 `10.60.0.0/16`,在 `config/project-setup.json` 的 `environments.production.vpcCidr` 里)不与你 AWS 账号里其他东西冲突。三个环境都是作为模板定义好的;scope 在运行时选。

2. **把 production 加进来再 apply:**
   ```
   python3 scripts/setup_repo.py apply --scope development,staging,production
   ```
   这会新增 `resume-cicd-lab-prd-static-site` 和 `resume-cicd-lab-prd-ecs-app`。花费涨到 ~$4.35/日(dev + staging + prod)。

3. 提升:
   ```
   python3 scripts/promotion_wizard.py
   # source: staging  target: production
   ```

4. **尽快清理**。Prod 比本 lab 流预算多 $1.45/日。实验完就 destroy。

## 为什么是 CloudFormation 而不是 Terraform

- 教学回路里 **少一套工具链**。Terraform 需要 state 管理、provider 配置、lock 文件 —— 与 CI/CD 一起学,焦点会被稀释。
- **栈删除原子**。CloudFormation `delete-stack` 由服务保证清理它创建的资源。Terraform state 可能和真实情况脱节。
- **模板可读**。CloudFormation YAML 冗长但直观 —— 没有 HCL 怪癖、没有 module 解析。

权衡:CloudFormation 部署更慢、语法体验更差、漂移检测也较弱。生产平台一般选 Terraform 更合适。对本 lab,CloudFormation 更简单。

## 另见

- [`architecture.md`](./architecture.md) —— 高层拓扑
- [`cicd-model.md`](./cicd-model.md) —— 栈与发布流程的连接
- [`github-setup.md`](./github-setup.md) —— OIDC 信任的 GitHub 侧
