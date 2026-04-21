> 🌐 [English](../en/lab-02-tools-and-dry-run.md) &nbsp;·&nbsp; [日本語](../ja/lab-02-tools-and-dry-run.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../README.cn-zh.md) &nbsp;·&nbsp; [← Lab 1](./lab-01-safety-first.md)

# Lab 2 — Tools + Dry-Run the Exit

⏱ 10 分钟 &nbsp;·&nbsp; 💰 $0 &nbsp;·&nbsp; 进去之前先知道出口在哪

## 为什么

大多数教程把「destroy」当脚注放在最后讲,这是反的。你不信任 destroy 路径,就会因为害怕弄坏什么而把资源开着不管。所以我们 **现在** 就彩排一次 destroy —— 在什么都还没造好的时候 —— 让你到真正需要用它时(Lab 10 或一次突发情况),输出你已经见过了。

> vs _「到时候 CLI 会告诉我」_ —— 它会告诉你,但不是用能让你放心的方式。空状态下的 dry-run 能在 0 爆炸半径下带来安心感。

## 做什么

1. **安装工具链**(已经有的可跳过):
   - `git`(任一较新版本)
   - `python3` ≥ 3.10
   - `node` 22 + `npm` 10(与 CI 对齐)
   - `aws` CLI v2(`aws --version` 显示 2.x.y)
   - `gh`(GitHub CLI — `gh auth login` 完成)
   - `jq`(多个脚本用它解析 JSON)

   按 OS 划分的安装命令 + `gh auth login` / `aws configure` 步骤都在 [`tools/install.md`](./tools/install.md)。

   然后安装向导用的 Python 包(如果你按 README 的 [Before you start](../../README.cn-zh.md#开始之前) 已经装过,可以跳过 —— 再跑一次也是空操作,不会出问题):
   ```
   pip install --user -r scripts/requirements.txt
   ```
   (typer + rich + questionary —— CLI UX 层)

2. **运行工具校验器** —— 这是下游所有脚本共享的权威检查:
   ```
   python3 scripts/setup_repo.py validate-tools
   ```
   输出是一个 `Tool | Available | Version | Authenticated` 四列的 Rich 表(列头会随你的 UI 语言本地化 —— ja 显示 `ツール | 利用可能 | バージョン | 認証済み`,zh-CN 显示 `工具 | 可用 | 版本 | 已认证`)。`Available` 每一行都应为 `ok`;`Version` 列在 `python3` / `node` / `npm` / `aws` 上应是绿色(分别达到文档要求下限 `3.10` / `22.0` / `10.0` / `2.0`);`Authenticated` 在 `aws` 与 `gh` 上应为 `ok`。如果哪一行显示 `missing`,或者对版本下限有要求的工具版本不达标(如 Python 3.9、node 18),校验器会以非零退出;安装或升级后再跑一次,直到全绿。全绿之后表格下方会跟一张 `✓ Toolchain ready` 面板,直接给出 Lab 2 的下一条命令。

3. **对空状态 dry-run exit 命令**。此时没部署任何东西,所以绝对安全:
   ```
   python3 scripts/setup_repo.py destroy --dry-run
   ```
   读输出。空状态(现在)下你会看到:
   - **「Stacks (N)」** 表 —— 还没部署,所以 `N=0`。Lab 10 时这里会填上 apply 创建的所有栈。
   - **「ECR repositories to purge」** 表 —— destroy 会清空的 ECR 仓库。现在还不存在,但这个表先把它们未来的名字告诉你,方便你之后认得。
   - **「What will NOT be touched」** 块 —— 你的 GitHub repo、Actions 变量、本地 git worktree 永远会被保留。
   - **「Cost impact」** 盒子里的 "Estimated cost stopped" —— 空状态下显示 `$0.00/day`(什么都没部署,也就没什么可停的)。Lab 9 跑完之后再到 Lab 10 时,同一个盒子会读 `$2.90/day`,也就是这条命令即将帮你省下来的金额。

   「Data loss warning」块只在真的有数据风险(S3 对象、ECR 镜像)时出现。现在看不到,Lab 10 里会看到。

4. **开一个记录工具版本的 PR**。只修改 `docs/` 就足以触发 `Validate` 工作流。分四个小步骤:

   **a) 建分支:**
   ```
   git checkout -b feat/lab-2-tools
   ```

   **b) 先把工具版本号收集出来。** 挨个跑下面的命令,把每一条打印出来的版本号记下来 —— (c) 里要手填进文档:
   ```
   git --version
   ```
   ```
   python3 --version
   ```
   ```
   node --version
   ```
   ```
   npm --version
   ```
   ```
   aws --version
   ```
   ```
   gh --version | head -1
   ```
   ```
   jq --version
   ```

   **c) 手工编辑这份 lab 文档把它们记下来。** 在编辑器里打开 `docs/cn-zh/lab-02-tools-and-dry-run.md`,滚到文件最底(最后一行 `[Lab 3 — Wire the Lab (dev only)](./lab-03-wire-the-lab.md)` 链接的下面),追加一个新节。把每个 `<…>` 占位符替换成你在 (b) 看到的值:
   ```markdown

   ## My environment

   Recorded <YYYY-MM-DD>:

   - `git --version` → <git version>
   - `python3 --version` → <python3 version>
   - `node --version` → <node version>
   - `npm --version` → <npm version>
   - `aws --version` → <aws version>
   - `gh --version` → <gh version>
   - `jq --version` → <jq version>
   ```
   保存,然后确认改动是对的:`git diff docs/cn-zh/lab-02-tools-and-dry-run.md` —— 应该只显示你追加的 `## My environment` 节(大约 10 行 `+`),没有任何删除、也没别的改动。

   **d) stage、commit、push、开 PR:**
   ```
   git add docs/cn-zh/lab-02-tools-and-dry-run.md
   ```
   ```
   git commit -m "docs(lab-2): record my tool versions"
   ```
   ```
   git push -u origin feat/lab-2-tools
   ```
   ```
   gh pr create --fill
   ```
   记下输出里打印的 PR 编号。如果 `gh pr create` 报 "could not find any commits between origin/main and feat/lab-2-tools",说明 (c) 的修改没保存 —— 把文件重新打开,确认 `## My environment` 在最底部,保存后重试。

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

- `validate-tools` 以 0 退出,每个工具都是 `ok`。
- `destroy --dry-run` 以 0 退出,打印横幅 "No changes will be made. This is a preview." 和一张 `Stacks (0)` 表。
- PR 通过 `Validate / summary` 检查。
- PR 合并后 Lab 2 的进度徽章变 ✓。

## 你刚刚做到的

证明了工具链完整,并在零代价状态下彩排了紧急出口。从这里开始,destroy 就是一条你熟悉的命令,而不是吓人的命令。

## 下一个

[Lab 3 — Wire the Lab (dev only)](./lab-03-wire-the-lab.md)
