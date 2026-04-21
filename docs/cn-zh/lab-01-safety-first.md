> 🌐 [English](../en/lab-01-safety-first.md) &nbsp;·&nbsp; [日本語](../ja/lab-01-safety-first.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 0](./lab-00-preview.md)

# Lab 1 — Safety First: 先架好绊线

⏱ 5 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 安全网

## 为什么

工程师放弃 AWS 教程的头号原因,是一张 $40 的忘记销毁的 NAT Gateway 账单。要在还没有任何东西在跑的时候、用冷静的头脑定好安全阈值。千万别在慌乱中配 Budget。

AWS Budgets 从 2020 年 10 月起免费。不用它就是失职。它按天触发,比月末账单到达要早得多。

> vs _「做完了我会记得 destroy」_ —— 凌晨 2 点你才发现 ECS service 忘了关,那时的你不会记得任何事。Budgets 会替你记住。  
> vs _AWS Cost Explorer_ —— 事后检测(粒度是次日)。Budgets 在阈值被越过的当下就发通知。

## 它是怎么连起来的

Lab 1 不碰 AWS。你在 `config/project-setup.json` 里设两个值;Lab 3 的 `bootstrap-shared` CloudFormation 栈会一起部署 Budget + SNS 主题 + 邮件订阅。同一个栈 = Lab 10 销毁时原子拆除。

## 动手

1. **打开 [`config/project-setup.json`](../../config/project-setup.json)。** 改之前,先瞄一眼现在的 `safety` 段:
   ```
   jq .safety config/project-setup.json
   ```
   你应该看到 `dailyCap: 10` 和空的 `email`:
   ```json
   {
     "dailyCap": 10,
     "email": ""
   }
   ```

2. **把 `safety.email` 设成你真正会看的邮箱。** 费用越过上限的 80% 和 100% 时,SNS 会给你发邮件。Lab 3 执行中,你要 **一次性** 点击确认订阅邮件。

3. **保持 `dailyCap: 10`**,没有特别理由就别动。整个实验流程的峰值花费在 Lab 9 约 $2.90/天,$10 是富余的上限,也能稳稳捕捉跑飞的状况。

   **确认你的改动生效。** 保存后再跑一次:
   ```
   jq .safety config/project-setup.json
   ```
   `email` 现在应该是你填的那个地址,`dailyCap` 是你选的数字。

4. **提交并开 PR。** 分支名要以 `feat/lab-1-` 开头,Lab Progress workflow 才会认:
   ```
   git checkout -b feat/lab-1-safety
   ```
   ```
   git commit -am "feat(safety): configure budget tripwire"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   记下输出里打印的 PR 编号。

5. **CI 绿了就合并 PR 并同步本地:**
   ```
   gh pr merge <number> --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

## 验证

- 合并后,Lab 1 进度徽章打勾。
- `grep -A2 '"safety"' config/project-setup.json` 能看到你的邮箱和上限。
- Lab 3 里 `bootstrap-shared` 栈 Plan 输出时,你刚才设的邮箱会作为 CFN 参数出现;它正是被传给 AWS 的那个值。

## 你刚才做了什么

架好了绊线。Budget 现在还不在 AWS 里,但它会随着 Lab 3 的第一个栈原子部署,也会随着 Lab 10 的 destroy 原子消失。安全网纳入代码管理,不再有销毁后残留的 Budget。

## 下一个

[Lab 2 — Tools + Dry-Run the Exit](./lab-02-tools-and-dry-run.md)
