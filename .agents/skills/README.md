# 本项目按需使用的设计技能

2026-11-04。用户要求挑选适合整套二次元主题的候选，按需安装，不全部引入。以下技能只安装在本项目，不修改全局技能或DSH日用安装，也不属于皮肤插件运行依赖。

## 已安装

| 技能 | 本项目用途 | 来源与固定提交 |
| --- | --- | --- |
| `ui-ux-pro-max` | 查询科幻、赛博、HUD、复古未来主义的颜色、字体、组件和动效参考；按需补足主题视觉方案 | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)，713eef51b04efc98d6fa565323b495f7c9c89fd4；安装源为其.claude/skills/ui-ux-pro-max子目录，保留完整data/scripts/references，并补入仓库根MIT许可 |
| `capability-router` | 本项目自建：把「有没有插件能做 X」拆成能力，对照 bundle 索引给出候选与安装代价，只建议不自动装 | 本项目原创，无上游；索引见 `capability-router/references/bundle-index.md` |
| `anime-character-director` | 新角色、立绘与商业二次元风格的专项设计，再交给已有ImageGen执行；不自动套用到当前首套 | [glt258/anime-character-director](https://github.com/glt258/anime-character-director)，b64385fd2c6a4c2e28045dea875319ec461fb28a；仓库本身是技能根，MIT许可 |

安装使用Codex skill-installer的GitHub安装脚本与项目级dest，两个上游SKILL.md保持原样。后续更新明确选择新提交，不无提示地跟随main。

## 与已有技能的分工

- 管理器、皮肤库、安装切换和设置交互：`impeccable` 主导，采用工作界面流程。
- 前端视觉构图、字体层级、可读性与视觉复核：`design-taste-frontend` 按主题辅助。
- 科幻/赛博等具体风格资料：按需查询 `ui-ux-pro-max`；已有档案暖白规范继续优先，不因检索结果重建全套设计系统。
- 原创角色/立绘：按需用 `anime-character-director`，普通委托可采用QUICK或AI_DECIDE；用户希望参与角色选择时再用USER_DECIDE。既有角色扩展须把用户已确认的参考和保留项明确传入本次任务，保留角色与画风一致性。
- 不把所有技能的完整流程叠加。用户主题与本项目范围优先，通用禁色/禁装饰偏好不成为引擎限制。画面生成、真实Alpha、连续动作及原生播放效果分别核对，技能安装不等于这些已通过。

## 可直接使用的本地检索

从本项目执行，技能脚本位置固定为此处的scripts/search.py，无需设置CLAUDE_PLUGIN_ROOT：

```sh
python3 '<本机路径>/.agents/skills/ui-ux-pro-max/scripts/search.py' 'Cyberpunk UI' --domain style --max-results 1
python3 '<本机路径>/.agents/skills/ui-ux-pro-max/scripts/search.py' 'HUD Sci-Fi' --domain style --max-results 1
```

验证：上述两条离线检索均命中对应active风格；角色技能17个runtime模块在现有Python中导入通过；两个SKILL.md的相对引用均存在。未做生图或角色质量测试。真实PNG像素Alpha检查如需Pillow，在实际素材任务中按需配置项目隔离环境，不修改全局Python。

## 本次不安装

- [Design-It](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-it)：有科幻、赛博、全息等风格指南，但与UI UX Pro Max本轮用途重叠；先保留来源，出现具体缺口再引入。合集星数不作子技能质量依据。
- [Game Assets Enhancer](https://github.com/adamlyttleapps/claude-skill-game-assets-enhancer)：风格锚点与分层素材方法有参考价值，但主流程偏横版游戏/视差场景，要求fal.ai、其MCP和付费生成；当前不安装、不配置密钥、不发起相关调用。

新技能在下一轮对话可被发现，进行中的工作线可按上述路径按需读取；当前ZIP皮肤库实现及已通过稿照常推进，不因安装技能重新出图或改版。
