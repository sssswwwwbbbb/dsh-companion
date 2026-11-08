# 云端插件安装 429 修复

日期：2026-11-08。用户从 DSH 原生插件安装器安装 `1.1.0-dev.3` 时，HEAD 和 GET 均反复收到429，最终 pnpm报 ERR_PNPM_FETCH_429。

## 原因与修复

服务器原有公开安装路径全站最多2个并行连接，同时每IP最多2个；Node又重复设置公开GET最多2个。Nginx最近12次该路径失败都为连接限流：11次全站额度、1次IP额度。错误与插件内容/授权无关。

公开 `/dsh-companion/install/` 改为每IP8、全站32；请求速率限制继续保留。去掉Node重复的全站2个GET限制，集中由Nginx管并发。私有更新下载、授权接口与其他业务路径没有改限流策略。只有明确publicInstall=true的包可匿名读取；匿名安装不会生成激活码、绑定设备或修改授权记录。

已备份并部署 `20261108-console7-9599f862`，备份 `<服务器备份目录>`，上个代码目录为 console6。切换保留41条原授权、9条原插件发布，签名和管理员身份保持，其他业务服务PID未变化。回退代码不能覆盖仍在变化的线上授权/领取库。

## 验证

- 真实HTTPS同时打开三个GET后，再发HEAD，四个响应均为200。
- 官方 DSH 0.2.2-rc.1、隔离profile，用相同HTTPS地址和官方安装器 `installBundle` 完整下载126473571字节、安装启用成功，版本实读1.1.0-dev.3，profile记录原HTTPS地址。用时217075ms（约3分37秒），不等于其他网络下固定耗时。
- 独立审查公开location替换/首次插入/幂等通过；私有路径和兜底404保留。
- 独立重跑license-flow 9/9通过，新增“三个下载同时打开仍可HEAD/GET”回归覆盖本次故障。
- 用户真实DSH profile未修改。仅本地隔离profile与pnpm包缓存用于验证。

证据：reports/install-429/deployment.json、concurrency.json、official-install.json。

原链接保持：

- Mac ARM64：https://<授权服务地址>/dsh-companion/install/dsh-companion-1.1.0-dev.3.tgz
- Windows x64：https://<授权服务地址>/dsh-companion/install/dsh-companion-1.1.0-dev.3-win32-x64.tgz

取消失败安装后重新安装即可；已经安装的用户不需要为服务器限流修复重装插件。原生安装页仍显示转圈和pnpm日志，DSH未提供公开字节百分比接口。
