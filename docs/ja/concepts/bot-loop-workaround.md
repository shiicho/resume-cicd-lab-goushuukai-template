> 🌐 [English](../../en/concepts/bot-loop-workaround.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/bot-loop-workaround.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← コンセプト深掘り](./README.md)

# bot-loop 回避: close + reopen

Lab 5(リリース PR)と Lab 7(プロモーション PR)でこれに引っかかります — `summary` が永遠に green にならず、`--auto` はマージを拒否し、コード自体には何も問題がない。この記事ではルール、1 回きりの修正、そして恒久的な修正を説明します。

## ルール

組み込みの `GITHUB_TOKEN` で発火したワークフローは、下流のワークフローを起動しません。これはセキュリティ機能で、[Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow) に正式に記載されています。

このリポジトリでは:
- Release Please は `github-actions[bot]` として PR を開く → `Validate` ワークフローの `pull_request` トリガが発火しない → 必須の `summary` チェックが現れない → branch protection がマージを拒否。
- `release-assets.yml` が同じ方法でプロモーション PR を開く → 同じ停止。

## 1 回きりの修正

PR を close して即 reopen します。GitHub は `pull_request.reopened` を「ユーザ操作」として扱うので、ワークフローは通常通り動きます:

```
gh pr close <number>
```

```
gh pr reopen <number>
```

その後、`gh pr merge <number> --auto --squash --delete-branch` は `summary` が green になった瞬間にマージします。Release PR ごとに 1 回、プロモーション PR ごとに 1 回 — これがコストの全てです。

## 恒久的な修正 — Lab 11 ボーナス

GitHub App を作って、問題の 2 つのワークフローで installation token を発行し、`GITHUB_TOKEN` ではなく App として PR を開きます。App 起点のワークフローは「ユーザ操作」として扱われ、このルールを完全に回避できます。

[Lab 11 — ループを本番仕様に(GitHub App)](../lab-11-bonus-github-app.md) は全セットアップを ~15 分で歩きます: App を作成、repo にインストール、認証情報を保存、2 つのワークフローをパッチ。1 回限りのセットアップで、close + reopen の儀式は永久に消えます。

## なぜこのルールがあるか

無ければ、ワークフローが PR を開き、その PR がワークフローを起動し、そのワークフローが PR を開き…という暴走が起きます。GitHub のルールは根本で断ち切っています。コスト: App を接続するまで 2 クリックの手間が要ること。

## 関連

- [release-please-action issue #922](https://github.com/googleapis/release-please-action/issues/922) — オリジナルの罠レポート、回避策と代替認証戦略つき。
- [Lab 5 — First Release Tag](../lab-05-first-release-tag.md) — 最初にここで噛まれる。
- [Lab 7 — First Deploy](../lab-07-first-deploy.md) — もう一度ここで噛まれる。
- [Lab 11 — Ship the Loop (GitHub App)](../lab-11-bonus-github-app.md) — 業界標準の修正。
