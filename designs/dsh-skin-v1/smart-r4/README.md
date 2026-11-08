# 智能互动 R4

独立设计预演，真实模型与原生执行器尚未连接。R3 入口及快照保持原样。

打开 http://127.0.0.1:4314/dsh-skin-v1/smart-r4/index.html ，依次输入“你好”“换个动作”，点击“查看上下文”。可预演安静、失败回退、停止、能力关闭、本地模式及刷新续接。

使用父目录已有的 React、组件、主题 token 和 R2 角色图集。无外部网络依赖。`model.js` 是固定样例和设计上下文，**不是可导入运行合同**；不要将它交给皮肤 loader。

编辑 app.jsx 后运行 `node designs/dsh-skin-v1/smart-r4/build.cjs`。作者定向检查：`node reports/first-skin/check-r4.cjs`。测试专用 URL 加 `?qa=1`，与正常预览使用独立 localStorage 键。

交接与本套默认建议见 docs/first-skin-design/smart-interaction-r4.md。模型和运行字段由 M3 模块线确认。
