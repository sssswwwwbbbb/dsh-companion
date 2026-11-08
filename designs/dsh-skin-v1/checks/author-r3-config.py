# -*- coding: utf-8 -*-
"""Author the R3 design declaration and its review matrix; not a DSH schema."""
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
controls={}
def field(key,label,kind,default,group,decision,dependency,display='始终',fallback='使用本套默认',runtime='仅本地设计模拟',**spec):
 controls[key]={'label':label,'type':kind,'default':default,'group':group,'decision':decision,'dependency':dependency,'display':display,'fallback':fallback,'runtime':runtime,**spec}
first='首版设计（待复审）';verify='待验证';later='后续';contract='当前合同已支持；R3 配置候选已声明，未做新宿主行为实测'
field('theme','阅读配色','enum','light','常用',first,'主题模块/明暗 token',values=['light','dark'],runtime='明暗 token 已有；原型手动模式不写宿主偏好')
field('accent','强调色方案','enum','copper','常用',verify,'主题预设选择能力；需扩展模块',values=['copper','marine'])
field('background','自带档案背景','boolean',True,'常用',first,'主题背景模块',fallback='纯色底',runtime='运行包用浓度 0 关闭；原型单独开关')
field('backgroundStyle','背景图案','enum','grid','常用',verify,'两套原创几何方案；背景选择能力待扩展',display='背景启用',fallback='档案网格',values=['grid','contour'])
field('backgroundOpacity','背景浓度','number',.04,'常用',first,'theme.backgroundOpacity',display='背景启用',fallback='0 为纯色底',runtime=contract,min=0,max=.15,step=.01)
field('pet','鲸鱼娘桌宠','boolean',True,'常用',first,'pet 模块与可用能力',fallback='保留启用入口/不可用原因；保留参数',runtime='模块开关由底座管理；R2 角色未接入')
field('petScale','角色大小','number',100,'常用',first,'pet.size 百分比，原生几何待验证',display='桌宠已启用且能力可用',runtime=contract,min=70,max=140,step=5)
field('profile','行为风格','enum','gentle','常用',first,'pet.profile，已有角色行为状态机',display='桌宠已启用且能力可用',runtime=contract,values=['free','gentle','lively'])
field('motion','动态效果','enum','system','常用',first,'系统减少动态与静态资源能力',fallback='静态 idle 与状态文字',values=['system','reduced'])
field('autonomous','自主活动','boolean',False,'更多',first,'pet.autonomous，R2 完整动作待制作',display='桌宠已启用且能力可用',runtime=contract)
field('followMouse','跟随鼠标','boolean',False,'更多',first,'pet.followMouse，原生行为待核对',display='桌宠已启用且能力可用',runtime=contract)
field('activityFrequency','自主活动间隔','enum',90,'更多',verify,'本地状态机频率字段未开放',display='自主活动开启且可表演',values=[30,60,90])
field('clickResponse','点击回应','boolean',True,'更多',first,'点击反馈模块与 react/greet 等动作',display='桌宠已启用且能力可用')
field('clickAction','点击动作','enum','react','更多',verify,'仅选择已提供的同角色姿态；需点击模块参数',display='点击回应开启',values=['react','greet','idle'])
field('clickText','点击短句','text','嗯，我在。','更多',verify,'纯文本气泡字段；不解释模板或脚本',display='点击回应与气泡开启',maxLength=40,fallback='空白则不显示可选气泡')
field('clickCooldown','点击冷却','number',2,'更多',verify,'点击调度去重字段；活动中重复触发固定合并',display='点击回应开启',min=0,max=10,step=1)
field('completion','任务完成反馈','boolean',True,'更多',verify,'当前会话已验证事件桥接；尚未接入',fallback='只保留原会话结果')
field('needsFeedback','需要处理提示','boolean',True,'更多',verify,'当前会话需处理/解除事件',display='本套声明工作反馈',fallback='原会话需处理状态仍保留')
field('bubbles','显示短气泡','boolean',True,'更多',first,'可选文案层，与反馈状态独立',display='本套声明反馈或点击',fallback='省略气泡；需处理状态仍冻结且有固定提示')
field('cooldown','完成提醒间隔','number',30,'更多',verify,'完成事件去重和冷却字段',display='任务完成反馈开启',min=5,max=300,step=5)
field('completionAction','完成动作','enum','greet','更多',verify,'同角色 greet/stretch/idle 姿态；完整动画待制作',display='任务完成反馈开启',values=['greet','stretch','idle'])
field('completionText','完成短句','text','这件事，做好了。','更多',verify,'完成气泡纯文本',display='完成反馈与气泡开启',maxLength=60,fallback='空白则不显示可选气泡')
field('needsText','处理短句','text','有一项事情需要你看看。','更多',verify,'需处理气泡纯文本；不替代原始会话',display='需处理提示与气泡开启',maxLength=60,fallback='空白不显示气泡，固定状态提示保留')
field('mappingEnabled','启用专属规则','boolean',False,'更多',verify,'已验证模型/事件 ID 与映射模块；尚未接入',display='本套声明工作反馈',fallback='回本套默认动作和文案')
field('eventRules','模型与状态规则','rules',[{'id':'sample-deepseek-complete','enabled':True,'model':'example-deepseek','event':'completed','action':'stretch','text':'这一项，已经整理好了。'}],'更多',verify,'示例 ID 只用于模拟；真实模型/会话/状态信号待底座验证',display='启用专属规则',fallback='无匹配/规则关闭回本套默认；需处理动作限定静态 idle',maxRules=8)
field('startup','启动开场','boolean',True,'更多',verify,'启动生命周期；扫描原片仅参考',fallback='立即进入工作区')
field('startupStyle','开场方案','enum','scan','更多',verify,'档案底板与扫描参考；新模块未开放',display='启动开场开启',fallback='纯档案或直接进入工作区',values=['scan','archive'])
field('startupPolicy','自动播放条件','enum','cold','更多',verify,'已确认冷启动/运行中启用规则与新开场模块',display='启动开场开启',fallback='只允许手动预览',values=['cold','manual'])
base=json.loads((r/'revisions/r2/design-defaults.json').read_text())
base.update(version='0.3.0',note='R3 design declaration and per-skin overrides; prototype only. R3 contract candidate exposes five supported fields using the historical builtin pet, not the R2 new character.',defaults={k:v['default'] for k,v in controls.items()},controls=controls)
base['fixed'].update(canvasSizePx=200,duplicateClick='coalesce',attentionLifetime='until-explicit-simulated-resolution',ruleScope='current-visible-example-session',rulePrecedence='exact model, wildcard model, skin default',arbitraryScripts=False)
base['fixed'].pop('backgroundStyle',None)
base['unsupportedHidden']=['character-costume-selector','sound-volume','arbitrary-colors','font-family-upload','real-model-character-mapping','input-monitor','external-wallpaper','market','creator-editor']
(r/'content/design-defaults.json').write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n')
rows=[]
for k,v in controls.items():
 rows.append({'field':k,**v,'override':'只保存本皮肤合法局部覆写；变回默认移除覆写','reset':'重置本套清本套覆写，保留全局停止/静音/授权'})
