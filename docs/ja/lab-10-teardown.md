> 🌐 [English](../en/lab-10-teardown.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-10-teardown.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 9](./lab-09-first-promotion.md)

# Lab 10 — The Teardown

⏱ 10 分 &nbsp;·&nbsp; 💰 **−$2.90/日**(課金停止) &nbsp;·&nbsp; ライフサイクル完結

## なぜ

10 分後には、あなたの AWS アカウントは $0/日 に戻っています — 全スタックが消え、全バケットが空になり、全 ECR イメージが purge される、あなたの手で。Lab 3 と同じウィザード、逆向きです。これが完全なライフサイクルの owning です — 楽しいところだけでなく。

destroy には dry-run プレビュー、タイプドスコープ確認(筋肉記憶の `y` 不可)、事前のデータ損失警告が揃っています。3 つとも実際に目にします。

> vs _「数日動かしっぱなしで実験する」_ — 週末 1 回忘れただけで $20+ です。必要な時は Lab 3 のウィザードで ~15 分で再構築できます。

## やること

1. **常に dry-run 先行**。出力を丁寧に読む:
   ```
   python3 scripts/setup_repo.py destroy --dry-run
   ```
   見えるもの:
   - 削除対象スタック(6 つ — dev 全て + staging 全て + shared)
   - 停止される推定コスト($2.90/日)
   - データ損失警告(S3 アーティファクトバケットの中身、ECR イメージ)
   - 触らないもの(GitHub repo、Actions 変数、ローカル git worktree)

2. **本番 destroy** — `--dry-run` フラグなしで呼ぶ:
   ```
   python3 scripts/setup_repo.py destroy
   ```
   ウィザードが dry-run サマリーを再表示し、次にプロンプト:
   ```
   ▲  Type the scope to confirm:
       destroy resume-cicd-lab-all
   ```
   1 文字ずつ打ちます(このフィールドでは tab 補完は無効化されています)。

3. **destroy の進捗を見届ける**。ウィザードは `aws cloudformation wait stack-delete-complete` を使います。S3 バケットはまず空にしてから削除。ECR イメージは強制削除。合計時間: ~5–10 分。

4. **AWS Console で確認**:
   - CloudFormation → Stacks → 6 スタック全てが `DELETE_COMPLETE`(またはスタックごと消えている)
   - S3 → Buckets → 個人用バケットのみ残存(`resume-cicd-lab-*` は無し)
   - ECR → Repositories → `resume-cicd-lab-*` の repo は無し
   - EC2 → Load Balancers → ラボの ALB 無し; VPC → デフォルト VPC のみ

5. **Lab 10 最終の claim PR を開いてマージする。** このマージで `lab-10-complete` ラベルが付き、最後のバッジが変わります。
   ```
   ./scripts/claim.py lab-10
   ```
   PR 番号をメモし、CI が green になったらマージ:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## 検証

- **`resume-cicd-lab-*` リソースがゼロ** であること。AWS Console か、ターミナルからヘッドレスで確認:
  ```
  aws cloudformation list-stacks \
    --query "StackSummaries[?starts_with(StackName, 'resume-cicd-lab') && StackStatus!='DELETE_COMPLETE'].StackName" \
    --output text --no-cli-pager
  ```
  空出力 = クリーン。
- AWS Budgets → `*-daily-cap` budget は残っていません。destroy が SNS トピックとメール購読とまとめて消去しました(いずれも `bootstrap-shared` の一部)。
- GitHub repo、Actions 変数、この clone 済み repo、全て無触。
- Lab 10 の進捗バッジが ✓ — 11 バッジ全て緑。(Shields.io は ~5 分キャッシュするので、バッジが反応しないように見えたら少し待つ。)
- `cat .local/setup-repo-state.json 2>/dev/null` が空かファイル自体が消えている。
- 👀 **destroy 後の総点検**。最後にもう一度 `.local/console-links.md` を開く — 全ての CloudFormation / S3 / ECR リンクが 404 になり、リージョン横断のリスト(ECS クラスタ、CloudFront ディストリビューション、Budgets)に自分の resource prefix 付きのものが 1 件もないはず。何も漏れていない証拠。

## あなたが今やったこと

AWS 環境を誕生から死まで owning しました — provision、出荷、promote、破棄。完全な CI/CD ライフサイクル: ~2 時間、支出 $3–6。

> ☕ 来週の土曜、もう一度 `python3 scripts/setup_repo.py` を回してみてください。ウィザードが既知のコマンドになっている状態なら ~15 分で全部再構築できます — 7 日目の筋肉記憶こそがこのコースの狙い。

## 次へ

ゼロから再構築(`setup_repo.py destroy` + 再実行、~15 分サイクル)してフローを体に入れてください。さらに進むなら [`cicd-model.md`](./concepts/cicd-model.md) を — production を追加、アプリを差し替え、pull モードと比較。

任意のボーナスに進む手もあります — [Lab 11 — ループを本番仕様に(GitHub App)](./lab-11-bonus-github-app.md) が Lab 5 / Lab 7 の close + reopen を業界標準の解決でたたみます(~15 分、GitHub のみ、AWS 不要)。
