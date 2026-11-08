# 贡献指南 · Contributing

感谢你愿意参与。提交前请先读这一页。

## 开发环境

- Node.js 22 及以上。
- macOS 用于打包桌面组件；只改插件逻辑时 Linux 也能跑测试。

```sh
npm install
npm ci --prefix licensing --omit=dev --ignore-scripts
npm test        # 171 项用例
npm run check   # 语法与 JSON 校验
```

## 提交前

1. 跑通 `npm test` 与 `npm run check`。
2. 不要提交 `.local/`、`dist/`、`reports/` 或任何凭据。
3. 素材改动需同时更新对应的 `ASSET-NOTICE.txt`。
4. 说明改动动机与验证方式，不写“已优化”这类空话。

## 分支与 PR

- 从 `main` 开分支，命名 `fix/`、`feat/`、`docs/` 开头。
- 一个 PR 只做一件事，附带复现步骤或截图。
- 涉及皮肤、授权或打包流程的改动，先开 issue 讨论。

## 许可

提交即表示你同意以 [AGPL-3.0-or-later](LICENSE) 授权你的代码贡献。素材不在此列，需单独确认。

---

# Contributing (English)

- Node.js 22+.
- Run `npm install`, `npm ci --prefix licensing --omit=dev --ignore-scripts`, `npm test` and `npm run check` before a PR.
- Never commit `.local/`, `dist/`, `reports/` or credentials.
- Update the matching `ASSET-NOTICE.txt` when you change assets.
- One PR does one thing; include how you verified it.

By submitting a PR you agree to license your code contribution under [AGPL-3.0-or-later](LICENSE). Assets are separate.
