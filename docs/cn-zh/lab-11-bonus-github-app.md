> 🌐 [English](../en/lab-11-bonus-github-app.md) &nbsp;·&nbsp; [日本語](../ja/lab-11-bonus-github-app.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 10](./lab-10-teardown.md)

# Lab 11 — 进阶彩蛋:把循环做成生产级(GitHub App)

⏱ 15 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 纯 GitHub,不动 AWS

## 为什么

Lab 5 和 Lab 7 教了你一个一次性的手动绕行 —— 把 bot 开的 PR 关掉再重开,让 CI 以用户事件身份触发。这是**教学上**完全正确的安排:你亲眼看见 GitHub 的 bot-loop 安全规则落到自己头上,然后用两下点击把它解开。但这不是真实团队出货时用的做法。

GitHub 官方的原话规则(引自 [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)):

> "events triggered by the `GITHUB_TOKEN`, with the exception of `workflow_dispatch` and `repository_dispatch`, will not create a new workflow run."

(相关安全背景: [Using the GITHUB_TOKEN in a workflow](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)。)

业界的解法是让「开 PR 的那条命令」别再以默认 `GITHUB_TOKEN` bot 的身份跑。你装一个 GitHub App,每次执行时 mint 一枚短时的 installation token,把它传给 `release-please` 和 `peter-evans/create-pull-request`。这样 PR 就是 App 开的 —— 不是 `GITHUB_TOKEN` —— 所以 bot-loop 规则不适用,`ci.yml` 的 `pull_request` 触发器自然会起。不再 close + reopen,不再绕道 `workflow_dispatch`,rollup 上直接出绿勾。

如果你的 fork 要真正用起来,就走这一章;只想拿完课程徽章,可以跳过。

> vs _永远靠 close + reopen_ —— 学的时候够用,规模大起来就疼。一个真实发布流水线每次会开 2 个 bot PR(release-please + promotion),每次都人工解锁就是 App 帮你消掉的摩擦。  
>
> vs _用 Personal Access Token(PAT)_ —— 接线最简单,卫生最差:PAT 继承用户全部权限范围,不自动 rotate,是该用户身份的单点失陷。GitHub App 是按仓库 scope 的,每次自动签发短时 installation token,不带用户身份。

## 前置

- 你已经做完 Lab 7(release → promotion 流程至少跑通一次,亲身体会过 bot-loop 陷阱)
- `gh` 以你本人身份认证,对 fork 是 admin
- AWS 栈不用存在 —— 这一章纯 GitHub,$0

## 做什么

