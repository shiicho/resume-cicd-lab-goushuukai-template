> 🌐 [English](../../en/concepts/resource-naming.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/resource-naming.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← コンセプト深掘り](./README.md)

# リソース命名 — 目に入るすべての名前の裏にあるパターン

Lab 3 で編集を求められるのは `aws.resourceIdentifier` と `aws.region` の 2 つだけ。このページは「なぜその 2 つだけなのか」「自分が選んだ slug はどこに現れるのか」「テンプレートが S3 のグローバル一意性の落とし穴をどう回避しているのか」を説明します。どこか特定の名前がどこから来ているのか気になった時に読む後付け資料です。

## 命名パターン

CloudFormation がこのラボで作成する全 AWS リソースは、1 つのテンプレートから組み立てられています:

```
{resourceProjectName}-{envCode}-{kind}-{resourceIdentifier}[-{accountId}]
```

- `resourceProjectName` — デフォルト `resume`。環境間で共有。
- `envCode` — スタックによって `shared`、`dev`、`stg`、`prod`。
- `kind` — リソース種別(`s3-site`、`ecr-web`、`iam-gh-release`、`cf-oac` など)。
- `resourceIdentifier` — Lab 3 で **あなたが** 選ぶ slug。自分のアカウント内での区別用。
- `accountId` — S3 バケット名にのみ付加。12 桁の AWS アカウント ID。手間なくグローバル一意性を確保します。

## 出力例

`resourceIdentifier: my-cicd-lab` でその他はデフォルトの場合:

| リソース | 名前 | 末尾の理由 |
|---|---|---|
| S3 site バケット | `resume-dev-s3-site-my-cicd-lab-123456789012` | `-<accountId>` でグローバル一意 |
| ECR repo | `resume-shared-ecr-web-my-cicd-lab` | アカウント内のみ一意 |
| IAM ロール | `resume-shared-iam-gh-release-my-cicd-lab` | アカウント内のみ一意 |
| CloudFront OAC | `resume-dev-cf-oac-my-cicd-lab` | アカウント内のみ一意 |

## S3 はグローバル一意 — 地球上のすべての AWS アカウントで

「自分のアカウント内で一意」ではありません。地球上のどこかのアカウントが既に `my-bucket` を使っていれば、あなたの `CreateBucket` は `BucketAlreadyExists` で落ちます。テンプレートはこれを回避するため、S3 バケット名の末尾に必ず `-${AWS::AccountId}` を付けます — あなたの 12 桁のアカウント ID だけでグローバル一意性は確保されるので、自分で凝った slug を考える必要はありません。

S3 以外(ECR、IAM、CloudFront OAC、ALB)は **AWS アカウント + リージョン内で一意** であれば十分です。同じアカウントにラボを 2 つ走らせるなら、それぞれに別の `resourceIdentifier` を振ります。クロスアカウントは既に安全。

## スタック名は別フィールド由来

`aws.stackPrefix`(デフォルト `resume-cicd-lab`)が CloudFormation の **スタック名** を決めます(`resume-cicd-lab-shared-oidc`、`resume-cicd-lab-dev-ecs-app` など)。リソース名の中には現れません。Lab 3 の Verify 箇条書きを見ると違いがはっきり分かります: スタック名は `resume-cicd-lab-` で始まり、バケット / ロール / ECR 名は `resume-` で始まります。

`stackPrefix` は編集しないでください — Verify 箇条書きと destroy ウィザードのどちらもデフォルトを前提にしています。

## `aws.resourceShortIdentifier` がある理由

ALB とターゲットグループは名前が 32 文字までです。20 文字の `resourceIdentifier` を突っ込むと即オーバー。テンプレートはこの 2 種類にだけ `resourceShortIdentifier`(デフォルト `cl`、5 文字以内)を代入します。同じ AWS アカウント + リージョンに 2 コピーを置く場合だけ変更が必要 — そうでなければ `cl` のままで永続的に問題ありません。

## 関連

- [`concepts/infrastructure.md`](./infrastructure.md) — CloudFormation スタックの全体レイアウト
- [`config/project-setup.json`](../../../config/project-setup.json) — これらのフィールドが住んでいる場所
- [Lab 3 — Wire the Lab](../lab-03-wire-the-lab.md) — 値を選ぶ場所
