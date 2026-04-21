> 🌐 [English](../en/lab-05-first-release-tag.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-05-first-release-tag.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 4](./lab-04-first-green-check.md)

# Lab 5 — First Release Tag

⏱ 10 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 初めてのセマンティックリリース

## なぜ

このラボの最後には、`main` 上に最初のリリースタグが刻まれます — あなたが書いた conventional commit メッセージから、bot が切ります。このタグが Lab 6 のアーティファクトビルドと Lab 7 のデプロイを起動するので、それ以降すべてはこの 1 回のマージにぶら下がります。

> vs _手動の `git tag v0.1.0 && git push --tags`_ — 動きはしますが、変更記録が残らず、リポジトリ間でズレます。Release Please は「自分がルールそのもの」なのでルールを強制できます。

## やること

1. **`feat:` コミットを作る** — `app/**` 配下のユーザー可視な変更なら何でも OK。サブステップは 4 つ:

   **a) ブランチを作る:**
   ```
   git checkout -b feat/lab-5-release-content
   ```

   **b) レジュメ内容のファイルを開いて中身を見る。** エディタで `app/src/features/resume/data/resume-projects.ts` を開きます。**最初の** `responsibilities: [` 行を見つけてください — クォートされたブレット(そのプロジェクトでやったこと)を開く配列です。その配列の先頭に、新しい 1 行を追加します。

   **c) このパイプラインに関するトークポイントを 1 行差し込む。** 最初の `responsibilities: [` のすぐ下(既存のブレットより前)に、以下の 1 行を貼り付けてください。周囲のブレットと同じ 6 スペースのインデントに揃えます:
   ```typescript
         'Deployed via GitHub Actions OIDC to AWS (CloudFormation + ECS + S3 + CloudFront)',
   ```
   保存したら確認: `git diff app/src/features/resume/data/resume-projects.ts` で `+` 行が 1 行だけ(追加したブレット)— それ以外は変わっていないのが正しいです。

   **d) コミット、push、PR を開く:**
   ```
   git commit -am "feat(resume): add talking point about release pipeline"
   ```
   ```
   git push -u origin feat/lab-5-release-content
   ```
   ```
   gh pr create --fill
   ```
   出力に表示される PR 番号をメモしてください。
   `gh pr create` が "could not find any commits between origin/main and feat/lab-5-release-content" で失敗したら、サブステップ (c) が保存されていません — ファイルを開き直し、追加した行が `responsibilities: [` 配列の中にあることを確認して保存し、再実行してください。

   > ⚠ **マージ前に PR タイトルを確認**。Release Please は `main` 上の squash-commit メッセージを `type(scope): subject` 形式で読みます。`gh pr create --fill` がブランチ名にフォールバックしていると(例: `feat/lab 5 release content`)、Release Please は CHANGELOG からあなたのコミットを静かに落とします。確認 + 修正:
   > ```
   > gh pr view --json title --jq .title
   > ```
   > ```
   > gh pr edit --title "feat(resume): add talking point about release pipeline"
   > ```
   > 💡 `(END)` で止まったら `q` で抜けます。永続的な修正は [`tools/pager-config.md`](./tools/pager-config.md)。

