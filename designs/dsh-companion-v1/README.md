# DSH 陪伴：大肥鱼首个角色效果样机

本地浏览器内的可交互效果预览，面向 Mac 与 Windows 共用的角色、配置和行为逻辑。它还不是已安装的 DSH 插件或原生系统桌宠。

启动预览：

```sh
python3 -m http.server 4311 --bind 127.0.0.1 --directory designs
```

打开 `http://127.0.0.1:4311/dsh-companion-v1/`。

可体验：自动走动与休息、鼠标跟随、点击摸头、双击喂饭、拖拽甩抛与落地、六组互动按钮、睡觉与唤醒、大小调整、三种相处模式、配置保存与导出、开场回放和暂停。屏幕里的精力与亲近值是本地示例状态，不消耗模型额度。

角色素材为 PC2005-cloud/dsh-pet 公开大肥鱼素材的固定版本，选用 12 段透明 WebM。完整署名、素材使用范围见 [ASSET-NOTICE.txt](ASSET-NOTICE.txt)，文件来源与校验记录见 [references/provenance.json](references/provenance.json)。本样机仅用于用户明确指定的非商业自用效果验证。

## 已确定的产品方向

- V1 同时面向 Mac 和 Windows，两端分别验收。
- 用户从 DSH 插件统一进入、选择角色配置包和管理桌宠。
- 正式产品的插件与桌宠共用一份激活码授权；公开素材保留各自许可。
- 主插件、桌面运行组件和角色包分层维护，逐项记录经过验证的 DSH 支持版本。

## 当前边界

尚未接入 DSH、真实模型、激活服务、桌面透明窗口、系统鼠标穿透、签名与安装更新，也未修改 DSH 启动顺序。本页的「桌面」是浏览器中的互动场景。浏览器效果通过不能代替 Mac/Windows 原生桌面、安装或 DSH 接入验收。

验证行为逻辑：

```sh
node --test designs/dsh-companion-v1/tests/behavior.test.mjs
```

配置入口为 `packs/whale-maid.json`。更换角色时替换该角色包中的素材与动作映射，保留行为接口即可。
