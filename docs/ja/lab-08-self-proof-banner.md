> 🌐 [English](../en/lab-08-self-proof-banner.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../cn-zh/lab-08-self-proof-banner.md)

[← README に戻る](../../README.ja.md) &nbsp;·&nbsp; [← Lab 7](./lab-07-first-deploy.md)

# Lab 8 — Self-Proof Banner

⏱ 15 分 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; レジュメが自分を証明する

## なぜ

デプロイされたサイトがレジュメをレンダリングしている。採用担当が来て内容を見る — そこまでは問題ない。しかし、サイト自体が CI/CD デモであることを知る術がありません。

この repo にすでに同梱されている `PipelineBanner.tsx` コンポーネントが、パイプライン自身のメタデータを読み取って宣言する、控えめなフッターストリップ(デスクトップ)または右下のフローティングピル(モバイル)を追加します:

> `staging · web-v0.2.0 · abc1234 · shipped 14:22 JST · ℹ pipeline info`

`ℹ` をクリックすると **Source → Build → Artifact** の 3 つのホップカード形式の Dialog が開き、それぞれにアテステーション pip(● attested / ◐ imagined)が付きます。Lab 8 で書き込む 4 フィールドは **Artifact** カード(release tag、build time、artifact key、任意で image digest)を埋めます。**Source** と **Build** カードは、将来のラボで `pipeline-info.json` に commit・workflow-run 系フィールドが足されるまで部分表示(`source repo n/a` / `workflow run · —`)のままです。

今は **BOOTSTRAP red** で表示されています — `/pipeline-info.json` がまだ存在しないからです。Lab 8 のあなたの作業は、それを書き出すワークフローステップです。次のリリース後、バナーは赤→ライブに切り替わります。

> vs _別建ての pipeline ダッシュボードページ_ — 採用担当は副次ナビをめったにクリックしません; フッターは常時表示されます。  
> vs _ヘッダーに太字バッジ_ — レジュメをデモに見せたくない; フッターは「レジュメ第一」の構図を保ちます。

## やること

1. **BOOTSTRAP 状態をローカルで見る**。**リポジトリルート**から、まずアプリの依存を入れて(初回のみ)、Vite の dev サーバーを起動:
   ```
   npm ci --prefix app                 # 初回のみ。app/node_modules を作成(~30 秒)
   ```
   ```
   npm run dev --prefix app
   ```
   `http://localhost:5173` を開く。デスクトップ(≥1280 px)では赤いフッターストリップに `⚠ BOOTSTRAP — pipeline hasn't shipped yet` と表示され、モバイルでは右下の赤いフローティングピルに折り畳まれます。`ℹ` をクリック(またはピル自体をタップ)して Dialog のブートストラップ説明を読んだら、サーバーを停止する(`Ctrl-C`)。

   > 💡 `ENOENT` / `Cannot find module 'vite'` / `could not determine executable to run` は全部同じ原因 — リポジトリルートにいないか、`npm ci` をまだ走らせていないか。`--prefix app` は今のカレントディレクトリから相対で解決するので、両方の前提が必要です。

2. **コンポーネントを流し読みする** — `fetch('/pipeline-info.json')` 呼び出しと 3 状態のロードステート機を見る:
   ```
   less app/src/components/PipelineBanner.tsx
   ```

3. **ワークフローステップを追加する**。`.github/workflows/release-assets.yml` を編集。`Derive release metadata` と `Package static site` の間にこのステップを挿入:
   ```yaml
   - name: Write pipeline-info.json into the artifact
     run: |
       cat > app/public/pipeline-info.json <<EOF
       {
         "releaseTag":     "${{ steps.meta.outputs.release_tag }}",
         "shortSha":       "${{ steps.meta.outputs.short_sha }}",
         "buildTimestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
         "artifactKey":    "${{ steps.meta.outputs.artifact_key }}"
       }
       EOF
   ```
   (バナーは `buildDurationSec` と `imageSha` があればそれも表示しますが、Lab 8 では 4 フィールドで十分です。)

4. **`app/src/components/PipelineBanner.tsx` に 1 行コメントも追加**して、同じ PR が `app/` に触れるようにします。例: `fetch('/pipeline-info.json')` の横に `// wired by release-assets.yml "Write pipeline-info.json" step` と書きます。Release Please の config は `web` コンポーネントを `app/**` に限定しているため、`.github/workflows/` だけの変更では version bump が発生せず、Lab 8 は永遠に新しいリリースを切れずバナーも切り替わりません。

5. **Commit + push + PR:**
   ```
   git checkout -b feat/lab-8-self-proof-banner
   ```
   ```
   git add .github/workflows/release-assets.yml app/src/components/PipelineBanner.tsx
   ```
   ```
   git commit -m "feat(web): wire pipeline-info.json into release build"
   ```
   ```
   git push -u origin feat/lab-8-self-proof-banner
   ```
   ```
   gh pr create --fill
   ```

