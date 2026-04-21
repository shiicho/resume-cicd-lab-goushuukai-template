> 🌐 [English](../en/lab-03-wire-the-lab.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-03-wire-the-lab.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 2](./lab-02-tools-and-dry-run.md)

# Lab 3 — Wire the Lab (dev only)

⏱ ハンズオン 25 分(+ CloudFormation 待ち時間) &nbsp;·&nbsp; 💰 **+$1.45/日 ここから発生**

## なぜ

このラボが終わったら、あなたの AWS アカウントには 4 つの本物の CloudFormation スタック、GitHub ↔ AWS の最初の OIDC 信頼、そして $1.45/日 のコストが載ります。設定 2 項目を編集してセットアップウィザードを走らせ、あとは CloudFormation が重労働をこなしていくのを見届けます。完了時に手に入るもの:

- GitHub Actions と AWS アカウント間の OIDC 信頼(長期鍵なし)
- 共有のアーティファクト S3 バケット + ECR リポジトリ
- 環境ごとの S3+CloudFront 静的サイトターゲット
- 環境ごとの VPC + ALB + ECS Fargate ランタイムターゲット

初回実行のスコープは `development` のみです。完全なプロモーションフロー(dev→staging)は Lab 9 で、production はこのラボの範囲外です(意図的)。

> vs _「一往復で済ませるため 3 環境全部いっぺんに上げる」_ — これから 2 時間、まだ見ぬパターンを学ぶために staging と prod を遊ばせておくことになります。dev 先行で $1.45/日に抑える代わりに $5.40/日を払うのは割に合いません。

## やること

1. **`config/project-setup.json` を編集**。エディタで開きます。`github.owner`/`github.repo` はすでにあなたの repo を指しています — 気になるなら `grep -A2 '"github":' config/project-setup.json` で覗いて確認できます。

   **編集前に、現在の `aws` ブロックを覗く:**
   ```
   jq .aws config/project-setup.json
   ```
   6 つのフィールドが見えます。そのうち 2 つだけ、自分で選ぶ必要があります:

   | フィールド | 何を入れるか | 例 |
   |---|---|---|
   | `aws.resourceIdentifier` | AWS **リソース**名(S3 / ECR / IAM / CloudFront)に付く短い slug — 小文字 + ハイフン、20 文字以内 | `my-cicd-lab` |
   | `aws.region` | デプロイする AWS リージョン | `ap-northeast-1`(デフォルトで OK) |

   編集後、`aws` ブロックはこの形になります(擬似的な `"aws.region"` のドット記法ではなく、本物の入れ子 JSON):
   ```json
   "aws": {
     "region": "ap-northeast-1",
     "stackPrefix": "resume-cicd-lab",
     "resourceProjectName": "resume",
     "resourceIdentifier": "my-cicd-lab",
     ...
   },
   ```

   **保存したら、編集が反映されたか確認:**
   ```
   jq '{resourceIdentifier: .aws.resourceIdentifier, region: .aws.region}' config/project-setup.json
   ```
   あなたの 2 つの値(例: `"my-cicd-lab"` と `"ap-northeast-1"`)が表示され、プレースホルダー文字列が残っていなければ OK。

   **なぜこの 2 つだけか:**

   `resourceIdentifier` はウィザードが作るほぼ全ての AWS リソース名(S3 バケット、ECR リポジトリ、IAM ロール、CloudFront OAC、…)の中に入ります。AWS コンソールで一目で識別できる文字列にしてください。`resourceShortIdentifier`(デフォルト `cl`)は AWS が 32 文字で名前を切る場所だけで使う別名 — 同じアカウント + リージョンに lab コピーを 2 つ以上置くときだけ動かせばよい。

   スタック名は `resourceIdentifier` の影響を受けません — `aws.stackPrefix` から作られ、下の Verify 一覧もデフォルトを前提にしています。S3 バケット名のグローバル一意性もテンプレートが処理してくれます(12 桁の AWS アカウント ID を末尾に付ける)。詳しい分解: [`concepts/resource-naming.md`](./concepts/resource-naming.md)。

   `aws.region` は全スタックが立つリージョンを決めます。それ以外のフィールドは適切なデフォルトになっているので触る必要はありません(理由は [`concepts/infrastructure.md`](./concepts/infrastructure.md))。

   `github.owner`/`github.repo` が fork と一致しているか念のため確認:
   ```
   GH_PAGER=cat gh repo view --json nameWithOwner --jq .nameWithOwner
   ```

