> 🌐 [English](../../en/tools/gh.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/gh.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# gh — GitHub CLI

`gh` は GitHub 公式のコマンドラインクライアント。GitHub Web UI でクリックするすべてを、ターミナルからできます — しばしばより速く、常にスクリプト化可能です。

## なぜここにあるか

このコースの PR はすべて `gh` で開き、監視し、マージします。「マージ」をクリックするためにブラウザに切り替える必要はありません。1 マージあたり 10–30 秒 × 20 マージ程度の節約、そして CI/CD スクリプトで PR 状態を問い合わせ、最近の run をリストし、workflow dispatch を起動するために今後ずっと使うパターンです。

## このラボで使うコマンド

| コマンド | 何をするか | 出現ラボ |
|---|---|---|
| `gh auth login` | 一度きりのデバイスフロー認証 | README「はじめる前」 |
| `gh repo create <slug> --template <tpl> --public --clone` | GitHub template からクローン | README |
| `gh pr create --fill` | branch + 直近 commit から PR を開く | Lab 1, 2, 4, 5, 8, 9 |
| `gh pr merge <number> --squash --delete-branch` | マージ + ブランチ削除 | 全ラボ、CI green 後 |
| `gh pr ready <number>` | draft PR を ready-for-review に | Lab 9 |
| `gh pr list --state open --json ...` | PR 一覧を JSON フィールド指定で | Lab 5, 7 |
| `gh pr view --json title` | 現在の PR のタイトル取得 | Lab 5(タイトル確認) |
| `gh pr checks <number>` | PR の CI チェック状態 | Lab 4 検証 |
| `gh run watch` | 実行中のワークフローをライブ追尾 | Lab 4, 6 |
| `gh run list --limit N` | 最近のワークフロー run | Lab 6, 7 |
| `gh workflow run <file>.yml --ref <tag>` | 手動でワークフローを dispatch | Lab 6(フォールバック) |
| `gh variable list` | repo レベルの Actions Variables | Lab 3 検証 |
| `gh repo view --json nameWithOwner --jq .nameWithOwner` | 現在の repo slug を取得 | Lab 3(監査) |
| `gh api <path>` | GitHub REST API の汎用コール | `setup_repo.py` 内部 |

## このラボが教える「本番の真実」

- **OIDC + `gh` + AWS CLI が「鍵なし」三点セット**。`gh` が GitHub 側(Actions Variables、repo settings、branch protection)を、AWS CLI が IAM ロールを作成。長期鍵はどこにもありません。
- **`--json` + `jq` がスクリプトの型**。`gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore("))'` は機械可読な出力をパイプ可能に返します。人間用テキストを grep するより遥かに安全。
- **ページャの罠**。多くの `gh` コマンドは短い出力でもデフォルトでページャに落ちます — `(END)` に止まる、`q` で抜ける。インラインは `GH_PAGER=cat gh ...`、永続化は `gh config set pager cat`。

## 転用スキルの強調

`gh` + `--json` + `jq` のパターンは構造化出力をサポートする全てのモダン CLI(AWS CLI `--output json`、kubectl `-o json`、Terraform `-json`、Helm、まともな社内ツール)に転用可能です。一度この筋肉をつけると、どれ相手にもスクリプトを書けます。

**レジュメの切り口**: 「CI/CD 自動化」または「DevOps ツール」ラインで、特に PAT なしで(repo-scoped `GITHUB_TOKEN` で)PR ライフサイクル + ワークフロー dispatch をスクリプト化できる能力として挙げる価値あり。

## 関連

- [`git.md`](./git.md) — 相棒ツール
- [`aws.md`](./aws.md) — `gh` が GitHub Actions に assume させる IAM ロール側
- [`jq.md`](./jq.md) — `gh --json` を実戦投入するための道具
- [`concepts/github-setup.md`](../concepts/github-setup.md) — branch protection + merge ポリシー
- [GitHub CLI マニュアル](https://cli.github.com/manual/) — 完全コマンドリファレンス
