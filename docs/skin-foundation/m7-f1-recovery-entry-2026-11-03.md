# M7-F1 首次使用恢复入口返工

2026-11-03，模块线实施/隔离验证，交主控复验。原M7的112文件清单`ef61f65925eaafc7ee0da520813250eac707f22fd22b68eeea088e0c7808859e`保留。

主控指出：fresh selected=null时停止仍合法，原新UI仅判断stopped便显示“恢复本套皮肤”，点击将读取null.id。本处只将显示条件改为stopped且确有selected，生成client同步更新；没有改停止核心、恢复方法、状态协议或原生播放。

`reports/skin-foundation-m7-f1-2026-11-03/targeted-ui.json`两条实际界面回执通过：

1. 全新隔离profile selected=null/stopped=false，从皮肤页实点停止后，selected仍null、phase=stopped；真实页面显示“效果已停止”，恢复按钮数为0，无错误。截图unselected-stopped.png。
2. 随后从普通内置入口选择准确0.7.1，再实点停止，原恢复按钮出现且启用；实际点击后恢复原contentKey、phase=ready/stopped=false。截图selected-stopped.png。未预览影片，completions=0。

新profile仍不传设计目录或注册注入；准确内容继续`4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`。此次控制模型/真实模型调用均0，没有重跑原五项daily或媒体。原daily的size105/受控调用1属于此前隔离profile，原证据不覆盖；当前fresh环境自然为默认size100、auto=false，原profile保留。

build-client及JavaScript/JSON检查通过；本地app开发签名校验通过，原59个native payload逐字节不变。新同范围112文件摘要及仅两文件差异在同目录source-manifest.json；build-check.json更新本地目录中模板/client的摘要，对原M7其余文件保持一致。没有重新制作安装归档或发布。

当前必要隔离Host/renderer/native保持，页面“陪伴→皮肤”、0.7.1已恢复就绪，供主控CUA复验就近预览和同一开关。无真实DSH/profile、安装、上传、提交或正式版本变动。
