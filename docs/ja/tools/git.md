> 🌐 [English](../../en/tools/git.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/git.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# git — バージョン管理

このラボ全体の土台になっている分散バージョン管理ツール。ここ 10 年コードを書いていればすでに使っているはず。このページは、11 ラボで出会うコマンドの復習です。

## なぜここにあるか

全てのラボが「`feat:` / `chore:` コミットをブランチに乗せて PR を開く」で成り立っています。`git` はそのブランチを作り、コミットを記録し、リモートに push し、マージを pull で戻す道具です。同時にこれは監査ログ — 2 年後に `git log deploy/static/development/site.json` を叩けば、dev に降りた全てのリリースが見えます。

## このラボで使うコマンド

| コマンド | 何をするか | 出現ラボ |
|---|---|---|
| `git checkout -b <branch>` | 新しいブランチを作成して切り替える | Lab 1, 2, 4, 5, 8, 9 |
| `git commit -am "msg"` | 追跡済み変更をステージしてコミット | Lab 1, 4, 5, 8 |
| `git add <path>` | 特定パスをステージ | Lab 2, 8 |
| `git commit -m "msg"` | コミット(事前に `git add` が必要) | Lab 2, 8 |
| `git push -u origin HEAD` | 現在のブランチを push、upstream 設定 | Lab 1 |
| `git push -u origin <branch>` | 特定ブランチを push | Lab 2, 4, 5, 8 |
| `git pull` | remote `main` を fetch + fast-forward | 全ラボ、merge 後に |
| `git fetch --tags` | タグのみ取得 | Lab 5 |
| `git diff <path>` | 未ステージの変更を表示 | Lab 1, 2, 5 |
| `git tag --list '<pattern>'` | glob にマッチするタグ一覧 | Lab 5 |
| `git checkout main` | main に戻る | Lab 9 |

## このラボが教える「本番の真実」

- **自分の PR を merge したら、必ず `git pull`**。`gh pr merge` は GitHub サーバー側の操作 — ローカル `main` は `git pull` まで動きません。飛ばすと次に作るブランチが古いコードから分岐します。詳細: [`concepts/local-sync-after-merge.md`](../concepts/local-sync-after-merge.md)。
- **Squash-merge が branch protection のデフォルト**。各マージが `main` 上で 1 コミットに圧縮 — 履歴がクリーン、`git revert <sha>` で巻き戻しも簡単。
- **コミットメッセージ形式は load-bearing**。`type(scope): subject`(`feat`、`fix`、`chore`、`docs`、…)は Lab 5 で Release Please が解析してバージョン bump を決めます。`docs:` は bump なし、`fix:` はパッチ、`feat:` はマイナー。

## ページャの罠

`git log`、`git diff`、`git tag --list` は 1 行出力でも `less` に落ちます。`q` で抜ける。インラインは `git --no-pager <cmd>`、永続化は `git config --global core.pager cat`。

## git を触り始めたばかりなら

- ラボの 9 割で使うのは `branch`、`commit`、`push`、`pull`、`merge`。まずこれを押さえる。
- このコースでは `rebase`、`reset --hard`、`cherry-pick` は不要。
- 迷ったら `git status` — ステージ済み、変更中、未追跡の状態が見えます。

## 関連

- [`concepts/local-sync-after-merge.md`](../concepts/local-sync-after-merge.md) — なぜ毎 merge 後に `git pull` が必要か、ASCII 状態図つき
- [Pro Git(無料オンライン)](https://git-scm.com/book) — 定番リファレンス
