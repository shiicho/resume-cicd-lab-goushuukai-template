> 🌐 [English](../en/lab-00-preview.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-00-preview.md)

[← README に戻る](../../README.ja.md)

# Lab 0 — The Preview

⏱ 5 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; AWS にはまだ触れない

## なぜ

2 時間と数ドルを投下する前に、5 分だけ使って「これは土曜の朝の時間の使い方として正しいか?」を判断します。Lab 1–10 はツールのインストール、ウィザードの実行、実際の AWS リソースのプロビジョニングを要求しますが、Lab 0 はそれらを一切しません — スコープを把握して claim PR を開くだけです。

> vs _「とりあえず飛び込んで様子を見る」_ — 小さなコミットメントなら安上がりですが、「これから 2 時間と ~$5 を投下する」というコミットメントに対しては割に合いません。

## やること

1. [README](../../README.ja.md) 先頭の **scope 行を読む**。頭に入れる内容: ハンズオン ~2 時間、稼働中 $1.45–$2.90/日、Lab 10 後は $0。

2. **11 ラボの表に目を通す**(同じく README 内)。各行の「操作内容」列だけを読みます。それが、これから自分がやることの完全な輪郭です。

3. **[`なぜこの方法なのか`](../../README.ja.md#なぜこの方法なのか) セクションを一度読む**。コース全体の理屈がこの節に集約されています。今ピンと来ない項目があっても、Lab 7 までにはわかるようになります。

4. **シェルを開く**。以下の情報を確認する方法を把握してください:
   - AWS アカウント ID(`aws sts get-caller-identity --query Account --output text --no-cli-pager` — これが失敗する場合は Lab 2 で直します。`--no-cli-pager` を付けないと AWS CLI v2 が 1 行の出力まで `less` に流して `(END)` で止めるので注意。)
   - GitHub ハンドル
   - この repo のローカルパス: `pwd` が repo ルートを指すこと

5. **claim PR を開いてマージする**。これで進捗バッジ上の「Lab 0 を preview した」が記録されます。
   ```
   ./scripts/claim.py lab-0
   ```
   スクリプトがブランチを作り、署名付きメッセージで空コミットを打ち、PR を開きます — 完了時に PR URL と番号が出力されます。Lab 0 は CI 待ちがありません(ブランチ保護は Lab 3 で有効になります)。そのままマージ:
   ```
   gh pr merge <number> --squash --delete-branch
   ```
   ```
   git pull
   ```
   > 💡 以降のラボはすべて、この儀式のバリエーションで閉じます。[`concepts/pr-workflow.md`](./concepts/pr-workflow.md) がいつでも戻って見られる 1 ページのリファレンス — claim PR と feat PR の違い、各フラグの意味、`git pull` が必要な理由。

## 検証

- 次の問いに戻り読みせず答えられること: _「このラボフローで発生しうる最悪ケースの 1 日あたりの AWS コストは? そして、それを止めるコマンドは何?」_
  - 答え: $2.90/日(Lab 9 時点)。停止: `./scripts/setup_repo.py destroy`。
- claim PR をマージし、**`git pull` まで走らせる** と、Lab 0 の進捗バッジが ✓ に変わる。

## あなたが今やったこと

AWS アカウントに触れる前に、コミットメント全体を preview しました。これ以降のラボは、なんとなく流された default ではなく、自分で選んだ choice になります。

> ☕ 残りのコースはあたたかいマグと相性がいいです。カップが冷める頃には最初のスタックが立っています。

> 💡 **最初の PR を merge したのに、ローカルの README がまだ古い slug のまま?** `gh pr merge` はリモート側の操作です — あなたのローカル `main` は claim 前のコミットのまま動いていません。`git pull` で同期してください。その「なぜ」と、現場のチームがローカル/リモートを揃えるために使う 3 つのパターンは [`concepts/local-sync-after-merge.md`](./concepts/local-sync-after-merge.md) にまとめてあります。これ以降のラボでも、**毎回 merge の後に** 同じことをやります。

## 次へ

[Lab 1 — Safety First: AWS Budgets](./lab-01-safety-first.md)
