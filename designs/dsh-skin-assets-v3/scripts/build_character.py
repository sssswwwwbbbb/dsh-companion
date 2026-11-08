"""Prepare a single-source character, real alpha, portraits and reusable rig layers.

Local chroma removal/color finishing is explicitly authorized for this candidate.
The MOSS PNG is preserved. No old character frames are used in the new motion.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'designs/dsh-skin-assets-v3'
S = .26
TX, TY = 256-512*S, 486-1515*S
SIZE = (512,512)

def chroma(im,seed=(512,600)):
    p = np.asarray(im.convert('RGB')).astype(np.float32)
    r,g,b = p[:,:,0],p[:,:,1],p[:,:,2]
    v = np.maximum(r,b)
    a = np.where(g>v+12, np.clip((v+3)/(g+1),0,1),1)
    a[a<.09] = 0
    a[(g>v*1.30+10)&(g>70)]=0
    # Keep edge pixels only near the actual connected character, not green-screen noise.
    connected=Image.fromarray((a>.5).astype('uint8')*255).copy()
    ImageDraw.floodfill(connected,seed,128,thresh=0)
    connected=Image.fromarray((np.asarray(connected)==128).astype('uint8')*255).filter(ImageFilter.MaxFilter(7))
    a*=np.asarray(connected).astype(np.float32)/255
    # Recover edge foreground against the actual green background.
    safe = np.maximum(a,.09)
    p[:,:,0] /= safe
    p[:,:,2] /= safe
    p[:,:,1] = (g-(1-a)*255)/safe
    p = np.clip(p,0,255)
    p[a==0] = 0
    return Image.fromarray(np.dstack((p,a*255)).astype('uint8'))

def finish_hair(im):
    p=np.array(im).astype(np.float32);rgb=p[:,:,:3];r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    yy,xx=np.mgrid[:im.height,:im.width]
    region=(yy<350)|((yy<1040)&((xx<362)|(xx>654)))
    blue=(b>r+12)&(b>g-5)&((r+g+b)>250)&(p[:,:,3]>0)
    eyes=(((xx-469)/37)**2+((yy-241)/27)**2<1)|(((xx-579)/37)**2+((yy-241)/27)**2<1)
    mask=Image.fromarray((region&blue&~eyes).astype('uint8')*255).filter(ImageFilter.GaussianBlur(1))
    w=np.asarray(mask).astype(np.float32)/255*.78
    y=rgb@np.array([.2126,.7152,.0722])
    palette=np.stack([np.interp(y,[0,130,255],[25,76,185]),
                      np.interp(y,[0,130,255],[38,93,207]),
                      np.interp(y,[0,130,255],[63,131,234])],axis=2)
    p[:,:,:3]=rgb*(1-w[:,:,None])+palette*w[:,:,None]
    return Image.fromarray(np.clip(p,0,255).astype('uint8')),mask

def polygon_layer(im, points, skin_out=False):
    m=Image.new('L',im.size);ImageDraw.Draw(m).polygon(points,fill=255)
    a=np.array(m).astype(np.float32)/255
    if skin_out:
        p=np.asarray(im);skin=(p[:,:,0]>p[:,:,1]*1.1)&(p[:,:,0]>p[:,:,2]*1.08)
        yy=np.arange(im.height)[:,None];a[(skin)&(yy>450)]=0
    a=(a*np.asarray(im.getchannel('A'))).astype('uint8')
    result=im.copy();result.putalpha(Image.fromarray(a));return result

def fit_canvas(layer):
    return layer.transform(SIZE,Image.Transform.AFFINE,(1/S,0,-TX/S,0,1/S,-TY/S),Image.Resampling.BICUBIC)

def main():
    raw=Image.open(OUT/'assets/character/master-01-source.png')
    rgba=chroma(raw);rgba,hair_mask=finish_hair(rgba)
    rgba.save(OUT/'assets/character/character-master.png')
    hair_mask.save(OUT/'review/hair-finishing-mask.png')
    fit_canvas(rgba).save(OUT/'assets/character/character.png')
    portrait=rgba.crop((290,0,720,485))
    portrait.thumbnail((384,432));portrait.save(OUT/'assets/character/portrait.png')
    layers={
      'head':[(292,0),(708,0),(715,285),(673,369),(610,426),(590,344),(457,344),(418,426),(337,367),(300,270)],
      'hair-left':[(320,120),(364,334),(347,642),(305,791),(351,913),(436,959),(425,1004),(320,984),(244,915),(231,773),(270,560),(300,350)],
      'hair-right':[(664,130),(709,330),(733,517),(749,696),(793,887),(728,994),(641,1016),(617,957),(665,852),(671,636),(648,338)],
      'torso':[(418,340),(609,340),(648,393),(628,490),(626,591),(663,719),(709,925),(636,956),(402,956),(325,923),(375,733),(420,590),(416,466),(388,400)],
      'arm-l':[(361,385),(418,410),(413,565),(398,631),(393,662),(325,658),(344,602),(347,476)],
      'forearm-l':[(325,642),(394,644),(391,682),(350,811),(309,811),(328,695)],
      'hand-l':[(306,789),(352,789),(353,842),(345,879),(326,894),(305,886),(294,854),(304,810)],
      'arm-r':[(623,406),(662,386),(683,461),(696,608),(706,663),(638,669),(627,598),(618,487)],
      'forearm-r':[(638,644),(706,638),(711,683),(730,819),(687,819),(652,708)],
      'hand-r':[(684,790),(728,790),(741,844),(737,876),(722,897),(702,888),(687,871),(681,837)],
      'thigh-l':[(410,937),(501,937),(505,1165),(413,1165)],
      'shin-l':[(413,1141),(506,1141),(501,1431),(413,1431)],
      'foot-l':[(410,1397),(504,1397),(509,1530),(403,1530)],
      'thigh-r':[(523,937),(626,937),(626,1165),(524,1165)],
      'shin-r':[(523,1141),(626,1141),(626,1431),(522,1431)],
      'foot-r':[(521,1397),(630,1397),(635,1530),(515,1530)]
    }
    target=OUT/'assets/rig';target.mkdir(exist_ok=True)
    for name,poly in layers.items():
        layer=polygon_layer(rgba,poly,skin_out=name.startswith('hair') or name=='torso')
        if name.startswith('hair'):
            p=np.array(layer);rgb=p[:,:,:3].astype(np.int16)
            # Hair-only backing: never keep stationary pink hands or white cuffs.
            keep=(rgb[:,:,2]>rgb[:,:,0]+8)&(rgb[:,:,2]>rgb[:,:,1]-5)&(rgb.mean(axis=2)>76)
            p[:,:,3]=(p[:,:,3]*keep).astype('uint8');layer=Image.fromarray(p)
        if name.startswith('thigh'):
            # Extend opaque stocking texture under the skirt to the hip joint.
            bx=420 if name.endswith('l') else 534
            patch=rgba.crop((bx,956,bx+66,991)).resize((66,100),Image.Resampling.BICUBIC)
            layer.alpha_composite(patch,(bx,870))
        fit_canvas(layer).save(target/(name+'.png'))
    (OUT/'identity/rig-layout.json').write_text(json.dumps({
      'source':'assets/character/character-master.png','canvas':[512,512],
      'scale':S,'offset':[TX,TY],'groundY':486,
      'headPivot':[512,346],'hip':[512,885],
      'joints':{'shoulder-l':[374,410],'elbow-l':[362,650],'wrist-l':[330,802],
                'shoulder-r':[647,410],'elbow-r':[674,650],'wrist-r':[708,812],
                'hip-l':[461,895],'knee-l':[454,1153],'ankle-l':[453,1416],
                'hip-r':[571,895],'knee-r':[568,1154],'ankle-r':[568,1416]},
      'layers':list(layers),'method':'one master, extracted RGBA parts, local pixel-seal under skirt; no independent action-frame generation'
    },ensure_ascii=False,indent=2)+'\n')
    a=np.asarray(rgba.getchannel('A'));bbox=rgba.getbbox()
    report={'sourceSize':raw.size,'mode':rgba.mode,'alphaExtrema':[int(a.min()),int(a.max())],
            'transparentPixels':int((a==0).sum()),'semiTransparentPixels':int(((a>0)&(a<255)).sum()),
            'foregroundBounds':bbox,'sourceTouchesCanvasEdge':bool(bbox[0]==0 or bbox[1]==0 or bbox[2]==raw.width or bbox[3]==raw.height),
            'nativeAlphaFromMoss':False,'alphaMethod':'local chroma key and edge foreground recovery',
            'hairFinishing':'masked luma-preserving silver-blue palette alignment; face and eye texture preserved',
            'oldCharacterFramesUsed':False,'masterSha256':hashlib.sha256((OUT/'assets/character/character-master.png').read_bytes()).hexdigest()}
    (OUT/'review/character-preparation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
