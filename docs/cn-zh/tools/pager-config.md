> 🌐 [English](../../en/tools/pager-config.md) &nbsp;·&nbsp; [日本語](../../ja/tools/pager-config.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# 分页器配置 —— 逃出 `(END)` 陷阱

本课用到的 3 个 CLI(`gh`、`git`、`aws`)默认都会把输出塞给分页器。哪怕只有一行也经常落到 `(END)` —— 看起来像命令卡住了。没卡 —— 按 `q` 退出,然后顺手把配置改了,再也不掉进去。

## 单次绕过

你现在正卡着,只想这一条命令不要分页:

| CLI | 单次写法 |
|---|---|
| `gh` | `GH_PAGER=cat gh ...` |
| `git` | `git --no-pager ...` |
| `aws` | 命令后加 `--no-cli-pager` |

## 持久修复

每台机器设置一次就忘掉:

```
gh config set pager cat
```

```
git config --global core.pager cat
```

然后 AWS CLI 这边,把下面这行加到 shell rc 里,新开的 session 都能吃到(bash 改成 `~/.bashrc`):

```
echo 'export AWS_PAGER=""' >> ~/.zshrc
```

```
source ~/.zshrc
```

README 的 [开始之前](../../../README.cn-zh.md#开始之前) 已经帮你跑前两行了。等 AWS CLI 的分页第一次咬到你的时候,再把 `AWS_PAGER` 那行加上。

## 为什么会这样

`less` 这套分页语义是 Unix 出身,看 `man` 那种大块文本很有用。但现代终端(tmux / iTerm2 / Alacritty / Ghostty)本身就有滚动回看,给 3 行响应套分页器纯粹是摩擦。上面的配置就是让每个 session 都主动退出这个行为。

## 相关

- [`gh.md`](./gh.md) —— GitHub CLI 入门
- [`aws.md`](./aws.md) —— AWS CLI 入门
- [`git.md`](./git.md) —— git 入门
