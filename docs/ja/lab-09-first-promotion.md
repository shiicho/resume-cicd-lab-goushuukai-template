> 🌐 [English](../en/lab-09-first-promotion.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-09-first-promotion.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 8](./lab-08-self-proof-banner.md)

# Lab 9 — First Promotion (dev → staging)

⏱ ハンズオン 20 分(+ CloudFormation 待ち時間) &nbsp;·&nbsp; 💰 **+$1.45/日** &nbsp;·&nbsp; ピーク $2.90/日 に到達

## なぜ

20 分後には、dev で動いているのと同じアーティファクトが staging でも動いています — リビルドではなく、同じ S3 zip と同じ ECR ダイジェストが 2 つ目のマニフェストから参照されます。AWS に触れる前に、`diff` コマンドがそれを証明します。

> vs _staging のためにリビルド_ — よくあるアンチパターン; リビルドごとにドリフトの機会が生まれます。Build-once-promote-many が不変アーティファクトの要点です。

## やること

1. **先に VPC + Internet Gateway の余裕を確認 — これが Lab 9 の地雷です**。AWS はリージョン当たり VPC 5 個、IGW 5 個がデフォルト。staging はそれぞれ +1 を追加するので、4 個使っている共有アカウントでは apply 5–10 分後に `ServiceLimitExceeded` で落ちます — 待たせた挙句の失敗は痛い。
   ```
   aws ec2 describe-vpcs --region ap-northeast-1 --query 'length(Vpcs)' --no-cli-pager
   ```
   ```
   aws ec2 describe-internet-gateways --region ap-northeast-1 --query 'length(InternetGateways)' --no-cli-pager
   ```
   どちらかが 4 以上なら、apply 前に 10 への増枠申請を — AWS はこのくらいの増枠は数分で自動承認します。増枠コマンドと保留中リクエストの追跡は [`tools/aws.md`](./tools/aws.md) の「VPC + IGW クォータ事前確認」セクション。

2. **scope を dev + staging に広げて apply**。config は最初から 3 つの環境をテンプレートとして定義していて、scope は実行時に選びます。拡張:
   ```
   python3 scripts/setup_repo.py apply --scope development,staging
   ```
   ウィザードが既存の dev スタック(変更なし)を検知し、staging の 2 スタック(`resume-cicd-lab-stg-static-site` + `resume-cicd-lab-stg-ecs-app`)だけを追加します。共有スタックは変わりません。コストは $2.90/日(dev $1.45 + staging $1.45)に上がります。

3. **同期された staging のマニフェストをコミットしてから main に戻ります** — `promotion_wizard.py` は作業ツリーが dirty だと動きません(未コミット変更が promotion PR に流れ込んでレビューを混乱させるため):
   ```
   git checkout -b chore/lab-9-staging-provisioned
   ```
   ```
   git commit -am "chore(lab-9): record staging stack outputs"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   PR 番号をメモし、マージして main に戻る:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

4. **プロモーションウィザードを実行:**
   ```
   python3 scripts/promotion_wizard.py
   ```
   ウィザードが案内してくれる流れ:
   - Source → Target 選択(`development → staging` を選ぶ)
   - candidate release picker(新しい順; `deploy/static/development/site.json` の git 履歴を読む)
   - **Unified diff プレビュー** — `deploy/static/staging/site.json` と `deploy/ecs/staging/task-definition.json` で変わる内容を表示
   - 書き出し + draft PR を開く(`gh pr create --draft` が PR のメカニクスを処理)

5. **draft PR をレビューする**。diff を丁寧に読む:
   - `artifactKey` — 現在の dev と **完全一致**
   - `image` ダイジェスト — 現在の dev と **完全一致**
   - `siteBucket` / `cloudFrontDistributionId` — **異なる**(staging のリソース)
   - task-definition の `environment` 変数 — **異なる**(staging の URL、APP_ENV=staging)

6. **draft を ready-for-review に変え、マージしてローカルを同期:**
   ```
   gh pr ready <number>
   ```
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

7. **デプロイを見届ける**。Lab 7 と同じワークフローですが、今度は staging 向けです。staging URL が上がってきます。

## 検証

- staging URL が応答する; self-proof banner のフッターに `env: staging` が表示される。
- **不変アーティファクトの証明**。実行:
  ```
  diff deploy/static/development/site.json deploy/static/staging/site.json
  ```
  `artifactKey` が出力に **現れない** — その不在こそが証明です。両ファイルで同じ値なので `diff` は隠します。差分に出るのは環境固有フィールド(`environment`、`publicBaseUrl`、`siteBucket`、`cloudFrontDistributionId`、`cloudFormationStack`)だけ。ECS の task-definition でも同様に確認:
  ```
  diff deploy/ecs/development/task-definition.json deploy/ecs/staging/task-definition.json
  ```
  `image`(ECR digest)は出ない。変わるのは `APP_ENV`、`APP_BASE_URL`、`APP_HOSTNAME`、family/cluster/role ARN のみ。
- promotion PR がマージされると Lab 9 の進捗バッジが ✓ になる。
- 👀 **コンソールで目視確認**。`.local/console-links.md`(staging 追加で再生成)に dev と staging **両方** のリソースへのリンクが載っています — CloudFormation スタック、ALB、CloudFront ディストリビューション。同じアーティファクトを指す 2 環境を並べて見比べるのに便利。

## あなたが今やったこと

1 つのリリースを、リビルドなしで 2 つの環境にプロモートしました。自分の目で不変性の主張を証明しました(同じ artifactKey、同じ image digest、異なる env config)。これは実際の本番プロモーションが使うパターンです。

> ☕ `diff` が **出さなかった** 行こそが本質 — `artifactKey` と `image` が dev と staging で一致しているから隠れている。その見えない等号が契約そのものです。

## 次へ

[Lab 10 — The Teardown](./lab-10-teardown.md)
