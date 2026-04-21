> 🌐 [English](../en/lab-04-first-green-check.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-04-first-green-check.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 3](./lab-03-wire-the-lab.md)

# Lab 4 — First Green Check

⏱ 5 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; CI が息をする

## なぜ

5 分後には、あなたのマシンから push して GitHub Actions が回した、最初の green `summary` チェックが手に入ります。Lab 3 で配線したものが本当に動くことの確認です。CI は CI/CD の静かなほう半分 — 動いていると信じるのではなく、動いているのを見るのが目的。

4 つのレーン(web、deploy、infra、automation)は [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) に定義されています。`detect-changes` ジョブのパスフィルターが、あなたが触ったファイルに基づいてどのレーンが走るかを決めます。

これが Lab 3 で作った OIDC 信頼が実際に効く最初のワークフロー実行でもあります — GitHub Actions が短命トークンで AWS ロールを assume、長期鍵ゼロ。6 ステップで仕組みを見ておきたければ [`concepts/oidc-federation.md`](./concepts/oidc-federation.md)(3 分)。

> vs _「CI をスキップして main に直接マージ」_ — 本番障害を起こす習慣を作ることになります。Lab 4 以降、green check は非交渉事項として扱ってください。

## やること

1. **ブランチを作り、`app/src/main.tsx` に空行を 1 行追加、コミット、push する:**
   ```
   git checkout -b feat/lab-4-first-green
   ```
   ```
   echo "" >> app/src/main.tsx
   ```
   ```
   git commit -am "chore: first CI touch"
   ```
   ```
   git push -u origin feat/lab-4-first-green
   ```
   (空白のみの変更で十分です — `app/**` は `web` レーンが監視しています。)

2. **PR を開く:**
   ```
   gh pr create --fill
   ```
   表示される PR 番号をメモしておきます。

3. **ターミナルから実行を見届ける** — タブ切り替え不要:
   ```
   gh run watch
   ```
   見えるもの:
   - `detect-changes` が最初に起動
   - `app/**` のパスフィルタは `web` レーンのみ拾うので `validate-web` だけ走る(`deploy`, `infra`, `automation` は全てスキップ)
   - `summary` ジョブがワークフロー全体をゲートする

   通常の実行時間: ~2–3 分。

4. **Green を見たら PR をマージして、ローカルを同期**。Squash-merge が唯一許された経路(Lab 3 のウィザードで設定済み):
   ```
   gh pr merge --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

   > 💡 **なぜ `--auto`?** ブランチ保護は `summary` チェックの pass をマージの条件にします。`--auto` なしで CI 完了前に `gh pr merge` を叩くと `X Pull request is not mergeable: the base branch policy prohibits the merge` が返ります。`--auto` を付けると GitHub がマージをキューイングし、チェックが green になった瞬間に自動でマージ。以降のラボも同じパターンです — フラグの意味と、マージ後の `git pull` が必要な理由の 1 ページリファレンスは [`concepts/pr-workflow.md`](./concepts/pr-workflow.md)。

## 検証

- `gh pr checks <number>` が `Validate / summary` に `pass` を表示。
- マージ後に Lab 4 の進捗バッジが ✓ になる。

## あなたが今やったこと

自分自身で組み上げた本物の CI パイプラインから、最初の green check を勝ち取りました。パス別レーンが「関係ある変更のみ」に反応することが実証されました。ここからは全ての PR がこのゲートを通ります。

## 次へ

[Lab 5 — First Release Tag](./lab-05-first-release-tag.md)
