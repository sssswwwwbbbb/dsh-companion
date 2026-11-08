# 安全策略 · Security Policy

## 报告问题

不要公开提 issue。发送邮件至 swbzzzz2021@163.com，写明：

- 受影响的版本与平台；
- 复现步骤或最小样例；
- 是否涉及激活校验、设备绑定或签名校验。

我们会在确认后回复处理计划。请给修复留出时间，不要在修复前公开细节。

## 范围

- 插件与桌面组件的权限、网络请求、配置解析；
- 皮肤包导入路径、资源加载与解压边界；
- 授权校验与设备绑定逻辑；
- 安装、更新与签名摘要校验。

不构成漏洞的：需要用户本机管理员权限才能改动的本地文件、公开已知的 DSH 上游问题。

## 支持版本

只维护最新正式版。旧版本的问题请先升级再复现。

---

# Security Policy (English)

Please do not open a public issue. Email swbzzzz2021@163.com with the affected version and platform, reproduction steps or a minimal sample, and whether activation, device binding or signature verification is involved.

In scope: plugin and desktop permissions, network requests, config parsing, skin import and archive extraction limits, licensing and device binding, update signature checks.

Out of scope: local files that already require administrator access, known upstream DeepSeek Harness issues.

Only the latest release is maintained.
