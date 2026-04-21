> 🌐 [English](../../en/tools/python.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/python.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# python — Python 3

ラボのウィザード(`setup_repo.py`、`promotion_wizard.py`、`claim.py`)は Python 3 で書かれています。Lab 2 のバリデーターが最低バージョン(≥ 3.10)を強制します。

## なぜここにあるか

Python はラボの CLI UX を繋ぐ接着剤です:

- **インタラクティブ CLI UX** — ライブ進捗バー、タイプドスコープ確認、枠付きエラーパネル。シェルスクリプトでは不可能。
- **クロスプラットフォーム** — 1 つのコードベースで macOS、Linux、(WSL 経由で)Windows に対応。
- **AWS との連携が簡単** — `boto3` 経由、あるいは `aws` CLI を shell-out。

## ラボの依存セット

`scripts/requirements.txt` から:

- **`typer`** — CLI フレームワーク(内部で click)
- **`rich`** — ターミナルレンダリング(progress、panel、table、カラー出力)
- **`questionary`** — インタラクティブピッカー(矢印キー選択)

1 回だけインストール(Lab 2 か README「はじめる前」):

```
pip install --user -r scripts/requirements.txt
```

## ラボのスクリプト一覧

| スクリプト | 何をするか |
|---|---|
| `scripts/setup_repo.py` | Apply ウィザード: ツール検証、環境スコープ、4–6 CloudFormation スタックのライブイベント配信デプロイ、`deploy/*` manifest の同期、GitHub Actions Variables + branch protection の設定 |
| `scripts/setup_repo.py destroy` | 同じスクリプト、destroy フロー: dry-run プレビュー、タイプドスコープ確認、スタック別進捗の teardown |
| `scripts/promotion_wizard.py` | Source → target ピッカー + unified diff + draft PR 作成、クロス環境プロモーション用(詳細: [`concepts/promotion-wizard.md`](../concepts/promotion-wizard.md)) |
| `scripts/claim.py` | ラボ進捗マーカー: `claim/lab-N` ブランチ + 空コミット PR を開き、`lab-label` ワークフローが merge 時にラベル付与 |

## このラボが教える「本番の真実」

- **Rich + Typer は過小評価されている CLI UX スタック**。進捗バー + カラーパネル + タイプド確認のあるウィザードは、destroy を「本物のインフラ」のように感じさせます — k6、Vault、Terraform Cloud CLI のような実物ツールと同じ触感。
- **`subprocess.Popen` に `stdout=DEVNULL` + `stderr=PIPE` + 別途イベントポーリングループ** — `aws` CLI の "Waiting for changeset…" を混入させずにライブ CloudFormation イベントを表示する型。`setup_repo.py` の `deploy_stack()` 参照。
- **Dry-run はフラグではなくコード設計**。全ての破壊的ツールを「プレビューのまま apply にもできる」設計にする、デフォルトは preview。`setup_repo.py destroy --dry-run` 参照。

## 転用スキル

**Python + Rich でインタラクティブ CLI ウィザードを作る能力**は本物の本番級スキル。DevOps プラットフォーム、社内開発者生産性ツール、CI/CD ユーティリティはみんなこれを掴みます。

**レジュメの切り口**: `setup_repo.py` のパターンを再現できるなら、それは実際の **ツール作成** で、「ライブイベント配信 + タイプドスコープ destroy 確認つきの Python-Rich CLI を CloudFormation オーケストレーション用に構築」として記載できます。

## 関連

- [`concepts/promotion-wizard.md`](../concepts/promotion-wizard.md) — ウィザードの 1 つを深掘り
- [Rich ドキュメント](https://rich.readthedocs.io/) — ラボ UI のライブラリ
- [Typer ドキュメント](https://typer.tiangolo.com/) — コマンド定義 + パース