rows += [
 {'field':'characterVariant','label':'角色/服装选择','decision':'后续','default':'当前仅 scan-whale-r2 候选，无可切换变体','range':'只有一套形象，不显示选择器','dependency':'真实不同服装资源及角色槽合同','display':'当前隐藏','fallback':'本套默认角色','override':'未来按皮肤保存资源 ID','reset':'未来回本套默认','runtime':'未接入'},
 {'field':'modelCharacterVariant','label':'模型对应不同形象','decision':'待验证','default':'不启用','range':'仅可用的真实资源/模型 ID','dependency':'角色变体 + 真实模型信号','display':'当前隐藏；本轮只演示动作/文案规则','fallback':'本套默认','override':'未来按皮肤保存','reset':'回本套默认','runtime':'未接入'},
 {'field':'sound','label':'声音/音量','decision':'不做','default':'无声','range':'本套未提供声音','dependency':'无资源','display':'隐藏','fallback':'文字提示','override':'保留全局静音意图','reset':'不清全局静音','runtime':'未声明'},
 {'field':'creatorPlatform','label':'制作器/上传/市场','decision':'后续','default':'不进入首版','range':'待单独定义','dependency':'发布/资源审核/账户能力','display':'隐藏','fallback':'本地声明包','override':'不适用','reset':'不适用','runtime':'未实现'},
 {'field':'externalWallpaper','label':'外部壁纸兼容','decision':'不做','default':'不启用','range':'不支持','dependency':'无','display':'隐藏','fallback':'自带背景/纯色底','override':'不适用','reset':'不适用','runtime':'未声明'}]
