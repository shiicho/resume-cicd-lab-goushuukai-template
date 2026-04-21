> 🌐 [English](../en/lab-02-tools-and-dry-run.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-02-tools-and-dry-run.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 1](./lab-01-safety-first.md)

# Lab 2 — Tools + Dry-Run the Exit

⏱ 10 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 入る前に出口を知る

## なぜ

ほとんどのチュートリアルは「destroy」を最後に、脚注のように教えます。これは逆です。destroy 経路を信頼できないと、「壊してしまうかもしれない」という恐怖からリソースを稼働させたままにします。だから destroy のリハーサルを **今**、まだ何も作っていない段階でやります — 実際に必要になった時(Lab 10 もしくはパニック時)に、アウトプットを見慣れた状態にしておくのです。

> vs _「必要になったら CLI が教えてくれる」_ — 教えてくれはしますが、安心できる形では教えてくれません。空の状態での dry-run なら、ブラスト半径ゼロで安心感を得られます。

## やること

1. **ツールチェーンをインストール**(すでにあるものはスキップ):
   - `git`(最近のバージョンなら何でも)
   - `python3` ≥ 3.10
   - `node` 22 + `npm` 10(CI と揃える)
   - `aws` CLI v2(`aws --version` が 2.x.y を表示)
   - `gh`(GitHub CLI — `gh auth login` 完了済み)
   - `jq`(複数のスクリプトで JSON パースに使う)

   OS 別のインストールコマンドと `gh auth login` / `aws configure` の手順は [`tools/install.md`](./tools/install.md) にまとめてあります。

   次にウィザードが使う Python パッケージをインストール(README の [Before you start](../../README.ja.md#before-you-start) で済ませた場合はスキップ可。再実行しても `pip` が no-op になるので安全です):
   ```
   pip install --user -r scripts/requirements.txt
   ```
   (typer + rich + questionary — CLI UX レイヤー)

2. **ツールバリデーター実行** — これが下流スクリプトが参照する正典的チェックです:
   ```
   python3 scripts/setup_repo.py validate-tools
   ```
   出力は `Tool | Available | Version | Authenticated` の 4 列 Rich テーブルです(列ヘッダーは UI 言語に合わせてローカライズされます — ja: `ツール | 利用可能 | バージョン | 認証済み`、zh-CN: `工具 | 可用 | 版本 | 已认证`)。`Available` はすべての行が `ok`、`Version` は `python3` / `node` / `npm` / `aws` がドキュメント要求のフロア(それぞれ `3.10` / `22.0` / `10.0` / `2.0`)を満たしていれば green、`Authenticated` は `aws` と `gh` が `ok`。`missing` の行か、フロア対象ツールがフロア未満(例: Python 3.9、node 18)の行があると、バリデーターは non-zero で終了します。インストール or アップグレードして全部 green になるまで再実行してください。全行 green になるとテーブルの下に `✓ Toolchain ready` パネルが続き、Lab 2 の次のコマンドへ誘導します。

3. **空状態に対して exit コマンドを dry-run する**。何もデプロイしていないので、確実に安全です:
   ```
   python3 scripts/setup_repo.py destroy --dry-run
   ```
   出力を読みます。空状態(現時点)では次が見えます:
   - **「Stacks (N)」** テーブル — まだ何もデプロイしていないので `N=0`。Lab 10 では apply が作ったスタックが全部ここに並びます。
   - **「ECR repositories to purge」** テーブル — destroy が空にする対象の ECR リポジトリ。今はまだ存在しませんが、Lab 7 以降で出てくる名前をここで先に見せてくれます。
   - **「What will NOT be touched」** ブロック — GitHub の repo、Actions 変数、ローカル git worktree は常に保護されます。
   - **「Cost impact」** ボックスの "Estimated cost stopped" — 空状態では `$0.00/day`(デプロイが何もないので止める対象もなし)と表示されます。Lab 9 まで走らせた状態で Lab 10 を叩くと、同じボックスが `$2.90/day` と読めて、これがまさに止めようとしている金額です。

   「Data loss warning」ブロックは実データが危険にさらされるとき(S3 オブジェクト、ECR イメージ)のみ表示されます。ここでは出ず、Lab 10 で見ることになります。

4. **ツールバージョンを記録する PR を開く**。`docs/` の変更だけで `Validate` ワークフローが起動します。サブステップは 4 つ:

   **a) ブランチを作る:**
   ```
   git checkout -b feat/lab-2-tools
   ```

   **b) まずツールのバージョンを集める。** 下のコマンドを 1 つずつ実行し、表示されたバージョン文字列をメモしてください — (c) でドキュメントに書き写します:
   ```
   git --version
   ```
   ```
   python3 --version
   ```
   ```
   node --version
   ```
   ```
   npm --version
   ```
   ```
   aws --version
   ```
   ```
   gh --version | head -1
   ```
   ```
   jq --version
   ```

   **c) このラボのドキュメントを手で編集して記録する。** エディタで `docs/ja/lab-02-tools-and-dry-run.md` を開き、ファイル末尾(最後の行 `[Lab 3 — Wire the Lab (dev only)](./lab-03-wire-the-lab.md)` リンクの次)までスクロールし、新しいセクションを追記します。各 `<…>` プレースホルダーを (b) で確認した値に置き換えてください:
   ```markdown

   ## My environment

   Recorded <YYYY-MM-DD>:

   - `git --version` → <git version>
   - `python3 --version` → <python3 version>
   - `node --version` → <node version>
   - `npm --version` → <npm version>
   - `aws --version` → <aws version>
   - `gh --version` → <gh version>
   - `jq --version` → <jq version>
   ```
   保存したら編集結果を確認: `git diff docs/ja/lab-02-tools-and-dry-run.md` で、追記した `## My environment` セクション(`+` 行が約 10 行)のみが表示され、削除や他の変更は無い状態が正しいです。

   **d) ステージ、コミット、push、PR を開く:**
   ```
   git add docs/ja/lab-02-tools-and-dry-run.md
   ```
   ```
   git commit -m "docs(lab-2): record my tool versions"
   ```
   ```
   git push -u origin feat/lab-2-tools
   ```
   ```
   gh pr create --fill
   ```
   出力に表示される PR 番号をメモ。`gh pr create` が "could not find any commits between origin/main and feat/lab-2-tools" で失敗したら、(c) の編集が保存されていません — ファイルを開き直し、末尾に `## My environment` があることを確認して保存し、再実行してください。

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

- `validate-tools` が終了コード 0 で、全ツールが `ok`。
- `destroy --dry-run` が終了コード 0 で "No changes will be made. This is a preview." のバナーと `Stacks (0)` テーブルを表示。
- PR が `Validate / summary` チェックを通過する。
- PR がマージされると Lab 2 の進捗バッジが ✓ になる。

## あなたが今やったこと

ツールチェーンの完全性を証明し、被害ゼロの状態で非常口をリハーサルしました。ここからは destroy は見知ったコマンドであって、怖いコマンドではありません。

## 次へ

[Lab 3 — Wire the Lab (dev only)](./lab-03-wire-the-lab.md)
