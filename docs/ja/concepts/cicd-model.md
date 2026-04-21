> 🌐 [English](../../en/concepts/cicd-model.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/cicd-model.md)

[← README に戻る](../../../README.ja.md)

# CI/CD モデル

このリポジトリが「なぜこうデプロイするのか、なぜ別のやり方を取らないのか」。

## リリースフローを一望する

```
  main に feat: コミット
         │
         ▼
  Release Please が「release PR」を開く
         │ merge
         ▼
  tag  web-v0.2.0  を push
         │
         ▼
  Build Release Assets:
     ├─ site.zip       → S3 アーティファクトバケット
     └─ container image → ECR(digest で pin)
         │
         ▼
  chore(development): promote web v0.2.0  PR が自動で開く
         │ merge
         ▼
  Deploy Static Site  +  Deploy ECS Service  (並列)
         │
         ▼
  dev 環境がライブ
         │
         ▼
  promotion_wizard.py  (dev → staging)
         │
         ▼
  chore(staging): promote web v0.2.0  PR  → merge → staging にデプロイ
```

## Push モード vs Pull モード

この repo は **push モード** です。merge 後、GitHub Actions が直接 AWS を呼び出して環境を更新します。全ての `aws s3 sync`、全ての `aws ecs update-service` 呼び出しがワークフローログに見えます。

**Pull モード**(Argo CD、Flux)は別方式です。クラスタ内部で controller が動き、git リポジトリを監視し、manifest の変更を pull してクラスタ状態と調整(reconcile)します。デプロイは「最終的に収束する(eventually consistent)」形で、ステップ・バイ・ステップではありません。

このラボで push を選ぶ理由:

- 全デプロイステップが **GH Actions ログに見える** — 各ステップが何をしているか学ぶのに最適。
- **可動部品が少ない** — インストールする controller なし、管理するクラスタサービスなし。
- **フィードバックループが短い** — merge で即デプロイ、次の調整サイクル待ちではない。

これが production だったら pull の方が良い理由:

- **ドリフト検知** — controller が継続的に reconcile; 誰かが AWS を手作業で触れば元に戻される。
- **マルチクラスタ** — CI 側にクロスアカウント認証情報を持たせずに、1 つの git repo で多数のクラスタを駆動できる。
- **ロールバック** — git コミットを revert すれば controller が自動でクラスタを戻す; ワークフロー再実行不要。

どちらのモデルも妥当です。この repo が push を選ぶのは教育的優位からで、絶対的に優れているからではありません。

参考: [Aviator: Pull vs Push GitOps](https://www.aviator.co/blog/choosing-between-pull-vs-push-based-gitops/)

## Release Please: コミットメッセージによるセマンティックバージョニング

[Release Please](https://github.com/googleapis/release-please) は `main` 上の conventional commits を読み、バージョンと CHANGELOG を上げる「release PR」を維持します。

| コミット種別 | バージョン bump |
|---|---|
| `feat:` または `feat(scope):` | minor(0.1.0 → 0.2.0) |
| `fix:` または `fix(scope):` | patch(0.1.0 → 0.1.1) |
| `feat!:` または本文に `BREAKING CHANGE:` | major(0.1.0 → 1.0.0) |
| `chore:`、`docs:`、`refactor:` | bump なし |

設定は [`release-please-config.json`](../../release-please-config.json)、manifest は [`.release-please-manifest.json`](../../.release-please-manifest.json)。タグは `web-v` プレフィックスなので、将来 release-tracked な他パッケージを追加しても衝突しません。

## 「build once, deploy many」原則

Lab 6 は 1 リリースから 2 アーティファクトを生成します:

- **S3 zip** — 不変、`web/releases/<tag>+<sha>/site.zip` で key 付け
- **ECR イメージ** — 不変、`sha256:...` ダイジェストでアドレス可能

全環境がまさにこのアーティファクトを参照します。Dev、staging、(ゆくゆくは) prod が、promotion 後に同じ zip + 同じダイジェストを指します。環境ごとにリビルドするのはアンチパターン — リビルドごとに環境ドリフトの可能性があります(node バージョン違い、タイムスタンプ違い、lockfile 解決違い)。

## Manifest 駆動デプロイ

`deploy/` ディレクトリが **環境契約** です。各 `site.json` と `task-definition.json` が、その環境で稼働すべきアーティファクトを指名します。

- manifest を変える = デプロイ内容を変える。
- 変更はレビュー可能な PR 経由で入る。
- デプロイワークフローがパスを監視し、merge で発火。
- manifest 変更の履歴がそのままデプロイの履歴。

これが **GitOps-lite** です。状態は git にあり、merge でクラウドに push される。pull モード GitOps なら controller が manifest に対して能動的にクラスタ状態を reconcile しますが、この repo は可視性のためにそのレイヤーを省いています。

## プロモーション = manifest のコピー

dev から staging へのプロモーションはリビルドしません。`deploy/static/development/site.json` の `artifactKey` と `image` フィールドを `deploy/static/staging/site.json` にコピーするだけです。ECS の task-definition も同様。

`promotion_wizard.py` がこのコピーを自動化し、draft PR を開きます。詳細は [`promotion-wizard.md`](./promotion-wizard.md)。

## なぜ長期 AWS 鍵を使わないのか

GitHub Actions は **OIDC 連携** で AWS 認証します:

1. ワークフロー開始; GitHub が特定ジョブ向けの OIDC トークンを発行。
2. ワークフローが `aws-actions/configure-aws-credentials@v4` を role ARN 付きで呼ぶ。
3. AWS STS が、そのロールの trust policy(この repo に限定される)で OIDC トークンを検証。
4. STS が一時的な AWS 認証情報を発行(~1 時間で失効)。
5. ワークフローがその認証情報で AWS API を呼ぶ。

`AWS_ACCESS_KEY_ID` を GitHub Secret に置く方式との比較:

- **ローテーションなし** — トークンはジョブ単位、~1 時間で失効。
- **漏洩リスクなし** — 漏れたトークンも 1 時間後には無用。
- **repo に限定** — IAM ロールの trust policy が、どの repo(オプションでどのブランチ)から assume できるかを制限。

参考: [GitHub: Security hardening with OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## 関連

- [`architecture.md`](./architecture.md) — インフラトポロジ全景
- [`promotion-wizard.md`](./promotion-wizard.md) — プロモーションフローの詳細
- [`infrastructure.md`](./infrastructure.md) — スタックごとの一覧
- [`scripts/watch-pipeline.sh`](../../scripts/watch-pipeline.sh) — `./scripts/watch-pipeline.sh`(または単発スナップショット用の `--once`)は、上記のピース — 環境ごとのリリース状態、共有アーティファクト、open PR、直近のワークフロー実行 — を 1 つの自動リフレッシュ「release travel」ビューに統合します。Lab 7 と Lab 9 で 2 ワークフロー並列のデプロイを眺める時に便利です。
