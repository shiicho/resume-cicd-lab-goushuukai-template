> 🌐 [English](../../en/concepts/promotion-wizard.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/promotion-wizard.md)

[← README に戻る](../../../README.ja.md)

# プロモーションウィザード

`scripts/promotion_wizard.py` — リビルドなしでリリースが環境間を渡る仕組み。

## 目的

Lab 6–7 は `Build Release Assets` ワークフロー経由で、タグから `development` 環境へリリースを自動プロモートします。これは一方通行で自動。

dev を超えるプロモーション(→ staging、→ production)は **オペレーター駆動** で自動ではありません。あなた(またはインストラクター)が、どのリリースをどの環境に出すかを明示的に決めます。ウィザードは、この判断を安全・レビュー可能・高速にするツールです。

設計ルール: **プロモーションでは絶対にリビルドしない**。dev で動いたアーティファクトと image が、そのまま staging で動くアーティファクトと image です。

## 動作

ソース環境(例: `development`)とターゲット(例: `staging`)が与えられた時、ウィザードは:

1. `deploy/static/<source>/site.json` と `deploy/ecs/<source>/task-definition.json` を読む — ソース環境で現在デプロイされているリリースを特定。
2. それらの manifest ファイルの `git log` を検査 — ソースにプロモートされた過去リリースを見つける(前進/後退両方可能)。
3. 候補リリースのピッカーを表示(新しい順、`version / gitSha / 日付 / commit subject`)。
4. ターゲット manifest で具体的に何が変わるかを **unified diff** で表示:
   - 静的 site.json の `artifactKey` + `release.version` + `release.gitSha`
   - ECS task-definition.json の `image` + 環境変数フィールド
5. 確認後、ターゲット manifest を書き出し、`gh pr create --draft` で **draft PR** を開く。

次にあなたが draft PR をレビューし、ready-for-review にフリップして merge。`Deploy Static Site` + `Deploy ECS Service` ワークフローが merge で発火。

## 使い方

```
python3 scripts/promotion_wizard.py
```

ウィザードは完全対話式 — 矢印キーで source/target を選択、矢印キーで release 候補を選択、yes/no で確認。

スクリプト / 非対話用途では:

```
python3 scripts/promotion_wizard.py \
  --source-env development \
  --target-env staging \
  --candidate-ref abc1234 \
  --yes
```

`--candidate-ref` にはソース環境のマニフェスト履歴にあるコミット SHA、もしくは現在チェックアウト中のマニフェストをそのまま昇格対象にする場合は `WORKTREE` というリテラル文字列を渡します。`--yes` は最後の確認をスキップします。

## 候補リストの見え方

```
◇  Choose a release to promote (newest first)

    ●  0.2.0  abc1234  2026-04-17  "feat: add build-info banner"
    ○  0.1.3  fed9876  2026-04-16  "fix: env.js defaults"
    ○  0.1.2  aaa0000  2026-04-15  "chore: bump release-please"
```

候補になるのは **ソース環境にデプロイ済み** のリリースのみ(manifest ファイルの git 履歴で可視)。dev で試していないものを promote してしまうのを防ぎます。

## diff プレビューの見え方

```
◇  Preview — what changes in the target manifests

    deploy/static/staging/site.json
    - "artifactKey": "web/releases/web-v0.1.2+aaa0000/site.zip"
    + "artifactKey": "web/releases/web-v0.2.0+abc1234/site.zip"
    - "release": { "version": "0.1.2", "gitSha": "aaa0000" }
    + "release": { "version": "0.2.0", "gitSha": "abc1234" }

    deploy/ecs/staging/task-definition.json
    - "image": "...resume-cicd-lab-shared-ecr-web@sha256:aaa..."
    + "image": "...resume-cicd-lab-shared-ecr-web@sha256:abc..."
    - { "name": "APP_VERSION", "value": "0.1.2" }
    + { "name": "APP_VERSION", "value": "0.2.0" }

    Same artifactKey + same image digest as dev.
    Different target bucket, different CloudFront, different ECS service.
```

ここでの教育上の要点は **最後の 2 行** です: アーティファクトの identity が不変で、環境スコープのフィールドだけが異なる、ということを文字通り目で見ることができます。これが「不変アーティファクト、交換可能な環境」パターンの 1 diff 表現です。

## PR の見え方

タイトル: `chore(staging): promote web v0.2.0`

本文(自動生成):

```markdown
Promote one immutable web release from `development` to `staging`.

Static target:
- Artifact: s3://<bucket>/web/releases/web-v0.2.0+abc1234/site.zip

ECS target:
- Image: <ecr-uri>@sha256:abc...

Release:
- Version: 0.2.0
- Source commit: abc1234

Note: same artifactKey + same image digest as `development`.
Only the target environment's bucket / CloudFront / ECS service / env vars differ.
```

## なぜ直接 push ではなく draft PR か

- **GitHub の PR UI で変更をレビュー** する機会(インラインコメント、diff ハイライト、参照可能な URL)。
- 「プロモートしたい」と「実際に出荷した」を分離する。
- PR を承認するレビュアーがデプロイのゲートになる — manifest が環境契約。

## プレビュー → 確認(デフォルト)

ウィザードは常に「プレビュー → 確認」モードで動きます。候補一覧と、ターゲットマニフェストで変更される内容の unified diff を表示したあと、「`v{version}` を `{tgt_env}` に昇格する draft PR を開きますか?」と聞きます。**No** と答えれば書き込みも PR 作成もせず終了、**Yes** で実行します。

最後の確認をスキップしたいとき(スクリプト実行や、事前に diff をレビュー済みの流れ):

```
python3 scripts/promotion_wizard.py --yes
```

## promotion_wizard.py を使うべきでない場合

- **新規作成した環境への最初のデプロイ**。ソース manifest がまだ bootstrap のプレースホルダー値なので、promote できる実体がありません。リリースビルド(Lab 5)を走らせて dev への自動プロモーションを発火させ、その後 dev から promote してください。
- **ロールバック**。ウィザードは古いリリースを候補として選ばせてくれます — それで OK。ただし実際の production ロールバックは、promotion PR に対して `git revert` を使う方が git 履歴がきれいです。
- **1 つの環境にだけ当てる緊急パッチ**。prod だけに一度限りのパッチがあるなら、「どこでも同じアーティファクト」不変条件を破っていることになります。そのパッチをまず dev に入れる(正攻法)か、環境を本当に厳密に直線的にすべきかを再考してください。

## 関連

- [`cicd-model.md`](./cicd-model.md) — リリースフロー全体
- [`architecture.md`](./architecture.md) — 各環境が AWS のどこに住んでいるか
- [`Lab 9 — First Promotion`](../lab-09-first-promotion.md) — ハンズオン
