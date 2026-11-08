"""Build only data/resources supported by the frozen v0.1 foundation contract."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib
root=Path(__file__).resolve().parents[1]
pack=root/"content/archive-warm-whale"
(pack/"assets").mkdir(parents=True,exist_ok=True)
im=Image.new("RGBA",(1440,900),(0,0,0,0));draw=ImageDraw.Draw(im)
# Original geometric pattern, transparent central reading zone. No character wallpaper.
for x in range(0,1440,48):
    if x<240 or x>1200: draw.line((x,0,x,900),fill=(125,120,104,255),width=1)
for y in range(0,900,48):
    draw.line((0,y,240,y),fill=(125,120,104,255),width=1)
    draw.line((1200,y,1440,y),fill=(125,120,104,255),width=1)
f=pack/"assets/archive-grid.png";im.save(f,optimize=True);data=f.read_bytes()
pairs={
"bg-base":("f4f1e9","202423"),
"bg-document-preview":("fffdf8","292e2c"),
"bg-document-selection":("f9e9da","443326"),
"bg-layer-1":("fffdf8","292e2c"),
"bg-layer-2":("f4f1e9","202423"),
"bg-layer-3":("ffffff","303633"),
"bg-overlay":("ffffff","303633"),
"bg-skeleton":("ece8de","353b37"),
"bg-multi-select":("f9e9da","443326"),
"border-l1":("ece8de","353b37"),
"border-l2":("d9d4c7","494f46"),
"border-l3":("a9a598","697161"),
"border-l4":("8d8b7e","899180"),
"label-primary":("2b302c","f1efe6"),
"label-primary-bluish":("35677e","91c3d7"),
"label-primary-dimmed":("68685e","b6b9ac"),
"label-primary-inverted":("fffdf8","202423"),
"label-secondary":("68685e","b6b9ac"),
"label-tertiary":("68685e","b6b9ac"),
"label-caption":("68685e","b6b9ac"),
"label-document-preview":("2b302c","f1efe6"),
"menu-icon":("68685e","b6b9ac"),
"menu-group-header-fill":("f4f1e9","202423"),
"state-business-primary":("a54c19","f2ab71"),
"state-business-tertiary":("f9e9da","443326"),
"state-error-primary":("a0372b","f4a99a"),
"state-error-secondary":("fbece7","492c28"),
"state-success-primary":("3b6751","9cc7ab"),
"state-success-secondary":("e8f0e9","2a3b30"),
"state-warn-primary":("a54c19","f2ab71"),
"state-warn-label":("a54c19","f2ab71"),
"state-warn-secondary":("f9e9da","443326"),
"state-idle-primary":("68685e","b6b9ac"),
"scrollbar-bg-l1":("d9d4c7","494f46"),
"scrollbar-hover-l1":("8d8b7e","899180"),
"toast-bg":("2b302c","f1efe6"),
"toast-label":("fffdf8","202423")
}
tokens={"--dsw-alias-"+k:{"light":"#"+v[0],"dark":"#"+v[1]} for k,v in pairs.items()}
specific={
"bubble":("ece8de","353b37"),
"bubble-highlight":("f9e9da","443326"),
"input-major":("fffdf8","292e2c"),
"menu":("ffffff","303633"),
"selector":("f4f1e9","202423"),
"sidebar-fill":("f4f1e9","202423"),
"sidebar-nav-item-active":("f9e9da","443326"),
"sidebar-nav-item-active-accent":("a54c19","f2ab71"),
"sidebar-nav-item-hover":("ece8de","353b37")
}
tokens.update({"--dsw-specific-"+k:{"light":"#"+v[0],"dark":"#"+v[1]} for k,v in specific.items()})
manifest={
"formatVersion":2,"id":"archive-warm-whale","version":"0.1.0","name":"档案暖白 · 鲸鱼娘",
"description":"本地接入候选：暖白/夜间颜色、自带静态背景、复用现有鲸鱼娘桌宠。未包含新扫描开场或工作状态反馈；主题在管理页撤下。",
"dshVersions":["0.2.1-rc.5"],
"assets":{"archive-grid":{"path":"assets/archive-grid.png","mime":"image/png","sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data),"width":1440,"height":900,"alpha":True,"source":"Original geometric grid authored in checks/build-content.py","license":"Project-authored; local integration candidate. No distribution license assigned."}},
"modules":{
"theme":{"interfaceVersion":1,"configVersion":1,"required":True,"config":{"tokens":tokens,"background":"archive-grid"},"settings":{"backgroundOpacity":{"label":"档案背景浓度（0 为关闭）","default":0.04}}},
"pet":{"interfaceVersion":1,"configVersion":1,"required":False,"config":{"builtinPack":"whale-maid-demo","profile":"gentle","autonomous":False,"followMouse":False},"settings":{"size":{"label":"桌宠大小（百分比）","default":100}}}
}}
(pack/"skin.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
print("Built",len(tokens),"color tokens and",len(data),"background bytes. Built-in pet reference only.")
