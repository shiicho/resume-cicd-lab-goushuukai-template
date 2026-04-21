> 🌐 [English](../en/lab-07-first-deploy.md) &nbsp;·&nbsp; [日本語](../ja/lab-07-first-deploy.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 6](./lab-06-first-artifacts.md)

# Lab 7 — First Deploy

⏱ 10 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 第一次上线

## 为什么

10 分钟后,你会拿到两个 live URL —— 一个 CloudFront 前置的静态站点、一个 ALB 前置的 Fargate 容器 —— 同时提供你在 Lab 6 里构建的那次发布。同一份字节、不同的运行时。上线的动作就是审查并合并一个 bot 开出来、只改两个 manifest 文件的 PR。

这个 PR 就是你的 **部署闸**。合并它会触发两个 workflow:

- `Deploy Static Site`(监听 `deploy/static/**`) —— 下载 S3 zip、`aws s3 sync` 到站点 bucket、CloudFront invalidation
- `Deploy ECS Service`(监听 `deploy/ecs/**`) —— 注册新 task definition、强制新部署、等 services-stable

两者并行触发。你的简历同时在两个运行时里上线。

## 做什么

1. **找到自动开出的 PR** —— 标题为 `chore(development): promote web v0.2.0`。`gh pr list --search` 对带括号的标题子串匹配不稳定,所以用 `--json` + `jq` 直接过滤:
   ```
   gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore(development): promote web v")) | "\(.number): \(.title)"'
   ```
   > 💡 短输出也可能进分页器 —— 按 `q` 退出。持久修复见 [`tools/pager-config.md`](./tools/pager-config.md)。

2. **打开 PR 读 diff**。浏览器里看:
   ```
   gh pr view <number> --web
   ```
   或者在终端里直接看:
   ```
   gh pr diff <number>
   ```
   变更的应该是两个文件:
   - `deploy/static/development/site.json`:
     - 新的 `artifactKey`(Lab 6 的 S3 zip 路径)
     - 新的 `release.version` + `release.gitSha`
   - `deploy/ecs/development/task-definition.json`:
     - 新的 `image` 字段(Lab 6 的 digest 指向的 ECR URI,不是 tag)
     - 新的 `APP_VERSION` / `APP_COMMIT_SHA` 环境变量

   这两个 manifest 就是 **环境契约**。要部署,就是改它们。

   > ⚠ **promotion PR 卡在 "Some checks haven't completed yet"?** 和 Lab 5 的 release PR 同样的 bot-loop —— 首次 close + reopen 一下:
   > ```
   > gh pr close <number>
   > ```
   > ```
   > gh pr reopen <number>
   > ```
   > 之后步骤 3 里的 `--auto` 就按预期工作。完整背景: [`concepts/bot-loop-workaround.md`](./concepts/bot-loop-workaround.md)。

3. **合并 PR:**
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```

4. **并行看两个部署 workflow:**
   ```
   gh run list --limit 5
   # "Deploy Static Site" 和 "Deploy ECS Service" 都应该在 running
   ```
   > 💡 `gh run list` 会进分页器 —— 按 `q` 退出。持久修复见 [`tools/pager-config.md`](./tools/pager-config.md)。

5. **拿到部署后的 URL** —— 其实是两个。

   CloudFront URL(静态):
   ```
   jq -r .publicBaseUrl deploy/static/development/site.json
   ```
   ALB URL(ECS) —— ecs-app 栈以 `ServiceUrl` 的名字导出:
   ```
   aws cloudformation describe-stacks \
     --stack-name resume-cicd-lab-dev-ecs-app \
     --query 'Stacks[0].Outputs[?OutputKey==`ServiceUrl`].OutputValue' \
     --output text --no-cli-pager
   ```

6. **两个 URL 都打开**。你的简历此时在两种完全不同的运行时里上线(CDN 缓存的静态 + 容器供给的 Nginx)。比较一下体验。

## 验证

- `gh run list` 显示两个 Deploy workflow 都是 `completed` 且 `success`。
- 两个 URL 都返回 HTTP 200 和你的简历内容。
- HTML 内容相同,但走的基础设施完全不同。
- promotion PR 合并后 Lab 7 的进度徽章变 ✓。

## 你刚刚做到的

把你的第一次发布 ship 到了一个可审查的环境契约上。简历内容此刻在两套独立运行时里、从同一份不可变产物上上线。git 历史里有了「什么时候、部署了什么、部署到哪」的完整记录。

> ☕ 把两个 URL 并排打开在浏览器里。HTML 一模一样,但 CloudFront 那份是从离你最近的边缘节点送过来的,ALB 那份是从你选定的区域直出。感受一下你亲手造出的那种不对称。

## 下一个

[Lab 8 — Self-Proof Banner](./lab-08-self-proof-banner.md)
