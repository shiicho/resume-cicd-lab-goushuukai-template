> 🌐 [English](../../en/tools/git.md) &nbsp;·&nbsp; [日本語](../../ja/tools/git.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# git —— 版本控制

整个 lab 的地基,分布式版本控制工具。过去 10 年写过代码的人大概率已经用过。这一页是 11 个 lab 里你会遇到的命令的回忆录。

## 为什么在这里

每个 lab 都是「`feat:` / `chore:` commit 开一个 branch、开一个 PR」。`git` 就是那个建分支、记录 commit、把 commit 推到远端、把合并拉回本地的工具。它同时也是审计日志 —— 两年后你 `git log deploy/static/development/site.json`,所有落到 dev 的发布都看得见。

## 这些 lab 用到的命令

| 命令 | 做什么 | 出现在 |
|---|---|---|
| `git checkout -b <branch>` | 建新分支并切换过去 | Lab 1, 2, 4, 5, 8, 9 |
| `git commit -am "msg"` | 暂存已追踪的改动并 commit | Lab 1, 4, 5, 8 |
| `git add <path>` | 暂存指定路径 | Lab 2, 8 |
| `git commit -m "msg"` | commit(需要先 `git add`) | Lab 2, 8 |
| `git push -u origin HEAD` | push 当前分支,设置 upstream | Lab 1 |
| `git push -u origin <branch>` | push 指定分支 | Lab 2, 4, 5, 8 |
| `git pull` | 从远端 `main` 取回并 fast-forward | 所有 lab,merge 后 |
| `git fetch --tags` | 只拉 tag | Lab 5 |
| `git diff <path>` | 看未暂存的改动 | Lab 1, 2, 5 |
| `git tag --list '<pattern>'` | 按 glob 列出 tag | Lab 5 |
| `git checkout main` | 切回 main | Lab 9 |

## 这个 lab 教给你的「生产真相」

- **自己的 PR 合了之后必须 `git pull`**。`gh pr merge` 发生在 GitHub 服务端 —— 本地 `main` 在 `git pull` 之前不会动。不 pull,下一次建分支就基于过时的代码。详见 [`concepts/local-sync-after-merge.md`](../concepts/local-sync-after-merge.md)。
- **Squash-merge 是 branch protection 默认**。每次合并都被压成 `main` 上的一个 commit —— 历史干净,`git revert <sha>` 一次就回滚。
- **commit message 格式是承重结构**。`type(scope): subject`(`feat`、`fix`、`chore`、`docs`、…)是 Lab 5 里 Release Please 解析出来决定版本 bump 的依据。`docs:` 不 bump;`fix:` bump patch;`feat:` bump minor。

## 分页器陷阱

`git log`、`git diff`、`git tag --list` 即使只有 1 行输出也会进 `less`。按 `q` 退出。单次:`git --no-pager <cmd>`;持久:`git config --global core.pager cat`。

## 如果 git 是你第一周接触

- 90% 的 lab 用:`branch`、`commit`、`push`、`pull`、`merge`。先把这几个掌握。
- 本课不需要 `rebase`、`reset --hard`、`cherry-pick`。
- 迷了就 `git status` —— 看哪些暂存了、改了、没追踪。

## 相关

- [`concepts/local-sync-after-merge.md`](../concepts/local-sync-after-merge.md) —— 为什么每次 merge 后都要 `git pull`,附 ASCII 状态图
- [Pro Git(免费在线)](https://git-scm.com/book) —— 经典参考
