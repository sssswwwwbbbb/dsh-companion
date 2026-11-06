import tokens from './theme-tokens.json' with { type: 'json' };
export const clone = value => structuredClone(value);
export function fail(code, field = '') { throw Object.assign(new Error(code + (field ? ': ' + field : '')), {code, field}); }
export const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const id = x => typeof x === 'string' && /^[a-z][a-z0-9-]{2,63}$/.test(x) && !['constructor','prototype','__proto__'].includes(x);
const own = (x,k) => Object.hasOwn(x,k);
export function keys(x, allowed, field) {
  if (!object(x) || Object.keys(x).some(k => !allowed.includes(k))) fail('SKIN_FIELDS_INVALID', field);
}
const num = (x,min,max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
export const animationSlots = ['idle','look','walk','run','stretch','eat','play','greet','react','sleep-in','sleep','wake'];
const color = x => typeof x === 'string' && /^#[a-fA-F0-9]{6}(?:[a-fA-F0-9]{2})?$/.test(x);
const themeTokens = new Set(tokens);
const tokenMap = x => object(x) && Object.keys(x).length > 0 && Object.keys(x).length <= 80 && Object.entries(x).every(([k,v]) => themeTokens.has(k) && object(v) && Object.keys(v).length === 2 && color(v.light) && color(v.dark));
const clips = x => object(x) && own(x,'idle') && Object.keys(x).length <= 12 && Object.keys(x).every(k => {
  if(!animationSlots.includes(k))return false;
  const a=x[k];return object(a) && Object.keys(a).every(k=>['asset','seconds','loop'].includes(k)) && id(a.asset) && num(a.seconds,.1,60) && typeof a.loop === 'boolean';
});
const petActions = animationSlots.filter(x=>!['walk','run'].includes(x));
const text = (x,max) => typeof x==='string' && x.length<=max;
const modelSelection = x => object(x) && (x.mode==='current' && Object.keys(x).length===1 || x.mode==='specific' && Object.keys(x).length===3 && text(x.provider,200) && x.provider.length>0 && text(x.model,200) && x.model.length>0);
const compatible=(def,module)=>def&&module.interfaceVersion===def.interfaceVersion&&(def.configVersions||[def.configVersion]).includes(module.configVersion);
const entryMarks=x=>object(x)&&Object.keys(x).length===2&&id(x.light)&&id(x.dark);
const feedbackFields=['entryMarks','entryMarkEnabled','workFeedbackEnabled','petEchoEnabled'];
const workspaceIcons=x=>object(x)&&Object.keys(x).length>0&&Object.keys(x).length<=64&&Object.entries(x).every(([key,pair])=>id(key)&&entryMarks(pair));
function workspaceRole(value){
  if(!object(value)||!['poster','portrait','avatar','idle','react'].every(key=>id(value[key])))return false;
  const count=Object.keys(value).length;
  return count===5||count===7&&text(value.name,32)&&value.name.trim().length>0
    &&text(value.model,24)&&/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value.model);
}
const workspaceFields=['semanticIcons','workspacePreset','workspaceDetailsEnabled','workspaceMotionEnabled','workspaceRole'];
export const definitions = {
  startup: {interfaceVersion:1,configVersion:1,configVersions:[1,2,3],fields:{
    poster:{fixed:true,required:true,valid:id},video:{fixed:true,valid:id},
    seconds:{fixed:true,required:true,valid:x=>num(x,1,15)},
    handoffSeconds:{fixed:true,valid:x=>num(x,.1,1)},
    stillSeconds:{fixed:true,valid:x=>num(x,1,15)},
    reducedMotion:{type:'boolean',valid:x=>typeof x==='boolean'},
    soundEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    greeting:{fixed:true,required:true,valid:x=>text(x,100)&&x.length>0},
    subtitle:{fixed:true,required:true,valid:x=>text(x,180)},
  }},
  theme: { interfaceVersion:1, configVersion:1, configVersions:[1,2,3], fields: {
    tokens: {fixed:true,required:true,valid:tokenMap}, background:{fixed:true,valid:id},
    backgroundOpacity:{type:'number',min:0,max:.15,default:.04,valid:x=>num(x,0,.15)},
    semanticIcons:{fixed:true,valid:workspaceIcons},
    workspacePreset:{fixed:true,valid:x=>['archive-warm-r2','commander-v1'].includes(x)},
    workspaceDetailsEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    workspaceMotionEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    workspaceRole:{fixed:true,valid:workspaceRole},
    entryMarks:{fixed:true,valid:entryMarks},
    entryMarkEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    workFeedbackEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
    petEchoEnabled:{type:'boolean',valid:x=>typeof x==='boolean'},
  }},
  pet: { interfaceVersion:1,configVersion:1,configVersions:[1,2], fields: {
    builtinPack:{fixed:true,required:true,valid:id}, animations:{fixed:true,valid:clips},
    canvasHeight:{fixed:true,default:300,valid:x=>num(x,100,400)},
    canvasOffsetY:{fixed:true,default:0,valid:x=>num(x,-40,40)},
    size:{type:'number',min:70,max:140,default:100,valid:x=>num(x,70,140)},
    profile:{type:'enum',options:['free','gentle','lively'],default:'gentle',valid:x=>['free','gentle','lively'].includes(x)},
    autonomous:{type:'boolean',default:false,valid:x=>typeof x==='boolean'},
    followMouse:{type:'boolean',default:false,valid:x=>typeof x==='boolean'},
    smartEnabled:{type:'boolean',default:false,valid:x=>typeof x==='boolean'},
    persona:{type:'text',maxLength:2000,default:'',valid:x=>text(x,2000)},
    modelSelection:{type:'model',default:{mode:'current'},valid:modelSelection},
    historyRounds:{type:'number',min:0,max:20,default:5,valid:x=>Number.isInteger(x)&&num(x,0,20)},
    allowSpeech:{type:'boolean',default:true,valid:x=>typeof x==='boolean'},
    allowActions:{type:'boolean',default:true,valid:x=>typeof x==='boolean'},
    actionDescriptions:{fixed:true,valid:x=>object(x)&&Object.keys(x).length>0&&Object.entries(x).every(([k,v])=>petActions.includes(k)&&text(v,120)&&v.length>0)},
    localReply:{fixed:true,default:'',valid:x=>text(x,120)},
  }},
};
export function validateManifest(input) {
  if (JSON.stringify(input)?.length > 65536) fail('SKIN_TOO_LARGE');
  keys(input,['formatVersion','id','version','name','description','dshVersions','assets','modules'],'skin');
  if(input.formatVersion!==2) fail('SKIN_FORMAT_UNSUPPORTED');
  if(!id(input.id)||!/^\d+\.\d+\.\d+$/.test(input.version||'')||typeof input.name!=='string'||!input.name.length||input.name.length>80) fail('SKIN_ID_INVALID');
  if(input.description!==undefined&&(typeof input.description!=='string'||input.description.length>500))fail('SKIN_FIELDS_INVALID','description');
  if(!Array.isArray(input.dshVersions)||!input.dshVersions.length||input.dshVersions.length>10||!input.dshVersions.every(x=>typeof x==='string'&&/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(x)))fail('SKIN_COMPATIBILITY_INVALID');
  if(!object(input.assets)||Object.keys(input.assets).length>128)fail('SKIN_ASSETS_INVALID');
  const startup=input.modules?.startup;
  let total=0;
  for(const [key,a] of Object.entries(input.assets)){
    if(!id(key))fail('SKIN_ASSET_INVALID',key);
    keys(a,['path','mime','sha256','bytes','width','height','alpha','source','license'],key);
    const startupMp4=a.mime==='video/mp4'&&startup?.interfaceVersion===1&&startup.configVersion===3&&startup.config?.video===key;
    const max=a.mime==='video/webm'||startupMp4?16*1024*1024:8*1024*1024;
    const supportedMime=startupMp4||['image/png','image/jpeg','image/webp','video/webm'].includes(a.mime);
    if(typeof a.path!=='string'||a.path.length>240||!/^[a-zA-Z0-9_. /-]+$/.test(a.path)||a.path.split('/').some(p=>!p||p==='.'||p==='..')||a.path.startsWith('/')||!supportedMime||!/^[a-f0-9]{64}$/.test(a.sha256||'')||!Number.isInteger(a.bytes)||!num(a.bytes,1,max))fail('SKIN_ASSET_INVALID',key);
    for(const p of ['width','height'])if(own(a,p)&&(!Number.isInteger(a[p])||!num(a[p],1,8192)))fail('SKIN_ASSET_INVALID',key+'.'+p);
    if(own(a,'alpha')&&typeof a.alpha!=='boolean')fail('SKIN_ASSET_INVALID',key+'.alpha');
    for(const p of ['source','license'])if(own(a,p)&&(typeof a[p]!=='string'||a[p].length>1000))fail('SKIN_ASSET_INVALID',key+'.'+p);
    total+=a.bytes;
  }
  if(total>128*1024*1024)fail('SKIN_TOO_LARGE');
  if(!object(input.modules)||!Object.keys(input.modules).length||Object.keys(input.modules).length>8)fail('SKIN_MODULES_INVALID');
  for(const [key,m] of Object.entries(input.modules)){
    if(!/^[a-z][a-z0-9-]{1,63}$/.test(key)||['constructor','prototype'].includes(key))fail('SKIN_MODULE_INVALID',key);
    keys(m,['interfaceVersion','configVersion','required','config','settings'],key);
    if(!Number.isInteger(m.interfaceVersion)||!Number.isInteger(m.configVersion)||typeof m.required!=='boolean'||!object(m.config)||!object(m.settings))fail('SKIN_MODULE_INVALID',key);
    const def=definitions[key];if(!def)continue;
    if(!compatible(def,m))continue; // compatible runner decides required vs optional
    for(const [field,value] of Object.entries(m.config))if(!def.fields[field]?.valid(value))fail('SKIN_CONFIG_INVALID',key+'.'+field);
    for(const [field,decl] of Object.entries(m.settings)){
      const spec=def.fields[field];if(!spec||spec.fixed||own(m.config,field))fail('SKIN_SETTING_UNSUPPORTED',key+'.'+field);
      keys(decl,['label','default','showWhen'],key+'.'+field);
      if(typeof decl.label!=='string'||!decl.label.length||decl.label.length>60||!own(decl,'default')||!spec.valid(decl.default))fail('SKIN_DEFAULT_INVALID',key+'.'+field);
      if(decl.showWhen!==undefined){
        keys(decl.showWhen,['field','equals'],key+'.'+field+'.showWhen');
        const other=def.fields[decl.showWhen.field];
        if(!other||!['boolean','enum'].includes(other.type)||!(own(m.settings,decl.showWhen.field)||own(m.config,decl.showWhen.field))||!other.valid(decl.showWhen.equals)||decl.showWhen.field===field)fail('SKIN_DISPLAY_INVALID',key+'.'+field);
      }
    }
    for(const [field,spec] of Object.entries(def.fields))if(spec.required&&!own(m.config,field))fail('SKIN_CONFIG_MISSING',key+'.'+field);
    if(key==='theme'&&m.config.background&&!input.assets[m.config.background]?.mime.startsWith('image/'))fail('SKIN_RESOURCE_MISSING','theme.background');
    if(key==='theme'){
      const declares=field=>own(m.config,field)||own(m.settings,field);
      if(m.configVersion<3&&workspaceFields.some(declares))fail('SKIN_SETTING_UNSUPPORTED','theme.workspace');
      if(workspaceFields.some(declares)){
        if(!['archive-warm-r2','commander-v1'].includes(m.config.workspacePreset)||!m.config.semanticIcons||!declares('workspaceDetailsEnabled'))fail('SKIN_CONFIG_MISSING','theme.workspace');
        for(const pair of Object.values(m.config.semanticIcons))for(const asset of Object.values(pair))if(input.assets[asset]?.mime!=='image/png')fail('SKIN_RESOURCE_MISSING','theme.semanticIcons');
        if(m.config.workspaceRole){
          for(const key of ['poster','portrait','avatar'])if(input.assets[m.config.workspaceRole[key]]?.mime!=='image/png')fail('SKIN_RESOURCE_MISSING','theme.workspaceRole');
          for(const key of ['idle','react'])if(input.assets[m.config.workspaceRole[key]]?.mime!=='video/webm')fail('SKIN_RESOURCE_MISSING','theme.workspaceRole');
        }
      }
      if(m.configVersion===1&&feedbackFields.some(declares))fail('SKIN_SETTING_UNSUPPORTED','theme.feedback');
      if(m.config.entryMarks){
        if(!declares('entryMarkEnabled'))fail('SKIN_CONFIG_MISSING','theme.entryMarkEnabled');
        for(const asset of Object.values(m.config.entryMarks))if(input.assets[asset]?.mime!=='image/png')fail('SKIN_RESOURCE_MISSING','theme.entryMarks');
      }else if(declares('entryMarkEnabled'))fail('SKIN_RESOURCE_MISSING','theme.entryMarks');
      if(declares('petEchoEnabled')){
        const pet=input.modules.pet,animations=pet?.config?.animations;
        if(!declares('workFeedbackEnabled')||!animations?.idle||!animations?.react)fail('SKIN_SETTING_UNSUPPORTED','theme.petEchoEnabled');
      }
    }
    if(key==='startup'){
      if(!input.assets[m.config.poster]?.mime.startsWith('image/'))fail('SKIN_RESOURCE_MISSING','startup.poster');
      const videoMime=input.assets[m.config.video]?.mime;
      if(m.config.video&&videoMime!=='video/webm'&&!(m.configVersion===3&&videoMime==='video/mp4'))fail('SKIN_RESOURCE_MISSING','startup.video');
      if(m.configVersion===1&&['handoffSeconds','stillSeconds','reducedMotion'].some(k=>own(m.config,k)||own(m.settings,k)))fail('SKIN_SETTING_UNSUPPORTED','startup.handoff');
      if(m.configVersion>=2&&(!m.config.video||!m.config.handoffSeconds||!m.config.stillSeconds||m.config.handoffSeconds>=m.config.seconds||m.config.stillSeconds>m.config.seconds))fail('SKIN_CONFIG_INVALID','startup.handoff');
      if(m.configVersion<3&&(own(m.config,'soundEnabled')||own(m.settings,'soundEnabled')))fail('SKIN_SETTING_UNSUPPORTED','startup.soundEnabled');
    }
    if(key==='pet'&&m.config.animations)for(const clip of Object.values(m.config.animations))if(input.assets[clip.asset]?.mime!=='video/webm')fail('SKIN_RESOURCE_MISSING','pet.animations');
    if(key==='pet'){
      if(m.configVersion===1&&m.config.animations&&Object.keys(m.config.animations).length!==12)fail('SKIN_CONFIG_INVALID','pet.animations');
      if(m.configVersion===2){
        if(!m.config.animations)fail('SKIN_CONFIG_MISSING','pet.animations');
        if(Object.keys(m.config.animations).length!==12&&(m.config.autonomous===true||own(m.settings,'autonomous')))fail('SKIN_SETTING_UNSUPPORTED','pet.autonomous');
        if(!m.config.animations.walk&&(m.config.followMouse===true||own(m.settings,'followMouse')))fail('SKIN_SETTING_UNSUPPORTED','pet.followMouse');
      }
    }
  }
  return clone(input);
}
export function resolveSettings(manifest, state, available, {strictRequired=true}={}) {
  const result={};
  for(const [key,m] of Object.entries(manifest.modules)){
    const def=definitions[key],supported=compatible(def,m)&&available[key]===true;
    if(!supported&&m.required&&strictRequired)fail('SKIN_CAPABILITY_REQUIRED',key);
    if(!supported){result[key]={status:'unavailable',reason:'SKIN_CAPABILITY_UNAVAILABLE',controls:[]};continue;}
    const values=Object.fromEntries(Object.entries(def.fields).filter(([,s])=>own(s,'default')).map(([k,s])=>[k,s.default]));
    Object.assign(values,m.config,Object.fromEntries(Object.entries(m.settings).map(([k,d])=>[k,d.default])));
    const overrides=state.overrides?.[manifest.id]?.[key]||{};
    for(const [k,v] of Object.entries(overrides)){
      if(!own(m.settings,k))continue; // preserve old unknown overrides without executing them
      if(!def.fields[k].valid(v))fail('SKIN_OVERRIDE_INCOMPATIBLE',key+'.'+k);values[k]=v;
    }
    const controls=Object.entries(m.settings).filter(([,d])=>!d.showWhen||values[d.showWhen.field]===d.showWhen.equals).map(([field,d])=>({field,label:d.label,value:values[field],default:d.default,type:def.fields[field].type,...(def.fields[field].options?{options:def.fields[field].options}:{}),...(def.fields[field].maxLength?{maxLength:def.fields[field].maxLength}:{}),...(def.fields[field].min!==undefined?{min:def.fields[field].min,max:def.fields[field].max}:{}),overridden:own(overrides,field)}));
    result[key]={status:state.disabled?.[key]?'disabled':'enabled',reason:state.disabled?.[key]?'USER_DISABLED':null,values,controls};
  }
  return result;
}
