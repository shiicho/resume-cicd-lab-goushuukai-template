> 🌐 [English](../en/lab-10-teardown.md) &nbsp;·&nbsp; [日本語](../ja/lab-10-teardown.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 9](./lab-09-first-promotion.md)

# Lab 10 — The Teardown

⏱ 10 分钟 &nbsp;·&nbsp; 💰 **−$2.90/日**(停止计费) &nbsp;·&nbsp; 完整生命周期结束

## 为什么

10 分钟后,你的 AWS 账号回到 $0/日 —— 每个栈清空,每个 bucket 腾空,每个 ECR 镜像 purge,由你亲手操作。和 Lab 3 同一个向导,反方向。这就是拥有完整生命周期 —— 不止于有趣的那一段。

destroy 路径配了 dry-run 预览、typed-scope 确认(不接受肌肉记忆的 `y`)、以及预先的数据损失警告。三样你都会真正看到。

> vs _「再多跑几天,实验一下」_ —— 一个被遗忘的周末 = $20+。需要的时候通过 Lab 3 的向导 ~15 分钟就能从零重建。

## 做什么

1. **先 dry-run** —— 永远如此。仔细读输出:
   ```
   python3 scripts/setup_repo.py destroy --dry-run
   ```
   你会看到:
   - 要删除的栈(6 个 —— dev 全部 + staging 全部 + shared)
   - 停掉的预估成本($2.90/日)
   - 数据损失警告(S3 产物 bucket 内容、ECR 镜像)
   - 不会被动的东西(GitHub repo、Actions 变量、本地 git worktree)

2. **真的 destroy** —— 不带 `--dry-run`:
   ```
   python3 scripts/setup_repo.py destroy
   ```
   向导会再次渲染 dry-run 摘要,然后提示:
   ```
   ▲  Type the scope to confirm:
       destroy resume-cicd-lab-all
   ```
   一个字一个字打(这个字段禁用了 tab 自动补全)。

3. **看 destroy 进度**。向导使用 `aws cloudformation wait stack-delete-complete`。S3 bucket 先清空再删除。ECR 镜像被强制删除。总耗时:~5–10 分钟。

4. **在 AWS Console 验证**。依次查:
   - CloudFormation → Stacks → 6 个栈都显示 `DELETE_COMPLETE`(或者栈彻底消失)
   - S3 → Buckets → 只剩你自己的 bucket(没有 `resume-cicd-lab-*`)
   - ECR → Repositories → 没有 `resume-cicd-lab-*` 仓库
   - EC2 → Load Balancers → 没有 lab 的 ALB;VPC → 只有默认 VPC

5. **打开 Lab 10 最后的 claim PR,然后把它合上。** 合并会打上 `lab-10-complete` 标签,最后一个徽章就亮了。
   ```
   ./scripts/claim.py lab-10
   ```
   记下 PR 编号,CI 绿了就合:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git pull
   ```

## 验证

- **`resume-cicd-lab-*` 资源清零**。AWS Console 能看,终端里无头核验也行:
  ```
  aws cloudformation list-stacks \
    --query "StackSummaries[?starts_with(StackName, 'resume-cicd-lab') && StackStatus!='DELETE_COMPLETE'].StackName" \
    --output text --no-cli-pager
  ```
  输出为空 = 干净。
- AWS Budgets → `*-daily-cap` budget 已不存在。destroy 把它连同 SNS 主题和邮件订阅一起拆掉了(都在 `bootstrap-shared` 里)。
- GitHub repo、Actions 变量、克隆到本地的 repo,都没被动。
- Lab 10 进度徽章变 ✓ —— 11 个徽章全绿。(Shields.io 有 ~5 分钟缓存,徽章看起来没反应就再等等。)
- `cat .local/setup-repo-state.json 2>/dev/null` 要么是空要么文件已删。
- 👀 **destroy 后扫个底**。最后再打开一次 `.local/console-links.md` —— 每条 CloudFormation / S3 / ECR 链接都应该 404,跨区域的列表(ECS 集群、CloudFront 分发、Budgets)里你这个 resource prefix 的也应该一个都没有。这就是「没漏任何东西」的证据。

## 你刚刚做到的

把一个 AWS 环境从出生到死亡全程 own 了一遍 —— 开、发布、提升、拆。完整的 CI/CD 生命周期:~2 小时,花费 $3–6。

> ☕ 下周六,再跑一次 `python3 scripts/setup_repo.py`。到时候向导已经是熟悉的命令,整套东西 ~15 分钟就能全部重建 —— 第 7 天的肌肉记忆,就是这门课想留给你的。

## 下一个

从零再跑一次(`setup_repo.py destroy` + 重新跑,~15 分钟循环)把流程内化。想走得更远,见 [`cicd-model.md`](./concepts/cicd-model.md) —— 加 production、换一个 app、和 pull 模式对比。

也可以选做进阶彩蛋 —— [Lab 11 — 把循环做成生产级(GitHub App)](./lab-11-bonus-github-app.md) 用业界标准做法把 Lab 5 / Lab 7 的 close + reopen 彻底消掉(~15 分钟,纯 GitHub,不动 AWS)。
