from pathlib import Path
from PIL import Image,ImageDraw,ImageChops
import json,math
root=Path(__file__).resolve().parents[2];lab=root/'.local/dsh-walk-native-20261105';report=root/'reports/dsh-walk-native-2026-11-05';registry=json.loads((lab/'backend-template/runtime-candidates.json').read_text());g=next(e['geometry'] for e in registry['contents'].values() if e['group']=='master');cal=json.loads((report/'calibration-analysis.json').read_text())
mask=Image.new('L',(640,360));draw=ImageDraw.Draw(mask)
for y,row in enumerate(g['hitRows']):
 for i in range(0,len(row),2):draw.line((row[i],y,row[i+1]-1,y),fill=255)
bodyTop=cal['walkBodyTopMedian']*cal['scale']+cal['translation'][1];bounds=[]
for f in sorted((lab/'walk-encoded-frames').glob('*.png')):
 im=Image.open(f).convert('RGBA');a=im.getchannel('A');bounds.append(a.point(lambda v:255 if v>224 else 0).getbbox());small=a.resize((640,360),Image.Resampling.LANCZOS).point(lambda v:255 if v>16 else 0)
 # Narrow feathering above the stable crown is presentation, not a collision body.
 d=ImageDraw.Draw(small);d.rectangle((0,0,639,math.floor(bodyTop)-1),fill=0)
 pix=list(small.getdata())
 for y in range(360):
  if sum(v>0 for v in pix[y*640:(y+1)*640])<6:d.line((0,y,639,y),fill=0)
 mask=ImageChops.lighter(mask,small)
rows=[];px=list(mask.getdata())
for y in range(360):
 row=[];inside=False
 for x,v in enumerate(px[y*640:(y+1)*640]+[0]):
  if bool(v)!=inside:row.append(x);inside=bool(v)
 rows.append(row)
b=mask.getbbox();g['hitRows']=rows;g['hitBounds']=list(b);g['maskBasis']='Conservative union of accepted idle/react silhouette and actual encoded walk; stable-crown cutoff excludes narrow top feathering; one fixed mask for all walk frames.'
(report/'walk-fixed-geometry.json').write_text(json.dumps({'geometry':g,'walkStableCrownLogical':bodyTop,'actualWalkOpaqueBounds':bounds,'fixedSize':g['defaultSize'],'fixedLogicalGround':g['ground'],'pixelDensity':3,'perFrameScaleOrRootAdjustment':False},ensure_ascii=False,indent=2)+'\n');mask.save(report/'walk-body-mask.png');print(json.dumps({'maskBounds':b,'walkOpaqueGroundYRange':[min(v[3] for v in bounds)/3,max(v[3] for v in bounds)/3],'fixedBodyCrown':bodyTop}))
