"""Uniform, uncropped derivatives for the fixed native 640x360 stage."""
import hashlib,json,subprocess,math
from pathlib import Path
from PIL import Image,ImageChops
import imageio_ffmpeg
from fractions import Fraction
ROOT=Path(__file__).resolve().parents[2];LAB=ROOT/'.local/dsh-pet-geometry-20261104';OUT=LAB/'assets';OUT.mkdir(parents=True,exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe()
manifest=json.loads((LAB/'input-asset-manifest.json').read_text());assets={a['id']:a for a in manifest['assets']}
legacy='designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready/assets/'
clips=[('legacy-idle',legacy+'idle-a2.webm','legacy071',True),('legacy-react',legacy+'react-a2.webm','legacy071',False),('master-idle','designs/dsh-skin-assets-v3/assets/motion/idle-breathe.webm','master04',True),('master-react','designs/dsh-skin-assets-v3/assets/motion/react-tilt.webm','master04',False)]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
decoded={};profiles={};records={}
for name,file,group,loop in clips:
 src=ROOT/file;folder=OUT/(name+'-source-frames');folder.mkdir(exist_ok=True)
 reader=imageio_ffmpeg.read_frames(str(src),pix_fmt='rgba',input_params=['-c:v','libvpx-vp9']);info=next(reader);reader.close();fps=str(Fraction(str(info['fps'])).limit_denominator(100000));size=tuple(info['size'])
 if not (folder/'0001.png').exists():subprocess.run([FF,'-loglevel','error','-c:v','libvpx-vp9','-i',str(src),'-vsync','0','-pix_fmt','rgba',str(folder/'%04d.png')],check=True)
 frames=sorted(folder.glob('*.png'));fps=str(Fraction(len(frames),1)/Fraction(str(info['duration'])));union=None
 for f in frames:
  a=Image.open(f).convert('RGBA').getchannel('A');union=a if union is None else ImageChops.lighter(union,a)
 decoded[name]={'frames':frames,'fps':fps,'size':size,'source':file,'sourceSha256':sha(src),'loop':loop,'group':group};profiles.setdefault(group,{'alpha':None,'size':size});old=profiles[group]['alpha'];profiles[group]['alpha']=union if old is None else ImageChops.lighter(old,union)
for group,p in profiles.items():
 w,h=p['size'];bbox=p['alpha'].getbbox();ground=assets['master-04']['anchors']['ground'] if group=='master04' else [(bbox[0]+bbox[2])/2,bbox[3]-1];gx,gy=ground
 scale=min((320-8)/gx,(640-8-320)/(w-gx),(330-8)/gy,(360-8-330)/(h-gy) if h>gy else float('inf'));tx,ty=320-scale*gx,330-scale*gy
 corners=[[tx,ty],[tx+w*scale,ty+h*scale]];assert corners[0][0]>=7.999 and corners[0][1]>=7.999 and corners[1][0]<=632.001 and corners[1][1]<=352.001
 reference_height=350 if group=='master04' else 195
 p.update({'sourceSize':[w,h],'sourceAlphaBounds':bbox,'sourceGround':ground,'scale':scale,'translation':[tx,ty],'mappedImageBounds':corners,'canvas':[640,360],'ground':[320,330],'defaultSize':reference_height*640/(scale*h),'referenceImageHeight':reference_height,'mirrorSafety':'unreviewed; no mirror enabled in this fixture','anchorBasis':'manifest visual estimate' if group=='master04' else 'derived alpha floor; original defaults preserved separately','hitAlpha':Image.new('L',(640,360))})
for name,clip in decoded.items():
 p=profiles[clip['group']];scale=p['scale'];tx,ty=p['translation'];folder=OUT/(name+'-normalized-frames');folder.mkdir(exist_ok=True);first=None;last=None;border_max=0
 for i,file in enumerate(clip['frames']):
  source=Image.open(file).convert('RGBA');mapped=source.convert('RGBa').transform((640,360),Image.Transform.AFFINE,(1/scale,0,-tx/scale,0,1/scale,-ty/scale),resample=Image.Resampling.BICUBIC).convert('RGBA');mapped.save(folder/f'{i+1:04d}.png');alpha=mapped.getchannel('A');p['hitAlpha']=ImageChops.lighter(p['hitAlpha'],alpha);border_max=max(border_max,max(alpha.crop((0,0,640,1)).getextrema()),max(alpha.crop((0,359,640,360)).getextrema()));first=mapped if first is None else first;last=mapped
 out=OUT/(name+'.webm');subprocess.run([FF,'-loglevel','error','-y','-framerate',clip['fps'],'-i',str(folder/'%04d.png'),'-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','24','-threads','4','-deadline','good','-cpu-used','4','-auto-alt-ref','0',str(out)],check=True)
 decoded_out=OUT/(name+'-decoded-frames');decoded_out.mkdir(exist_ok=True);subprocess.run([FF,'-loglevel','error','-c:v','libvpx-vp9','-i',str(out),'-vsync','0','-pix_fmt','rgba',str(decoded_out/'%04d.png')],check=True)
 for frame in sorted(decoded_out.glob('*.png')):p['hitAlpha']=ImageChops.lighter(p['hitAlpha'],Image.open(frame).convert('RGBA').getchannel('A'))
 assert border_max==0
 records[name]={k:v for k,v in clip.items() if k!='frames'};records[name].update({'file':str(out.relative_to(ROOT)),'frames':len(clip['frames']),'seconds':len(clip['frames'])/float(Fraction(clip['fps'])),'size':[640,360],'sha256':sha(out),'boundaryAlphaMax':border_max,'sourceUnchanged':sha(ROOT/clip['source'])==clip['sourceSha256']});first.save(OUT/(name+'-first.png'))
for group,p in profiles.items():
 mask=p['hitAlpha'].point(lambda v:255 if v>16 else 0);p['hitBounds']=mask.getbbox();rows=[]
 for y in range(360):
  values=[mask.getpixel((x,y))>0 for x in range(640)];spans=[];start=None
  for x,on in enumerate(values+[False]):
   if on and start is None:start=x
   elif not on and start is not None:spans.extend([start,x]);start=None
  rows.append(spans)
 p['hitRows']=rows;p['bodyProbe']=[320,170];p['transparentProbe']=[p['hitBounds'][0]+12,306];assert mask.getpixel(tuple(p['bodyProbe']))>0;assert mask.getpixel(tuple(p['transparentProbe']))==0;assert p['hitBounds'][0]<p['transparentProbe'][0]<p['hitBounds'][2] and p['hitBounds'][1]<p['transparentProbe'][1]<p['hitBounds'][3]
 p['maskBasis']='union of normalized and encoded-then-decoded idle/react frames, alpha >16; conservative stationary interaction silhouette';p.pop('alpha');p.pop('hitAlpha');p.pop('size')
for name in ['book','cup']:
 a=assets[name];src=ROOT/a['file'];(OUT/(name+'.png')).write_bytes(src.read_bytes())
baseline=json.loads((ROOT/'reports/dsh-pet-geometry-2026-11-04/baseline.json').read_text())
result={'fixtureOnly':True,'runtimeContract':False,'sourceReferences':{'legacy071':{'id':'archive-warm-whale','version':'0.7.1','contentKey':baseline['legacyContentKey']},'master04':{'manifestSnapshot':'input-asset-manifest.json','manifestSha256':sha(LAB/'input-asset-manifest.json'),'layoutSnapshot':'input-scene-layout.json','layoutSha256':sha(LAB/'input-scene-layout.json')}},'canvas':[640,360],'feetY':330,'method':'single uniform affine scale and transparent padding; no source crop, no body reshaping','profiles':profiles,'animations':records,'props':{name:{k:assets[name].get(k) for k in ['file','prepared_size','anchors','sha256','anchor_basis']} for name in ['book','cup']},'placementReference':'designs/dsh-skin-assets-v3/scene-layout.json; respond board, side props, no hand attachment','excluded':['single-frame walk/run/climb are not played or translated as gaits','side-lying style drift','unreviewed mirror','new climbing physics'],'sourceDefaultsUnchanged':True}
result['derivedKey']=hashlib.sha256(json.dumps(result,sort_keys=True,separators=(',',':')).encode()).hexdigest()
(OUT/'content-map.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'derivedClips':len(records),'profiles':{k:{x:p[x] for x in ['sourceSize','scale','defaultSize','hitBounds']} for k,p in profiles.items()},'sourceFilesOverwritten':False}))
