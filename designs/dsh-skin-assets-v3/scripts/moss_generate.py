"""One explicit MOSS image request. Credentials and raw response stay in .local.

Run with the existing project Python; request JSON contains no credentials.
An existing response resumes only its download; an unknown request is never reposted.
"""
from pathlib import Path
import argparse, datetime, hashlib, json, os, sys, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'designs/dsh-skin-assets-v3'
PRIVATE = ROOT / '.local/moss-assets-v3'

def save(path, value, private=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    if private:
        os.chmod(path, 0o600)

def run():
    parser = argparse.ArgumentParser()
    parser.add_argument('request', type=Path)
    parser.add_argument('--id', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    args.request = args.request.resolve()
    if not args.id.replace('-', '').replace('_', '').isalnum():
        raise ValueError('Use a plain request id')
    env = {}
    for line in (ROOT / '.local/moss.env').read_text().splitlines():
        if '=' not in line or line.lstrip().startswith('#'):
            continue
        k, v = line.removeprefix('export ').split('=', 1)
        env[k.strip()] = v.strip().strip('\"\'')
    payload = json.loads(args.request.read_text())
    allowed = {'model', 'prompt', 'negative_prompt', 'size', 'n', 'seed',
               'prompt_enhance', 'response_format', 'output_watermark'}
    if set(payload) - allowed or payload['n'] != 1:
        raise ValueError('Request must use documented fields and one image')
    output = (OUT / args.output).resolve()
    if not output.is_relative_to(OUT.resolve()):
        raise ValueError('Output must remain inside candidate directory')
    receipt = PRIVATE / (args.id + '.json')
    if receipt.exists():
        saved = json.loads(receipt.read_text())
        if saved.get('state') != 'response-received':
            print(json.dumps({'id':args.id,'state':saved.get('state'),
                              'action':'No repeated POST; reconcile original request'}, ensure_ascii=False))
            return 2
        response = saved['response']
    else:
        start = time.time()
        save(receipt, {'id':args.id,'state':'submitted-unknown','requestFile':str(args.request),
                       'submittedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}, True)
        print(json.dumps({'id':args.id,'state':'submitted-once','model':payload['model'],
                          'size':payload['size'],'seed':payload['seed']}), flush=True)
        base = env.get('MOSS_API_BASE_URL','https://api.mosi.cn').rstrip('/')
        if base.endswith('/v1'):
            base = base[:-3]
        request = Request(base + '/v1/images/generations',
                          data=json.dumps(payload).encode(),
                          headers={'Authorization':'Bearer '+env['MOSS_API_KEY'],
                                   'Content-Type':'application/json'}, method='POST')
        try:
            with urlopen(request, timeout=900) as result:
                response = json.load(result)
            save(receipt, {'id':args.id,'state':'response-received','elapsedSeconds':round(time.time()-start,2),
                           'response':response}, True)
        except HTTPError as e:
            raw = e.read().decode('utf-8', errors='replace')
            save(receipt, {'id':args.id,'state':'http-error','httpStatus':e.code,'responseBody':raw}, True)
            print(json.dumps({'id':args.id,'state':'http-error','httpStatus':e.code}), flush=True)
            return 2
        except Exception as e:
            print(json.dumps({'id':args.id,'state':'unknown','errorType':type(e).__name__,
                              'action':'No automatic POST retry'}), flush=True)
            return 2
    url = response['data'][0]['url']
    if not url.startswith('https://'):
        raise ValueError('Expected HTTPS image result')
    output.parent.mkdir(parents=True, exist_ok=True)
    # A separate unauthenticated GET: the API bearer is never sent to the image CDN.
    with urlopen(Request(url, headers={'User-Agent':'DSH-project-material-candidate'}), timeout=120) as result:
        blob = result.read()
    if not blob.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Expected actual PNG bytes')
    output.write_bytes(blob)
    public = {'id':args.id,'source':'MOSS text-to-image','model':payload['model'],
              'request':str(args.request.relative_to(ROOT)),'seed':payload['seed'],
              'sizeRequested':payload['size'],'usage':response.get('usage'),
              'image':str(output.relative_to(OUT)),'sha256':hashlib.sha256(blob).hexdigest(),
              'bytes':len(blob),'referenceImageInput':False,'nativeAlphaRequested':False}
    save(OUT / 'identity' / (args.id + '-provenance.json'), public)
    print(json.dumps(public, ensure_ascii=False), flush=True)
    return 0

if __name__ == '__main__':
    sys.exit(run())
