> 🌐 **English** &nbsp;·&nbsp; [日本語](../../ja/tools/node.md) &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/node.md)

[← Back to README](../../../README.md) &nbsp;·&nbsp; [← Tool primers](./README.md)

# node — Node + npm

Node 22 + npm 10 run the web app (`app/`) both locally and in CI. Lab 2's validator enforces these floors because CI uses `actions/setup-node@v4` pinned to the same versions — drift between your laptop and CI is the #1 source of flaky "works on my machine" debugging.

## Why it's here

The resume website under `app/` is a React + Vite app:

- **Vite** — dev server + bundler. `npm run dev --prefix app` in Lab 8 invokes it.
- **React** — UI framework.
- **TypeScript** — type-checked JS. Source files are `.ts` / `.tsx`.

You only touch `node` / `npm` directly in Lab 8 (running the dev server to preview the BOOTSTRAP banner). Everything else — CI builds, release bundling — is orchestrated by GitHub Actions.

## Commands these labs use

| Command | What it does | Seen in |
|---|---|---|
| `npm run dev --prefix app` | Start Vite dev server on `http://localhost:5173` | Lab 8 |
| `node --version` | Confirm Node 22 | Lab 2 validator |
| `npm --version` | Confirm npm 10 | Lab 2 validator |

## Why the version floor matters

`actions/setup-node@v4` in `.github/workflows/ci.yml` pins to Node 22. If your local Node is 18, you might install + test with API differences that never surface until CI fails — or worse, pass locally but fail in prod. The Lab 2 validator enforces a floor so this doesn't bite.

## Production truths this lab teaches

- **Pin your Node version.** Use `.nvmrc` / `.node-version` + a CI matrix on the same version. Drift is the #1 cause of JS flakes.
- **`npm ci`, not `npm install`, in CI.** `npm ci` refuses if `package-lock.json` is stale — lockfile becomes a reproducibility contract, not a suggestion.
- **`--prefix` lets you invoke a subdir's scripts without `cd`.** `npm run X --prefix app` ≡ `cd app && npm run X` but leaves your shell where it was.

## Transferable skill highlight

Not a "resume-worthy" skill on its own — Node + npm is table stakes for anything front-end. Cite only if the role explicitly asks for Node + React fluency.

## See also

- [Vite docs](https://vite.dev/) — what `npm run dev` actually does
- [`concepts/cicd-model.md`](../concepts/cicd-model.md) — how the web build ties into `release-assets.yml`
