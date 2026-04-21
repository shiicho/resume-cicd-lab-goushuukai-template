> 🌐 [English](../../en/concepts/pr-workflow.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/pr-workflow.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 概念深读](./README.md)

# PR 工作流 —— 合并仪式

每个 lab 都以合并 Pull Request 收尾。整门课里出现两种 PR 形态,但它们的收尾动作是一样的。认一次就够,后面每个 lab 只需要讲自己那部分独有的细节。

## 两种 PR 形态

### claim PR —— Lab 0, 3, 6, 10

`claim.py` 一条命令把 branch、commit、open 都做了。你只负责合并和 sync:

```
./scripts/claim.py lab-N
```

记下打印出来的 PR 号,然后合并 + sync:

```
gh pr merge <number> --auto --squash --delete-branch
```

```
git pull
```

**Lab 0 是唯一的例外** —— branch protection 还没上(Lab 3 才开),所以可以不走 `--auto` 队列直接合。Lab 0 之后的每个 claim PR 都用 `--auto`。

### feat / chore / fix PR —— Lab 1, 2, 4, 5, 8, 9

标准 git 流程: branch → edit → commit → push → open → merge。

```
git checkout -b feat/lab-N-short-name
```

按 lab 说的做编辑、保存,然后:

```
git commit -am "feat(scope): terse subject"
```

```
git push -u origin HEAD
```

```
gh pr create --fill
```

记下 PR 号,CI 绿了再合并 + sync:

```
gh pr merge <number> --auto --squash --delete-branch
```

```
git checkout main
```

```
git pull
```

## 每个 flag 的理由

- **`--squash`** —— 把 PR 内的 commit 压成一个再落到 `main`。历史线性好读,也是 Release Please(Lab 5)能把 squash-commit 的 subject 解析成 conventional-commit type(`feat:` / `fix:` / `chore:`)的前提。
- **`--delete-branch`** —— 合并后删远端分支。本地那份要你自己 `git branch -d feat/lab-N-*` 才会消,但无所谓,`git pull` 不在乎它。
- **`--auto`** —— 告诉 GitHub「必要 check 一绿就合」。不加 `--auto` 就急着 `gh pr merge`,会报 `X Pull request is not mergeable: the base branch policy prohibits the merge`。加了的话,`gh pr create` 完就可以扔下命令去泡咖啡。

## 为什么每次合并后都要 `git pull`

`gh pr merge` 是远端操作,改的是 `origin/main`。你本地的 `main` 在 `git pull` 之前还停在合并前那个 commit。不 sync,下次 `claim.py` 或 `git checkout -b` 就会从过时的 base 拉分支,CI 会以「base 落后」为由拒掉。

深入: [`concepts/local-sync-after-merge.md`](./local-sync-after-merge.md) —— 实际团队同步本地与远端的 3 种模式(squash-merge + pull、rebase-and-sync、plain merge)。

## Lab Progress workflow 认的分支名

PR 分支必须对上下面某一条,`lab-N-complete` 标签才会落,徽章才会亮:

| 形态 | 来源 | 出现在 |
|---|---|---|
| `claim/lab-N` | `claim.py` 的输出 | Lab 0, 3, 6, 10 |
| `feat/lab-N-*` | feature 分支 | Lab 1, 2, 4, 8, 9 |
| `chore/lab-N-*` / `docs/lab-N-*` / `fix/lab-N-*` | 挂在某个 lab 上的非 feat PR | 任何 lab |
| `release-please--*` | Release Please 自动开 | Lab 5 |
| 标题匹配 `chore(<env>): promote` | promotion PR | Lab 7, 9 |

对不上 = 没标签、徽章不亮。完整正则在 [`.github/workflows/lab-label.yml`](../../../.github/workflows/lab-label.yml)。

## bot 开的 PR 第一次必卡

Release Please(Lab 5)和 release-assets 的 promotion workflow(Lab 7, 8, 9)都是用 `GITHUB_TOKEN` 开 PR 的。这些 PR 不会自动触发 CI,所以 `--auto` 头一次合不了。见 [`concepts/bot-loop-workaround.md`](./bot-loop-workaround.md) —— 每个 bot PR 一次 close + reopen 就过了。

## 相关

- [`concepts/local-sync-after-merge.md`](./local-sync-after-merge.md) —— 每次合并后为什么要 `git pull`
- [`concepts/bot-loop-workaround.md`](./bot-loop-workaround.md) —— 为什么有些 PR 要 close + reopen
- [`concepts/github-setup.md`](./github-setup.md) —— 这里用到的 flag 背后的 branch protection 规则
- [`tools/gh.md`](../tools/gh.md) —— 这里引用的每个 `gh` 命令的入门
