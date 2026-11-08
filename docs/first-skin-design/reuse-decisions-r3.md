# R3 复用与适配记录

2026-11-03。落实用户“有合适的开源实现可以复用，不要重复造轮子”的原则。核对范围是现有项目、官方接口能力记录和已收集的固定参考；没有为本轮修复换栈或新增远程依赖。

| 来源 / 版本 | 本轮采用部分 | 取舍及验证 |
|---|---|---|
| React / ReactDOM 18.3.1，本项目 vendor/，MIT 文本已保留 | 现有状态/Effect、SettingRow、Segmented、Toggle、Button、PetMedia | 直接扩充现有组件；原生 select/input/fieldset 构成小型规则编辑区，不引入通用规则 DSL 或新的表单框架。浏览器检查覆盖编辑、保存、状态组合和窄窗。 |
| Babel standalone 7.29.0，本项目 vendor/，MIT 文本已保留 | 既有 build-preview.cjs 编译路径 | 只用于本地预编译，页面不加载 Babel。检查 JSX 与生成 JS 一致。 |
| 项目 dsh-skin-core 0.1.0 | loadSkin、prepareResources、validateManifest、resolveSettings | 5 个运行字段继续用原合同解析与验证，没有新增运行存储、资源协议或协调层。profile/autonomous/followMouse 只从固定字段改为候选包的公开 settings。 |
| DSH 0.2.1-rc.5 官方接口与本项目 capability-matrix.md | 官方颜色 token、原生桌宠模块、既有生命周期能力边界 | 本轮只消费已核对的能力，不改宿主适配器。主题预设、事件规则、新开场的公共能力请求交给所属模块扩展。 |
| LeeRolling/dsh-boot-suite 2.16.0，34b892eae168abf14fc9623cb109d6806ffeacf2 | 已保留的档案/扫描视觉参考 | 不再下载副本，不移植其初始化、授权叙事或宿主实现。新开场仍是参考演示。代码许可不替代角色和扫描视频的作者链确认。 |
| PC2005-cloud/dsh-pet，2265f24a941e6d6736d8a069cc06cf4216df4539 | 现有 builtin 包用于 R1/R3 配置技术验证；旧资源及声明留存 | 不把旧角色重新放回 R3 可见预览，不把 CC BY-NC-SA 素材当作新角色商用授权。 |
| 本项目既有 audit-media.py / imageio-ffmpeg / Pillow 工具链 | 后续透明边缘、时长和采样验收候选 | 本轮未新增动画制作依赖、未生成新视频。先确定 idle/react 少量完整动作与锚点标准，再制作批量资源。 |

新增 preview-model.js 只处理这份浏览器设计稿的有效状态、纯文本规则和覆写，4,263 字节（记录时）。它不替代 dsh-skin-core 的运行 schema。当前浏览器模拟需要文字和规则等尚未开放的设计字段，无法直接加载带 Node 文件资源依赖的运行 loader；因此只补这层必要的原型业务编排，实际内容仍由原 loader 校验。

规则是有上限的声明数据：两类示例事件、已列出的示例模型 ID 和本套四姿态，不提供任意脚本、表达式或真实模型读取。依赖不增加；当前 HTML 的 React/ReactDOM 本地脚本合计 142,586 字节，R2 角色图继续复用原 1,554,309-byte 透明 PNG。原生主机未在本轮加载新候选，所以没有把浏览器表现当作原生性能结论。

后续制作工具是否开源及采用何种项目许可证仍未决定。代码、生成角色、参考视频、字体的来源分别保留；不因使用 MIT 代码而扩张素材范围，也不提前引入制作器、上传、市场或外部壁纸兼容。