2. **PR をマージしてローカルを同期**(CI が green になってから):
   ```
   gh pr merge --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

3. **Release Please を待つ** — `.github/workflows/release-please.yml` は `main` への push ごとに実行され、新しい `feat:` / `fix:` コミットを検知すると release PR を開く(または更新する)。~30 秒。

4. **release PR をレビュー**。自動生成タイトルは `chore(main): release web 0.2.0` のような形。PR 番号を控える — 次のステップで必要:
   ```
   gh pr list --state open --head 'release-please--branches--main--components--web' --json number,title
   ```
   > 💡 `(END)` で止まったら `q` で抜けます。永続的な修正は [`tools/pager-config.md`](./tools/pager-config.md)。

   diff を読む:
   - `.release-please-manifest.json` のバージョンが上がっている
   - `app/CHANGELOG.md` に、あなたのコミットメッセージで新セクションが追加されている
   - `app/package.json` のバージョンが上がっている

   > ⚠ **release PR がいつまでも「Some checks haven't completed yet」で止まっている? これは想定内で、あなたの設定が壊れているわけではありません。** bot が開いた PR は `pull_request` ワークフローを自動起動しません — GitHub の安全ルールです。初回だけ手当て:
   > ```
   > gh pr close <release-pr-number>
   > ```
   > ```
   > gh pr reopen <release-pr-number>
   > ```
   > これ以降、ステップ 5 の `--auto` が期待どおり動きます。完全な背景と恒久的な修正: [`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md)。恒久的な修正は任意の [Lab 11 ボーナス](./lab-11-bonus-github-app.md)。

5. **release PR をマージしてローカルを同期**。ここがタグが切られる瞬間。ステップ 4 で控えた番号を渡す(ローカルは `main` にいるので、番号なしの `gh pr merge` は対象 PR を推論できない):
   ```
   gh pr merge <release-pr-number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

6. **タグを確認** — Release Please が `web-v<version>` 形式のタグを作る:
   ```
   git fetch --tags
   ```
   ```
   git tag --list 'web-v*'
   ```
   > 💡 `git tag --list` は出力 1 行でも `less` に落ちます — `q` で抜ける。永続的な修正は [`tools/pager-config.md`](./tools/pager-config.md)。

## 検証

- `git tag --list 'web-v*'` にタグ(例: `web-v0.2.0`)が表示される。
- GitHub → Releases タブに自動生成された release エントリがある。
- `app/CHANGELOG.md` に新バージョンのエントリがある。
- release PR がマージされると、Lab 5 の進捗バッジが ✓ になる。

## あなたが今やったこと

初めてのセマンティックリリースを、手作業ではなく bot 経由で切りました。このタグは「何が、いつ、出荷されたか」の恒久的で監査可能な記録です — 2 年後にロールバックが必要になったとき、まだそこにあります。

> 🤔 **Lab 6 に行く前に、一瞬だけ立ち止まってみてください**。Lab 4 でも `app/**` を触ったのに、リリースは何も走りませんでした。同じパス、同じ release 設定、同じコンポーネント — なのに結果が違う。なぜでしょう?
>
> <details>
> <summary>自分で考えてから、ここを開いて答え合わせ。</summary>
>
> Release Please は `app/**` の *ファイル変更* を見ているのではありません — *commit の subject* を見ています。ルールは [Conventional Commits](https://www.conventionalcommits.org/):
>
> - `feat:` → minor バージョンアップ(0.1.0 → 0.2.0)
> - `fix:` → patch バージョンアップ(0.1.0 → 0.1.1)
> - `chore:`、`docs:`、`refactor:`、`style:`、`test:`、`perf:`、`build:`、`ci:` → **バージョンは上がらない**
>
> Lab 4 の commit は `chore: first CI touch`。Release Please はそれを見て、肩をすくめて、また眠りに戻りました。release PR を開かせた張本人は Lab 5 の `feat(resume): …` です。
>
> 直交する 2 つのルールが同時に噛み合う必要があります: パスフィルタ(`app/**`)は *どのコンポーネント* がリリースされるかを決め、commit タイプは *そもそもリリースが起きるかどうか* を決めます。
>
> 筋肉にしておく価値あり — ユーザーに見えない作業(README 修正、CI 設定、内部リファクタ)は `chore:` にしておくと、バージョン番号が意味を保ったままになります。
> </details>

> ☕ ブラウザで repo の **Releases** タブを開いてみてください。bot が CHANGELOG 付きのちゃんとしたリリースページを、誰の手も介さずに公開しています。

## 次へ

[Lab 6 — First Artifacts (S3 + ECR)](./lab-06-first-artifacts.md)
