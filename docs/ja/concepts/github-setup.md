> 🌐 [English](../../en/concepts/github-setup.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/github-setup.md)

[← README に戻る](../../../README.ja.md)

# GitHub セットアップ

`setup_repo.py` が自動で設定する内容と、手動で再現するためのチェックリスト。

## ウィザードが設定するもの

`python3 scripts/setup_repo.py`(Lab 3)を実行し、`gh` が利用可能で認証済みであれば、以下が設定されます:

| 領域 | 設定項目 | 値 |
|---|---|---|
| Repo メタデータ | 名前、説明 | `config/project-setup.json` から |
| Merge ポリシー | Squash merge | 唯一許可される方式 |
| Merge ポリシー | Merge 時にブランチ削除 | 有効 |
| Workflow 権限 | `GITHUB_TOKEN` 権限 | contents + pull-requests(read-write) |
| Review 自動承認 | Bot レビュー | 有効(Release Please + promotion PR 用) |
| ブランチ保護 | 必須チェック | `Validate / summary` |
| ブランチ保護 | PR レビュー必須 | 1 approval |
| ブランチ保護 | 古いレビューを dismiss | on |
| Actions 変数 | `AWS_REGION` | config から |
| Actions 変数 | `AWS_RELEASE_ROLE_ARN` | OIDC スタックの outputs から |
| Actions 変数 | `AWS_STATIC_DEPLOY_ROLE_ARN` | OIDC スタックの outputs から |
| Actions 変数 | `AWS_ECS_DEPLOY_ROLE_ARN` | OIDC スタックの outputs から |

## 手動チェックリスト(`gh` が使えない場合 / 手動で再現したい場合)

### 1. repo の作成(存在しなければ)

```
gh repo create <owner>/<repo> --public --source=. --push
```

あるいはブラウザで: New repository → `config/project-setup.json` と同じ名前 → Public → 作成。

> デフォルトが `--public` なのは、shields.io で描画する進捗バッジが public リポジトリにしか効かないためです。バッジが常に `0` で構わないなら `--private` に置き換えても問題ありません。OIDC の信頼関係は repo slug にスコープされており、可視性で変わりません。

### 2. Merge ポリシー

GitHub → Settings → General → **Pull Requests**:

- ☐ Allow merge commits
- ☐ Allow rebase merging
- ☑ Allow squash merging
- ☑ Automatically delete head branches

### 3. Workflow 権限

GitHub → Settings → Actions → General → **Workflow permissions**:

- ◉ Read and write permissions
- ☑ Allow GitHub Actions to create and approve pull requests

### 4. `main` のブランチ保護

GitHub → Settings → Branches → **Add branch ruleset**:

- Target: `main`
- ☑ Require a pull request before merging
  - ☑ Require approvals(1)
  - ☑ Dismiss stale pull request approvals
- ☑ Require status checks to pass before merging
  - 追加: `Validate / summary`
- ☑ Require branches to be up to date before merging(任意だが推奨)

### 5. Actions 変数(secrets ではなく)

GitHub → Settings → Secrets and variables → Actions → **Variables** タブ:

| 名前 | 由来 | 例 |
|---|---|---|
| `AWS_REGION` | `config/project-setup.json` | `ap-northeast-1` |
| `AWS_RELEASE_ROLE_ARN` | CloudFormation スタック output | `arn:aws:iam::123...:role/resume-cicd-lab-release-role` |
| `AWS_STATIC_DEPLOY_ROLE_ARN` | CloudFormation スタック output | `arn:aws:iam::123...:role/resume-cicd-lab-static-deploy` |
| `AWS_ECS_DEPLOY_ROLE_ARN` | CloudFormation スタック output | `arn:aws:iam::123...:role/resume-cicd-lab-ecs-deploy` |

これらは **変数** であって secrets ではありません。role ARN は秘密ではない — その role の trust policy がどの GitHub repo から assume できるかを制限するので、ARN 単体は攻撃者にとって無用です。

### 6. 検証

些細なブランチを push して PR を開く。見えるはずのもの:

- `Validate / summary` チェックが required として表示
- チェックが通るまで merge ボタンが無効
- Squash merge のみが有効な merge オプション
- Merge 後、ブランチが自動削除

## ブランチ戦略

- **`main` が唯一の長命ブランチ**。production とローカルは分岐しない。
- **feature ブランチは短命**(`feat/*`、`fix/*`、`docs/*`、`chore/*`)。PR を開き、green check を得て、squash-merge。
- **`dev`、`stg`、`prd` ブランチは作らない**。環境状態は `deploy/` に住む、ブランチ名には住まない。だからプロモーションは環境ブランチ間の merge ではなく、PR 内のファイル変更です。
- **Release Please が恒久的な「release PR」を管理**。conventional commits をマージすると自動更新される; リリースを切りたい時にそれをマージする。

## ワークフローファイル一覧

| ワークフロー | 発火契機 | 目的 |
|---|---|---|
| `.github/workflows/ci.yml` | PR + main への push | パスベースのバリデーションレーン |
| `.github/workflows/release-please.yml` | main への push | release PR を開く/更新する |
| `.github/workflows/release-assets.yml` | `web-v*` タグ + workflow_dispatch | アーティファクトビルド + dev 自動プロモート |
| `.github/workflows/deploy-static.yml` | main への push で `deploy/static/**` に影響 | S3 sync + CloudFront invalidation |
| `.github/workflows/deploy-ecs.yml` | main への push で `deploy/ecs/**` に影響 | task-def 登録 + service 更新 |
| `.github/workflows/lab-label.yml` | PR マージ | 該当 PR に `lab-N-complete` ラベルを付与 |

## 追加しないもの

- **長期 AWS アクセスキーを secret として**。OIDC セットアップの目的はこれを避けることです。
- **promotion PR を経由しない `deploy-production` ワークフロー**。プロモーションこそがレビュー可能なゲートです; ワークフローはマージされた manifest 変更でのみ発火すべき。
- **別の CI ツール(Circle / Buildkite など)**。このラボは意図的にシングルプラットフォーム(GitHub Actions)にしているので、学習者のメンタルモデルがシンプルに保たれます。

## 関連

- [`architecture.md`](./architecture.md) — AWS 側の OIDC 信頼がどこにあるか
- [`cicd-model.md`](./cicd-model.md) — なぜ push モード CD か
- [`infrastructure.md`](./infrastructure.md) — 各 CloudFormation スタックの中身
