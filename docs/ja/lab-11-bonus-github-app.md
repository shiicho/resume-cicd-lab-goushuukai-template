> 🌐 [English](../en/lab-11-bonus-github-app.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-11-bonus-github-app.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 10](./lab-10-teardown.md)

# Lab 11 — ボーナス: ループを本番仕様に(GitHub App)

⏱ 15 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; GitHub のみ、AWS 無し

## なぜ

Lab 5 と Lab 7 では、初回だけの手当てとして bot が開いた PR を close → reopen して CI を発火させました。これは「GitHub の bot-loop 安全ルールが実際に自分に起きる様子」を目で見てから、2 クリックで直すという正しい学習体験でした。でも、実際のチームが本番で採用するやり方ではありません。

GitHub 公式の該当ルール(原文引用: [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)):

> "events triggered by the `GITHUB_TOKEN`, with the exception of `workflow_dispatch` and `repository_dispatch`, will not create a new workflow run."

(関連のセキュリティ文脈: [Using the GITHUB_TOKEN in a workflow](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)。)

業界の定石は、PR を開くコマンドについて「デフォルトの `GITHUB_TOKEN` bot として動く」のをやめることです。GitHub App をインストールし、実行ごとに短命のインストール トークンを発行して、`release-please` と `peter-evans/create-pull-request` にそのトークンを渡す。すると PR の発行者が App になり、`GITHUB_TOKEN` ではなくなるので bot-loop ルールの対象外 — `ci.yml` の `pull_request` トリガーが自然に発火します。close + reopen 不要、`workflow_dispatch` の回避策も不要、rollup に素直にグリーンチェックが乗ります。

本番で運用するフォークならこの lab を踏んでください。コースバッジだけ取りたいならスキップして OK です。

> vs _close + reopen を永遠に続ける_ — 学習には十分、規模が出ると苦痛。1 リリースあたり 2 つの bot PR(release-please + promotion)が開く本番パイプラインで、毎回手動で解除するのは App で消える摩擦です。  
>
> vs _Personal Access Token(PAT)を使う_ — 実装は最も簡単、衛生面は最悪。PAT はユーザーの全スコープを引き継ぎ、自動ローテーションせず、そのユーザーの identity の単一障害点になります。GitHub App はリポ単位にスコープされ、短命のインストール トークンを自動発行し、ユーザーの identity を持ちません。

## 前提

- Lab 7 まで完走していること(release → promotion のフローを一度は実行し、bot-loop トラップを体験済み)
- `gh` が自分として認証済み、フォークの admin 権限
- AWS スタックは無くて OK — この lab は GitHub のみ、$0

## やること

