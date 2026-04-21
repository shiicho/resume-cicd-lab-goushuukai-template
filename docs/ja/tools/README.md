> 🌐 [English](../../en/tools/README.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/README.md)

[← README に戻る](../../../README.ja.md)

# ツール入門

このコースで使う各 CLI の 1 ページ解説です。**任意** — 既に知っているものは飛ばしてください。ラボを終わらせるためにここを読む必要はありません。見慣れないコマンドに出会ったとき、戻ってこられる 1 ページとして置いてあります。

**ゼロからセットアップする人はここから:**

- [`install.md`](./install.md) — OS 別の 6 CLI インストール + ログイン(macOS / Linux / Windows)
- [`pager-config.md`](./pager-config.md) — `(END)` の罠から永久に抜ける

**CLI 別の入門:**

- [`git.md`](./git.md) — バージョン管理(branch、commit、push、pull)
- [`gh.md`](./gh.md) — GitHub CLI(PR、run、variables、API)
- [`aws.md`](./aws.md) — AWS CLI v2(sts、cloudformation、s3、ecr、service-quotas)
- [`jq.md`](./jq.md) — JSON クエリ(フィルタ、プロジェクション、パイプ対応)
- [`python.md`](./python.md) — Python 3 + pip(ラボのウィザード用)
- [`node.md`](./node.md) — Node 22 + npm(Web アプリ + CI 同期)

## このうち「本番で戦える」のは?

このコースが終わった後、キャリアでほぼ毎日使うことになるのは 2 つ:

1. **`gh` + `jq`** のセット — ターミナルから機械可読な GitHub 状態を扱う。kubectl、AWS CLI、`--json` をサポートする任意のモダン CLI に転用できます。**レジュメ価値あり**: 「CI/CD 自動化ツール」。
2. **`aws` CLI v2** + `--query` + `--output` — 同じパターンを別システムで。AWS エンジニアは毎日これを使います。**レジュメ価値あり**: 「AWS 運用ツール」。

残り(`git`、`python`、`node`)は前提知識レベル — ロールが明示的に要求する場合のみ書きます。

## 関連

- [`concepts/`](../concepts/) — 設計の深い解説(push モード CD、OIDC 連携、不変アーティファクト)
- ルート [README](../../../README.ja.md) — コース概要 + ラボ索引
