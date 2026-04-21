> 🌐 [English](../../en/concepts/github-setup.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/github-setup.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# GitHub 设置

`setup_repo.py` 自动设置的内容 —— 以及当你想手工复现时的清单。

## 向导自动设置什么

当你运行 `python3 scripts/setup_repo.py`(Lab 3),且 `gh` 可用并已认证时,它会设置:

| 领域 | 设置项 | 值 |
|---|---|---|
| 仓库元数据 | 名称、描述 | 来自 `config/project-setup.json` |
| 合并策略 | Squash merge | 唯一允许 |
| 合并策略 | 合并后删除分支 | 开启 |
| Workflow 权限 | `GITHUB_TOKEN` 权限 | contents + pull-requests(读写) |
| 自动审查 | Bot review | 开启(给 Release Please + promotion PR 用) |
| 分支保护 | 必过检查 | `Validate / summary` |
| 分支保护 | 需要 PR review | 1 个批准 |
| 分支保护 | 清除过期 review | 开 |
| Actions 变量 | `AWS_REGION` | 来自 config |
| Actions 变量 | `AWS_RELEASE_ROLE_ARN` | 来自 OIDC 栈输出 |
| Actions 变量 | `AWS_STATIC_DEPLOY_ROLE_ARN` | 来自 OIDC 栈输出 |
| Actions 变量 | `AWS_ECS_DEPLOY_ROLE_ARN` | 来自 OIDC 栈输出 |

## 手工清单(`gh` 不可用,或你想手工复现)

### 1. 建仓库(如果还没有)

```
gh repo create <owner>/<repo> --public --source=. --push
```

或者在浏览器里:New repository → 和 `config/project-setup.json` 里一致的名字 → Public → 创建。

> 默认用 `--public`,是因为 shields.io 渲染的进度徽章只能查询 public 仓库。如果你接受徽章始终显示 `0`,换成 `--private` 完全没问题。OIDC 的信任关系按 repo slug 精确匹配,与可见性无关。

### 2. 合并策略

在 GitHub → Settings → General → **Pull Requests**:

- ☐ Allow merge commits
- ☐ Allow rebase merging
- ☑ Allow squash merging
- ☑ Automatically delete head branches

### 3. Workflow 权限

在 GitHub → Settings → Actions → General → **Workflow permissions**:

- ◉ Read and write permissions
- ☑ Allow GitHub Actions to create and approve pull requests

### 4. `main` 分支保护

在 GitHub → Settings → Branches → **Add branch ruleset**:

- Target: `main`
- ☑ Require a pull request before merging
  - ☑ Require approvals(1)
  - ☑ Dismiss stale pull request approvals
- ☑ Require status checks to pass before merging
  - 添加:`Validate / summary`
- ☑ Require branches to be up to date before merging(可选但推荐)

### 5. Actions 变量(不是 secret)

在 GitHub → Settings → Secrets and variables → Actions → **Variables** 页签:

| 名称 | 来源 | 例 |
|---|---|---|
| `AWS_REGION` | `config/project-setup.json` | `ap-northeast-1` |
| `AWS_RELEASE_ROLE_ARN` | CloudFormation 栈输出 | `arn:aws:iam::123...:role/resume-cicd-lab-release-role` |
| `AWS_STATIC_DEPLOY_ROLE_ARN` | CloudFormation 栈输出 | `arn:aws:iam::123...:role/resume-cicd-lab-static-deploy` |
| `AWS_ECS_DEPLOY_ROLE_ARN` | CloudFormation 栈输出 | `arn:aws:iam::123...:role/resume-cicd-lab-ecs-deploy` |

这些是 **变量**,不是 secret。Role ARN 不敏感 —— 该 role 的 trust policy 限定了哪个 GitHub 仓库能 assume 它,ARN 单独对攻击者毫无用处。

### 6. 验证

推一个微小分支,开 PR。你应该看到:

- `Validate / summary` 被列为必过
- 在 check 通过前 merge 按钮是禁用的
- Squash merge 是唯一可用的 merge 选项
- 合并后分支被自动删除

## 分支策略

- **`main` 是唯一长命分支**。生产和本地永不分叉。
- **Feature 分支是短命的**(`feat/*`、`fix/*`、`docs/*`、`chore/*`)。开 PR,拿到 green check,squash-merge。
- **不要用 `dev`、`stg`、`prd` 分支**。环境状态住在 `deploy/` 里,而不是分支名里。所以提升是 PR 里的一次文件变更,而不是跨环境分支的 merge。
- **Release Please 维护一个常驻的「release PR」**。合并 conventional commit 时它自动更新;你想切出一个发布时再合并它。

## Workflow 文件一览

| Workflow | 何时 | 用途 |
|---|---|---|
| `.github/workflows/ci.yml` | PR + push 到 main | 基于路径的校验 lane |
| `.github/workflows/release-please.yml` | push 到 main | 开/更新 release PR |
| `.github/workflows/release-assets.yml` | `web-v*` tag + workflow_dispatch | 构建产物 + 自动提升 dev |
| `.github/workflows/deploy-static.yml` | push 到 main 涉及 `deploy/static/**` | S3 sync + CloudFront invalidation |
| `.github/workflows/deploy-ecs.yml` | push 到 main 涉及 `deploy/ecs/**` | 注册 task-def + 更新 service |
| `.github/workflows/lab-label.yml` | PR merged | 给符合模式的 PR 贴 `lab-N-complete` 标签 |

## 不要加的东西

- **长期 AWS access key** 作为 secret。OIDC 配置的全部意义就是避免它。
- **不走 promotion PR 的 `deploy-production` workflow**。提升就是那道可审查的闸;workflow 只应由 manifest 的 merged 变更触发。
- **第二套 CI 工具(Circle / Buildkite 等)**。本 lab 刻意保持单平台(GitHub Actions),让学习者的心智模型保持简单。

## 另见

- [`architecture.md`](./architecture.md) —— OIDC 信任在 AWS 一侧住在哪
- [`cicd-model.md`](./cicd-model.md) —— 为什么 push 模式 CD
- [`infrastructure.md`](./infrastructure.md) —— 每个 CloudFormation 栈里放了什么
