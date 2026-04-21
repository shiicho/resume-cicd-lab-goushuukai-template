> 🌐 [English](../../en/tools/install.md) &nbsp;·&nbsp; [日本語](../../ja/tools/install.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# 安装 —— 6 个 CLI + 登录

Lab 2 的 `validate-tools` 需要这 6 个 CLI 出现在你的 PATH 里: `git`、`gh`、`aws`(v2)、`python3`(≥ 3.10)、`node`(22)、`jq`。这一页就是按操作系统划分的安装速查表,加后面一次性的登录配置。如果 `validate-tools` 因为缺工具挂了,就从这里开始。

## macOS —— Homebrew 一行

如果装了 [Homebrew](https://brew.sh/):

```
brew install git gh awscli python node jq
```

6 个都装上,全都是当前稳定版,全部满足 Lab 2 的版本下限。结束。

没装 Homebrew 就先去 [brew.sh](https://brew.sh/) 装。Apple Silicon 机器记得把 `/opt/homebrew/bin` 加到 `PATH`(安装器会打印一行让你贴)。

## Linux

### Debian / Ubuntu

```
sudo apt update && sudo apt install -y git jq python3 python3-pip
```

`gh`、`awscli` v2、`node` 22 在 apt 里没有达到下限的包,用厂商安装器:

- **gh**: [cli.github.com/manual/installation](https://cli.github.com/manual/installation)(页面里有 apt 仓库的步骤)。
- **aws CLI v2**: 下载 [官方安装器](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)。`apt install awscli` 装的是 v1 —— 版本不对。
- **node 22**: 用 [nvm](https://github.com/nvm-sh/nvm)(`nvm install 22 && nvm use 22`)或者 [NodeSource 仓库](https://github.com/nodesource/distributions)。

### Fedora / RHEL

```
sudo dnf install -y git jq python3 python3-pip
```

其他的和 Debian 一样 —— `gh`、`aws` v2、`node` 22 走厂商安装器。

### Arch / Manjaro

```
sudo pacman -S git github-cli aws-cli-v2 python python-pip nodejs npm jq
```

Arch 是唯一一个所有 CLI 的当前版本都打包好的 Linux 发行版。

## Windows

### winget(Windows 11 或较新的 Windows 10)

```
winget install Git.Git GitHub.cli Amazon.AWSCLI Python.Python.3.12 OpenJS.NodeJS jqlang.jq
```

装完重启 shell 让新 `PATH` 生效。用 PowerShell 或 WSL2 —— Command Prompt 也能跑,但 lab 里部分 bash 的兜底脚本假定类 Unix shell。

### Chocolatey / Scoop

如果已经在用 [Chocolatey](https://chocolatey.org/) 或 [Scoop](https://scoop.sh/),对应包名是: `git`、`gh`、`awscli`、`python`、`nodejs-lts`、`jq`。

### WSL2(想要最顺的 lab 体验就选这个)

装 WSL2 + Ubuntu,然后在 WSL shell 里按上面的 **Debian / Ubuntu** 那一节装。这门课之后都假定一个类 Unix 的 shell —— WSL2 正好对上。

## 登录(每台机器一次)

CLI 装好后,三个一次性的配置:

### GitHub CLI 登录

```
gh auth login
```

依次选: GitHub.com → HTTPS → Yes(用 GitHub 凭据认证) → Login with a web browser。会显示一个 device code —— 打开打印出来的 URL,贴 code,批准。用 `gh auth status` 看一下,显示登录成功就好。

### AWS 凭据

这门 lab 最简单的配置方式:在你自己的个人 AWS 账号里建一个 IAM user,挂上 **AdministratorAccess** 策略。Lab 会创建 IAM role、CloudFormation 栈、VPC、ECS 集群,这种范围的权限刚好合适。

```
aws configure
```

输入: Access Key ID、Secret Access Key、默认区域(比如 `ap-northeast-1`)、默认输出格式(`json`)。验证:

```
aws sts get-caller-identity --no-cli-pager
```

如果你们组织用 AWS SSO / IAM Identity Center:

```
aws configure sso
```

```
aws sso login
```

### git 身份(如果还没设过)

```
git config --global user.name "Your Name"
```

```
git config --global user.email "you@example.com"
```

用和 GitHub 账号同一个邮箱,这样 commit 上会显示你的头像。

## 分页器预设(避免之后头疼)

三个 CLI 即使只有 1 行输出,默认也会进分页器 —— 看起来像卡住了。趁现在关掉:

```
gh config set pager cat
```

```
git config --global core.pager cat
```

AWS CLI 要加到 shell 的 rc 里(bash 用 `~/.bashrc`):

```
echo 'export AWS_PAGER=""' >> ~/.zshrc
```

```
source ~/.zshrc
```

完整解释见 [`pager-config.md`](./pager-config.md)。

## 验证

一切都汇到这里。clone 完 repo 后,在仓库根目录跑:

```
python3 scripts/setup_repo.py validate-tools
```

每一行在 `Available` 和 `Authenticated` 列都应该是 `ok`。哪一行红了就回去按上面那一节再装一遍,再跑一次 `validate-tools`。

## 相关

- [`gh.md`](./gh.md) · [`aws.md`](./aws.md) · [`git.md`](./git.md) · [`jq.md`](./jq.md) · [`python.md`](./python.md) · [`node.md`](./node.md) —— 每个 CLI 的一页入门
- [`pager-config.md`](./pager-config.md) —— 为什么分页器烦人,以及怎么永久关掉
- 根目录 [README 的「开始之前」](../../../README.cn-zh.md#开始之前) —— 最短的安装指针