6. **3 PR のカスケード — ここで CI/CD が実感になる瞬間。**

   あなたがさっき書いた 1 行のコードは、ライブサイトに届くまでに **3 つの別々のプルリクエスト** を通ります。それぞれが別々の問いに答える、別々のレビューゲートです。この 3 つを理解すると、プラットフォーム全体の見え方が変わります:

   ![3 PR カスケード:feat PR → Release PR → Promotion PR → 本番サイト](../diagrams/images/three-pr-cascade.png)

   <details>
   <summary>テキスト版(ASCII)</summary>

   ```
   [1] feat PR        ─merge─▶  main
                                 ├─▶  Release Please が起動
   [2] Release PR     ─merge─▶  タグ web-v0.X.0
                                 ├─▶  release-assets.yml が artifact をビルド
   [3] Promotion PR   ─merge─▶  live site(dev デプロイ)
   ```

   </details>

   | # | 開いた主体 | 何を決めている | diff の形 | マージ時 |
   |---|---|---|---|---|
   | 1 | あなた | このコードは正しいか? | ソースファイル | Release Please が起動 |
   | 2 | `github-actions[bot]`(Release Please) | `main` をバージョン X と呼ぶ準備はできたか? | バージョン更新 + CHANGELOG | タグが切られる → artifact がビルドされる |
   | 3 | `github-actions[bot]`(release-assets) | バージョン X を dev で動かす準備はできたか? | `artifactKey` + image digest のみ | dev へデプロイ |

   それぞれのゲートは独立しています。(2) を拒否すれば、コードは `main` に入ったままでリリースは切られない。(3) を拒否すれば、artifact は S3 + ECR にあるがデプロイはされない。**この分離こそが要点です** — Lab 9 では (3) の同じ artifact を、リビルドなしで staging にデプロイします。staging のマニフェストだけを変える *4 つめ* の PR をマージするだけ。それができるのは、バージョニング (2) とデプロイ (3) が別々の PR だからです。

   **(1/3) あなたの feat PR** — 今開いたばかりの PR。
   - 中身: `release-assets.yml` に追加したステップ + `PipelineBanner.tsx` の一行コメント。
   - CI が green になったらマージして main に戻る:
     ```
     gh pr merge <n> --auto --squash --delete-branch
     ```
     ```
     git checkout main
     ```
     ```
     git pull
     ```

   **(2/3) Release Please PR** — (1) のマージから ~30 秒以内に自動で開きます。
   - タイトル: `chore(main): release web 0.X.0`。Author: `github-actions[bot]`。
   - diff: `.release-please-manifest.json` + `app/package.json` のバージョン更新、`app/CHANGELOG.md` にあなたのコミットサブジェクト付きの新セクション。
   - Lab 5 と同じ bot-loop — close + reopen で CI を蹴飛ばし、それからマージ([`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md)):
     ```
     gh pr close <n>
     ```
     ```
     gh pr reopen <n>
     ```
     ```
     gh pr merge <n> --auto --squash --delete-branch
     ```
     ```
     git pull
     ```
   - マージ時: タグ `web-v0.X.0` が切られる → `release-assets.yml` がそのタグで起動 → `pipeline-info.json` を埋め込んだ `site.zip` + 新しい ECR イメージをビルド → PR (3) を自動で開く。

   **(3/3) Promotion PR** — (2) のビルド完了と同時に自動で開きます(~3–4 分後)。
   - タイトル: `chore(development): promote web v0.X.0`。Author: `github-actions[bot]`。
   - diff: **純粋なデプロイ意図 — コードの変更はゼロ**。`deploy/static/development/site.json` に新しい `artifactKey` + `release.version`、`deploy/ecs/development/task-definition.json` に新しい image digest。**マニフェストこそがデプロイ契約**。
   - マージ:
     ```
     gh pr merge <n> --auto --squash --delete-branch
     ```
     ```
     git pull
     ```
   - マージ時: `deploy-static.yml` + `deploy-ecs.yml` が並列で起動。新しい `/pipeline-info.json` が dev に乗ります。

7. **デプロイ済み URL を再読み込み**。フッターが red → live に変わります: リリースタグ、short SHA、ビルド時刻、artifact key が表示されます。このブラウザで `/pipeline-info.json` が初めて有効になるタイミングで、Dialog が一度だけ自動オープンし、ストリップ/ピルを 24 時間だけ border-beam が縁取ります — red→live の瞬間を意匠で強化する演出です。その後はいつでも `ℹ` をクリックすれば 3 ホップカードの証明 Dialog を再度開けます。

## 検証

- デプロイ済みサイトの全ページ下部にフッターストリップが表示される。
- `ℹ` クリックで Dialog が開き、**Artifact** ホップが完全に埋まる(release tag、SHA、build time、artifact key)。**Source** と **Build** ホップは `pipeline-info.json` が v2 スキーマの追加フィールドを持つまで部分表示のままです。
- bootstrap 状態の URL(まだリリースなし)は依然として **赤** で表示される。
- 新しいリリースがマージ&デプロイされると Lab 8 の進捗バッジが ✓ になる。

## あなたが今やったこと

デプロイ済みのレジュメに、自己宣言型の信用状を与えました。見たいと思う訪問者は誰でも、アーティファクト自体から「これは手作業のアップロードではなく、本物の CI/CD パイプラインで作られた」ことを検証できます。プロダクトと証明が、同じアーティファクトになりました。

> ☕ フッターを右クリック → **ページのソースを表示**。`/pipeline-info.json` の fetch とリリースタグが DOM に埋め込まれているのが見えます — これがあなたの CI/CD パイプラインが訪問者のブラウザに書いている絵葉書です。

## 次へ

[Lab 9 — First Promotion (dev → staging)](./lab-09-first-promotion.md)
