import fs from 'node:fs';
import path from 'node:path';
const stateDir=path.resolve(process.env.DSH_LICENSE_STATE||'.local/license-service');
const service=JSON.parse(fs.readFileSync(path.join(stateDir,'service.json')));
const token=fs.readFileSync(path.join(stateDir,'admin.token'),'utf8');
const [command,...args]=process.argv.slice(2);
const option=(name,fallback)=>{const index=args.indexOf('--'+name);if(index<0)return fallback;const value=Number(args[index+1]);if(!Number.isSafeInteger(value))throw new Error('Invalid --'+name);return value;};
let route,input;
if(command==='issue'){if(!args[0])throw new Error('Private output file required');route='/admin/issue';input={label:args[1]&&!args[1].startsWith('--')?args[1]:'Mac workflow validation',days:option('days',30),devices:option('devices',1)};}
else if(command==='revoke'){route='/admin/revoke';input={licenseId:args[0]};}
else if(command==='publish'){route='/admin/releases';input={artifact:path.resolve(args[0]),version:args[1],build:Number(args[2]),supportedDsh:['0.2.1-rc.5']};}
else throw new Error('Expected issue <private-output-file>, revoke <license-id>, or publish <artifact> <version> <build>');
const response=await fetch(service.serviceUrl+route,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(input)});
const value=await response.json();if(!response.ok)throw new Error(value.error);
if(command==='issue'){
 if(!args[0])throw new Error('Private output file required');const file=path.resolve(args[0]);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});
 console.log('Activation code saved to the specified private file.');
}else console.log(JSON.stringify(value));
