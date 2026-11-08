from pathlib import Path
import re,json,hashlib
root=Path.cwd();source=root/'reports/skin-workspace-v2-interface-2026-11-04/official/dsh-web-frontend/dist/assets/index-BXV-oxvX.js';s=source.read_text();exports=dict(re.findall(r'(Icon\w+):([\w$]+)',s))
map={
'workspace':['WorkspaceTreeOutline','ProjectAddOutline'],'compose':['NewChatOutline'],'conversation':['ContextInjectionOutline'],'history':[],
'search':['SearchOutline'],'panel-left':['PanelLeftOutline'],'folder':['FolderClose','FolderCloseOutline'],'folder-open':['FolderOpen','FolderOpenOutline'],
'pin':['PinFill','PinOutline'],'bookmark':[],'archive':['ArchiveOutline','ArchiveCheckOutline','ArchiveOffOutline','UnarchiveOutline'],
'more':['EllipsisOutline'],'attachment':['PaperclipOutline'],'link':['LinkOutline'],'quote':[],'copy':['CopyOutline'],'retry':['RefreshOutline'],
'edit':['EditOutline'],'branch':['BranchOutline'],'send':['SendOutline','PaperPlaneOutline'],'stop':['StopFill'],
'chevron-down':['ChevronDownOutline','ChevronUpOutline'],'chevron-right':['ChevronRightOutline','ChevronLeftOutline','ChevronsUpDownOutline','TriangleRightFill'],
'plus':['PlusOutline','AppsAddOutline'],'file-text':[],'file-code':[],'file-image':[],'file-table':[],'terminal':['CodeOutline'],'external':['RightUpOutline','BrowseOutline'],
'check':['CheckOutline','CheckCircleOutline','CheckCircleFill'],'clock':['ClockOutline','AlarmClockOutline'],'alert':['WarningOutline','WarningTriangleOutline'],
'info':['InfoOutline'],'play':['PlayOutline'],'pause':['PauseOutline'],'close':['CloseOutline','CloseFill','CloseCircleFill'],
'settings':['SettingsOutline'],'sliders':['SlidersTwoOutline'],'sun':['LightOutline'],'moon':['DarkOutline'],'palette':['PersonalizationOutline'],
'companion':[],'volume':[],'mute':[],'download':['DownloadOutline'],'shield':['ShieldOutline','WorkspaceWrite','ReadOnly','FullAccess'],
'expand':['FullscreenOutline'],'plugin':['CordisPluginOutline','PluginPinwheelOutline'],'skill':['SkillOutline'],'model':['DataOutline','ApiOutline'],
'agent':['AgentPresetOutline','UsersOutline','UserOutline'],'question':['QuestionOutline'],'plan':['PlanOutline','ChecklistOutline'],'inbox':['QueueOutline'],'git-diff':['CompareSplitOutline']}
def expression(var):
 m=re.search(r'(?<![\w$])'+re.escape(var)+r'\s*=',s)
 if not m:return ''
 a=m.end();depth=0;quote=None;escape=False
 for j in range(a,len(s)):
  c=s[j]
  if quote:
   if escape:escape=False
   elif c=='\\':escape=True
   elif c==quote:quote=None
  elif c in '\"\'`':quote=c
  elif c in '({[':depth+=1
  elif c in ')}]':depth-=1
  elif c in ',;' and depth==0:return s[a:j]
 return ''
def svgexpr(var,depth=0):
 e=expression(var)
 m=re.match(r'^(?:\([^)]*\)|\w+)=>\w+\.jsx\(([\w$]+),\{',e)
 return svgexpr(m.group(1),depth+1) if m and depth<3 else e
leaves={};evidence={};missing=[]
for semantic,names in map.items():
 selectors=[];matched=[]
 for name in names:
  for weight in ['Regular','Medium']:
   n='Icon'+name+weight
   if n not in exports:continue
   expr=svgexpr(exports[n]);paths=re.findall(r'\bd:"([^\"]+)"',expr)
   if not paths:
    const=re.search(r'\bd:([\w$]+)',expr)
    if const:
     raw=expression(const.group(1))
     if raw.startswith(chr(34)): paths=re.findall(r'\bd:"([^\"]+)"','d:'+raw)
   selector=None
   # Include every authored path: a shared outer circle is not a semantic identity.
   if paths:selector='svg'+''.join(':has(path[d='+json.dumps(p)+'])' for p in dict.fromkeys(paths))
   else:
    r=re.search(r'jsx\("rect",\{([^}]+)\}',expr)
    if r:
     attrs=re.findall(r'\b(x|y|width|height|rx):(?:"([0-9.]+)"|([0-9.]+))',r.group(1))
     if attrs:selector='svg:has(rect'+''.join('['+a+'="'+(b or c)+'"]' for a,b,c in attrs)+')'
   if selector:selectors.append(selector);matched.append(n)
 if selectors:leaves[semantic]=list(dict.fromkeys(selectors));evidence[semantic]=matched
 else:missing.append(semantic)
for semantic,classes in {'file-code':['_code_1wejo_8','_html_1wejo_20'],'file-table':['_excel_1wejo_12'],'file-image':['_image_1wejo_24'],'file-text':['_markdown_1wejo_28','_other_1wejo_32','_pdf_1wejo_36','_word_1wejo_48','_ppt_1wejo_40'],'folder':['_folder_1wejo_16']}.items():
 leaves.setdefault(semantic,[]).extend('svg.'+c for c in classes)
leaves.setdefault('stop',[]).append('.JZLxKW_primary > svg:has(> rect[width="10"][height="10"])')
conversation=root/'reports/skin-workspace-v2-interface-2026-11-04/official/dsh-client-ui-conversation/lib/client.js'
composer=conversation.read_text();start=composer.index('className: InputBar_module_css_default.primary,',composer.index('className: InputBar_module_css_default.primary,')+1)
send_path=re.search(r'\bd: "([^"]+)"',composer[start:]).group(1)
leaves.setdefault('send',[]).append('.JZLxKW_primary > svg:has(> path[d='+json.dumps(send_path)+'])')
# Official FileTypeIcon renders language icons without the generic file classes.
# Its rc.5 file-tree leaf is fixed and keeps the original file button and handler.
leaves.setdefault('file-code',[]).append('svg.h_iMMG_fileIcon[viewBox="0 0 20 20"]')
owners={}
for semantic,selectors in leaves.items():
 for selector in selectors:owners.setdefault(selector,[]).append(semantic)
collisions={k:v for k,v in owners.items() if len(set(v))>1}
assert not collisions,collisions
(root/'experiments/dsh-workspace-r2/client/leaves.json').write_text(json.dumps(leaves,ensure_ascii=False,indent=2)+'\n')
(root/'reports/dsh-workspace-r2-2026-11-05/leaf-map-source.json').write_text(json.dumps({'source':str(source.relative_to(root)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'composerSource':str(conversation.relative_to(root)),'composerSha256':hashlib.sha256(conversation.read_bytes()).hexdigest(),'semanticSourceExports':evidence,'mapped':list(leaves),'notHostGlyphsOrOwnedSlots':[x for x in missing if x not in leaves],'publicOwnedIcons':['companion','play','check','close'],'exactSelectorCollisions':collisions,'method':'fixed rc.5 complete SVG path signatures, original composer leaves and actual FileTypeIcon classes; original SVG remains when signature does not match'},ensure_ascii=False,indent=2)+'\n')
print({'mappedSemantics':len(leaves),'selectors':sum(map.__len__() for map in leaves.values()),'notHostGlyphs':[x for x in missing if x not in leaves]})
