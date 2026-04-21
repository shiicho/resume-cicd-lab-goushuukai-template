> 🌐 [English](../../en/concepts/infrastructure.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/infrastructure.md)

[← README に戻る](../../../README.ja.md)

# インフラストラクチャ

[`infra/cloudformation/`](../../infra/cloudformation/) 配下の CloudFormation テンプレートのスタックごとの一覧。

## 4 種類のスタック

| テンプレート | スタック名 | 個数 | 目的 |
|---|---|---|---|
| `bootstrap-shared.yaml` | `resume-cicd-lab-shared-oidc` | 1 | GitHub OIDC provider + release/static-deploy/ecs-deploy のスコープ限定ロール |
| `shared-delivery.yaml` | `resume-cicd-lab-shared-delivery` | 1 | S3 アーティファクトバケット + ECR repo |
| `static-site.yaml` | `resume-cicd-lab-<env>-static-site` | 環境ごとに 1 | プライベート S3 バケット + CloudFront ディストリビューション |
| `ecs-app.yaml` | `resume-cicd-lab-<env>-ecs-app` | 環境ごとに 1 | VPC + ALB + ECS Fargate cluster/service |

## `shared-oidc` — 信頼境界

**1 回だけ作成、全環境で再利用。**

リソース:

- **OpenID Connect Provider** — `https://token.actions.githubusercontent.com` を信頼元として登録(`config/project-setup.json` の `aws.existingGitHubOidcProviderArn` が設定されていれば既存プロバイダを再利用)。
- **スコープ限定 IAM ロール 3 つ**:
  - `<prefix>-release-role` — 信頼: この GitHub repo + `ref` が `refs/tags/web-v*` に一致する時のみ。権限: アーティファクトバケットへの S3 PutObject、web repo への ECR PushImage。
  - `<prefix>-static-deploy` — 信頼: この GitHub repo + ref が `main` の時のみ。権限: 環境ごとの site バケットへの S3 Sync、各 distribution への CloudFront invalidation。
  - `<prefix>-ecs-deploy` — 信頼: 同上。権限: ECS RegisterTaskDefinition + UpdateService + task ロールへの PassRole。

なぜ 1 つではなく 3 ロールか: 最小権限。`release-role` が漏れてもアーティファクト publish しかできず、デプロイは起こせない。`static-deploy` が漏れても ECR に新イメージは push できない。単一漏洩のブラスト半径は小さい。

## `shared-delivery` — アーティファクト平面

**1 回だけ作成、全環境で再利用。**

リソース:

- **S3 アーティファクトバケット**(`<project>-shared-s3-artifact-<identifier>-<account>`) — `web/releases/<tag>+<sha>/site.zip` を格納。ライフサイクル: 30 日後 Glacier 遷移、180 日で expire。
- **ECR リポジトリ**(`<project>-shared-ecr-web-<identifier>`) — コンテナイメージ格納。image scanning 有効。ライフサイクル: タグ付きは直近 20 個保持、untagged は 7 日で削除。

共有平面を意図的に採用 — アーティファクトは全環境で同じアーティファクトそのもの。環境ごとのアーティファクト保管は「build once」原則に反する。

## `<env>-static-site` — S3 + CloudFront ターゲット

**環境ごとに 1 つ。**

リソース:

- **プライベート S3 site バケット**(`<project>-<env>-s3-site-<identifier>-<account>`) — public access 完全ブロック。CloudFront 経由でのみ配信。
- **CloudFront Origin Access Control** — CloudFront が private バケットを読めるよう認可。
- **CloudFront ディストリビューション** — price class `PriceClass_200`(US+EU+Asia エッジ; グローバルレイテンシには十分、めったに使わないエッジには払わない)。TTL は SPA 向けに調整(HTML 短命、アセット長命)。
- **CloudFront function** — SPA ルーティング処理(非アセットパスを `/index.html` に書き換える)。

デプロイフロー: `Deploy Static Site` ワークフローがアーティファクトバケットから `site.zip` をダウンロード、解凍、`aws s3 sync --delete` で site バケットへ、`aws cloudfront create-invalidation --paths '/*'`。

## `<env>-ecs-app` — ECS + Fargate ターゲット

