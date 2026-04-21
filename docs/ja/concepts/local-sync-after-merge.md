> 🌐 [English](../../en/concepts/local-sync-after-merge.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/local-sync-after-merge.md)

[← README に戻る](../../../README.ja.md)

# マージ後のローカル同期 — なぜ `git pull` が必要か

`gh pr merge <n> --squash --delete-branch` を実行し、`✓ Squashed and merged` を見て、「これでローカルの `main` も最新だ」と思ったかもしれません。

そうではありません。ローカルで `README.md` を開いても、あなたが push した変更は反映されていません。このページでは、なぜそうなるのか、何をすればよいのか、そしてローカルとリモートを揃えておくための実務上のお作法を説明します。

---

## なぜローカルの `main` が遅れているのか

`gh pr merge` は **GitHub サーバ側で実行されます**。あなたのブランチから `origin/main` 上に **新しい squash コミット** を作り、ブランチを消します。あなたの手元のマシンは、自分から取りに行くまで何も知りません。

```
マージ前:
  feat/claim-lab-0 (local) ──push──▶ origin/claim/lab-0
                                          │
                                          └──── GitHub で PR が open ───────┐
                                                                             │
  main (local)  ═══════════════════▶ origin/main                             │
                 同じコミット                                                │
                                                                             │
`gh pr merge 1 --squash --delete-branch` の後:                                │
                                                                             ▼
  origin/main  ═══════════════════▶ [新しい squash コミット]  ◀── サーバ側で merge
                                          (SHA X — あなたのリターゲット等を含む)
  main (local)  ═══════════════════▶ [古いコミットのまま]
                                          (SHA Y — merge 前の状態)
  origin/claim/lab-0 ───────────消滅───────┘
  feat/claim-lab-0 (local) ─────消滅─── (--delete-branch でローカル/リモート両方消える)
```

じっと見る価値があるのは 2 点:

1. **squash コミットは *新しい* SHA** であり、あなたが push したものとは別物です。`git merge-base --is-ancestor feat/claim-lab-0 origin/main` は、内容的に同じものが landed していても false を返します — git はコミットを SHA で識別するためです。
2. **ローカルの `main` は手つかず**。`gh` はリモート側だけの操作中に、作業ツリーやチェックアウト中のブランチを勝手に書き換えません。

## 何を実行すべきか

```
git fetch origin main   # 確認: どれくらい遅れている?
git pull                # 適用: ローカル main を origin/main に fast-forward
```

なぜ fetch を先に? fetch は安全(`origin/main` のような remote-tracking ref だけを更新し、作業ツリーには手を触れない)なので、同期する前にズレが見えます:

```
git log --oneline HEAD..origin/main   # リモートにはあるがローカルにないコミット
git log --oneline origin/main..HEAD   # ローカルにあるが push していないコミット
```

claim PR を merge した直後なら、前者は 1 行(あなたの squash コミット)、後者は空です。その後の `git pull` はきれいに fast-forward されます。

rebase で linear history を保つチームなら、`git pull --rebase` の方を使います。このラボでは merge 直後にローカルの未 push コミットはないので、どちらでも同じ結果です。

## なぜ `gh pr merge` は自動で pull しないのか

クライアント側の状態とサーバ側の状態は git の世界では **意図的に分離** されているから。正当化する理由をいくつか:

- **作業ツリーに未コミットの変更があるかもしれない**。毎 merge 後に自動 pull すると、最悪のタイミングで merge conflict に放り込まれます。明示的な `git pull` は実行タイミングを自分で選べます。
- **ローカルでは別のブランチにいるかもしれない**。release PR を `gh pr merge` している最中にあなたが `feat/next-thing` にいたら、断りなしにローカル `main` を書き換えるのは失礼です。
- **ツールを合成可能に保つ**。`gh` はリモート操作、`git` はローカル操作。`&&` で繋ぐかは利用者の選択、ツールの前提ではありません。

この安全性の対価は「`git pull` を忘れない」こと。それが取引です。

## 実務上のお作法(現場のチームが実際にやっていること)

PR ベースで出荷しているチームなら、ほぼ例外なく見る 3 パターン:

### 1. ブランチを切る前に pull

```
git checkout main
git pull --rebase origin main
git checkout -b feat/next-thing
```

古い `main` から分岐すると、PR の diff に「あなたが書いていないコミット」が混入し、rebase 時に conflict します。この 3 行の準備運動で両方とも回避できます。

### 2. 自分の PR を merge した後に pull

まさに今の状況。`gh pr merge ...` → `git pull`。ローカルの tip を `origin/main` の squash コミットに揃えることで、次の `git log` に「実際に shipped されたもの」が出ます(あなたが push したものではなく)。

### 3. 定期的に `git fetch --prune`

```
git fetch --prune
```

すべての remote-tracking ref を更新し、リモートブランチが消えたものをローカルからも削除します。作業ツリーには触れません。1 日 repo から離れた後に戻ってきたタイミングで走らせておくと、シェルプロンプトや IDE が正しく「remote より N 遅れ」と表示します。

### アンチパターン:自動 pull

`cd` のたびに自動 fetch するシェル設定や、`checkout main` に pull を alias するチームもあります。要注意:作業ツリーが汚れた状態で `main` に切り替えた瞬間、望まない merge conflict に放り込まれることがあります。手動の `git pull` は退屈ですが予測可能です。

---

## このラボでは

`✓ Squashed and merged pull request …` を見たら、毎回必ず:

```
git pull
```

それだけです。claim PR のラボ (0, 3, 6, 10) には `claim.py` が staged した retarget / manifest / config 変更が含まれているので、Lab 3 のセットアップウィザードが読みに来る前にローカル `main` に反映しておきたい。feat PR のラボ (1, 2, 4, 5, 7, 8, 9) も内容変更は小さいですが、同じ習慣を続けておくと得られるものが多いです。

忘れて Lab N のコマンドが「ファイルがない」「設定が古い」と文句を言い出したら、だいたい `git pull` し忘れが原因です。pull して retry。

---

[← README に戻る](../../../README.ja.md)
