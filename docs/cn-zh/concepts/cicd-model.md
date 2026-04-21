> 🌐 [English](../../en/concepts/cicd-model.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/cicd-model.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# CI/CD 模型

这个仓库为什么是这种部署方式,而不是别的方式。

## 发布流程一览

```
  main 上的 feat: 提交
         │
         ▼
  Release Please 开出「release PR」
         │ merge
         ▼
  推 tag  web-v0.2.0
         │
         ▼
  Build Release Assets:
     ├─ site.zip       → S3 产物 bucket
     └─ container image → ECR(按 digest 固定)
         │
         ▼
  自动开出  chore(development): promote web v0.2.0  PR
         │ merge
         ▼
  Deploy Static Site  +  Deploy ECS Service  (并行)
         │
         ▼
  dev 环境上线
         │
         ▼
  promotion_wizard.py  (dev → staging)
         │
         ▼
  chore(staging): promote web v0.2.0  PR  → merge → 部署到 staging
```

## Push 模式 vs Pull 模式

这个仓库是 **push 模式**。合并之后,GitHub Actions 直接调 AWS 更新环境。你能在 workflow 日志里看到每一次 `aws s3 sync`、每一次 `aws ecs update-service`。

**Pull 模式**(Argo CD、Flux)工作方式不同:一个 controller 跑在你的集群里,watch 一个 git 仓库,拉 manifest 变更,调和集群状态。部署是「最终一致」的,而不是一步一步的。

本 lab 选 push 的理由:

- 每一步部署都 **在 GH Actions 日志里可见** —— 学习每一步在干什么的好方法。
- **更少的活动部件** —— 无需安装 controller,无需管理集群内服务。
- **反馈回路更紧** —— 合并即部署,不需要等下一次调和周期。

假如是生产,pull 会更好的理由:

- **漂移检测** —— controller 持续调和;有人手改了 AWS 也会被还原。
- **多集群** —— 一个 git 仓库可以驱动多个集群,CI 侧不用跨账号凭据。
- **回滚** —— revert git 提交,controller 自动把集群回滚;不需要重跑 workflow。

两种模型都成立。本仓库选 push 是因为教学上更优,不是因为它普适更优。

延伸阅读: [Aviator: Pull vs Push GitOps](https://www.aviator.co/blog/choosing-between-pull-vs-push-based-gitops/)

## Release Please: 用提交消息做语义化版本

[Release Please](https://github.com/googleapis/release-please) 读 `main` 上的 conventional commit,维护一个把版本和 CHANGELOG 升级的「release PR」。

| 提交类型 | 版本升级 |
|---|---|
| `feat:` 或 `feat(scope):` | minor(0.1.0 → 0.2.0) |
| `fix:` 或 `fix(scope):` | patch(0.1.0 → 0.1.1) |
| `feat!:` 或正文里 `BREAKING CHANGE:` | major(0.1.0 → 1.0.0) |
| `chore:`、`docs:`、`refactor:` | 不升级 |

配置在 [`release-please-config.json`](../../release-please-config.json),manifest 在 [`.release-please-manifest.json`](../../.release-please-manifest.json)。tag 以 `web-v` 前缀,这样本仓库以后加其他 release-tracked 包也不会 tag 冲突。

## 「Build once, deploy many」原则

Lab 6 从一次发布产出两份产物:

- **S3 zip** —— 不可变,key 为 `web/releases/<tag>+<sha>/site.zip`
- **ECR 镜像** —— 不可变,用 `sha256:...` digest 寻址

每个环境都引用这一份具体产物。Dev、staging,(以后的) prod 在提升之后都指向同一份 zip + 同一份 digest。按环境重构建是反模式 —— 每次重构建都有环境漂移的机会(node 版本、时间戳、lockfile 解析各不同)。

## Manifest 驱动部署

`deploy/` 目录就是 **环境契约**。每一个 `site.json` 和 `task-definition.json` 声明了该环境应该运行哪一份产物。

- 改 manifest = 改部署内容。
- 变更通过可审查的 PR 进来。
- 部署 workflow 监听路径,合并时触发。
- Manifest 变更的历史 **就是** 部署的历史。

这是 **GitOps-lite**:状态在 git,合并时 push 到云。pull 模式的 GitOps 会让 controller 主动对着 manifest 调和集群状态;本仓库省掉那一层以保持可见。

## 提升 = 复制一个 manifest

把一次发布从 dev 提升到 staging 不重构建。它只是把 `deploy/static/development/site.json` 的 `artifactKey` 和 `image` 字段复制到 `deploy/static/staging/site.json`。ECS task-definition 一样。

`promotion_wizard.py` 把这次复制自动化并开一个 draft PR。细节见 [`promotion-wizard.md`](./promotion-wizard.md)。

## 为什么不用长期 AWS 密钥

GitHub Actions 通过 **OIDC 联合** 认证到 AWS:

1. Workflow 启动;GitHub 为这个具体 job 签发 OIDC token。
2. Workflow 调用 `aws-actions/configure-aws-credentials@v4` 并给出 role ARN。
3. AWS STS 用该 role 上的 trust policy 验证 OIDC token(policy 限定到本仓库)。
4. STS 签发临时 AWS 凭据(~1 小时过期)。
5. Workflow 用这份凭据调 AWS API。

与把 `AWS_ACCESS_KEY_ID` 存为 GitHub secret 相比:

- **不用轮换** —— token 按 job 签发,~1 小时过期。
- **无泄露风险** —— 泄漏的 token 1 小时后就没用了。
- **限定到仓库** —— IAM role 的 trust policy 限定了哪个仓库(可选哪个分支)能 assume 它。

延伸阅读: [GitHub: Security hardening with OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## 另见

- [`architecture.md`](./architecture.md) —— 整套基础设施的拓扑
- [`promotion-wizard.md`](./promotion-wizard.md) —— 提升流程细节
- [`infrastructure.md`](./infrastructure.md) —— 一栈一栈的清单
- [`scripts/watch-pipeline.sh`](../../scripts/watch-pipeline.sh) —— `./scripts/watch-pipeline.sh`(或单次快照用 `--once`)把上面这些部分 —— 按环境的发布状态、共享产物、open PR、最近 workflow —— 汇集到一张自动刷新的「release travel」视图里。Lab 7 和 Lab 9 里两个 workflow 并行部署时很好用。
