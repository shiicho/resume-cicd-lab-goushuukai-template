> 🌐 [English](../en/lab-04-first-green-check.md) &nbsp;·&nbsp; [日本語](../ja/lab-04-first-green-check.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 3](./lab-03-wire-the-lab.md)

# Lab 4 — First Green Check

⏱ 5 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; CI 活起来了

## 为什么

5 分钟后,你会拿到第一个 green `summary` 检查 —— 从你的机器 push,由 GitHub Actions 执行,确认 Lab 3 里接好的线真的通电。CI 是 CI/CD 里安静的那一半;目标是看它真的在跑,而不只是相信它在跑。

四个 lane(web、deploy、infra、automation)定义在 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) 里。`detect-changes` job 的 path filter 根据你触碰的文件决定哪些 lane 会跑。

这也是 Lab 3 里建好的 OIDC 信任第一次真正上场的 workflow 运行 —— GitHub Actions 用短期 token assume AWS 角色,零长期密钥。想用 6 步图看一下握手过程: [`concepts/oidc-federation.md`](./concepts/oidc-federation.md)(3 分钟)。

> vs _「跳过 CI 直接 merge 到 main」_ —— 那你正在培养会引发生产事故的习惯。从 Lab 4 开始,把 green check 当作不可妥协的前提。

## 做什么

1. **切分支,往 `app/src/main.tsx` 追加一行空白,commit,push:**
   ```
   git checkout -b feat/lab-4-first-green
   ```
   ```
   echo "" >> app/src/main.tsx
   ```
   ```
   git commit -am "chore: first CI touch"
   ```
   ```
   git push -u origin feat/lab-4-first-green
   ```
   (空白改动就够了 —— `app/**` 是 `web` lane 监控的。)

2. **开 PR:**
   ```
   gh pr create --fill
   ```
   记下输出里的 PR 号。

3. **从终端看运行过程** —— 不用切标签页:
   ```
   gh run watch
   ```
   你会看到:
   - `detect-changes` 最先跑
   - `app/**` 的路径过滤只命中 `web` 这一路,所以只有 `validate-web` 会跑(`deploy`、`infra`、`automation` 全部 skip)
   - `summary` job 把整个 workflow 封口

   典型耗时:~2–3 分钟。

4. **绿了之后 merge PR,并把本地同步回来**。Squash-merge 是唯一允许的路径(Lab 3 的向导里已经配好):
   ```
   gh pr merge --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

   > 💡 **为什么要加 `--auto`?** 分支保护要求 `summary` 检查 pass 才能合。不加 `--auto` 就急着 `gh pr merge` 会得到 `X Pull request is not mergeable: the base branch policy prohibits the merge`。加上之后,GitHub 会把 merge 排进队,等检查一绿就自动合上。后面每个 lab 都用这个模式 —— 每个 flag 的意义以及为什么每次 merge 后都要 `git pull`,一页参考: [`concepts/pr-workflow.md`](./concepts/pr-workflow.md)。

## 验证

- `gh pr checks <number>` 显示 `Validate / summary` 为 `pass`。
- 合并之后 Lab 4 的进度徽章变 ✓。

## 你刚刚做到的

从你亲手接好的 CI 流水线里拿到了第一次 green check。基于路径的 lane 证明了它们只对相关改动触发。从这里起,每一个 PR 都会走这道闸。

## 下一个

[Lab 5 — First Release Tag](./lab-05-first-release-tag.md)
