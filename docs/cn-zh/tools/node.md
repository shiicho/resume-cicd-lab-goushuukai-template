> 🌐 [English](../../en/tools/node.md) &nbsp;·&nbsp; [日本語](../../ja/tools/node.md) &nbsp;·&nbsp; **简体中文**

[← 回到 README](../../../README.cn-zh.md) &nbsp;·&nbsp; [← 工具入门](./README.md)

# node —— Node + npm

Node 22 + npm 10 驱动 `app/` 下的 Web 应用,本地和 CI 都一样。Lab 2 强制版本下限,是因为 CI 用 `actions/setup-node@v4` pin 到同样的版本 —— 笔记本和 CI 不对齐是「在我机器上没问题」这类 flaky 调试的头号原因。

## 为什么在这里

`app/` 下的简历网站是 React + Vite:

- **Vite** —— dev 服务器 + 打包器。Lab 8 里 `npm run dev --prefix app` 跑的就是它。
- **React** —— UI 框架。
- **TypeScript** —— 带类型的 JS。源码是 `.ts` / `.tsx`。

直接碰 `node` / `npm` 的只有 Lab 8(跑 dev 服务器预览 BOOTSTRAP 页脚)。其他(CI 构建、发布打包)都由 GitHub Actions 编排。

## 这些 lab 用到的命令

| 命令 | 做什么 | 出现在 |
|---|---|---|
| `npm run dev --prefix app` | 在 `http://localhost:5173` 启 Vite dev 服务器 | Lab 8 |
| `node --version` | 确认是 Node 22 | Lab 2 校验 |
| `npm --version` | 确认是 npm 10 | Lab 2 校验 |

## 为什么要 pin 版本下限

`.github/workflows/ci.yml` 的 `actions/setup-node@v4` pin 到 Node 22。如果你本地是 Node 18,可能 install + 测试都通过,可 CI 里才爆,或者更糟:本地过了,prod 炸。Lab 2 的下限校验就是为了在进入后面的 lab 之前堵掉这一类问题。

## 这个 lab 教给你的「生产真相」

- **Pin 住 Node 版本**。用 `.nvmrc` / `.node-version` + 同版本的 CI matrix。JS 代码库里 flake 的头号来源就是版本漂移。
- **CI 里用 `npm ci`,不是 `npm install`**。`npm ci` 在 `package-lock.json` 过期时拒绝运行 —— lockfile 变成「再现性契约」,不再只是「建议」。
- **`--prefix` 让你不 `cd` 也能跑子目录脚本**。`npm run X --prefix app` ≡ `cd app && npm run X`,但 shell 的工作目录不动。

## 可迁移技能

单独作为「简历价值」的技能算不上 —— Node + npm 是做前端就默认要会。只有职位明确要求 Node + React 熟练度时才写。

## 相关

- [Vite 文档](https://vite.dev/) —— `npm run dev` 背后在做什么
- [`concepts/cicd-model.md`](../concepts/cicd-model.md) —— Web 构建怎么串进 `release-assets.yml`
