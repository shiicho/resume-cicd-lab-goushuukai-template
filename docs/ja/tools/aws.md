> 🌐 [English](../../en/tools/aws.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/aws.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# aws — AWS CLI v2

AWS 公式のコマンドラインクライアント。S3、EC2、CloudFormation、ECR、IAM、Service Quotas — 全ての AWS サービスが `aws <service> <verb>` 経由でアクセスできます。Lab 2 で v2 をインストール済み(`aws --version` が `2.x.y` を返す)。

## なぜここにあるか

このコースは本物の AWS リソースをプロビジョニングします。`aws` を使う 3 つの仕事:

1. **アイデンティティ / サニティチェック** — 「自分は誰?」「正しいアカウント/リージョン?」
2. **読み取り専用検査** — CloudFormation スタック、S3 アーティファクト、ECR イメージ、VPC/IGW 数の確認
3. **クォータ管理** — Lab 9 前に VPC / IGW クォータ増枠リクエスト

CloudFormation スタック作成自体は `setup_repo.py` が(`aws cloudformation deploy` を内部で叩いて)やってくれるので、手書きする必要はありません。

## このラボで使うコマンド

| コマンド | 何をするか | 出現ラボ |
|---|---|---|
| `aws sts get-caller-identity` | 自分は誰 / どのアカウント? | Lab 0 サニティ |
| `aws cloudformation list-stacks --query ...` | ステータス別にスタック一覧 | Lab 3 検証、Lab 10 検証 |
| `aws cloudformation describe-stacks --stack-name ...` | スタック出力(ALB DNS など)を取得 | Lab 7 |
| `aws s3 ls s3://<bucket>/<path>/` | プレフィックス配下の S3 オブジェクト一覧 | Lab 6 |
| `aws ecr describe-images --repository-name ... --query ...` | ECR のイメージ + digest 一覧 | Lab 6 |
| `aws ec2 describe-vpcs --query 'length(Vpcs)'` | リージョンの VPC 数 | Lab 9 |
| `aws ec2 describe-internet-gateways --query ...` | IGW 数 | Lab 9 |
| `aws service-quotas request-service-quota-increase` | クォータ増枠リクエスト | Lab 9 |
| `aws service-quotas list-requested-service-quota-change-history-by-quota` | クォータリクエストの進捗 | Lab 9 |

## このラボが教える「本番の真実」

- **`--query` + `--output text` が JSON 相手の grep 代替**。`--query` は JMESPath — JSON のクエリ言語。全 AWS サービスで同じ構文。Lab 3 / 6 / 7 の例を参照。
- **`--no-cli-pager`** は全コマンドにインラインで付ける、でないと `(END)` の罠にハマる。永続化は `~/.zshrc` / `~/.bashrc` に `export AWS_PAGER=""`。
- **Service Quotas は本物**。AWS デフォルトは保守的(リージョン当たり 5 VPC / 5 IGW)。共有アカウントでは罠になるので、Lab 9 では先に増枠。`request-service-quota-increase` + `list-requested-service-quota-change-history` のペアはキャリア技能。
- **`aws sts get-caller-identity`** は何か変だと感じた時に最初に打つべきコマンド。「あ、間違ったアカウントだ」は多くの時間を救ってきました。

## VPC + IGW クォータ事前確認(Lab 9 の地雷)

AWS はデフォルトで **リージョン当たり VPC 5 個、Internet Gateway 5 個**。Lab 9 の staging `ecs-app` スタックはそれぞれに +1 を追加するので、リージョンが既に 4 の状態で Lab 9 を走らせると apply の途中で `ServiceLimitExceeded` で失敗します。先に残量を確認し、必要なら増枠を申請してください。

Lab 3 で選んだリージョンでの残量確認(`ap-northeast-1` は適宜置き換えて):

```
aws ec2 describe-vpcs --region ap-northeast-1 --query 'length(Vpcs)' --no-cli-pager
```

```
aws ec2 describe-internet-gateways --region ap-northeast-1 --query 'length(InternetGateways)' --no-cli-pager
```

どちらかが `4` 以上なら、`10` への増枠を申請。この手の小幅増枠は AWS が数分以内に自動承認します。

VPC クォータ:

```
aws service-quotas request-service-quota-increase --service-code vpc \
  --quota-code L-F678F1CE --desired-value 10 --region ap-northeast-1
```

Internet Gateway クォータ:

```
aws service-quotas request-service-quota-increase --service-code vpc \
  --quota-code L-A4707A72 --desired-value 10 --region ap-northeast-1
```

保留中のリクエストを見る:

```
aws service-quotas list-requested-service-quota-change-history-by-quota \
  --service-code vpc --quota-code L-F678F1CE --region ap-northeast-1 --no-cli-pager
```

quota-code(`L-F678F1CE` = VPC、`L-A4707A72` = IGW)はリージョン非依存の AWS 識別子 — どのリージョンでも同じ値が効きます。

## プロファイルを使う場合

複数 AWS アカウントを扱うなら名前付きプロファイルを設定し(`aws configure --profile <name>`)、各コマンドで `--profile <name>` を付けるか、`export AWS_PROFILE=<name>` をシェルで設定。このラボはデフォルト単一プロファイルを前提 — 違うなら各コマンドに `--profile <name>` を追加してください。

## 転用スキル

中規模以上の SaaS の大半で AWS CLI v2 は標準装備。`--query`(JMESPath)+ `--output text` + 慎重な `--region` のセットは、予測可能・冪等・CI フレンドリーな ops スクリプトの書き方そのものです。

**レジュメの切り口**: 「AWS 運用ツール」または「インフラ自動化」— 特にブラウザを使わずマルチサービス(CloudFormation + IAM + ECR + S3)の read/write フローをスクリプト化できる能力。

## 関連

- [`jq.md`](./jq.md) — AWS の `--query` は JSON in/out、`jq` がパイプを仕上げる
- [`concepts/infrastructure.md`](../concepts/infrastructure.md) — 各 CloudFormation スタックの中身
- [`concepts/architecture.md`](../concepts/architecture.md) — AWS 側のトポロジ
- [AWS CLI v2 リファレンス](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/index.html) — 全サービス一覧