output={'date':'2026-11-03','revision':'R3','status':'design candidate; awaiting repeat independent acceptance','rows':rows,'publicPreviewControls':len(controls),'runtimeCandidatePublicFields':['theme.backgroundOpacity','pet.size','pet.profile','pet.autonomous','pet.followMouse']}
(r/'content/configuration-matrix-r3.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
doc=Path('docs/first-skin-design/configuration-matrix-r3.md')
lines=['# 首套配置矩阵 / R3','', '2026-11-03。回应 D-R2-03。下表为本轮设计取舍，等待复审；“首版设计”不代表已实现运行能力。“待验证”项仅在标明模拟的原型中展示，不灌入当前运行合同。','',f'原型共 {len(controls)} 个声明字段（含一组有结构的规则）；R3 合同验证候选公开 5 个字段。通用模块开关、全局停止不计入皮肤专属字段数量。数量不是验收目标，字段须对应明确体验。','', '统一规则：每个控件都有合法默认值；修改保存到本皮肤覆写，原声明不改写；关闭收起子项并保留值；能力不可用说明原因、停止表演；不支持项隐藏。重置仅清本套覆写，保留全局停止、静音、授权。','', '| 字段 / 配置 | 取舍 | 默认 / 范围 | 依赖与显示条件 | 缺失回退 | 实际接入状态 |','|---|---|---|---|---|---|']
for v in rows:
 default=json.dumps(v.get('default'),ensure_ascii=False) if v.get('type')!='rules' else '规则总开关默认关闭；1 条示例；最多 8 条'
 span=v.get('values') or (str(v.get('min'))+'–'+str(v.get('max'))+' / step '+str(v.get('step')) if v.get('type')=='number' else ('纯文本 ≤'+str(v['maxLength'])+'字' if v.get('type')=='text' else v.get('range','布尔' if v.get('type')=='boolean' else '规则列表')))
 cells=[v['field']+' / '+v['label'],v['decision'],default+'；'+str(span),v['dependency']+'；'+v['display'],v['fallback'],v['runtime']]
 lines.append('| '+' | '.join(str(x).replace('|','／').replace('\n',' ') for x in cells)+' |')
lines+=['','## 规则编辑与失效约定','','- 本轮模型是 example-deepseek / example-other 等示例 ID，不读取真实 DSH 模型。按精确模型 → 任意模型 → 本套默认选择第一条启用规则；同一模型/事件的启用规则禁止重复，最多八条。','- 只允许 completed 和 needs-user 两个事件样例。需要处理强制 idle 静态，不接受庆祝动作；不能把规则文本当脚本或模板执行。','- 禁用映射保留规则，无匹配回本套默认；规则不跨皮肤、后台会话或未验证事件执行。切换示例模型/会话解除旧的模拟反馈，停止清空待播队列；用户未处理的会话状态不由气泡开关消除。','- 实际底座须提供事件代次、当前会话 ID、真实模型 ID、需处理解除/会话切换失效，再扩展 feedback/mapping 模块及版本。现有协调、存储、资源与撤销机制复用。','','## 动作范围先收敛','','先保留 idle/react/greet/stretch 四姿态；首轮完整动画只验证 idle 与 react。需要处理用静态 idle，不另造庆祝/错误表演；walk/run/eat/play/sleep 等不因为合同有槽位就自动列为本套首版玩法。完整动作制作在配置与角色候选复审后推进；当前不批量制作、不以静帧视频冒充完整动画。']
doc.write_text('\n'.join(lines)+'\n')
print('R3 declaration:',len(controls),'controls;',len(rows),'matrix rows')
