"""Read-only video measurement and lossless frame extraction for design QA.
Requires Pillow and imageio-ffmpeg; never edits source media.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib, io, json, re, subprocess
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[3]
DESIGN = ROOT / "designs/dsh-skin-v1"
REPORT = ROOT / "reports/first-skin"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def info(path):
    p = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    s = p.stderr
    dim = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", s)
    dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", s)
    fps = re.search(r"([\d.]+) fps", s)
    return {"width":int(dim[1]), "height":int(dim[2]),
            "durationSeconds":int(dur[1])*3600+int(dur[2])*60+float(dur[3]),
            "fps":float(fps[1]) if fps else None,
            "alphaDeclared":bool(re.search(r"alpha_mode\s*:\s*1",s,re.I)),
            "audioPresent":bool(re.search(r"Stream .*Audio:",s))}

def frame(path, at):
    args=[FFMPEG, "-loglevel", "error"]
    if path.suffix==".webm": args+=["-c:v","libvpx-vp9"]
    args+=["-i",str(path),"-ss",str(at),"-frames:v","1","-f","image2pipe","-vcodec","png","-"]
    data=subprocess.run(args,capture_output=True,check=True).stdout
    return Image.open(io.BytesIO(data)).convert("RGBA")

results=[]
for path in sorted((ROOT/"designs/dsh-companion-v1/assets/whale-maid").glob("*.webm")):
    meta=info(path)
    first=frame(path,0)
    last=frame(path,max(0,meta["durationSeconds"]-0.09))
    samples=[]
    for at,img in [(0,first),(5,frame(path,5)),(meta["durationSeconds"]-0.09,last)]:
        alpha=img.getchannel("A")
        bbox=alpha.point(lambda x:255 if x>16 else 0).getbbox()
        histogram=alpha.histogram()
        samples.append({"time":round(at,3),"alphaBounds":bbox,"transparentFraction":round(histogram[0]/(img.width*img.height),4),
                        "edgeAlphaMax":max(alpha.crop((0,0,img.width,1)).getextrema()[1],alpha.crop((0,img.height-1,img.width,img.height)).getextrema()[1],alpha.crop((0,0,1,img.height)).getextrema()[1],alpha.crop((img.width-1,0,img.width,img.height)).getextrema()[1])})
    union=ImageChops.lighter(first.getchannel("A"),last.getchannel("A")).point(lambda x:255 if x>16 else 0)
    diff=ImageChops.difference(first,last)
    delta=sum(ImageStat.Stat(diff,mask=union).mean[:3])/3
    rec={"name":path.stem,**meta,"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
         "samples":samples,"firstLastRgbMeanDifference":round(delta,2),
         "provisionalAnchor":[0.5,max(s["alphaBounds"][3] for s in samples if s["alphaBounds"])/meta["height"]],
         "loopReview":"needs-visual-review" if delta>12 else "low-frame-difference-not-proof-of-seamless-loop"}
    results.append(rec)
    if path.stem in ["idle","react","greet"]:
        first.save(DESIGN/"assets/whale-maid"/(path.stem+"-poster.png"))
scan=DESIGN/"assets/reference/whale-girl-scan.mp4"
scanmeta={**info(scan),"bytes":scan.stat().st_size,"sha256":hashlib.sha256(scan.read_bytes()).hexdigest()}
for at,name in [(0,"scan-closed"),(3.5,"scan-middle"),(6.8,"scan-poster")]:
    frame(scan,at).save(DESIGN/"assets/reference"/(name+".png"))
REPORT.mkdir(parents=True,exist_ok=True)
(REPORT/"media-audit.json").write_text(json.dumps({"date":"2026-11-03","scope":"metadata and sampled alpha/loop measurements; not full animation approval","decoder":"imageio-ffmpeg/libvpx-vp9","pet":results,"scan":scanmeta},ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"petCount":len(results),"scan":scanmeta,"measurementReport":"reports/first-skin/media-audit.json"},ensure_ascii=False))
