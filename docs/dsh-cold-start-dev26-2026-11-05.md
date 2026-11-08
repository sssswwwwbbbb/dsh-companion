# 「冷启动」macOS 修复候选 dev.26

适用 Apple 芯片 Mac 与官方 DSH 0.2.1-rc.5。通过 DSH 的「添加插件」安装本地包。SHA-256 为 `5130521f51eaf6dbfd4bfecac2769f709bbac9c23798d622e7fb1c90c02e809d`。[本地安装包](<<本机路径>/dist/dsh-plugin-companion-0.1.0-dev.26.tgz>)

- 在「陪伴 → 本套设置」开启「启动时自动播放」后，按 ⌘Q 完全退出，再点原 DeepSeek Harness 图标。开场在 DSH 主窗口内播放，12.5 秒片尾后交回工作区，Esc 或「进入工作区」可跳过。播放沿用本套声音和减少动态偏好。旧陪伴启动器可在「授权与更新」移除。
- 「角色大小」在当前桌宠窗口更新，保持人物中心、当前动作和等比命中区。隔离实测从 100% 到 140% 再到 70%，原生画框依次为 685、959、479，提交到保存回执用时 143 和 138 毫秒。进程、窗口和皮肤代次一致，重新打开 DSH 后仍保持 70%。

自动开场使用 `webserver/index-inject` 的 head 注入。官方 Desktop Host 将注入行交给当前原生窗口，插件在同一个文档中控制媒体和工作区输入。原片不改字节，系统无焦点时启动流程有自动退回工作区的时限。[启动注入参考一](https://github.com/lxj5820/dsh-boot-animation/blob/b7786cd749ef18608340a8f5e2071a3656ebf009/entry.js#L1525) · [启动注入参考二](https://github.com/LeeRolling/dsh-boot-suite/blob/34b892eae168abf14fc9623cb109d6806ffeacf2/lib/host-startup.js#L1005)

同一 SHA 已通过归档审计、官方插件管理器安装、自然片尾、Esc、关闭自动播放、关闭声音、减少动态、重复打开和滑块缩放回归。运行中修改开关、停用及重新启用插件均保持当前工作区。整包测试在隔离 DSH 进行，锁屏时对隔离窗口模拟焦点。小探针在实焦点下验证了原片自然结束与 Esc。主控负责原图标实点和缩放后的物理点击、拖动验收。[隔离回执](<<本机路径>/reports/dsh-cold-start-dev26-2026-11-05/summary.json>)

从项目根目录重建。

```sh
node experiments/dsh-cold-start-install/stage.mjs .local/dsh-cold-start-dev26-rebuild 0.1.0-dev.26
cd .local/dsh-cold-start-dev26-rebuild
npm run package:mac
```
