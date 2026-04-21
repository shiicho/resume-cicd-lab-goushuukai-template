> 🌐 [English](../../en/concepts/pr-workflow.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/concepts/pr-workflow.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← コンセプト深掘り](./README.md)

# PR ワークフロー — マージの儀式

すべてのラボはマージされた Pull Request で終わります。コース中 2 種類の PR が出てきますが、どちらも同じ形で閉じます。この儀式を一度覚えれば、各ラボは「そのラボ固有の部分」だけ説明すれば済みます。

## 2 種類の PR

### claim PR — Labs 0, 3, 6, 10

`claim.py` が branch・commit・open を 1 コマンドでやってくれます。あなたはマージと sync だけ:

```
./scripts/claim.py lab-N
```

出力された PR 番号をメモし、マージ + sync:

```
gh pr merge <number> --auto --squash --delete-branch
```

```
git pull
```

**Lab 0 だけ例外** — Lab 3 が開くまで branch protection がないので、`--auto` キューに入れずに即マージできます。Lab 0 以外の claim PR はすべて `--auto` を使います。

### feat / chore / fix PR — Labs 1, 2, 4, 5, 8, 9

標準的な git フロー: branch → edit → commit → push → open → merge。

```
git checkout -b feat/lab-N-short-name
```

ラボが指示する編集をして保存、それから:

```
git commit -am "feat(scope): terse subject"
```

```
git push -u origin HEAD
```

```
gh pr create --fill
```

PR 番号をメモし、CI が green になったらマージ + sync:

```
gh pr merge <number> --auto --squash --delete-branch
```

```
git checkout main
```

```
git pull
```

## 各フラグの理由

- **`--squash`** — PR 内の commit を 1 つにつぶして `main` に載せます。履歴がリニアで読みやすく、Release Please(Lab 5)が squash-commit の subject を conventional-commit の type(`feat:` / `fix:` / `chore:`)として解釈できるのもこのおかげ。
- **`--delete-branch`** — マージ後にリモートのブランチを削除。ローカルのコピーは `git branch -d feat/lab-N-*` を自分で叩くまで残りますが、`git pull` は気にしないので問題ありません。
- **`--auto`** — 「必須チェックが green になったら即マージ」を GitHub に予約します。これが無いと、早すぎる `gh pr merge` は `X Pull request is not mergeable: the base branch policy prohibits the merge` で落ちます。`--auto` を付けておけば `gh pr create` の直後に回してコーヒーを取りに行けます。

## なぜマージ毎に `git pull` するか

`gh pr merge` はリモート操作です。`origin/main` は書き換わりますが、ローカルの `main` は `git pull` するまで前のコミットを指したままです。skip すると次の `claim.py` や `git checkout -b` が古い base から分岐し、CI は「base に遅れている」と言って拒否します。

詳しくは [`concepts/local-sync-after-merge.md`](./local-sync-after-merge.md) — squash-merge + pull、rebase-and-sync、plain merge の 3 つのパターンを扱っています。

## Lab Progress ワークフローが認識するブランチ名

バッジが点灯する(`lab-N-complete` ラベルが付く)ためには、PR ブランチが下のどれかに一致している必要があります:

| 形式 | マッチ元 | 使用ラボ |
|---|---|---|
| `claim/lab-N` | `claim.py` の出力 | Lab 0, 3, 6, 10 |
| `feat/lab-N-*` | feature ブランチ | Lab 1, 2, 4, 8, 9 |
| `chore/lab-N-*` / `docs/lab-N-*` / `fix/lab-N-*` | ラボに紐づく非 feat PR | 任意のラボ |
| `release-please--*` | Release Please が自動で開く | Lab 5 |
| タイトルが `chore(<env>): promote` に一致 | プロモーション PR | Lab 7, 9 |

不一致 = ラベルも付かず、バッジも点かない。完全な正規表現は [`.github/workflows/lab-label.yml`](../../../.github/workflows/lab-label.yml) にあります。

## bot が開いた PR は最初に止まる

Release Please(Lab 5)と release-assets のプロモーションワークフロー(Lab 7, 8, 9)はどちらも `GITHUB_TOKEN` で PR を開きます。これらの PR は CI を自動発火させないため、最初の 1 回は `--auto` がマージできません。[`concepts/bot-loop-workaround.md`](./bot-loop-workaround.md) を参照 — bot PR ごとに close + reopen のワンライナーで抜けます。

## 関連

- [`concepts/local-sync-after-merge.md`](./local-sync-after-merge.md) — なぜマージ毎に `git pull` が要るか
- [`concepts/bot-loop-workaround.md`](./bot-loop-workaround.md) — なぜ一部の PR には close + reopen が要るか
- [`concepts/github-setup.md`](./github-setup.md) — ここで使うフラグが効く branch protection ルール
- [`tools/gh.md`](../tools/gh.md) — ここで参照している `gh` コマンドすべての入門