1. **建一个 GitHub App。** 打开 [github.com/settings/apps/new](https://github.com/settings/apps/new),填:

   | 字段 | 值 |
   |---|---|
   | GitHub App name | `<owner>-cicd-lab-bot`(全局唯一,随意) |
   | Homepage URL | 你 fork 的 URL(如 `https://github.com/<owner>/<repo>`) |
   | Webhook → Active | **取消勾选**(这个 App 不需要 webhook) |
   | Where can this GitHub App be installed? | **Only on this account** |

   在 **Repository permissions** 里授权:

   | 权限 | 访问级别 | 原因 |
   |---|---|---|
   | Contents | Read & write | 推 release 分支、更新 manifest |
   | Pull requests | Read & write | 开 release 和 promotion PR |
   | Actions | Read & write | 触发 workflow(作为保险留着) |
   | Workflows | Read & write | release-please 如果触到 `.github/workflows/*` 时必须的 |
   | Metadata | Read-only(默认,别取消) | 基础要求 |

   点最下方 **Create GitHub App**。

2. **生成私钥。** 在 App 设置页滚到 **Private keys → Generate a private key**,`.pem` 文件会下载到本机。当密码对待 —— 不要 commit 到任何地方。

3. **把 App 装到 fork 上。** App 左侧 **Install App → 选你的 fork → Install**。安装页选 **Only select repositories**,只勾你这个 fork。

4. **记下 App ID。** 回到 App 设置页(**General** 顶部),找到数字 **App ID**(类似 `123456`),复制。

5. **把两个 secret 存到 fork 里。** 在仓库目录下:
   ```
   gh secret set APP_ID --body "<粘贴 App ID>"
   ```
   ```
   gh secret set APP_PRIVATE_KEY < ~/Downloads/<app-name>.<date>.private-key.pem
   ```
   > 💡 第二行用 stdin 重定向 —— 换成 `gh secret set <name> <<< "<值>"` 会把 `.pem` 里的换行搞坏,钥匙就不能用了。从文件 `<` 进去才能保住换行。

   验证:
   ```
   gh secret list | grep -E '^(APP_ID|APP_PRIVATE_KEY)'
   ```
   两个名字都应该出现(值会被 mask)。

6. **给 `.github/workflows/release-please.yml` 打补丁。** 在 `release-please` 步骤前加一个 mint App token 的步骤,再把 token 引用换掉。按下面的 diff 手工改:

   ```diff
    jobs:
      release-please:
        runs-on: ubuntu-latest
        outputs:
          releases_created: ${{ steps.release-please.outputs.releases_created }}
          prs_created: ${{ steps.release-please.outputs.prs_created }}
          tag_name: ${{ steps.release-please.outputs['app--tag_name'] }}
          pr_head_branch: ${{ fromJSON(steps.release-please.outputs.pr || '{}').headBranchName }}
        steps:
   +      - name: Mint installation token
   +        id: app-token
   +        uses: actions/create-github-app-token@v1
   +        with:
   +          app-id: ${{ secrets.APP_ID }}
   +          private-key: ${{ secrets.APP_PRIVATE_KEY }}
   +
          - name: Run release please
            id: release-please
            uses: googleapis/release-please-action@v4
            with:
   -          token: ${{ github.token }}
   +          token: ${{ steps.app-token.outputs.token }}
              config-file: release-please-config.json
              manifest-file: .release-please-manifest.json
   ```

7. **给 `.github/workflows/release-assets.yml` 打补丁。** promotion PR 那步同样的替换:

   ```diff
          - name: Create development promotion PR
            id: promotion-pr
            if: steps.meta.outputs.promote_to_development == 'true'
            uses: peter-evans/create-pull-request@v6
            with:
   -          token: ${{ github.token }}
   +          token: ${{ steps.app-token.outputs.token }}
              base: main
   ```
   再在 `steps:` 最前面(`Checkout` 之前)加 mint token 的步骤:
   ```diff
        steps:
   +      - name: Mint installation token
   +        id: app-token
   +        uses: actions/create-github-app-token@v1
   +        with:
   +          app-id: ${{ secrets.APP_ID }}
   +          private-key: ${{ secrets.APP_PRIVATE_KEY }}
   +
          - name: Checkout
            uses: actions/checkout@v4
   ```

8. **(可选)删掉 dispatch-ci 的绕行 job。** 装了 App 之后,这些 job 实务上已经无所事事 —— PR 一开,`ci.yml` 就自动起:
   - 删 `release-please.yml` 最下面的 `dispatch-ci-on-release-pr` job。
   - 删 `release-assets.yml` 最下面的 `Dispatch Validate on the promotion PR branch` step。

   留着也无害(在 commit 层面多一条 check-run 重复跑)。删了更干净。

9. **Commit、PR、合并。** 工作流改动本身也要走 PR(让 CI 校验改动):
   ```
   git checkout -b chore/bonus-github-app
   ```
   ```
   git commit -am "chore: use GitHub App for release-please + promotion PRs"
   ```
   ```
   git push -u origin HEAD
   ```
   ```
   gh pr create --fill
   ```
   记下 PR 号。这个 PR 是 *你* 开的,不是 bot,所以 CI 正常触发 —— 绿了就合:
   ```
   gh pr merge <number> --auto --squash --delete-branch
   ```
   ```
   git checkout main
   ```
   ```
   git pull
   ```

10. **试一下。** 在 `main` 上任意搞一个 `feat:` commit 来触发一次 release(按 Lab 5 的流程也行):
    ```
    git checkout -b feat/bonus-test
    ```
    ```
    echo "" >> app/src/main.tsx
    ```
    ```
    git commit -am "feat: test App-minted release pipeline"
    ```
    ```
    git push -u origin HEAD && gh pr create --fill
    ```
    合掉。Release Please 会开 release PR —— **亲眼看它不用 close + reopen 就自动跑 CI**。那个 PR 合掉后,promotion PR 也是同样自动触发。到这里就完成了。

## 确认

- **bot 开的 PR 上 CI 原地起跑。** release 之后,App 开的 Release Please PR 在 ~30 秒内就带全 `Validate → summary` 的 check rollup —— 不需要 `gh pr close && gh pr reopen`:
  ```
  gh pr view <release-pr-number> --json statusCheckRollup --jq '.statusCheckRollup[] | {name, conclusion}'
  ```
- **触发者变成你的 App**,不再是 `github-actions[bot]`:
  ```
  gh run list --workflow=Validate --limit 1 --json event,triggeringActor
  ```
  `event` 是 `pull_request`,`triggeringActor.login` 是 `<app-name>[bot]`。
- **secret 存在但 Actions 日志里看不到值**(GitHub 自动 mask)。

## 你刚才

把一个教学级的绕行换成了业界标准做法。你的 release 流水线这下真的是 hands-free —— bot PR 触发 CI,auto-merge 一次到位,从打 tag 到部署之间没有两下点击的戏码。真实团队就是这么出的货。

以后要 rotate App 的钥匙,在 App 设置页重新 Generate 一份 `.pem`,再跑一次 `gh secret set APP_PRIVATE_KEY < ...` 就行 —— 工作流不用再改。

## 回滚(如果决定不用 App)

1. revert 工作流的两处改动(`git revert` 这个 bonus PR)
2. Settings → Installed GitHub Apps → 找到这个 App → **Uninstall**
3. 想连 App 本体也删就去 [github.com/settings/apps](https://github.com/settings/apps) 删掉
4. 删两个 secret:
   ```
   gh secret delete APP_ID
   ```
   ```
   gh secret delete APP_PRIVATE_KEY
   ```

回到 close + reopen 的生活。

## 下一个

课程到这就走完了。[README](../../README.cn-zh.md) 上所有徽章此刻都应该是绿的。从这里开始:

- **重建 lab** —— `python3 scripts/setup_repo.py destroy` → `python3 scripts/setup_repo.py` 把全流程内化成肌肉记忆。
- **往深走** —— [`concepts/cicd-model.md`](./concepts/cicd-model.md) 讲加 production、换 app、和 pull 模式对比。
- **留作参考** —— 下次要把 GitHub Actions → AWS 接起来的时候,这个 repo 里所有东西都能直接拷贝进真实工作。

[← 回到 README](../../README.cn-zh.md)
