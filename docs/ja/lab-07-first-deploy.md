> 🌐 [English](../en/lab-07-first-deploy.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-07-first-deploy.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 6](./lab-06-first-artifacts.md)

# Lab 7 — First Deploy

⏱ 10 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 初めての出荷

## なぜ

10 分後には、Lab 6 でビルドしたリリースを提供する 2 つのライブ URL が手に入ります — 1 つは CloudFront フロントの静的サイト、もう 1 つは ALB フロントの Fargate コンテナ。同じビット、違うランタイム。ちょうど 2 つの manifest ファイルに触るだけの、bot が開いた PR をレビューしてマージすれば出荷完了です。

その PR があなたの **デプロイゲート** です。マージすると 2 つのワークフローが発火します:

- `Deploy Static Site`(`deploy/static/**` を監視) — S3 zip をダウンロード、`aws s3 sync` でサイトバケットへ、CloudFront invalidation
- `Deploy ECS Service`(`deploy/ecs/**` を監視) — 新しい task definition を登録、強制的に新デプロイ、services-stable を待つ

両方が並列に走ります。レジュメが 2 つのランタイムで同時にライブになります。

## やること

1. **自動で開かれた PR を探す** — タイトルは `chore(development): promote web v0.2.0`。`gh pr list --search` は括弧を含むタイトルのサブストリング一致が不安定なので、`--json` + `jq` で直接絞り込みます:
   ```
   gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore(development): promote web v")) | "\(.number): \(.title)"'
   ```
   > 💡 短い出力でもページャに落ちることがあります — `q` で抜ける。永続的な修正は [`tools/pager-config.md`](./tools/pager-config.md)。

2. **PR を開いて diff をレビューする**。ブラウザで見る:
   ```
   gh pr view <number> --web
   ```
   あるいはターミナル内で:
   ```
   gh pr diff <number>
   ```
   変わったファイルは 2 つのはず:
   - `deploy/static/development/site.json`:
     - 新しい `artifactKey`(Lab 6 の S3 zip パス)
     - 新しい `release.version` + `release.gitSha`
   - `deploy/ecs/development/task-definition.json`:
     - 新しい `image` フィールド(Lab 6 のダイジェスト付き ECR URI。タグではない)
     - 新しい `APP_VERSION` / `APP_COMMIT_SHA` 環境変数

   この 2 つの manifest が **環境契約** です。デプロイとは、これを変更することです。

   > ⚠ **promotion PR が「Some checks haven't completed yet」で止まっている?** Lab 5 の release PR と同じ bot-loop — 初回だけ close + reopen:
   > ```
   > gh pr close <number>
   > ```
   > ```
   > gh pr reopen <number>
   > ```
   > これ以降、ステップ 3 の `--auto` が期待どおり動きます。完全な背景: [`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md)。

3. **PR をマージ:**
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```

4. **両方のデプロイワークフローを並列で監視:**
   ```
   gh run list --limit 5
   # "Deploy Static Site" と "Deploy ECS Service" 両方が running になっているはず
   ```
   > 💡 `gh run list` はページャに落ちます — `q` で抜ける。永続的な修正は [`tools/pager-config.md`](./tools/pager-config.md)。

5. **デプロイ済みの URL を取得** — 実は 2 つあります。

   CloudFront URL(静的):
   ```
   jq -r .publicBaseUrl deploy/static/development/site.json
   ```
   ALB URL(ECS) — ecs-app スタックが `ServiceUrl` として export しています:
   ```
   aws cloudformation describe-stacks \
     --stack-name resume-cicd-lab-dev-ecs-app \
     --query 'Stacks[0].Outputs[?OutputKey==`ServiceUrl`].OutputValue' \
     --output text --no-cli-pager
   ```

6. **両方の URL を開く**。レジュメが、2 つの完全に異なるランタイム環境(CDN キャッシュの静的サイト + コンテナ提供の Nginx)でライブになっています。体験を比較してみてください。

## 検証

- `gh run list` が両方の Deploy ワークフローを `completed` `success` と表示。
- 両 URL がレジュメ内容を HTTP 200 で返す。
- HTML コンテンツは同じだが、全く異なるインフラパスから配信されている。
- promotion PR がマージされると Lab 7 の進捗バッジが ✓ になる。

## あなたが今やったこと

レビュー可能な環境契約に対して最初のリリースを出荷しました。レジュメ内容が 2 つの独立したランタイムで、同じ不変アーティファクトから、ライブになっています。git 履歴には「いつ、何が、どこにデプロイされたか」の完全な記録が残っています。

> ☕ 両方の URL を左右に並べて開いてみてください。HTML は同じですが、CloudFront 側はあなたに一番近いエッジでキャッシュされ、ALB 側は選んだリージョンから直接配信されます。自分で作ったその非対称性を感じる瞬間。

## 次へ

[Lab 8 — Self-Proof Banner](./lab-08-self-proof-banner.md)
