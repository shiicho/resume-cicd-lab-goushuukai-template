> 🌐 [English](../../en/tools/jq.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/jq.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# jq — JSON クエリ

`jq` はコマンドライン JSON プロセッサ。標準入力(またはファイル)から JSON を受け取り、小さくも強力な式言語でフィルタ・プロジェクション・変換を行います。構造化データ版の `sed` / `awk` と考えてください。

## なぜここにあるか

ラボは JSON だらけ: `config/project-setup.json`、`deploy/shared/delivery.json`、`deploy/static/development/site.json`、`deploy/ecs/development/task-definition.json`。「X を確認」「Y を調べる」はたいてい `jq` のワンライナーです。

`gh --json` と `aws ... --output json` も `jq` とペアで最終整形。

## このラボで使う式

| 式 | 何をするか | 出現ラボ |
|---|---|---|
| `jq .aws config/project-setup.json` | `.aws` オブジェクトに入る | Lab 3 |
| `jq '{rid: .aws.resourceIdentifier, region: .aws.region}'` | 選んだフィールドで新オブジェクト投影 | Lab 3 検証 |
| `jq -r .artifactBucket deploy/shared/delivery.json` | 生文字列出力(JSON クォートなし) | Lab 6, 7 |
| `jq -r .publicBaseUrl deploy/static/development/site.json` | 生 URL | Lab 7 |
| `jq '.[] \| select(.title \| startswith("chore("))'` | 配列要素を述語でフィルタ | Lab 5, 7 |

主要フラグ:

- **`-r` / `--raw-output`** — JSON クォートを外す。別コマンドにパイプする時は必ずこれ。
- **`-c` / `--compact-output`** — レコードあたり 1 行(`while read` 用)。
- **`.` のみ** — 入力を pretty-print(JSON が妥当か確認用)。

## このラボが教える「本番の真実」

- **`jq` + CLI の `--json` 出力は普遍的なスクリプト契約**。シェルスクリプトがもう人間用テキストをパースする必要はない。
- **`-r` がほぼ常に欲しい**。なしだと `jq .name` は `"resume-cicd-lab"`(クォート付き)、ありだと `resume-cicd-lab`(素文字列)。素文字列はクリーンにパイプできます。
- **フィルタは `|` で合成**。`jq` 式の中のパイプ、シェルパイプではない。`.items | map(.id)` は `items` を選んで ID に map。

## 落とし穴

- **`aws --query` 内のバッククォートのエスケープ**。AWS CLI の JMESPath はリテラルバッククォートを文字列デリミタに使いますが、シェルバッククォートと衝突します。`--query "imageDetails[?imageTags != null].{tags:join(\`,\`, imageTags)}"` のようにエスケープ(Lab 6 参照)。
- **存在しないキーはエラーではなく `null`**。`jq .missing foo.json` を `{}` に対して打つと `null` を出して exit 0。クエリパスを疑え。

## 試してみる

Lab 5 でリリースを出した後、delivery manifest を見る:

```
jq . deploy/shared/delivery.json
```

次に特定のフィールドだけ:

```
jq '{bucket: .artifactBucket, ecr: .ecrRepositoryUri}' deploy/shared/delivery.json
```

## 転用スキル

`jq` フィルタを自信を持って書けるなら、どのクラウド(GCP / Azure も JSON 出力あり)のどのツール(kubectl、terraform、helm)相手にも ops スクリプトが書けます。`jq` 流暢さは乗数効果があります。

**レジュメの切り口**: 「CI/CD + インフラ自動化」— 特にテキストパース無しで機械可読な GitHub + AWS 運用フローをスクリプト化できる能力。

## 関連

- [`gh.md`](./gh.md) — `gh --json X,Y --jq '...'` パターン
- [`aws.md`](./aws.md) — AWS CLI `--query` は JMESPath(`jq` に似て別物); `jq` がパイプを仕上げる
- [jq マニュアル](https://jqlang.github.io/jq/manual/) — 定番リファレンス
