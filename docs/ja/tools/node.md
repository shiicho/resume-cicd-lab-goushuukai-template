> 🌐 [English](../../en/tools/node.md) &nbsp;·&nbsp; **日本語** &nbsp;·&nbsp; [简体中文](../../cn-zh/tools/node.md)

[← README に戻る](../../../README.ja.md) &nbsp;·&nbsp; [← ツール入門](./README.md)

# node — Node + npm

Node 22 + npm 10 が `app/` の Web アプリをローカルと CI の両方で動かします。CI は `actions/setup-node@v4` を同じバージョンに pin しているので、Lab 2 はローカルも合わせる floor を課します — ラップトップと CI の乖離は「自分の環境では動いた」デバッグの元凶です。

## なぜここにあるか

`app/` 配下のレジュメ Web サイトは React + Vite:

- **Vite** — dev サーバー + バンドラ。Lab 8 の `npm run dev --prefix app` が起動。
- **React** — UI フレームワーク。
- **TypeScript** — 型付き JS。ソースは `.ts` / `.tsx`。

`node` / `npm` を直接触るのは Lab 8(BOOTSTRAP バナーをプレビューするために dev サーバーを起動)のみ。それ以外(CI ビルド、リリースバンドリング)は GitHub Actions が調整します。

## このラボで使うコマンド

| コマンド | 何をするか | 出現ラボ |
|---|---|---|
| `npm run dev --prefix app` | Vite dev サーバーを `http://localhost:5173` で起動 | Lab 8 |
| `node --version` | Node 22 を確認 | Lab 2 バリデーター |
| `npm --version` | npm 10 を確認 | Lab 2 バリデーター |

## なぜバージョン下限が重要か

`.github/workflows/ci.yml` の `actions/setup-node@v4` は Node 22 に pin。ローカルが Node 18 だと API 差分で install + test が通って、CI で初めて失敗するか、最悪ローカルで通って prod で落ちる可能性があります。Lab 2 バリデーターの floor チェックはこれを防ぎます。

## このラボが教える「本番の真実」

- **Node バージョンを pin する**。`.nvmrc` / `.node-version` + 同バージョンを走らせる CI matrix。乖離が JS の flake の原因 No.1。
- **CI では `npm install` ではなく `npm ci`**。`npm ci` は `package-lock.json` が古いと拒否 — lockfile が「提案」ではなく「再現性契約」になります。
- **`--prefix` があれば `cd` なしでサブディレクトリのスクリプト起動**。`npm run X --prefix app` ≡ `cd app && npm run X`、でもシェルの作業ディレクトリは動かさない。

## 転用スキル

単体では「レジュメ価値」のあるスキルではありません — Node + npm はフロントエンドなら前提知識レベル。ロールが Node + React を明示的に要求する場合のみ記載。

## 関連

- [Vite ドキュメント](https://vite.dev/) — `npm run dev` が実際にやっていること
- [`concepts/cicd-model.md`](../concepts/cicd-model.md) — Web ビルドが `release-assets.yml` とどう繋がるか
