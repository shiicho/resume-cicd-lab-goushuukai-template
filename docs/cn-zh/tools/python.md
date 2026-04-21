> 🌐 [English](../../en/tools/python.md) &nbsp;·&nbsp; [日本語](../../ja/tools/python.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# python —— Python 3

本 lab 的向导(`setup_repo.py`、`promotion_wizard.py`、`claim.py`)是 Python 3 写的。Lab 2 的校验器强制一个版本下限(≥ 3.10)。

## 为什么在这里

Python 是把 lab CLI UX 串起来的粘合剂。它给我们:

- **交互式 CLI UX** —— 实时进度条、typed-scope 确认、带框的错误面板。shell 脚本做不到。
- **跨平台** —— 一套代码跑在 macOS、Linux、(通过 WSL)Windows 上。
- **与 AWS 的接入简单** —— `boto3` 或者 shell out 给 `aws` CLI 都行。

## 本 lab 的依赖集

来自 `scripts/requirements.txt`:

- **`typer`** —— CLI 框架(底层是 click)
- **`rich`** —— 终端渲染(进度条、面板、表格、彩色输出)
- **`questionary`** —— 交互式选择器(箭头键选择)

一次性安装(Lab 2 或 README「开始之前」):

```
pip install --user -r scripts/requirements.txt
```

## lab 的脚本总览

| 脚本 | 做什么 |
|---|---|
| `scripts/setup_repo.py` | Apply 向导:校验工具、选环境范围、带实时事件流地部署 4–6 个 CloudFormation 栈、同步 `deploy/*` manifest、设置 GitHub Actions Variables + branch protection |
| `scripts/setup_repo.py destroy` | 同一个脚本,destroy 流程:dry-run 预览、typed-scope 确认、按栈进度拆除 |
| `scripts/promotion_wizard.py` | Source → target 选择 + unified diff + 开 draft PR,用于跨环境提升(详见 [`concepts/promotion-wizard.md`](../concepts/promotion-wizard.md)) |
| `scripts/claim.py` | lab 进度标记:开一个 `claim/lab-N` 分支 + 空改动 PR,`lab-label` workflow 合并时打标签 |

## 这个 lab 教给你的「生产真相」

- **Rich + Typer 是一套被低估的 CLI UX 栈**。带进度条 + 彩色面板 + typed 确认的向导让 destroy 感觉像真正的基础设施工具 —— 因为 k6、Vault、Terraform Cloud CLI 等真实工具已经长这样。向它们看齐。
- **`subprocess.Popen` + `stdout=DEVNULL` + `stderr=PIPE` + 额外的事件轮询循环** —— 这是同时显示实时 CloudFormation 事件、又把 `aws` CLI 的 `Waiting for changeset…` 杂音挡住的套路。看 `setup_repo.py` 的 `deploy_stack()`。
- **Dry-run 是一种代码设计,不是一个 flag**。把每个破坏性工具设计成「preview 也可以 apply」,默认 preview。看 `setup_repo.py destroy --dry-run`。

## 可迁移技能

**用 Python + Rich 写交互式 CLI 向导**是真正的生产级技能。DevOps 平台、内部研发效率工具、CI/CD 工具链都会用到。

**简历切入点**:如果你理解 `setup_repo.py` 的模式到能复制的程度,那就是实打实的 **工具作成 / ツール作成**,可以写成:「用 Python-Rich 为 CloudFormation 编排构建了一个带实时事件流 + typed-scope destroy 确认的 CLI」。

## 相关

- [`concepts/promotion-wizard.md`](../concepts/promotion-wizard.md) —— 其中一个向导的深度剖析
- [Rich 文档](https://rich.readthedocs.io/) —— lab UI 的底层库
- [Typer 文档](https://typer.tiangolo.com/) —— 命令定义 + 解析
