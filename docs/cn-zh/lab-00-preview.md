> 🌐 [English](../en/lab-00-preview.md) &nbsp;·&nbsp; [日本語](../ja/lab-00-preview.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md)

# Lab 0 — The Preview

⏱ 5 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 还没碰 AWS

## 为什么

在你投入两小时和几美元之前,先花 5 分钟决定一下这是不是周六早上的好用法。Lab 1–10 会让你安装工具、运行向导、真实地 provision AWS 资源;Lab 0 什么都不做 —— 只界定范围,然后开一个 claim PR。

> vs _「先跳进去看看能怎么样」_ —— 对小承诺来说便宜;对「我要花接下来两小时和 ~$5」这种承诺来说就贵了。

## 做什么

1. 在 [README](../../README.cn-zh.md) 顶部 **读一遍 scope 行**。记住:动手 ~2 小时、运行期间 $1.45–$2.90/日、Lab 10 之后 $0。

2. **浏览 11 个 lab 的表格**(同样在 README 里)。每一行只看「操作」列。那就是你接下来要做的完整轮廓。

3. **读一遍 [`为什么这么做,而不是别的做法`](../../README.cn-zh.md#为什么这么做而不是别的做法) 这一节**。这是整门课承重的论证。现在看不明白的条目,到 Lab 7 就会懂。

4. **打开 shell**。确认你会查:
   - 自己的 AWS 账号 ID(`aws sts get-caller-identity --query Account --output text --no-cli-pager` —— 如果失败,Lab 2 会帮你修。不加 `--no-cli-pager` 的话,AWS CLI v2 会把一行输出也喂给 `less` 分页,然后你会卡在 `(END)`。)
   - 自己的 GitHub handle
   - 这个仓库的本地路径:`pwd` 应该落在仓库根目录

5. **开一个 claim PR,并把它合上**。这会把「我 preview 过 Lab 0」记在进度徽章上。
   ```
   ./scripts/claim.py lab-0
   ```
   脚本会建分支、带签名消息做一次空提交、开 PR —— 跑完时会打印 PR URL 和编号。Lab 0 没有 CI 要等(分支保护要到 Lab 3 才开启),直接合:
   ```
   gh pr merge <number> --squash --delete-branch
   ```
   ```
   git pull
   ```
   > 💡 后面每个 lab 都以这套仪式的某个变体收尾。随时可以回去查的一页参考: [`concepts/pr-workflow.md`](./concepts/pr-workflow.md) —— claim PR 和 feat PR 的区别、每个 flag 的意义、为什么每次合并后都要 `git pull`。

## 验证

- 不回翻资料能答出:_「这条 lab 流最坏情况下每天 AWS 费用是多少?用什么命令停?」_
  - 答:$2.90/日(Lab 9 时)。停:`./scripts/setup_repo.py destroy`。
- 合并 claim PR **并跑完 `git pull`** 之后,Lab 0 的进度徽章变 ✓。

## 你刚刚做到的

在碰 AWS 账号之前,把整份承诺 preview 了一遍。接下来的每个 lab 都是你主动做的 choice,而不是被动滑进去的 default。

> ☕ 剩下的课程适合配一杯热饮。到杯子凉下来的时候,你的第一个栈已经立起来了。

> 💡 **合完第一个 PR,但本地 README 还是老 slug?** `gh pr merge` 是远端操作 —— 你本地 `main` 还停在 claim 之前的那个 commit 上。跑 `git pull` 同步。「为什么这样」以及真实团队用来保持本地/远端一致的 3 种模式都在 [`concepts/local-sync-after-merge.md`](./concepts/local-sync-after-merge.md) 里。之后的每个 lab,**每次 merge 之后** 都这么做。

## 下一个

[Lab 1 — Safety First: AWS Budgets](./lab-01-safety-first.md)
