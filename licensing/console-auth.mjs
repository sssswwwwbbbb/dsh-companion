import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {hash,verify} from '@node-rs/argon2';
import {CompactEncrypt,compactDecrypt} from 'jose';

export class ConsoleError extends Error {
  constructor(code,status=400){super(code);this.status=status;}
}
export function privateJson(file,value){
  const temporary=file+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});
  fs.renameSync(temporary,file);fs.chmodSync(file,0o600);
}
const hashPassword=password=>hash(password,{memoryCost:19456,timeCost:2,parallelism:1});
export async function provisionConsole(stateDir,{reset=false,now=Date.now}={}){
  fs.mkdirSync(stateDir,{recursive:true,mode:0o700});const file=path.join(stateDir,'console-auth.json');
  if(fs.existsSync(file)&&!reset)return JSON.parse(fs.readFileSync(file));
  const password=randomBytes(24).toString('base64url');
  const record={format:2,username:'admin',hash:await hashPassword(password),revision:randomBytes(16).toString('hex'),changedAt:now()};
  privateJson(file,record);privateJson(path.join(stateDir,'console-initial.json'),{username:record.username,password,createdAt:now()});return record;
}
export function consoleKey(stateDir,name,required=false){
  const file=path.join(stateDir,name);
  if(!fs.existsSync(file)){if(required)throw new ConsoleError('ISSUANCE_KEY_MISSING',500);fs.writeFileSync(file,randomBytes(32),{mode:0o600,flag:'wx'});}
  const key=fs.readFileSync(file);if(key.length!==32)throw new ConsoleError('CONSOLE_KEY_INVALID',500);return key;
}
export function openCodeVault(stateDir,database){
  const key=consoleKey(stateDir,'issuance-key.bin',database.licenses.some(row=>row.codeBox));
  return {
    async protect(id,code){return {codeHint:code.slice(-6),codeBox:await new CompactEncrypt(new TextEncoder().encode(code)).setProtectedHeader({alg:'dir',enc:'A256GCM',kid:id}).encrypt(key)};},
    async reveal(license){
      if(!license.codeBox)throw new ConsoleError('CODE_NOT_RETAINED',409);
      try{
        const result=await compactDecrypt(license.codeBox,key,{keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM']});
        const code=new TextDecoder().decode(result.plaintext);
        if(result.protectedHeader.kid!==license.id||createHash('sha256').update(code).digest('hex')!==license.codeHash)throw new Error();return code;
      }catch{throw new ConsoleError('CODE_STORAGE_INVALID',500);}
    }
  };
}
export class ConsoleAuth {
  constructor({stateDir,now=Date.now}){this.file=path.join(stateDir,'console-auth.json');this.now=now;this.work=0;}
  credentials(){return JSON.parse(fs.readFileSync(this.file));}
  async login(username,password){
    if(this.work>=2)throw new ConsoleError('LOGIN_RATE_LIMIT',429);
    if(typeof username!=='string'||typeof password!=='string'||password.length>200)throw new ConsoleError('LOGIN_FAILED',401);
    this.work++;
    try{const value=this.credentials();if(!await verify(value.hash,password)||username!==value.username)throw new ConsoleError('LOGIN_FAILED',401);return {username:value.username,revision:value.revision,expiresAt:this.now()+12*3600000};}
    finally{this.work--;}
  }
  authenticate(session){
    const data=session.get('admin');
    if(!data||data.expiresAt<=this.now()||data.revision!==this.credentials().revision)throw new ConsoleError('AUTH_REQUIRED',401);return data;
  }
  logoutAll(){const value=this.credentials();privateJson(this.file,{...value,revision:randomBytes(16).toString('hex')});}
  async changePassword(oldPassword,newPassword){
    if(typeof oldPassword!=='string'||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>200)throw new ConsoleError('PASSWORD_INVALID');
    if(newPassword===oldPassword)throw new ConsoleError('PASSWORD_UNCHANGED');
    if(this.work>=2)throw new ConsoleError('LOGIN_RATE_LIMIT',429);this.work++;
    try{
      const before=this.credentials();if(!await verify(before.hash,oldPassword))throw new ConsoleError('OLD_PASSWORD_INVALID',403);
      const next={...before,hash:await hashPassword(newPassword),revision:randomBytes(16).toString('hex'),changedAt:this.now()};
      if(this.credentials().revision!==before.revision)throw new ConsoleError('AUTH_CHANGED',409);privateJson(this.file,next);
    }finally{this.work--;}
  }
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
  const [command,directory]=process.argv.slice(2);if(command!=='reset'||!directory)throw new Error('Expected reset <private-state-directory>');
  await provisionConsole(path.resolve(directory),{reset:true});console.log('Console password reset; saved to the private bootstrap file.');
}