**環境ごとに 1 つ。**

リソース:

- **VPC** — CIDR は `config/project-setup.json` から(dev は `10.40.0.0/16`、staging は `10.50.0.0/16`、prod は `10.60.0.0/16`)。
- **2 AZ にまたがる 2 パブリックサブネット**。プライベートサブネットなし、NAT Gateway なし — 意図的なコスト制御(NAT は idle でも月 $32)。ECS は VPC endpoint 経由で ECR から image を pull。
- **Internet Gateway** + route table。
- **ALB**(Application Load Balancer)HTTP:80 リスナー → ターゲットグループ(HTTP:8080)。
- **ECS Fargate cluster** + **service** + **task definition**。
- **IAM ロール**:
  - Task execution role — ECR pull、CloudWatch Logs 書き込み。
  - Task role — 空(アプリが AWS サービスにランタイムアクセスする時用; まだ必要なし)。
- **CloudWatch log group**(`/aws/ecs/<project>-<env>-logs-web-<identifier>`)。

デプロイフロー: `Deploy ECS Service` ワークフローが更新済みの `deploy/ecs/<env>/task-definition.json` を読む、`aws ecs register-task-definition` を実行、`aws ecs update-service --force-new-deployment --wait-for-service-stable` を実行。

## 構造化命名

全ての AWS リソースは `{resourceProjectName}-{environment}-{aws-resource-code}-{identifier}` に従います。

例:

- `resume-shared-ecr-web-<identifier>` — 共有 ECR repo
- `resume-dev-ecs-service-<identifier>` — dev ECS service
- `resume-dev-s3-site-<identifier>-<account>` — dev site バケット(S3 のグローバル一意性のためアカウント ID を付与)

環境コードは略号: `dev` / `stg` / `prd`。共有リソースは `shared`。

命名を制御する 2 つの config フィールド:

- `aws.stackPrefix` — CloudFormation スタック名のベース(例: `resume-cicd-lab`)
- `aws.resourceProjectName` / `resourceIdentifier` / `resourceShortIdentifier` — リソース命名パターンの各パーツ

「short identifier」が存在するのは、AWS の一部リソース名に短い長さ制限があるから(ALB 名 ≤ 32 文字、target group 名 ≤ 32 文字)。そこでは短い形が使われます。

## production を追加する

ラボフローは staging(Lab 9)で終わります。production を試したければ:

1. **production の VPC CIDR を確認**(デフォルト `10.60.0.0/16`、`config/project-setup.json` の `environments.production.vpcCidr` に定義)が AWS アカウント内の他のものと衝突しないことを確認。3 つの環境はすべてテンプレートとして定義済みで、scope は実行時に選びます。

2. **production を含めて apply:**
   ```
   python3 scripts/setup_repo.py apply --scope development,staging,production
   ```
   `resume-cicd-lab-prd-static-site` と `resume-cicd-lab-prd-ecs-app` が追加される。コストは ~$4.35/日(dev + staging + prod)に。

3. promote:
   ```
   python3 scripts/promotion_wizard.py
   # source: staging  target: production
   ```

4. **早めに片付ける**。Prod はラボフローの想定より $1.45/日 余分に発生します。実験が終わったら destroy。

## なぜ Terraform ではなく CloudFormation か

- 教える際のツールチェーンを **1 つ減らす**。Terraform は state 管理、provider 設定、lock file が必要 — CI/CD と並行して学ぶと焦点が薄まる。
- **スタック削除がアトミック**。CloudFormation `delete-stack` は、自分が作ったリソースを片付けることがサービスとして保証されている。Terraform state は現実と乖離しうる。
- **テンプレートが読みやすい**。CloudFormation YAML は冗長だが素直 — HCL の癖も module 解決もない。

トレードオフ: CloudFormation はデプロイが遅く、構文エルゴノミクスが劣り、ドリフト検知も弱い。本番プラットフォームには Terraform の方が概して向く。このラボには CloudFormation がよりシンプル。

## 関連

- [`architecture.md`](./architecture.md) — 高レベルのトポロジ
- [`cicd-model.md`](./cicd-model.md) — リリースフローとスタックの接続
- [`github-setup.md`](./github-setup.md) — OIDC 信頼の GitHub 側
