> 🌐 [English](../../en/concepts/architecture.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/architecture.md)

[← README に戻る](../../../README.ja.md)

# アーキテクチャ

1 枚の図、次に各パーツ。

## 全体像

![アーキテクチャ:自分のマシン → GitHub Actions → AWS](../../diagrams/images/architecture.png)

<details>
<summary>テキスト版(ASCII)</summary>

```
   ┌────────────────────┐      ┌──────────────────────────────────────────┐
   │                    │      │        GitHub Actions (CI/CD)            │
   │   自分のマシン      │      │                                          │
   │                    │ push │  ┌─────────┐   merge   ┌────────────┐    │
   │  git + gh + aws    ├─────▶│  │Validate │──────────▶│ release-   │    │
   │  setup_repo.py     │      │  │(path    │  to main  │ please bot │    │
   │                    │      │  │ lanes)  │           │ opens PR   │    │
   └────────────────────┘      │  └─────────┘           └──────┬─────┘    │
                               │                               │ merge    │
                               │                       tag web-v*         │
                               │                               ▼          │
                               │  ┌──────────────────────────────────┐    │
                               │  │      Build Release Assets        │    │
                               │  │                                  │    │
                               │  │  OIDC → assumeRole (no keys)     │    │
                               │  │    ↓                             │    │
                               │  │  npm build → site.zip → S3       │    │
                               │  │  docker build → image → ECR      │    │
                               │  │    ↓                             │    │
                               │  │  open dev promotion PR           │    │
                               │  └──────────────────┬───────────────┘    │
                               │                     │ merge PR            │
                               │                     ▼                     │
                               │  ┌─────────────┐  ┌─────────────┐         │
                               │  │ Deploy      │  │ Deploy      │         │
                               │  │ Static Site │  │ ECS Service │         │
                               │  └──────┬──────┘  └──────┬──────┘         │
                               └─────────┼────────────────┼────────────────┘
                                         │                │
                                         ▼                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                          AWS Account                            │
   │                                                                 │
   │   ┌──────────────────────────┐   ┌──────────────────────────┐   │
   │   │  shared-delivery         │   │  shared-oidc             │   │
   │   │   • S3 artifact bucket   │   │   • GitHub OIDC provider │   │
   │   │   • ECR repo (web)       │   │   • 3 scoped roles       │   │
   │   └──────────────────────────┘   └──────────────────────────┘   │
   │                                                                 │
   │   ┌──────────────────────────┐   ┌──────────────────────────┐   │
   │   │  dev-static-site         │   │  dev-ecs-app             │   │
   │   │   • S3 site bucket       │   │   • VPC + 2 subnets      │   │
   │   │   • CloudFront dist      │   │   • ALB                  │   │
   │   │                          │   │   • ECS Fargate service  │   │
   │   └──────────────────────────┘   └──────────────────────────┘   │
   │                                                                 │
   │   [Lab 9 で staging を追加すると同じペアが増える]                │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

</details>

## 各パーツ

**自分のマシン。** git + gh(GitHub CLI)+ aws(AWS CLI)+ `setup_repo.py`(ウィザード)を動かします。ここに長期 AWS キーは置きません — ウィザードは既存の AWS 認証情報(IAM Identity Center / AWS SSO)で CloudFormation を呼び、GitHub Actions は実行時アクセスに OIDC を使います。

**GitHub Actions。** 5 つのワークフロー:

- `Validate` — パスベースのレーン(`web`、`deploy`、`infra`、`automation`)。全 PR と main への全 push。
- `Release Please` — main 上の conventional commits を読み、release PR を開く/更新する。
- `Build Release Assets` — `web-v*` タグで発火。site.zip → S3、docker image → ECR をビルド。dev promotion PR を開く。
- `Deploy Static Site` — `deploy/static/**` を触った PR がマージされると発火。S3 へ sync、CloudFront を invalidate。
- `Deploy ECS Service` — `deploy/ecs/**` を触った PR がマージされると発火。task-def を登録、service を更新、stable を待つ。

**OIDC 連携。** `shared-oidc` スタックが `token.actions.githubusercontent.com` を信頼する OpenID Connect プロバイダを作ります。スコープ限定の 3 ロール(release、static-deploy、ecs-deploy)は、この特定リポジトリのワークフローからしか assume できません。GitHub Secrets に長期鍵はありません; トークンはジョブ単位、~1 時間で失効します。

**共有配信(shared delivery)。** `shared-delivery` スタックが作るもの:
- サイト zip 用の S3 バケット 1 個(N 日後に Glacier に lifecycle 遷移)
- web イメージ用の ECR repo 1 個(image scanning 有効、untagged は 7 日で lifecycle 剪定)

これらは全環境で共有します。アーティファクトが同じアーティファクトであることそのものが要点だからです。

**環境ごと: 静的サイト。** `<env>-static-site` スタックが作るもの:
- プライベート S3 バケット 1 個(コンテンツ用)
- CloudFront ディストリビューション 1 個(そのバケットから Origin Access Control で配信)

**環境ごと: ECS アプリ。** `<env>-ecs-app` スタックが作るもの:
- パブリックサブネット 2 個の VPC 1 つ(コスト削減のため NAT なし — タスクは VPC endpoint 経由で ECR から image を pull)
- HTTP リスナー → ECS ターゲットグループの ALB 1 つ
- ECS クラスタ + Fargate service + task definition
- task execution role + task role(最小権限)
- CloudWatch log group

2 つのデプロイターゲットは独立です — 同じアーティファクト、異なるランタイム。Lab 7 で並列にデプロイして比較できます。

## なぜこの形

- **Terraform ではなく CloudFormation** — ツールチェーンを 1 つ減らす。スタック削除はアトミック; [`Lab 10`](../lab-10-teardown.md) の teardown は安全が保証される。
- **pull モードではなく push モード** — 全てのデプロイステップが GH Actions ログで可視。詳細は [`cicd-model.md`](./cicd-model.md)。
- **manifest 駆動の状態** — `deploy/*/*.json` が環境契約。全てのデプロイがレビュー可能な PR。
- **2 つのデプロイターゲット** — 抽象的に読むのではなく、Lab 7 で自分の肌で違いを感じるため。

## より詳しく

- [`infrastructure.md`](./infrastructure.md) — スタックごとの一覧、リソース命名規則、production の追加方法
- [`cicd-model.md`](./cicd-model.md) — push vs pull、release-please、プロモーション semantics
- [`github-setup.md`](./github-setup.md) — ブランチ保護、merge ポリシー、Actions 変数