2. **セットアップウィザードを実行:**
   ```
   python3 scripts/setup_repo.py
   ```
   ウィザードは 5 ステップをライブ進捗つきで歩きます:
   - Step 1 Preflight — ツールチェック + repo 状態(~5 秒)
   - Step 2 Scope — `development only` を確認(各選択肢に日額コストをインライン表示)
   - Step 3 CloudFormation deploy — 4 スタック、合計 ~8–12 分(スタックごとに Rich の進捗バー)
   - Step 4 Manifest sync — `deploy/shared/`、`deploy/static/development/`、`deploy/ecs/development/` を実スタック出力で書き換え
   - Step 5 GitHub 設定 — Actions Variables に `AWS_REGION` と 3 つのロール ARN を書き込み、`main` にブランチ保護を適用(必須ステータスチェック: `summary`)。これ以降、CI が赤/保留中の PR は merge できなくなります

   > 💡 **Step 3 は CloudFormation が本気で働いている 8〜12 分 — これは AWS の下限であって、セットアップのバグではありません**。コーヒーを淹れ直すのに最適な時間。そして: AWS が Lab 1 の `safety.email` 宛にサブスクリプション確認メール(件名 **AWS Notification - Subscription Confirmation**)を送ってきます。ウィザードが終わるまでに **Confirm subscription** をクリックしておかないと、支出がキャップを超えても予算アラートが飛びません — サブスクリプションは `PendingConfirmation` のまま放置されます。

3. **スタックが途中で失敗したら**、ウィザードが枠付きエラーパネルを出します。読んで原因に対処し(たいていは IAM ロール名の衝突か S3 のグローバル一意性違反)、再開します:
   ```
   python3 scripts/setup_repo.py resume
   ```
   `.local/setup-repo-state.json` を読み直し、失敗したスタックのみ再試行します。

4. **ウィザードが書き換えた内容を確認する**。以下のファイルを開き、ブートストラップのプレースホルダーが実値に置き換わっているのを見届けます:
   - `deploy/shared/delivery.json` — artifact bucket + ECR URI
   - `deploy/static/development/site.json` — site bucket、CloudFront ID、public URL
   - `deploy/ecs/development/task-definition.json` — image URI、execution role ARN、log group 名、環境変数注入

5. **Lab 3 の claim PR を開き、マージする。**
   ```
   ./scripts/claim.py lab-3
   ```
   PR 番号をメモし、CI が green になったらマージ:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## 検証

- AWS Console → CloudFormation: 4 スタックが `CREATE_COMPLETE`:
  - `resume-cicd-lab-shared-oidc`
  - `resume-cicd-lab-shared-delivery`
  - `resume-cicd-lab-dev-static-site`
  - `resume-cicd-lab-dev-ecs-app`
- GitHub → Settings → Secrets and variables → Actions → Variables タブ: 4 変数が存在(`AWS_REGION`、`AWS_RELEASE_ROLE_ARN`、`AWS_STATIC_DEPLOY_ROLE_ARN`、`AWS_ECS_DEPLOY_ROLE_ARN`)。
- SNS サブスクリプション確認済み — メールのリンクをクリックした。ヘッドレス確認:
  ```
  aws sns list-subscriptions --no-cli-pager \
    --query 'Subscriptions[?contains(TopicArn, `budget-alerts`)].[Endpoint, SubscriptionArn]' \
    --output text
  ```
  `SubscriptionArn` が ARN になっていること(`PendingConfirmation` ではなく)。(フィルタはスタックプレフィックスではなく `budget-alerts` にマッチさせています — SNS トピック名は `resume-shared-sns-budget-alerts-<resourceIdentifier>` という形式で、スタック名プレフィックスは含まれません。`budget-alerts` は全学生のフォークで共通の固定部分です。)
- 👀 **コンソールでビジュアル確認**。`.local/console-links.md`(ウィザードが書き出す)にこのラボで作られた全リソースへのクリックリンクが載っています — CloudFormation スタック、S3 バケット、ECR、ECS、CloudFront、Budgets、SNS、IAM ロール。上の CLI 検証と合わせて開いて確認。
- 稼働コスト: ~$1.45/日(主に NAT Gateway + ECS タスク idle + CloudFront + 最小 S3)。

## あなたが今やったこと

4 スタックの CloudFormation + OIDC 連携 + tracked manifests を 15 分以下で配線しました。これで GitHub Actions は短命 AWS ロールを assume できます — 鍵なし、ローテーションなし、漏洩不可能。

## 次へ

[Lab 4 — First Green Check](./lab-04-first-green-check.md)
