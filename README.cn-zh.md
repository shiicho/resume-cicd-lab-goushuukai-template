> 🌐 [English](README.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; **简体中文**

# resume-cicd-lab

把一个 React 应用以两种方式部署到 AWS —— S3 + CloudFront **和** ECS/Fargate —— 通过一条完整的发布与提升流水线,你在 11 个动手实验里亲自把它跑通。

> ⏱ 动手合计 ~2 小时 &nbsp;·&nbsp; 💰 运行期间每日 $1.45 – $2.90 &nbsp;·&nbsp; 🧹 Lab 10 之后归零到 $0

- 🔗 **在线 demo**:_会在 Lab 7 上线 —— 你的部署会有属于自己的 URL_
- 🧭 **架构图**:[`docs/cn-zh/concepts/architecture.md`](docs/cn-zh/concepts/architecture.md)
- 🛠 **工具入门**(可选):[`docs/cn-zh/tools/`](docs/cn-zh/tools/README.md) —— git、gh、aws、jq、python、node 的单页讲解
- 📚 **概念深读**:[`docs/cn-zh/concepts/`](docs/cn-zh/concepts/) —— CI/CD 模型、OIDC 联邦、promotion wizard 等

---

## 适合谁

✅ 你会 git 和 Docker、能自己读懂 CloudFormation、想在不依赖长期凭据的前提下把 GitHub Actions → AWS 接起来。  
✅ 你想理解原理(「为什么用 OIDC? 为什么是 push 模式? 为什么要两个部署目标?」),而不是点来点去的 GUI 教程。  
✅ 你有一个自己控制的 AWS 账号,并且能花大约 **$5 总额** 用于学习。  
❌ 如果你想要点击式的 GUI 引导,请去用 [AWS Workshop Studio](https://catalog.workshops.aws/)。

本仓库自带一份可运行的简历作为可部署载荷。你会用一条真正的发布流水线把 **一个 React 应用** 发布出去,之后随意把它替换成你自己的简历内容也可以。

## 你会构建什么

1. 基于 **OIDC** 的 GitHub Actions 流水线(Secrets 中不放长期 AWS 凭据)
2. 一份 React 应用编译出 **每次发布两个不可变产物**:一个 S3 zip 和一个 ECR 镜像,构建一次,跨环境提升
3. 一种 **tracked manifest** 模型,使每次部署都是一个可审查的 Pull Request,而不是 AWS 控制台里的一次点击

## 为什么这么做,而不是别的做法

- **为什么用 OIDC,而不是在 Secrets 里放 AWS Access Key?** &nbsp;每次工作流运行签发的短期 token 在几分钟后失效;泄露的长期密钥就是事故。OIDC 直接消除了轮换问题。
- **为什么用 push 模式 CD,而不是 Argo CD pull 模式?** &nbsp;每一步部署都能在 GitHub Actions 日志里看到。pull 模式把状态调和藏在集群内部 —— 对生产规模不错,但不利于学习每一步在干什么。
- **为什么用 CloudFormation,而不是 Terraform?** &nbsp;教学回路里少一套工具链。栈删除是原子、安全有保证的 —— 适合那种你希望能在每次运行之间完全重置的 AWS 账号。
- **为什么要两个部署目标(S3 与 ECS),而不是一个?** &nbsp;让你在 Lab 7 亲身感受差异 —— 同一次发布,不同的运行时,不同的权衡 —— 而不是在抽象中阅读。

---

## 实验列表

按顺序做 11 个 lab。每个 lab 都很短(阅读 ≤30 秒,动手 2–10 分钟,验证,庆祝),以一个记录你进度的已合并 Pull Request 结束。

| # | 标题 | 时长 | 费用 | 操作 |
|---|---|---|---|---|
| 0 | [The Preview](docs/cn-zh/lab-00-preview.md) | 5 分钟 | $0 | 界定范围;在任何安装之前先提交 |
| 1 | [Safety First — AWS Budgets](docs/cn-zh/lab-01-safety-first.md) | 5 分钟 | $0 | 在 config 里设置 `safety.email`;Budget 绊线随 Lab 3 一起部署 |
| 2 | [Tools + Dry-Run the Exit](docs/cn-zh/lab-02-tools-and-dry-run.md) | 10 分钟 | $0 | 安装工具链;对空状态执行 `destroy --dry-run` |
| 3 | [Wire the Lab (dev only)](docs/cn-zh/lab-03-wire-the-lab.md) | 25 分钟 | **+$1.45/日** | 改 4 个配置字段;运行 setup 向导;看着 4 个 CloudFormation 栈被部署出来 |
| 4 | [First Green Check](docs/cn-zh/lab-04-first-green-check.md) | 5 分钟 | $0 | 推送一个微小变更;在终端里看 CI 跑起来 |
| 5 | [First Release Tag](docs/cn-zh/lab-05-first-release-tag.md) | 10 分钟 | $0 | 合并一个 `feat:` 提交;让 Release Please 切出 `web-v0.1.0` |
| 6 | [First Artifacts (S3 + ECR)](docs/cn-zh/lab-06-first-artifacts.md) | 10 分钟 | $0 | 检查 tag 生成出来的 S3 zip 和 ECR digest |
| 7 | [First Deploy](docs/cn-zh/lab-07-first-deploy.md) | 10 分钟 | $0 | 审查 bot 开出的提升 PR;合并;打开你的上线 URL |
| 8 | [Self-Proof Banner](docs/cn-zh/lab-08-self-proof-banner.md) | 15 分钟 | $0 | 添加 build-info banner —— 你的站点现在能 **自证** 它是谁构建的 |
| 9 | [First Promotion (dev → staging)](docs/cn-zh/lab-09-first-promotion.md) | 20 分钟 | **+$1.45/日** | 运行提升向导;同一个产物,不同的环境 |
| 10 | [The Teardown](docs/cn-zh/lab-10-teardown.md) | 10 分钟 | **-$2.90/日** | `destroy --dry-run`、输入作用域确认、回到 $0 |
| 11 | [把循环做成生产级(GitHub App)](docs/cn-zh/lab-11-bonus-github-app.md) _(进阶彩蛋)_ | 15 分钟 | $0 | 用 GitHub App 取代 Lab 5 / Lab 7 的 close + reopen —— 选做,纯 GitHub |

**动手合计**:~2 小时 10 分钟(不含 AWS 栈创建等待时间,也不含选做的 Lab 11 进阶彩蛋)。
**峰值日花费**(Lab 9 之后):$2.90/日,直到 Lab 10 把它归零。
**最终状态**(Lab 10 之后):账号回到 $0/日,本地 git 历史保留。

---

## 你的进度

每个 lab 都以一个已合并 PR 结束。合并时 [`.github/workflows/lab-label.yml`](.github/workflows/lab-label.yml) 会加上 `lab-N-complete` 标签,下面的徽章读取该标签的数量。**全部 `0` = 未开始** · **全部 `1` = 完成**。

[![Lab 0](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-0-complete+is%3Amerged&label=Lab%200&style=flat-square&color=gold&cacheSeconds=60)](docs/cn-zh/lab-00-preview.md)
[![Lab 1](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-1-complete+is%3Amerged&label=Lab%201&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/cn-zh/lab-01-safety-first.md)
[![Lab 2](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-2-complete+is%3Amerged&label=Lab%202&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/cn-zh/lab-02-tools-and-dry-run.md)
[![Lab 3](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-3-complete+is%3Amerged&label=Lab%203&style=flat-square&color=gold&cacheSeconds=60)](docs/cn-zh/lab-03-wire-the-lab.md)
[![Lab 4](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-4-complete+is%3Amerged&label=Lab%204&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/cn-zh/lab-04-first-green-check.md)
[![Lab 5](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-5-complete+is%3Amerged&label=Lab%205&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/cn-zh/lab-05-first-release-tag.md)
[![Lab 6](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-6-complete+is%3Amerged&label=Lab%206&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/cn-zh/lab-06-first-artifacts.md)
[![Lab 7](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-7-complete+is%3Amerged&label=Lab%207&style=flat-square&color=gold&cacheSeconds=60)](docs/cn-zh/lab-07-first-deploy.md)
[![Lab 8](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-8-complete+is%3Amerged&label=Lab%208&style=flat-square&color=gold&cacheSeconds=60)](docs/cn-zh/lab-08-self-proof-banner.md)
[![Lab 9](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-9-complete+is%3Amerged&label=Lab%209&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/cn-zh/lab-09-first-promotion.md)
[![Lab 10](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-10-complete+is%3Amerged&label=Lab%2010&style=flat-square&color=gold&cacheSeconds=60)](docs/cn-zh/lab-10-teardown.md)

Lab 0、3、6、10 通过 `./scripts/claim.py lab-N` 打开的 claim PR 完成。其余 lab 会生成它们自己的 feature、release 或 deploy PR —— workflow 都识别并分别打上对应标签。

## 中断了再接上

上面的徽章是幂等的 —— 昨天如果中途停了,进度不会退化。一条命令就能知道你在哪:

```
./scripts/where-was-i.py
```

会打印你最近完成的 lab + 下一个 lab 的文档指针 + (如果相关)正在等你的自动 PR。

---

## 开始之前

**如果你是以 `.tar.gz` 形式拿到本仓库**(不是直接 clone),先解包并 cd 进去:

```
mkdir -p ~/Projects
tar -xzf ~/Downloads/handoff.tar.gz -C ~/Projects
cd ~/Projects/resume-cicd-lab
```

创建你自己的 GitHub repo 并推送已经预置好的初始提交(tar 里已经 seed 了一个 Initial commit,所以一条命令即可):

```
gh repo create <owner>/<name> --public --source=. --push
```

> **为什么用 `--public`?** 进度徽章通过 shields.io 渲染,而 shields.io 调的是 GitHub 的未认证 search API,看不到 private 仓库,因此 private 仓库的徽章一律显示 `0`。public 会把 packager 的简历内容(你可以在 Lab 7 之后换成你自己的)、你的 `safety.email`、AWS 角色 ARN(包含你的 AWS 账号 ID)、以及 Actions workflow 日志全部公开。AWS 访问本身是安全的 —— OIDC 的信任关系按 owner/repo 精确匹配到 AWS 角色,仓库可见性不会改变安全边界。如果你更想保持私有,把 `--public` 换成 `--private` 即可;徽章会始终显示 `0`,但你的 label 进度仍可通过 `./scripts/where-was-i.py` 在本地查询。

一次性安装 lab CLI 需要的 Python 依赖:

```
pip install --user -r scripts/requirements.txt
```

一次性:关掉默认的 CLI 分页器,避免短输出把你卡在 `(END)`:

```
gh config set pager cat
git config --global core.pager cat
# AWS CLI:把 `export AWS_PAGER=""` 加到 ~/.zshrc 或 ~/.bashrc。
# 单次调用也可以加 `--no-cli-pager`(lab 文档已在需要的地方使用)。
```

> **UI 语言。** 第一次运行 wizard(`claim.py` / `setup_repo.py` / `promotion_wizard.py`)时,会问你用 English / 日本語 / 中文 —— 从 `$LANG` 自动检测,并保存到 `config/project-setup.json`。单次调用想切换,加 `--locale en` / `--locale ja` / `--locale zh-CN`。命令、flag、JSON key 在任何语言下都保持英文;本地化的只是面板、提示和祝辞文本。

> Lab 3 会带你编辑 4 个配置字段 —— `github.owner`/`github.repo`(把 OIDC 从 packager 的 slug 重定向到你自己的),以及 `aws.resourceIdentifier`、`aws.region`。不需要单独的 setup 步骤。
>
> 假定 `python3` ≥ 3.10 和 `pip` 已在 PATH 中。如果 `pip install --user` 的安装目录不在 PATH 上,请改用 `python3 -m pip install --user -r scripts/requirements.txt` 重试。
>
> Lab 0 的 claim PR 会在两处把 packager 的 slug 自动改成你自己的:README 里的进度徽章 URL(这样你合并的 lab 标签从第一次起就点亮你自己仓库里的进度格子)和 `config/project-setup.json` 的 `github.owner`/`github.repo`(这样 Lab 3 的 OIDC 信任策略绑定的是你的 repo)。到 Lab 3 你只需要挑 `aws.resourceIdentifier` 和 `aws.region` 两个字段。

---

## 从这里开始

👉 **[Lab 0 — The Preview](docs/cn-zh/lab-00-preview.md)**

Lab 0 只有阅读 + 一个 claim PR。5 分钟就能决定你是否要投入接下来的两小时。Lab 3 之前不碰 AWS。

## 如果需要提前停下

Lab 10 是自包含的。任何时候你都可以直接跳过去:

```
./scripts/setup_repo.py destroy --dry-run    # 预览会被删除什么
./scripts/setup_repo.py destroy               # 审阅预览后再应用
```

或者看 [Lab 10 — The Teardown](docs/cn-zh/lab-10-teardown.md)。

---

## 仓库布局

```
resume-cicd-lab/
├── app/                      ← React SPA(简历,被部署的那个)
├── config/                   ← project-setup.json —— Lab 3 里要编辑的文件
├── deploy/                   ← tracked manifests —— CI 与 AWS 的契约
│   ├── shared/               ← 产物 bucket + ECR repo
│   ├── static/<env>/         ← 每个环境的 S3 + CloudFront 目标
│   └── ecs/<env>/            ← 每个环境的 ECS task-def + service
├── infra/cloudformation/     ← 纯粹的 CFN 模板(每个环境 4 个栈)
├── scripts/                  ← setup_repo.py(向导)、promotion_wizard.py、claim.py、where-was-i.py、watch-pipeline.sh;UI i18n 用的 wizard/ + locales/
├── .github/workflows/        ← Validate、Release Please、Build Release、Deploy Static/ECS
└── docs/                     ← lab 文件 + 概念文档(en / ja / cn-zh)
```

---

## 补充

- wizard CLI(`claim.py` / `setup_repo.py` / `promotion_wizard.py`)的 UI 文本 —— 面板、提示、祝辞 —— 本地化到 en / ja / zh-CN。命令、flag、JSON key、以及 AWS / CloudFormation / GitHub 的子进程输出保持英文;这些是 CLI 的 API 面(Git 的 porcelain/plumbing 规则)。UI 语言说明见 [开始之前](#开始之前)。
- 教学文档(本 README、11 个 lab、概念文档)翻译成 **日本語** 和 **简体中文** —— 使用上方的语言切换器。
- 这是一个 pre-production 学习制品。不要在生成出来的基础设施上托管你在意的东西。Lab 10 会把它全部拆掉。
