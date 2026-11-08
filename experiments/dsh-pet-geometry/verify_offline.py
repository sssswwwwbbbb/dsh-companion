"""Necessary resource/alpha/configuration checks. Native UI stays a separate gate."""
from pathlib import Path
from fractions import Fraction
import hashlib,json
from PIL import Image
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];LAB=ROOT/'.local/dsh-pet-geometry-20261104';REPORT=ROOT/'reports/dsh-pet-geometry-2026-11-04'
data=json.loads((LAB/'assets/content-map.json').read_text());baseline=json.loads((REPORT/'baseline.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[];details=[]
def check(name,ok,**detail):checks.append({'name':name,'pass':bool(ok),**detail})
for name,v in data['animations'].items():
 profile=data['profiles'][v['group']];frames=sorted((LAB/'assets'/(name+'-decoded-frames')).glob('*.png'));border_max=0;outside_mask=0;bottoms=[]
 for file in frames:
  image=Image.open(file).convert('RGBA');alpha=image.getchannel('A');assert image.size==(640,360)
  border_max=max(border_max,max(alpha.crop((0,0,640,1)).getextrema()),max(alpha.crop((0,359,640,360)).getextrema()),max(alpha.crop((0,0,1,360)).getextrema()),max(alpha.crop((639,0,640,360)).getextrema()))
  mask=alpha.point(lambda x:255 if x>16 else 0);bbox=mask.getbbox();bottoms.append(bbox[3])
  # Compare actual decoded opaque pixels to the supplied input silhouette.
  for y in range(bbox[1],bbox[3]):
   spans=profile['hitRows'][y]
   for x in range(bbox[0],bbox[2]):
    if mask.getpixel((x,y)) and not any(spans[i]<=x<spans[i+1] for i in range(0,len(spans),2)):outside_mask+=1
 streams=[]
 for kind,file in [('source',ROOT/v['source']),('derived',ROOT/v['file'])]:
  reader=imageio_ffmpeg.read_frames(str(file),pix_fmt='rgba',input_params=['-c:v','libvpx-vp9']);m=next(reader);reader.close();streams.append({'kind':kind,'size':m['size'],'fps':m['fps'],'duration':m['duration']})
 source_intact=sha(ROOT/v['source'])==v['sourceSha256'];correct_timing=streams[0]['fps']==streams[1]['fps'] and abs(streams[0]['duration']-streams[1]['duration'])<.002
 # Lossy VP9 alpha can leave a 1-2/255 fringe. Raw padding must be exactly
 # transparent; decoded borders must contain no body pixel at the declared >16 threshold.
 check(name+'-resource-alpha-fit',source_intact and correct_timing and len(frames)==v['frames'] and v['boundaryAlphaMax']==0 and border_max<=16 and outside_mask==0,streams=streams,frames=len(frames),rawPaddingBoundaryAlphaMax=v['boundaryAlphaMax'],decodedBoundaryAlphaMax=border_max,bodyAlphaThreshold=16,decodedOpaquePixelsOutsideHitMask=outside_mask,footBottomRange=[min(bottoms),max(bottoms)])
 p=profile;s=p['scale'];gx,gy=p['sourceGround'];tx,ty=p['translation'];details.append({'animation':name,'uniformScale':s,'translation':[tx,ty],'mappedGround':[gx*s+tx,gy*s+ty],'sourceAspect':p['sourceSize'][0]/p['sourceSize'][1],'referenceImageHeight':p['referenceImageHeight'],'defaultNativeSize':round(p['defaultSize']),'displayImageHeight':p['sourceSize'][1]*s*round(p['defaultSize'])/640,'noSourceCrop':True})
geometry_ok=all(abs(d['mappedGround'][0]-320)<1e-7 and abs(d['mappedGround'][1]-330)<1e-7 for d in details)
check('uniform-content-mapping',geometry_ok,profiles=details)
bad=[v['file'] for v in baseline['protectedFiles'] if sha(ROOT/v['file'])!=v['sha256']]
check('captured-inputs-and-accepted-node-preserved',not bad,checked=len(baseline['protectedFiles']),mismatches=bad)
skin=json.loads((ROOT/baseline['legacyRoot']/'skin.json').read_text());check('legacy-key-and-defaults-retained',skin['modules']['pet']==baseline['legacyDefaults'],contentKey=baseline['legacyContentKey'],canvasHeight=skin['modules']['pet']['config']['canvasHeight'],canvasOffsetY=skin['modules']['pet']['config']['canvasOffsetY'],sizeDefault=skin['modules']['pet']['settings']['size']['default'])
review=json.loads((ROOT/baseline['materialReview']).read_text());runtime=[v for v in review['verifiedInputs'] if '/assets/prepared/' in v['file'] or '/assets/motion/' in v['file']];changed=[v['file'] for v in runtime if sha(ROOT/v['file'])!=v['sha256']];check('accepted-twelve-runtime-materials-preserved',len(runtime)==12 and not changed,files=len(runtime),mismatches=changed)
result={'result':'offline-pass-ui-pending' if all(v['pass'] for v in checks) else 'offline-failed','fullNodeAccepted':False,'checks':checks,'passed':sum(v['pass'] for v in checks),'total':len(checks),'nativeVisibleAndInputAcceptance':'pending manual Mac unlock','sourceDefaultsWritten':False,'singleFrameGaitsUsed':False,'realDSHIntegrated':False}
(REPORT/'offline-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'result':result['result'],'passed':result['passed'],'total':result['total'],'failed':[v['name'] for v in checks if not v['pass']]},ensure_ascii=False))
