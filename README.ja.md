> 🌐 [English](README.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](README.cn-zh.md)

# resume-cicd-lab

1 つの React アプリを 2 通りの方法で AWS に配信する — S3 + CloudFront **と** ECS/Fargate — ハンズオン形式 11 ラボで、完全なリリース&プロモーションのパイプラインを自分で動かして学びます。

> ⏱ ハンズオン合計 ~2 時間 &nbsp;·&nbsp; 💰 稼働中は 1 日 $1.45 – $2.90 &nbsp;·&nbsp; 🧹 Lab 10 完了後は $0

- 🔗 **ライブデモ**: _Lab 7 で配信される — 自分のデプロイは自分専用の URL を持ちます_
- 🧭 **アーキテクチャ図**: [`docs/ja/concepts/architecture.md`](docs/ja/concepts/architecture.md)
- 🛠 **ツール入門**(オプトイン): [`docs/ja/tools/`](docs/ja/tools/README.md) — git、gh、aws、jq、python、node の 1 ページ解説
- 📚 **コンセプト深掘り**: [`docs/ja/concepts/`](docs/ja/concepts/) — CI/CD モデル、OIDC federation、promotion wizard など

---

## 対象となる学習者

✅ git と Docker を使えて、CloudFormation を読めて、長期鍵に頼らずに GitHub Actions → AWS を配線したい人  
✅ GUI クリック型ではなく、理屈(「なぜ OIDC なのか? なぜ push モードなのか? なぜデプロイ先を 2 つ用意するのか?」)を理解したい人  
✅ 自分で制御できる AWS アカウントを持っていて、学習に合計 **$5 程度**使える人  
❌ ポイント&クリックのガイド UI がほしい人は [AWS Workshop Studio](https://catalog.workshops.aws/) を使ってください

この repo は、動く状態のレジュメをデプロイ可能なペイロードとして最初から同梱しています。これから本物のリリースパイプラインを使って **1 本の React アプリ** を配信し、そのあと好きに自分自身のレジュメ内容に差し替えられます。

## 組み立てるもの

1. **OIDC** を使った GitHub Actions パイプライン(Secrets に AWS の長期鍵を置かない)
2. 1 本の React アプリを **1 リリース = 2 つの不変アーティファクト** にコンパイル(S3 zip と ECR イメージ)。一度ビルドして環境間でプロモーションする
3. **tracked manifest** モデル — 全てのデプロイが AWS コンソールのクリックではなく、レビュー可能な Pull Request になる

## なぜこの方法なのか

- **なぜ Secrets の AWS アクセスキーではなく OIDC か?** &nbsp;ワークフロー実行ごとに発行される短命トークンは数分で失効する。長期鍵は漏れたら侵害になる。OIDC はローテーションの問題そのものをなくしてくれる。
- **なぜ Argo CD の pull モードではなく push モード CD か?** &nbsp;全てのデプロイステップが GitHub Actions のログに見える。pull モードはクラスタ内部で状態調整を隠す — 本番スケールには優れるが、各ステップが何をしているか学ぶには劣る。
- **なぜ Terraform ではなく CloudFormation か?** &nbsp;教える側のツールチェーンを 1 つ減らせる。スタックの削除はアトミックで安全が保証されている — 実行の合間に AWS アカウントをまっさらに戻したい用途に向く。
- **なぜ 1 つではなく 2 つのデプロイターゲット(S3 と ECS)か?** &nbsp;Lab 7 で自分の肌で違いを感じるため — 同じリリース、異なるランタイム、異なるトレードオフ。抽象的に読むのではなく、自分で触って体感する。

---

## ラボ一覧

11 個のラボを順番に進めます。各ラボは短く(読むのに ≤30 秒、作業 2–10 分、検証、達成感)、進捗が記録される Pull Request のマージで完了します。

| # | タイトル | 所要時間 | コスト | 操作内容 |
|---|---|---|---|---|
| 0 | [The Preview](docs/ja/lab-00-preview.md) | 5 分 | $0 | 範囲を把握する; 何もインストールする前にコミットする |
| 1 | [Safety First — AWS Budgets](docs/ja/lab-01-safety-first.md) | 5 分 | $0 | `safety.email` を config に設定; Budget トリップワイヤは Lab 3 で deploy される |
| 2 | [Tools + Dry-Run the Exit](docs/ja/lab-02-tools-and-dry-run.md) | 10 分 | $0 | ツール類のインストール; 空状態に対して `destroy --dry-run` を走らせる |
| 3 | [Wire the Lab (dev only)](docs/ja/lab-03-wire-the-lab.md) | 25 分 | **+$1.45/日** | 設定 4 項目を編集; ウィザード実行; 4 つの CloudFormation スタックがデプロイされるのを見届ける |
| 4 | [First Green Check](docs/ja/lab-04-first-green-check.md) | 5 分 | $0 | 小さな変更を push; CI 実行をターミナルでライブに眺める |
| 5 | [First Release Tag](docs/ja/lab-05-first-release-tag.md) | 10 分 | $0 | `feat:` コミットをマージ; Release Please に `web-v0.1.0` を切ってもらう |
| 6 | [First Artifacts (S3 + ECR)](docs/ja/lab-06-first-artifacts.md) | 10 分 | $0 | タグが生成した S3 zip と ECR ダイジェストを確認する |
| 7 | [First Deploy](docs/ja/lab-07-first-deploy.md) | 10 分 | $0 | bot が開いた昇格 PR をレビュー; マージ; 自分のライブ URL を開く |
| 8 | [Self-Proof Banner](docs/ja/lab-08-self-proof-banner.md) | 15 分 | $0 | ビルド情報バナーを追加 — サイト自身が何から生まれたかを **証明** する |
| 9 | [First Promotion (dev → staging)](docs/ja/lab-09-first-promotion.md) | 20 分 | **+$1.45/日** | プロモーションウィザード実行; 同じアーティファクト、異なる環境 |
| 10 | [The Teardown](docs/ja/lab-10-teardown.md) | 10 分 | **-$2.90/日** | `destroy --dry-run`、タイプドスコープ確認、$0 に戻す |
| 11 | [ループを本番仕様に(GitHub App)](docs/ja/lab-11-bonus-github-app.md) _(ボーナス)_ | 15 分 | $0 | Lab 5 / Lab 7 の close + reopen を GitHub App で廃止 — 任意、GitHub のみ |

**ハンズオン合計**: ~2 時間 10 分(AWS のスタック作成待ちは除く。任意の Lab 11 ボーナスも除く)
**ピーク日額課金**(Lab 9 以降): Lab 10 でゼロに戻すまで $2.90/日
**最終状態**(Lab 10 後): アカウントは $0/日に戻り、ローカル git 履歴は保持される

---

## 進捗

全ラボはマージされた PR で終わります。マージ時に [`.github/workflows/lab-label.yml`](.github/workflows/lab-label.yml) が `lab-N-complete` ラベルを付与し、以下のバッジがそのラベル数を読み取ります。**すべて `0` = 未着手** · **すべて `1` = 完了**。

[![Lab 0](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-0-complete+is%3Amerged&label=Lab%200&style=flat-square&color=gold&cacheSeconds=60)](docs/ja/lab-00-preview.md)
[![Lab 1](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-1-complete+is%3Amerged&label=Lab%201&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/ja/lab-01-safety-first.md)
[![Lab 2](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-2-complete+is%3Amerged&label=Lab%202&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/ja/lab-02-tools-and-dry-run.md)
[![Lab 3](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-3-complete+is%3Amerged&label=Lab%203&style=flat-square&color=gold&cacheSeconds=60)](docs/ja/lab-03-wire-the-lab.md)
[![Lab 4](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-4-complete+is%3Amerged&label=Lab%204&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/ja/lab-04-first-green-check.md)
[![Lab 5](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-5-complete+is%3Amerged&label=Lab%205&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/ja/lab-05-first-release-tag.md)
[![Lab 6](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-6-complete+is%3Amerged&label=Lab%206&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/ja/lab-06-first-artifacts.md)
[![Lab 7](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-7-complete+is%3Amerged&label=Lab%207&style=flat-square&color=gold&cacheSeconds=60)](docs/ja/lab-07-first-deploy.md)
[![Lab 8](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-8-complete+is%3Amerged&label=Lab%208&style=flat-square&color=gold&cacheSeconds=60)](docs/ja/lab-08-self-proof-banner.md)
[![Lab 9](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-9-complete+is%3Amerged&label=Lab%209&style=flat-square&color=2ea44f&cacheSeconds=60)](docs/ja/lab-09-first-promotion.md)
[![Lab 10](https://img.shields.io/github/issues-search/shiicho/resume-cicd-lab-goushuukai-template?query=label%3Alab-10-complete+is%3Amerged&label=Lab%2010&style=flat-square&color=gold&cacheSeconds=60)](docs/ja/lab-10-teardown.md)

Lab 0、3、6、10 は `./scripts/claim.py lab-N` で開く claim PR で完了します。それ以外のラボは自分自身の feature / release / deploy PR を生成します — ワークフローはどちらの形式も認識し、ラベルを付与します。

## 中断から再開するには

上のバッジは冪等です — 昨日途中で止めても、進捗は消えていません。1 コマンドで現在地がわかります:

```
./scripts/where-was-i.py
```

最後に完了したラボ + 次のラボのドキュメントへのポインタ + (該当すれば)待っている自動 PR を表示します。

---

## 始める前に

**この repo を `.tar.gz` で受け取った場合**(直接 clone ではなく)、まず展開して cd してください:

```
mkdir -p ~/Projects
tar -xzf ~/Downloads/handoff.tar.gz -C ~/Projects
cd ~/Projects/resume-cicd-lab
```

自分の GitHub repo を作成して、シード済みのコミットを push します(tar には初期コミットが含まれているので 1 コマンドで済みます):

```
gh repo create <owner>/<name> --public --source=. --push
```

> **なぜ `--public`?** 進捗バッジは shields.io 経由で描画されます。shields.io は GitHub の未認証 search API を叩くため、private repo は見えず、バッジは常に `0` を返します。public にすると、パッケージャのレジュメ内容(Lab 7 以降にあなた自身のものに差し替え可能)、`safety.email`、AWS ロール ARN(AWS アカウント ID を含む)、Actions ワークフローログがすべて世界に見えるようになります。AWS アクセス自体は安全 — OIDC の信頼関係は owner/repo の完全一致と AWS ロールにスコープされており、リポジトリの可視性はセキュリティ境界を変えません。private を選びたい場合は `--public` を `--private` に置き換えてください。バッジは `0` のままですが、ラベルの進捗は `./scripts/where-was-i.py` でローカルに取得できます。

ラボ CLI が使う Python 依存を 1 回だけインストールします:

```
pip install --user -r scripts/requirements.txt
```

1 回だけ: 短い出力で `(END)` に詰まらないように、既定のページャーを無効化:

```
gh config set pager cat
git config --global core.pager cat
# AWS CLI: `~/.zshrc` または `~/.bashrc` に `export AWS_PAGER=""` を追記。
# 逐次対応なら `--no-cli-pager`(ラボドキュメントでは必要な箇所で既に使用)。
```

> **UI 言語について。** 最初に実行するウィザード(`claim.py` / `setup_repo.py` / `promotion_wizard.py`)で、English / 日本語 / 中文 のどれで使うか聞かれます — `$LANG` から自動検出し、`config/project-setup.json` に保存されます。個別の実行で切り替えたいときは `--locale en` / `--locale ja` / `--locale zh-CN` を付けてください。コマンド・フラグ・JSON キーはどの言語でも英語のまま、ローカライズされるのはパネル・プロンプト・祝辞のみです。

> Lab 3 で 4 つの設定項目を案内します — `github.owner`/`github.repo`(OIDC をパッケージャの slug からあなたの slug に向け直す)、`aws.resourceIdentifier`、`aws.region`。別途のセットアップステップは不要です。
>
> `python3` ≥ 3.10 と `pip` が PATH に入っていることを前提にしています。`pip install --user` のインストール先が PATH に含まれない場合は `python3 -m pip install --user -r scripts/requirements.txt` で再実行してください。
>
> Lab 0 の claim PR は 2 箇所でパッケージャの slug をあなたのものへ自動的に書き換えます: README の進捗バッジ URL(これによりマージしたラボラベルが最初から正しい repo の進捗グリッドに反映される)と `config/project-setup.json` の `github.owner`/`github.repo`(これにより Lab 3 の OIDC 信頼ポリシーがあなたの repo に紐づく)。Lab 3 であなたが選ぶのは `aws.resourceIdentifier` と `aws.region` の 2 つだけです。

---

## 始める

👉 **[Lab 0 — The Preview](docs/ja/lab-00-preview.md)**

Lab 0 は読むことと claim PR を開くだけです。5 分で、これからの 2 時間を投資するかどうかを決めます。Lab 3 までは AWS には触れません。

## 途中で止めたくなったら

Lab 10 は単体で完結します。いつでもここに飛べます:

```
./scripts/setup_repo.py destroy --dry-run    # 何が消されるかプレビュー
./scripts/setup_repo.py destroy               # プレビューを確認してから適用
```

または [Lab 10 — The Teardown](docs/ja/lab-10-teardown.md) を参照。

---

## リポジトリ構成

```
resume-cicd-lab/
├── app/                      ← React SPA(レジュメ、デプロイされる)
├── config/                   ← project-setup.json — Lab 3 で編集するファイル
├── deploy/                   ← tracked manifests — CI と AWS の契約
│   ├── shared/               ← アーティファクト bucket + ECR repo
│   ├── static/<env>/         ← 環境ごとの S3 + CloudFront ターゲット
│   └── ecs/<env>/            ← 環境ごとの ECS task-def + service
├── infra/cloudformation/     ← 純粋な CFN テンプレート(環境ごとに 4 スタック)
├── scripts/                  ← setup_repo.py(ウィザード)、promotion_wizard.py、claim.py、where-was-i.py、watch-pipeline.sh; UI i18n 用の wizard/ + locales/
├── .github/workflows/        ← Validate, Release Please, Build Release, Deploy Static/ECS
└── docs/                     ← ラボファイル + コンセプト資料(en / ja / cn-zh)
```

---

## 補足

- ウィザード CLI(`claim.py` / `setup_repo.py` / `promotion_wizard.py`)は UI のプロース — パネル、プロンプト、祝辞 — を en / ja / zh-CN にローカライズします。コマンド、フラグ、JSON キー、AWS / CloudFormation / GitHub のサブプロセス出力は英語のまま。これらは CLI の API 面なので(Git の porcelain/plumbing ルール)。UI 言語の注記は [はじめる前](#はじめる前) を参照。
- ガイド用資料(この README、11 ラボ、コンセプト資料)は **日本語** と **简体中文** に翻訳されています — 上部の言語ピッカーから切り替えてください。
- これは pre-production の学習用成果物です。生成されたインフラ上に残しておきたいものをホストしないでください。Lab 10 で全部片付けます。