1. **GitHub App を作る。** [github.com/settings/apps/new](https://github.com/settings/apps/new) を開いて、以下を入力:

   | 項目 | 値 |
   |---|---|
   | GitHub App name | `<owner>-cicd-lab-bot`(グローバル一意、自由に命名) |
   | Homepage URL | フォークの URL(例: `https://github.com/<owner>/<repo>`) |
   | Webhook → Active | **チェック外す**(この App に webhook は不要) |
   | Where can this GitHub App be installed? | **Only on this account** |

   **Repository permissions** で以下を許可:

   | 権限 | アクセス | 理由 |
   |---|---|---|
   | Contents | Read & write | リリース ブランチを push、manifest 更新 |
   | Pull requests | Read & write | release と promotion の PR を開く |
   | Actions | Read & write | ワークフロー トリガー(保険として残す) |
   | Workflows | Read & write | release-please が `.github/workflows/*` に触る時に必要 |
   | Metadata | Read-only(デフォルト、外さない) | 基本要件 |

   一番下の **Create GitHub App** をクリック。

2. **秘密鍵を発行する。** App の設定ページで **Private keys → Generate a private key** までスクロール。`.pem` ファイルがダウンロードされます。パスワード同様、どこにも commit しないこと。

3. **フォークに App をインストールする。** App の左サイドバーから **Install App → 自分のフォークを選ぶ → Install**。インストール画面で **Only select repositories** を選び、自分のフォークだけチェック。

4. **App ID を控える。** App の設定ページ(**General** の上部)に戻り、数字の **App ID**(例: `123456`)を見つけてコピー。

5. **2 つの secret をフォークに保存する。** リポジトリ ディレクトリから:
   ```
   gh secret set APP_ID --body "<App-ID を貼る>"
   ```
   ```
   gh secret set APP_PRIVATE_KEY < ~/Downloads/<app-name>.<date>.private-key.pem
   ```
   > 💡 2 行目は stdin リダイレクトを使います — `gh secret set <name> <<< "<値>"` だと `.pem` の改行が壊れて鍵が使えなくなります。ファイル `<` なら改行を保って渡せます。

   確認:
   ```
   gh secret list | grep -E '^(APP_ID|APP_PRIVATE_KEY)'
   ```
   両方の名前が出るはず(値はマスク)。

6. **`.github/workflows/release-please.yml` にパッチを当てる。** `release-please` の前に App トークンを発行するステップを追加し、トークン参照を差し替えます。以下の差分を手で適用:

   ```diff
    jobs:
      release-please:
        runs-on: ubuntu-latest
        outputs:
          releases_created: ${{ steps.release-please.outputs.releases_created }}
          prs_created: ${{ steps.release-please.outputs.prs_created }}
          tag_name: ${{ steps.release-please.outputs['app--tag_name'] }}
          pr_head_branch: ${{ fromJSON(steps.release-please.outputs.pr || '{}').headBranchName }}
        steps:
   +      - name: Mint installation token
   +        id: app-token
   +        uses: actions/create-github-app-token@v1
   +        with:
   +          app-id: ${{ secrets.APP_ID }}
   +          private-key: ${{ secrets.APP_PRIVATE_KEY }}
   +
          - name: Run release please
            id: release-please
            uses: googleapis/release-please-action@v4
            with:
   -          token: ${{ github.token }}
   +          token: ${{ steps.app-token.outputs.token }}
              config-file: release-please-config.json
              manifest-file: .release-please-manifest.json
   ```

7. **`.github/workflows/release-assets.yml` にパッチを当てる。** promotion PR ステップで同じ差し替え:

   ```diff
          - name: Create development promotion PR
            id: promotion-pr
            if: steps.meta.outputs.promote_to_development == 'true'
            uses: peter-evans/create-pull-request@v6
            with:
   -          token: ${{ github.token }}
   +          token: ${{ steps.app-token.outputs.token }}
              base: main
   ```
   そして `steps:` リストの先頭(`Checkout` の前)に App トークン発行ステップを追加:
   ```diff
        steps:
   +      - name: Mint installation token
   +        id: app-token
   +        uses: actions/create-github-app-token@v1
   +        with:
   +          app-id: ${{ secrets.APP_ID }}
   +          private-key: ${{ secrets.APP_PRIVATE_KEY }}
   +
          - name: Checkout
            uses: actions/checkout@v4
   ```

8. **(任意)dispatch-ci の回避ジョブを削除する。** App を使う以上、これらのジョブは実務上もう仕事をしていません — PR が開いた時点で `ci.yml` が自然発火するからです:
   - `release-please.yml` の末尾にある `dispatch-ci-on-release-pr` ジョブを削除。
   - `release-assets.yml` の末尾にある `Dispatch Validate on the promotion PR branch` ステップを削除。

   残しても無害(コミット レベルで check-run が重複するだけ)。削除すると綺麗。

9. **commit、PR、マージ。** ワークフロー変更自体も PR にする(CI が変更を検証するため):
   ```
   git checkout -b chore/bonus-github-app
   ```
   ```
   git commit -am "chore: use GitHub App for release-please + promotion PRs"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   PR 番号を控える。この PR は *自分* が開いた(bot ではない)ので CI は普通に発火します — グリーンになったらマージ:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

10. **動作確認。** 適当な `feat:` コミットを `main` に起こしてリリースをトリガー(Lab 5 のフローでも OK):
    ```
    git checkout -b feat/bonus-test
    ```
    ```
    echo "" >> app/src/main.tsx
    ```
    ```
    git commit -am "feat: test App-minted release pipeline"
    ```
    ```
    git push -u origin HEAD && gh pr create --fill
    ```
    マージすると Release Please が release PR を開きます — **close+reopen なしで CI が自動発火することを目で確認**。その PR がマージされると promotion PR も同じく自動発火。これで完了です。

## 確認

- **bot が開いた PR で CI がそのまま流れる。** リリース後、App が開いた Release Please の PR には `Validate → summary` のチェック rollup が ~30 秒以内に乗る — `gh pr close && gh pr reopen` は不要:
  ```
  gh pr view <release-pr-number> --json statusCheckRollup --jq '.statusCheckRollup[] | {name, conclusion}'
  ```
- **トリガーしたアクターが App** で、`github-actions[bot]` ではない:
  ```
  gh run list --workflow=Validate --limit 1 --json event,triggeringActor
  ```
  `event` は `pull_request`、`triggeringActor.login` は `<app-name>[bot]`。
- **secret は存在するが値は Actions ログに出ない**(GitHub が自動マスク)。

## できたこと

学習用の回避策を業界標準の本番仕様に置き換えました。リリース パイプラインが正真正銘のハンズフリーに — bot PR が CI を発火し、auto-merge が初回で効き、タグとデプロイの間に 2 クリックの芝居がありません。実際のチームが本番で出荷しているやり方そのものです。

もし鍵をローテーションするなら、App の設定ページで `.pem` を再発行し `gh secret set APP_PRIVATE_KEY < ...` を流し直すだけ — ワークフローの編集は不要です。

## ロールバック(App を使わない決断に戻すなら)

1. ワークフロー変更 2 箇所を revert(bonus PR を git revert)
2. Settings → Installed GitHub Apps → 当該 App → **Uninstall**
3. App 本体も消したければ [github.com/settings/apps](https://github.com/settings/apps) から削除
4. secret を 2 つ削除:
   ```
   gh secret delete APP_ID
   ```
   ```
   gh secret delete APP_PRIVATE_KEY
   ```

close + reopen ライフに戻ります。

## 次へ

これでコースは完走です。[README](../../README.ja.md) の全バッジが green になっているはず。ここから先は:

- **ラボを再構築** — `python3 scripts/setup_repo.py destroy` → `python3 scripts/setup_repo.py` で一連の流れを筋肉記憶に。
- **深掘り** — [`concepts/cicd-model.md`](./concepts/cicd-model.md) で production 追加、アプリ差し替え、pull モードとの比較。
- **リファレンスとして残しておく** — 次に GitHub Actions → AWS を配線する時に戻ってコピペできる作業例として。

[← README に戻る](../../README.ja.md)
