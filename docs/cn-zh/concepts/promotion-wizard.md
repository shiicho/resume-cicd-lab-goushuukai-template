> 🌐 [English](../../en/concepts/promotion-wizard.md) &nbsp;·&nbsp; [日本語](../../ja/concepts/promotion-wizard.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md)

# Promotion Wizard

`scripts/promotion_wizard.py` —— 发布怎样在环境之间移动而不重构建。

## 用途

Lab 6–7 通过 `Build Release Assets` workflow 把一次发布从 tag 自动提升到 `development` 环境。这是单向且自动的。

超出 dev 的提升(→ staging、→ production)是 **操作者驱动** 的,不是自动的。你(或导师)明确决定哪一次发布去哪个环境。向导是让这个决定安全、可审查、且快的工具。

设计规则:**提升永远不重构建**。在 dev 上跑的产物和镜像,就是在 staging 上要跑的同一份产物和镜像。

## 它做什么

给定源环境(例:`development`)和目标(例:`staging`),向导:

1. 读 `deploy/static/<source>/site.json` 和 `deploy/ecs/<source>/task-definition.json` —— 找到源环境当前部署的发布。
2. 检查这些 manifest 的 `git log` —— 找出曾提升到源的历史发布(这样你可以前滚或回滚)。
3. 展示候选发布选择器(新到旧),每项含 `version / gitSha / 日期 / commit subject`。
4. **Unified diff** 展示目标 manifest 里会变什么:
   - 静态 site.json 里的 `artifactKey` + `release.version` + `release.gitSha`
   - ECS task-definition.json 里的 `image` + 环境变量字段
5. 确认后,写入目标 manifest,并用 `gh pr create --draft` 开一个 **draft PR**。

你随后审阅 draft PR,翻成 ready-for-review,合并。`Deploy Static Site` + `Deploy ECS Service` workflow 合并后触发。

## 用法

```
python3 scripts/promotion_wizard.py
```

向导是完全交互式的 —— 方向键选 source/target,方向键选 release candidate,yes/no 确认。

脚本 / 非交互用法:

```
python3 scripts/promotion_wizard.py \
  --source-env development \
  --target-env staging \
  --candidate-ref abc1234 \
  --yes
```

`--candidate-ref` 接受源环境 manifest 历史里的 commit SHA,或字面量 `WORKTREE`(把当前 checkout 状态的 manifest 当作 promotion 源)。`--yes` 跳过最后的确认。

## 候选列表长什么样

```
◇  Choose a release to promote (newest first)

    ●  0.2.0  abc1234  2026-04-17  "feat: add build-info banner"
    ○  0.1.3  fed9876  2026-04-16  "fix: env.js defaults"
    ○  0.1.2  aaa0000  2026-04-15  "chore: bump release-please"
```

只有 **曾被部署到源环境** 的发布(在源 manifest 文件的 git 历史里可见)才是候选。这能防止你把没在 dev 里测过的东西提升上去。

## Diff 预览长什么样

```
◇  Preview — what changes in the target manifests

    deploy/static/staging/site.json
    - "artifactKey": "web/releases/web-v0.1.2+aaa0000/site.zip"
    + "artifactKey": "web/releases/web-v0.2.0+abc1234/site.zip"
    - "release": { "version": "0.1.2", "gitSha": "aaa0000" }
    + "release": { "version": "0.2.0", "gitSha": "abc1234" }

    deploy/ecs/staging/task-definition.json
    - "image": "...resume-cicd-lab-shared-ecr-web@sha256:aaa..."
    + "image": "...resume-cicd-lab-shared-ecr-web@sha256:abc..."
    - { "name": "APP_VERSION", "value": "0.1.2" }
    + { "name": "APP_VERSION", "value": "0.2.0" }

    Same artifactKey + same image digest as dev.
    Different target bucket, different CloudFront, different ECS service.
```

这里的教学关键是 **最后两行**:你能亲眼看到产物身份不变,而环境作用域的字段是不同的。这就是「不可变产物,可替换环境」模式浓缩在一个 diff 里。

## PR 长什么样

标题:`chore(staging): promote web v0.2.0`

正文(自动生成):

```markdown
Promote one immutable web release from `development` to `staging`.

Static target:
- Artifact: s3://<bucket>/web/releases/web-v0.2.0+abc1234/site.zip

ECS target:
- Image: <ecr-uri>@sha256:abc...

Release:
- Version: 0.2.0
- Source commit: abc1234

Note: same artifactKey + same image digest as `development`.
Only the target environment's bucket / CloudFront / ECS service / env vars differ.
```

## 为什么要 draft PR,而不是直接 push

- 给你一个机会在 **GitHub 的 PR UI 里审查变更**(行内评论、diff 高亮、可引用的 URL)。
- 把「我想提升」和「我们确实做了这次提升」分开。
- 批准该 PR 的审阅者就是部署闸门 —— manifest 是环境契约。

## preview-then-confirm(默认)

wizard 总是先 preview 再确认:先列出候选,再显示目标 manifest 的 unified diff,然后问「要写入并为 `v{version}` 开一个 draft PR 到 `{tgt_env}` 吗?」。回答 **No** 不写任何文件、不开 PR 就退出;回答 **Yes** 才执行。

想跳过最后的确认(脚本里,或者你已经在别处 review 过 diff):

```
python3 scripts/promotion_wizard.py --yes
```

## 什么时候 promotion_wizard.py 不是合适的工具

- **新建环境的第一次部署**。源 manifest 还是 bootstrap 占位值,没有真实可提升的东西。先跑一次 release build(Lab 5)让自动提升到 dev 触发;然后再从 dev 提升。
- **回滚**。向导允许你把旧发布作为候选选中 —— 用就行。但实际的生产回滚,通常更适合对 promotion PR 用 `git revert`,这样 git 历史更干净。
- **只针对某一个环境的紧急补丁**。如果 prod 有一个 dev/staging 没有的一次性补丁,你就打破了「全环境同一产物」不变式。要么先把补丁放到 dev(正确做法),要么重新审视你的环境是否应该严格线性。

## 另见

- [`cicd-model.md`](./cicd-model.md) —— 整个发布流程
- [`architecture.md`](./architecture.md) —— 每个环境在 AWS 住在哪
- [`Lab 9 — First Promotion`](../lab-09-first-promotion.md) —— 动手使用
