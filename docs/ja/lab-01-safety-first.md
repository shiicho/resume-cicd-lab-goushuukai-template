> 🌐 [English](../en/lab-01-safety-first.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-01-safety-first.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 0](./lab-00-preview.md)

# Lab 1 — Safety First: トリップワイヤを仕掛ける

⏱ 5 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; セーフティネット

## なぜ

AWS のチュートリアルを投げ出す最大の理由は、$40 の消し忘れ NAT Gateway 請求です。何も動いていないうちに、冷静な頭で安全閾値を決めましょう。慌てながら Budget を設定してはいけません。

AWS Budgets は 2020 年 10 月から無料です。使わないほうが怠慢と言えます。月末の請求書が届く前に、日次でトリップワイヤが発火します。

> vs _「終わったら destroy するの忘れない」_ — ECS サービスを起動したまま寝落ちした朝 2 時のあなたは覚えていません。Budgets が代わりに覚えてくれます。  
> vs _AWS Cost Explorer_ — 被害が起きた後に検出(粒度は翌日単位)。Budgets は閾値を越えた瞬間に通知します。

## 仕組み

Lab 1 では AWS を触りません。`config/project-setup.json` の 2 つの値を設定するだけ。Budget + SNS トピック + メール購読は Lab 3 の `bootstrap-shared` CloudFormation スタックがまとめてデプロイします。同じスタック = Lab 10 の teardown で atomic に消える。

## やること

1. **[`config/project-setup.json`](../../config/project-setup.json) を開く。** 編集前に、現在の `safety` セクションを覗く:
   ```
   jq .safety config/project-setup.json
   ```
   `dailyCap: 10` と空の `email` が見えるはずです:
   ```json
   {
     "dailyCap": 10,
     "email": ""
   }
   ```

2. **`safety.email` を設定。** 実際にチェックしている受信箱にしてください。費用が上限の 80% と 100% を越えると SNS がメールします。Lab 3 実行中に **1 回だけ** 受信箱から購読を承認します。

3. **`dailyCap: 10` はそのまま。** 理由がなければ変更不要です。このラボ群のピーク費用は Lab 9 時点で $2.90/日。$10 なら十分なマージンがあり、暴走も確実に捕まえます。

   **編集が反映されたか確認。** 保存したら:
   ```
   jq .safety config/project-setup.json
   ```
   `email` にあなたのアドレスが、`dailyCap` に選んだ値が入っていれば OK。

4. **コミットして PR を開く。** `feat/lab-1-` で始まるブランチ名にすることで Lab Progress ワークフローが拾えます:
   ```
   git checkout -b feat/lab-1-safety
   ```
   ```
   git commit -am "feat(safety): configure budget tripwire"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   出力に表示される PR 番号をメモしてください。

5. **CI グリーンを確認したら PR をマージしてローカルを同期:**
   ```
   gh pr merge <number> --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

## 検証

- マージ後、Lab 1 の進捗バッジが ✓ になる。
- `grep -A2 '"safety"' config/project-setup.json` でメールと cap が確認できる。
- Lab 3 で `bootstrap-shared` スタックが Plan を表示するとき、ここで設定したメールが CFN パラメータとして現れる。同じ値が AWS に渡ります。

## あなたが得たもの

トリップワイヤの武装完了。Budget はまだ AWS に存在しませんが、Lab 3 の最初のスタックで atomic にデプロイされ、Lab 10 の destroy で atomic に消えます。セーフティネットをコード管理し、消し忘れの Budget はもう残りません。

## 次

[Lab 2 — Tools + Dry-Run the Exit](./lab-02-tools-and-dry-run.md)
