> 🌐 [English](../../en/tools/install.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/install.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# インストール — 6 つの CLI + 認証

Lab 2 の `validate-tools` は 6 つの CLI を PATH に要求します: `git`、`gh`、`aws`(v2)、`python3`(≥ 3.10)、`node`(22)、`jq`。このページは OS 別のインストールチートシート + その後やる一度きりの認証です。ツールが足りなくて `validate-tools` が落ちたら、ここから始めてください。

## macOS — Homebrew 一行

[Homebrew](https://brew.sh/) が入っているなら:

```
brew install git gh awscli python node jq
```

これで 6 つとも現行安定版が揃い、Lab 2 のフロア(最低バージョン)を全部クリアします。終わり。

Homebrew が入っていないなら、まず [brew.sh](https://brew.sh/) からインストール。Apple Silicon なら `/opt/homebrew/bin` を `PATH` に追加するのも忘れずに(インストーラが貼り付け用の行を出してくれる)。

## Linux

### Debian / Ubuntu

```
sudo apt update && sudo apt install -y git jq python3 python3-pip
```

`gh`、`awscli` v2、`node` 22 は apt のパッケージではフロアに届かないので、ベンダー直のインストーラを使います:

- **gh**: [cli.github.com/manual/installation](https://cli.github.com/manual/installation)(ページ内に apt リポジトリの手順あり)。
- **aws CLI v2**: [公式インストーラ](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) をダウンロード。`apt install awscli` だと v1 が入る — バージョン違い。
- **node 22**: [nvm](https://github.com/nvm-sh/nvm)(`nvm install 22 && nvm use 22`)か [NodeSource リポジトリ](https://github.com/nodesource/distributions)を使う。

### Fedora / RHEL

```
sudo dnf install -y git jq python3 python3-pip
```

Debian と同じ注意点 — `gh`、`aws` v2、`node` 22 はベンダー経由。

### Arch / Manjaro

```
sudo pacman -S git github-cli aws-cli-v2 python python-pip nodejs npm jq
```

Arch だけは全ての CLI の現行バージョンがパッケージ化されている唯一の Linux ディストロ。

## Windows

### winget(Windows 11、新しめの Windows 10)

```
winget install Git.Git GitHub.cli Amazon.AWSCLI Python.Python.3.12 OpenJS.NodeJS jqlang.jq
```

新しい `PATH` を効かせるためにシェルを再起動。PowerShell か WSL2 を使ってください — コマンドプロンプトでも動くけど、ラボの一部フォールバックスクリプトは bash を前提にしています。

### Chocolatey / Scoop

既に [Chocolatey](https://chocolatey.org/) / [Scoop](https://scoop.sh/) を使っているなら、対応パッケージは: `git`、`gh`、`awscli`、`python`、`nodejs-lts`、`jq`。

### WSL2(最もスムーズなラボ体験のための推奨)

WSL2 + Ubuntu を入れて、WSL のシェル内で上の **Debian / Ubuntu** セクションに従ってください。このコースは以降、Unix 系のシェルを前提にしています — WSL2 ならそれに合います。

## 認証(マシンごとに一度)

CLI が入ったら、一度きりのセットアップが 3 つ。

### GitHub CLI のログイン

```
gh auth login
```

選ぶ順: GitHub.com → HTTPS → Yes(GitHub 資格情報で認証)→ Login with a web browser。デバイスコードが表示される → 出た URL を開いて、コードを貼って、承認。`gh auth status` でログイン済みに見えれば OK。

### AWS 認証情報

このラボで一番楽なのは、自分の個人 AWS アカウントで **AdministratorAccess** ポリシーを付けた IAM ユーザを使うやり方です。ラボは IAM ロール、CloudFormation スタック、VPC、ECS クラスタを作るので、この広さの権限がちょうど合います。

```
aws configure
```

入力する項目: Access Key ID、Secret Access Key、デフォルトリージョン(例 `ap-northeast-1`)、デフォルト出力フォーマット(`json`)。確認:

```
aws sts get-caller-identity --no-cli-pager
```

組織が AWS SSO / IAM Identity Center を使っているなら:

```
aws configure sso
```

```
aws sso login
```

### git の名前(一度も設定したことがないなら)

```
git config --global user.name "Your Name"
```

```
git config --global user.email "you@example.com"
```

GitHub のアカウントと同じメールを使うと、コミットにアバターが出ます。

## ページャ設定(将来の頭痛防止)

3 つの CLI とも、1 行の出力でもデフォルトでページャに通ります — ハングしたように見えます。今のうちに無効化:

```
gh config set pager cat
```

```
git config --global core.pager cat
```

AWS CLI はシェルの rc に追加(bash なら `~/.bashrc`):

```
echo 'export AWS_PAGER=""' >> ~/.zshrc
```

```
source ~/.zshrc
```

詳しくは [`pager-config.md`](./pager-config.md)。

## 確認

全部ここに帰着します。repo を clone したあとのルートで:

```
python3 scripts/setup_repo.py validate-tools
```

全行が `Available` と `Authenticated` 列で `ok` になるはず。赤いのが出たら、そのツールを上のインストール手順で入れ直してから `validate-tools` を再実行。

## 関連

- [`gh.md`](./gh.md) · [`aws.md`](./aws.md) · [`git.md`](./git.md) · [`jq.md`](./jq.md) · [`python.md`](./python.md) · [`node.md`](./node.md) — CLI 別の 1 ページ入門
- [`pager-config.md`](./pager-config.md) — なぜページャが邪魔か、どう永続的に無効化するか
- ルート [README の「はじめる前」](../../../README.ja.md#はじめる前) — 最も短いインストールポインタ
