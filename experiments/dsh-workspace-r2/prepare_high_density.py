"""Three source pixels per logical stage unit, from original1024 media only."""
from pathlib import Path
from PIL import Image
import json,hashlib,subprocess
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[2]
LAB=ROOT/'.local/dsh-workspace-r2-20261105'
OUT=LAB/'quality-high-density';OUT.mkdir(exist_ok=True)
REPORT=ROOT/'reports/dsh-workspace-r2-2026-11-05'
FF=imageio_ffmpeg.get_ffmpeg_exe()
geometry=json.loads((LAB/'backend-template/runtime-candidates.json').read_text())
profile=next(e['geometry'] for e in geometry['contents'].values() if e['group']=='master')
DENSITY=3;canvas=(640*DENSITY,360*DENSITY)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
records=[]
for name,source,seconds in [('master-idle','idle-breathe.webm',2.5),('master-react','react-tilt.webm',1.5)]:
 original=ROOT/'designs/dsh-skin-assets-v3/assets/motion'/source
 frames=OUT/(name+'-source');frames.mkdir(exist_ok=True)
 subprocess.run([FF,'-loglevel','error','-y','-c:v','libvpx-vp9','-i',str(original),'-vsync','0','-pix_fmt','rgba',str(frames/'%04d.png')],check=True)
 normalized=OUT/(name+'-high');normalized.mkdir(exist_ok=True)
 scale=profile['scale']*DENSITY;tx,ty=[v*DENSITY for v in profile['translation']]
 files=sorted(frames.glob('*.png'))
 for i,f in enumerate(files):
  im=Image.open(f).convert('RGBA');assert im.size==(499,1024)
  mapped=im.convert('RGBa').transform(canvas,Image.Transform.AFFINE,(1/scale,0,-tx/scale,0,1/scale,-ty/scale),resample=Image.Resampling.BICUBIC).convert('RGBA')
  mapped.save(normalized/f'{i+1:04d}.png')
 out=OUT/(name+'.webm')
 subprocess.run([FF,'-loglevel','error','-y','-framerate','24','-i',str(normalized/'%04d.png'),'-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','16','-threads','4','-deadline','good','-cpu-used','4','-auto-alt-ref','0',str(out)],check=True)
 assert out.stat().st_size<=16*1024*1024
 decoded=OUT/(name+'-readback.png')
 subprocess.run([FF,'-loglevel','error','-y','-c:v','libvpx-vp9','-ss','1.18','-i',str(out),'-frames:v','1','-pix_fmt','rgba',str(decoded)],check=True)
 im=Image.open(decoded).convert('RGBA');alpha=im.getchannel('A');bounds=alpha.point(lambda n:255 if n>16 else 0).getbbox()
 records.append({'name':name,'source':str(original.relative_to(ROOT)),'sourceSha256':sha(original),'output':str(out.relative_to(ROOT)),'sha256':sha(out),'bytes':out.stat().st_size,'size':list(canvas),'logicalCanvas':[640,360],'density':DENSITY,'frames':len(files),'fps':24,'seconds':seconds,'readbackAt':1.18,'readback':str(decoded.relative_to(ROOT)),'alphaBounds':bounds,'alphaVisibleHeight':bounds[3]-bounds[1],'sourceGroundLogical':profile['ground'],'geometryChanged':False,'pixelTransform':{'scale':scale,'translation':[tx,ty]},'old360UsedAsInput':False})
 print(json.dumps(records[-1]),flush=True)
(REPORT/'high-density-media.json').write_text(json.dumps({'basis':'Original499x1024 -> same uniform affine transform at3x density -> VP9-alpha CRF16; logical geometry unchanged','records':records},ensure_ascii=False,indent=2)+'\n')
