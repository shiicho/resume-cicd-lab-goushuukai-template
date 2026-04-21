> 🌐 [English](../en/lab-05-first-release-tag.md) &nbsp;·&nbsp; [日本語](../ja/lab-05-first-release-tag.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 4](./lab-04-first-green-check.md)

# Lab 5 — First Release Tag

⏱ 10 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 第一次语义化发布

## 为什么

这个 lab 结束时,你的 `main` 上会出现第一个 release tag —— 由 bot 切,从你写的一条 conventional commit 消息里算出来的版本号。这个 tag 驱动 Lab 6 的产物构建和 Lab 7 的部署,整条下游都挂在这次 merge 上。

> vs _手工 `git tag v0.1.0 && git push --tags`_ —— 能用,但变更记录无处可查、在不同仓库之间漂移。Release Please 之所以能强制这条规则,是因为它本身就是这条规则。

## 做什么

1. **做一个 `feat:` 提交** —— `app/**` 下任意用户可见的改动都行。分四个小步骤:

   **a) 建分支:**
   ```
   git checkout -b feat/lab-5-release-content
   ```

   **b) 打开简历内容文件,先看看里面有什么。** 在编辑器里打开 `app/src/features/resume/data/resume-projects.ts`。找到文件里**第一个** `responsibilities: [` —— 这一行开了一个数组,里面是加引号的条目,讲述那个项目里你做过什么。你要在这个数组最前面加一条。

   **c) 在数组最前面插入一条讲述这条流水线的话。** 紧跟第一个 `responsibilities: [` 的下一行(在任何既有条目之前),粘贴下面这一行,缩进对齐到周围既有条目的 6 空格:
   ```typescript
         'Deployed via GitHub Actions OIDC to AWS (CloudFormation + ECS + S3 + CloudFront)',
   ```
   保存,然后确认:`git diff app/src/features/resume/data/resume-projects.ts` —— 应该只有一行 `+`(你加的那一条),别的都没变。

   **d) commit、push、开 PR:**
   ```
   git commit -am "feat(resume): add talking point about release pipeline"
   ```
   ```
   git push -u origin feat/lab-5-release-content
   ```
   ```
   gh pr create --fill
   ```
   记下输出里打印的 PR 编号。
   如果 `gh pr create` 报 "could not find any commits between origin/main and feat/lab-5-release-content",说明 (c) 的修改没保存 —— 重开文件,确认你加的那一行在 `responsibilities: [` 数组里,保存后重试。

   > ⚠ **合并之前确认 PR 标题**。Release Please 按 `type(scope): subject` 格式解析 `main` 上的 squash-commit 消息。如果 `gh pr create --fill` 回退到了分支名(比如 `feat/lab 5 release content`),Release Please 会悄悄把你的 commit 从 CHANGELOG 里漏掉。检查 + 修正:
   > ```
   > gh pr view --json title --jq .title
   > ```
   > ```
   > gh pr edit --title "feat(resume): add talking point about release pipeline"
   > ```
   > 💡 卡在 `(END)`?按 `q`。持久修复见 [`tools/pager-config.md`](./tools/pager-config.md)。

2. **合并 PR 并把本地同步回来**(等 CI 绿):
   ```
   gh pr merge --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

3. **等 Release Please** —— `.github/workflows/release-please.yml` 会在每次 push 到 `main` 时运行;检测到新 `feat:` / `fix:` 提交时会开或更新一个 release PR。~30 秒。

4. **审阅 release PR**。标题自动生成,形如 `chore(main): release web 0.2.0`。记下 PR 号 —— 下一步要用:
   ```
   gh pr list --state open --head 'release-please--branches--main--components--web' --json number,title
   ```
   > 💡 卡在 `(END)`?按 `q`。持久修复见 [`tools/pager-config.md`](./tools/pager-config.md)。

   读 diff:
   - `.release-please-manifest.json` 的版本号上去了
   - `app/CHANGELOG.md` 新增一节,里面是你的 commit 消息
   - `app/package.json` 的版本号上去了

   > ⚠ **release PR 永远卡在 "Some checks haven't completed yet"?这是预期的 —— 不是你的 setup 有问题。** bot 开的 PR 不会自动触发 `pull_request` workflow —— 这是 GitHub 的安全规则。首次手动处理一下:
   > ```
   > gh pr close <release-pr-number>
   > ```
   > ```
   > gh pr reopen <release-pr-number>
   > ```
   > 之后步骤 5 的 `--auto` 就按预期工作。完整背景和永久修复: [`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md)。永久修复在可选的 [Lab 11 进阶彩蛋](./lab-11-bonus-github-app.md) 里。

5. **合并 release PR 并把本地同步回来**。这就是 tag 被切出来的瞬间。把第 4 步记下的编号传进去(你本地在 `main` 分支,不带编号的 `gh pr merge` 推不出该合哪个 PR):
   ```
   gh pr merge <release-pr-number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

6. **确认 tag** —— Release Please 会创建 `web-v<version>` 形式的 tag:
   ```
   git fetch --tags
   ```
   ```
   git tag --list 'web-v*'
   ```
   > 💡 `git tag --list` 哪怕只有 1 行也会进 `less` —— 按 `q` 退出。持久修复见 [`tools/pager-config.md`](./tools/pager-config.md)。

## 验证

- `git tag --list 'web-v*'` 能看到你的 tag(例:`web-v0.2.0`)。
- GitHub → Releases 页签出现一个自动生成的 release 条目。
- `app/CHANGELOG.md` 里有新版本的 entry。
- release PR 合并后,Lab 5 的进度徽章变 ✓。

## 你刚刚做到的

用 bot 而不是手工切出了第一次语义化发布。这个 tag 是「什么、何时发布的」的永久、可审计记录 —— 两年后当你需要回滚,它还在那里。

> 🤔 **进 Lab 6 之前停一下**。Lab 4 你也改过 `app/**`,但什么都没 release。一样的路径、一样的 release 配置、一样的 component —— 结果却完全不同。为什么?
>
> <details>
> <summary>先自己想一下,再打开这里看答案。</summary>
>
> Release Please 盯的不是 `app/**` 里的 *文件改动* —— 它盯的是 *commit 的 subject*。规则是 [Conventional Commits](https://www.conventionalcommits.org/):
>
> - `feat:` → minor 版本号 +1(0.1.0 → 0.2.0)
> - `fix:` → patch 版本号 +1(0.1.0 → 0.1.1)
> - `chore:`、`docs:`、`refactor:`、`style:`、`test:`、`perf:`、`build:`、`ci:` → **不升版本**
>
> Lab 4 的 commit 是 `chore: first CI touch`。Release Please 看了一眼,耸耸肩,又睡过去了。真正让 release PR 冒出来的是 Lab 5 的 `feat(resume): …`。
>
> 两条正交的规则必须同时命中:path filter(`app/**`)决定 *哪个 component* 发布;commit type 决定 *到底要不要发布*。
>
> 值得练成肌肉记忆 —— 用户看不到的改动(README 调整、CI 配置、内部重构)都用 `chore:`,版本号才能保住它的意义。
> </details>

> ☕ 在浏览器里打开你 repo 的 **Releases** 页签。bot 刚刚自动发布了一个带 CHANGELOG 的正式 release 页面,没有人需要亲手写它。

## 下一个

[Lab 6 — First Artifacts (S3 + ECR)](./lab-06-first-artifacts.md)
