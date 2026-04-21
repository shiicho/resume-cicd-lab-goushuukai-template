> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/install.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/install.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# Install — the six CLIs + auth

Lab 2's `validate-tools` needs six CLIs on your PATH: `git`, `gh`, `aws` (v2), `python3` (≥ 3.10), `node` (22), `jq`. This page is the install cheat sheet per OS, plus the one-time authentication you do afterward. If `validate-tools` fails for a missing tool, start here.

## macOS — one-liner via Homebrew

If you have [Homebrew](https://brew.sh/):

```
brew install git gh awscli python node jq
```

That lands all six at their current stable versions, every one above Lab 2's floor. Done.

If you don't have Homebrew, install it first from [brew.sh](https://brew.sh/). On Apple Silicon, remember to add `/opt/homebrew/bin` to your `PATH` (Homebrew's installer prints the line to copy).

## Linux

### Debian / Ubuntu

```
sudo apt update && sudo apt install -y git jq python3 python3-pip
```

`gh`, `awscli` v2, and `node` 22 don't have apt packages meeting the floor — use their vendor installers:

- **gh**: [cli.github.com/manual/installation](https://cli.github.com/manual/installation) (apt repository instructions on the page).
- **aws CLI v2**: download the [bundled installer](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). `apt install awscli` gives you v1 — wrong version.
- **node 22**: use [nvm](https://github.com/nvm-sh/nvm) (`nvm install 22 && nvm use 22`) or the [NodeSource repository](https://github.com/nodesource/distributions).

### Fedora / RHEL

```
sudo dnf install -y git jq python3 python3-pip
```

Same caveats as Debian — `gh`, `aws` v2, and `node` 22 go through vendor installers.

### Arch / Manjaro

```
sudo pacman -S git github-cli aws-cli-v2 python python-pip nodejs npm jq
```

Arch is the one Linux distro where every CLI's current version is packaged.

## Windows

### winget (Windows 11, modern Windows 10)

```
winget install Git.Git GitHub.cli Amazon.AWSCLI Python.Python.3.12 OpenJS.NodeJS jqlang.jq
```

Restart your shell so the new `PATH` takes effect. Use PowerShell or WSL2 for the lab — Command Prompt works but the shell-script fallbacks some labs reference assume bash.

### Chocolatey / Scoop

If you already use [Chocolatey](https://chocolatey.org/) or [Scoop](https://scoop.sh/), their corresponding packages are: `git`, `gh`, `awscli`, `python`, `nodejs-lts`, `jq`.

### WSL2 (recommended for the smoothest lab experience)

Install WSL2 with Ubuntu, then follow the **Debian / Ubuntu** section above inside the WSL shell. The rest of the course assumes a Unix-like shell; WSL2 matches that expectation.

## Authentication (once per machine)

After the CLIs are installed, three one-time setup steps:

### GitHub CLI login

```
gh auth login
```

Pick: GitHub.com → HTTPS → Yes (authenticate with your GitHub credentials) → Login with a web browser. A device code appears — open the printed URL, paste the code, approve. `gh auth status` should then show you as logged in.

### AWS credentials

For this lab, the simplest setup is an IAM user in your personal AWS account with **AdministratorAccess** policy attached. The lab creates IAM roles, CloudFormation stacks, VPCs, ECS clusters — broad permissions match the scope.

```
aws configure
```

Enter: Access Key ID, Secret Access Key, default region (e.g. `ap-northeast-1`), default output format (`json`). Verify:

```
aws sts get-caller-identity --no-cli-pager
```

If your organization uses AWS SSO / IAM Identity Center instead:

```
aws configure sso
```

```
aws sso login
```

### Git identity (if you've never set it)

```
git config --global user.name "Your Name"
```

```
git config --global user.email "you@example.com"
```

Use the same email that's on your GitHub account so commits render with your avatar.

## Pager defaults (saves a future headache)

All three CLIs page even 1-line output by default, which looks like a hang. Disable pagers once:

```
gh config set pager cat
```

```
git config --global core.pager cat
```

For AWS CLI, add to your shell rc (bash uses `~/.bashrc`):

```
echo 'export AWS_PAGER=""' >> ~/.zshrc
```

```
source ~/.zshrc
```

Full explanation: [`pager-config.md`](./pager-config.md).

## Verify

Everything lands here. From the repo root after you've cloned it:

```
python3 scripts/setup_repo.py validate-tools
```

Every row should read `ok` in the `Available` and `Authenticated` columns. If any row is red, re-run the install step for that tool above, then re-run `validate-tools`.

## See also

- [`gh.md`](./gh.md) · [`aws.md`](./aws.md) · [`git.md`](./git.md) · [`jq.md`](./jq.md) · [`python.md`](./python.md) · [`node.md`](./node.md) — one-page primer per CLI
- [`pager-config.md`](./pager-config.md) — why pagers are annoying and how to disable them permanently
- Root [README Before you start](../../../README.md#before-you-start) — the shortest install pointer, for reference
