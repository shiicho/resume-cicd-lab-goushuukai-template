> 🌐 [English](../en/lab-06-first-artifacts.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-06-first-artifacts.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 5](./lab-05-first-release-tag.md)

# Lab 6 — First Artifacts (S3 + ECR)

⏱ 10 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 1 回ビルドして何度もデプロイする

## なぜ

Lab 5 のタグが今、並行して 2 つのものを生み出しました: S3 にある静的サイトの zip と、ECR にあるコンテナイメージ — 同じリリース、2 つの形。このラボでは両方を開いて、存在を確認し、名前で指し示せるようにします。ここから先、どのデプロイもこの 2 つのアーティファクトを参照します — 環境ごとのリビルドはありません。

- **静的 `site.zip`** を共有 S3 アーティファクトバケットにアップロード(CloudFront/S3 デプロイターゲット用)
- **コンテナイメージ** を ECR に push、リリースタグとコミット SHA の 2 つの tag を付ける(ECS/Fargate デプロイターゲット用)

Lab 7 で両方にデプロイする時に、自分の肌でトレードオフを感じます。これが「build once, deploy many」原則 — 環境ごとのリビルドの真逆です。

> vs _環境ごとにビルドする_ — リビルドごとに環境ドリフトの可能性が生まれます(node バージョン違い、タイムスタンプ違い、lockfile 解決違い)。Build-once は不変性を強制します — dev で動いたビットが、そのまま prod で動くビットです。

## やること

1. **自動起動するビルドを見届ける**。release PR がマージされた瞬間に `release-please.yml` が完走し、新しい tag を検出して `release-assets.yml` を `gh workflow run` で明示的にディスパッチします(`.github/workflows/release-please.yml` 末尾の `dispatch-release-assets` ジョブ)。合計 ~3–4 分。一覧してアタッチ:
   ```
   gh run list --workflow="Build Release Assets" --limit 1
   ```
   ```
   gh run watch
   ```
   > 💡 `gh run list` は 1 行出力でもページャに落ちます — `q` で抜ける。永続的な修正は [`tools/pager-config.md`](./tools/pager-config.md)。

   > **なぜ auto-dispatch になるか**: GitHub のセーフティルールは、`GITHUB_TOKEN` が push した tag から下流の `push: tags` ワークフローを起動することを禁じています(bot 同士のループ防止)。一方、同じ token からの `workflow_dispatch` イベントは明示的に許可されています。そこで Release Please は従来どおり tag を push しつつ、同じワークフローの第 2 ジョブで `gh workflow run release-assets.yml --ref $tag` を叩いて受け渡します。PAT も GitHub App も追加 secret も不要。
   >
   > 一覧が空だったら(リポジトリ設定が OFF、または `actions: write` が剥がれたなど)、手動ディスパッチでフォールバック:
   > ```
   > latest_tag=$(git ls-remote --tags origin 'web-v*' | awk -F'refs/tags/' '{print $2}' | sort -V | tail -1)
   > ```
   > ```
   > gh workflow run release-assets.yml --ref "${latest_tag}" -f version="${latest_tag#web-v}"
   > ```

2. **S3 アーティファクトを確認** — 新しい zip を一覧:
   ```
   ARTIFACT_BUCKET=$(jq -r .artifactBucket deploy/shared/delivery.json)
   ```
   ```
   aws s3 ls "s3://${ARTIFACT_BUCKET}/web/releases/" --recursive
   ```
   `web/releases/web-v0.2.0+<short_sha>/site.zip` のようなパスが見えます。key にはタグと SHA の両方が入るので、再生(replay)で衝突が起きません。

3. **ECR イメージを確認** — repo 内のイメージを一覧。`[?imageTags != null]` で未タグイメージ(リトライ時に残ることがある)を除外します。`imageTags` はリスト(1 イメージに 2 タグ)なので、`--output table` に渡す前にカンマ結合でスカラ化します — そうしないと AWS CLI の表フォーマッタは "Row should have 2 elements, instead it has 1" で落ちます:
   ```
   ECR_REPO=$(jq -r .ecrRepositoryUri deploy/shared/delivery.json | sed 's|.*/||')
   ```
   ```
   aws ecr describe-images --repository-name "${ECR_REPO}" \
     --query 'imageDetails[?imageTags != null].{tags:join(`,`, imageTags), digest:imageDigest}' \
     --output table --no-cli-pager
   ```
   同じダイジェストを指す **2 つの tag** が見えます:
   - `web-v0.2.0`(リリースタグ)
   - `sha-<short_sha>`(コミット SHA)

4. **ダイジェストをメモ** — `sha256:...`。これがイメージの暗号学的 identity です。Lab 7 のデプロイがこれを pin します。コピーしておくと、次のラボで `deploy/ecs/development/task-definition.json` に同じ値が見えます。

5. **Lab 6 の claim PR を開いてマージする。**
   ```
   ./scripts/claim.py lab-6
   ```
   スクリプトが PR 番号を出します。CI が green になったらマージ:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## 検証

- S3 一覧に、自分のリリースタグのパス配下に `site.zip` がある。
- ECR 一覧で、2 つの tag(`web-v*` と `sha-*`)が同じダイジェストを指している。
- Build Release Assets の GitHub Actions ログで、`Update development release state` ステップが成功している(これが Lab 7 の PR を起動する)。
- 👀 **コンソールで目視確認**。`.local/console-links.md`(ウィザードが生成)に S3 アーティファクトバケット + ECR repo への直リンクがあります — 新しい zip と 2 つのイメージタグをコンソール側で、上の CLI 出力と並べて確認できます。

## あなたが今やったこと

1 つのリリースタグから、2 つの不変アーティファクトを生成しました。同じビットが 2 通り(S3 key + ECR digest)でアドレス可能です。Lab 7 と Lab 9 の全環境は、まさにこのアーティファクトを参照します — リビルドなし、ドリフトなし。

> ☕ あの `sha256:...` ダイジェストは、ローカルで Docker が計算するのと同じハッシュです。`docker pull <ecr-uri>@<digest>` で取ってきて、build-once-deploy-many の主張を手元で確かめてみてください。

## 次へ

[Lab 7 — First Deploy](./lab-07-first-deploy.md)
