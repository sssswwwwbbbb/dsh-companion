# M4 两状态资源子集合同

2026-11-03。模块线已定型的实现接口，原生定向结果待本轮报告；皮肤线可以据此组装独立内容，不改已验收0.4.0/A1来源。

pet 使用 `interfaceVersion:1, configVersion:2`。旧 pet configVersion 1 继续支持 builtin 或全12槽自定义；v2 必须给 animations，至少包含 idle，其余只声明有真实资源的槽。所有片段仍是原资源合同内的 WebM、asset逻辑ID、seconds和loop。

```json
{
  "interfaceVersion": 1,
  "configVersion": 2,
  "required": false,
  "config": {
    "builtinPack": "whale-maid-demo",
    "canvasHeight": 195,
    "canvasOffsetY": 12,
    "profile": "gentle",
    "autonomous": false,
    "followMouse": false,
    "animations": {
      "idle": {"asset":"whale-idle-a1","seconds":3,"loop":true},
      "react": {"asset":"whale-react-a1","seconds":1.8,"loop":false}
    },
    "actionDescriptions": {"idle":"安静站立陪伴","react":"侧头轻轻回应用户"},
    "localReply": "我在这里，陪你慢慢来。"
  },
  "settings": {
    "size": {"label":"桌宠大小（百分比）","default":100},
    "smartEnabled": {"label":"智能互动","default":true},
    "persona": {"label":"本套人设","default":"使用R4已确认人设原文"},
    "modelSelection": {"label":"互动使用的模型","default":{"mode":"current"}},
    "historyRounds": {"label":"最近互动轮数（本次运行）","default":10},
    "allowSpeech": {"label":"允许说话","default":true},
    "allowActions": {"label":"允许动作","default":true}
  }
}
```

这是模块片段，asset ID、persona须用本套真实资源和原文；根清单与资源摘要继续由内容线维护。builtinPack 在有自定义 animations 时仅复用原行为曲线，不补媒体。原生加载时整个动画集合替换为已声明集合，未提供动作不能回到历史角色。

canvasHeight 是固定基础媒体区高度，100–400 CSS像素，缺省300；size 仍是70–140百分比。按A1源画布362×362、角色不透明高度约334px，195媒体区＋size100预计约180px角色。视频保持原比例居中包含，不能把正方形拉成原16:9角色；实际轮廓、脚底和切换由原生试播确认。原生A1实测角色约178–180px，初次脚底留空约12px，故可固定canvasOffsetY:12向下平移；该值范围-40–40，缺省0，并随size缩放。只用尺寸和一次平移，不建设锚点/关键帧坐标体系。

本轮A1只声明idle/react。缺动作的手动入口不显示，认证动作请求明确不可用；本地/模型只选已加载且本套声明的能力，其他本地行为回到idle。回应持续1.8秒后由已有行为状态机返回idle，不补播队列。动态气泡与停止/恢复继续M3合同。

缺walk时不能公开followMouse或设为true；缺完整12槽时不能公开autonomous或设为true。这两项固定false可省略，沿用模块内部默认false。既有同皮肤覆写中未公开的项不执行；新包不为了保留旧设置而开放未就绪玩法。

模型会收到idle/react真实就绪子集，可以只说话或安静。没有stretch/greet资源时不得声称模型动作已实现；A1媒体检查与0.4.0历史builtin两轮结果分别报告。
