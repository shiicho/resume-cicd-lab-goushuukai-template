> 🌐 [English](../../en/tools/pager-config.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/pager-config.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# ページャ設定 — `(END)` の罠から抜ける

このラボで使う 3 つの CLI(`gh`、`git`、`aws`)はデフォルトで出力をページャに通します。1 行の応答でもしばしば `(END)` で止まるので、コマンドがハングしたように見えます。ハングしていません — `q` で抜けます。そして、もう二度と引っかからないように設定してしまいましょう。

## その場での回避

今まさに詰まっていて、この 1 回だけ抜けたい時:

| CLI | インライン回避 |
|---|---|
| `gh` | `GH_PAGER=cat gh ...` |
| `git` | `git --no-pager ...` |
| `aws` | コマンドに `--no-cli-pager` を付ける |

## 永続的な修正

マシンごとに 1 回だけ設定して忘れます:

```
gh config set pager cat
```

```
git config --global core.pager cat
```

そして AWS CLI 用に、新しいシェルでも効くよう rc ファイルに追記します(bash なら `~/.bashrc`):

```
echo 'export AWS_PAGER=""' >> ~/.zshrc
```

```
source ~/.zshrc
```

README の [はじめる前](../../../README.ja.md#はじめる前) で上 2 行は既に実行済み。AWS のページャに引っかかった時に `AWS_PAGER` の行も足してください。

## なぜこうなるか

`less` 系のページング挙動はすべて Unix 由来。man ページのような分量を読むには便利ですが、3 行の応答に対しては純粋な摩擦です。モダンターミナル(tmux / iTerm2 / Alacritty / Ghostty)は既にスクロールバックを持っているので、ページャはもう仕事がありません。上の設定で全セッションを opt-out します。

## 関連

- [`gh.md`](./gh.md) — GitHub CLI 入門
- [`aws.md`](./aws.md) — AWS CLI 入門
- [`git.md`](./git.md) — git 入門
