> 🌐 [English](../../en/concepts/local-sync-after-merge.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/local-sync-after-merge.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# merge 之后的本地同步 —— 为什么 `git pull` 不可省

你刚跑完 `gh pr merge <n> --squash --delete-branch`,看到 `✓ Squashed and merged`,心想「我本地 `main` 应该也跟上了吧」。

没跟上。打开本地 `README.md`,你 push 的内容一个字都没反映。这篇文档解释为什么会这样、你应该跑什么,以及把本地和远端保持一致的行业惯例。

---

## 为什么本地 `main` 是落后的

`gh pr merge` 跑在 **GitHub 服务端**。它把你的分支 squash 成一个 **全新的 commit**,写到 `origin/main` 上,再把分支删掉。你的本地除非主动去取,否则什么都不知道。

```
merge 之前:
  feat/claim-lab-0 (local) ──push──▶ origin/claim/lab-0
                                          │
                                          └──── PR 在 GitHub 上 open ───────┐
                                                                             │
  main (local)  ═══════════════════▶ origin/main                             │
                 同一个 commit                                               │
                                                                             │
`gh pr merge 1 --squash --delete-branch` 之后:                                │
                                                                             ▼
  origin/main  ═══════════════════▶ [新的 squash commit]  ◀── 服务端合并
                                          (SHA X — 包含你的 retarget 等)
  main (local)  ═══════════════════▶ [原来的 commit 不动]
                                          (SHA Y — merge 之前的状态)
  origin/claim/lab-0 ───────────消失───────┘
  feat/claim-lab-0 (local) ─────消失─── (--delete-branch 把本地和远端都删)
```

值得盯住两点:

1. **squash 得到的是*全新的* SHA**,不是你 push 上去的那个。`git merge-base --is-ancestor feat/claim-lab-0 origin/main` 会返回 false,哪怕内容一模一样 —— git 用 SHA 识别 commit,不看内容。
2. **本地 `main` 没被碰过**。`gh` 在做纯远端操作时,故意不去改你的工作区和当前分支。

## 应该跑什么

```
git fetch origin main   # 看看: 落后了多少?
git pull                # 同步: 把本地 main fast-forward 到 origin/main
```

为什么先 fetch?因为 fetch 是安全的(只更新 `origin/main` 这类 remote-tracking ref,不碰工作区),它让你在同步之前能看到差距:

```
git log --oneline HEAD..origin/main   # 远端有但本地没有的 commits
git log --oneline origin/main..HEAD   # 本地有但还没 push 的 commits
```

刚 merge 完 claim PR 时,前者返回 1 行(你的 squash commit),后者返回空。然后 `git pull` 就干净地 fast-forward。

如果你在追求 linear history 的团队里,用 `git pull --rebase`。对本 lab 没影响 —— merge 之后本地没有未 push 的 commits。

## 为什么 `gh pr merge` 不自动 pull

因为在 git 的世界里,客户端状态和服务端状态是 **刻意分离的**。这种分离有几个正当理由:

- **你工作区可能有未提交的改动**。每次 merge 都自动 pull,很可能在最糟的时机把你丢进一个 merge conflict 里。显式的 `git pull` 让你自己选时机。
- **本地可能不在 `main` 上**。你在 `feat/next-thing` 里做事的时候对着一个 release PR 跑 `gh pr merge`,那工具不问一声就动你本地 `main` 就很过分了。
- **保持工具可组合**。`gh` 做远端,`git` 做本地,用不用 `&&` 拼起来是你作为用户的选择,不是工具默认的前提。

这种安全性的代价是:你得记得 `git pull`。交易就是这样。

## 行业惯例(真实团队实际的做法)

用 pull-request 工作流发版的团队,几乎都会看到以下 3 种模式:

### 1. 开新分支之前先 pull

```
git checkout main
git pull --rebase origin main
git checkout -b feat/next-thing
```

从一个过时的 `main` 开分支,PR 的 diff 里会混入「你没写过的 commits」,rebase 的时候还会冲突。3 行准备工作就能一并解决。

### 2. 合完自己的 PR 后 pull

就是你现在这个场景。`gh pr merge ...` → `git pull`。让本地的 tip 对齐到 `origin/main` 的 squash commit 上,下次 `git log` 看到的就是「真正发出去的东西」(而不是「你 push 上去的分支 commits」)。

### 3. 定期跑 `git fetch --prune`

```
git fetch --prune
```

更新所有 remote-tracking ref,并把对应远端已经消失的本地 ref 清掉。不碰工作区。离开一天之后回到 repo 时随手跑一下,shell 提示符 / IDE 就能准确地显示「落后远端 N 个 commit」。

### 反模式:自动 pull

有些 shell 在 `cd` 时自动 fetch,有些团队把 `checkout main` 别名成「顺带 pull」。小心:在工作区脏的状态下切 `main` 那一瞬间,可能被丢进一个你没要的 merge conflict。手动 `git pull` 虽然无聊,但可预期。

---

## 在本 lab 里

每次看到 `✓ Squashed and merged pull request …`,跑:

```
git pull
```

就这么简单。claim PR 的 lab (0, 3, 6, 10) 里都有 `claim.py` staged 的 retarget / manifest / config 改动,你希望 Lab 3 的 setup 向导读配置之前,本地 `main` 已经同步了。feat PR 的 lab (1, 2, 4, 5, 7, 8, 9) 改动通常较小,但养成同一个习惯只会有好处。

如果你忘了,Lab N 的某条命令抱怨「文件不存在」或「配置过旧」,基本就是 `git pull` 漏了。pull 一下再 retry 即可。

---

[← 回到 README](../../../README.cn-zh.md)
