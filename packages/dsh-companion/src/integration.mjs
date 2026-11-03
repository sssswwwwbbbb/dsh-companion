import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { readJson, writeJson } from './storage.mjs';
const execute=promisify(execFile);
export function profileGate(profileDir){
  try{const value=readJson(path.join(profileDir,'package.json')),names=['dsh-plugin-companion','@local/dsh-companion'];return {installed:names.some(name=>!!value.dependencies?.[name]),enabled:names.some(name=>!!value.dependencies?.[name]&&value.dsh?.profile?.bundles?.includes(name)===true)};}
  catch{return {installed:false,enabled:false};}
}
export class Integration {
  constructor({stateDir,profileDir,packageRoot,launcherDirectory}){
    this.stateDir=stateDir;this.profileDir=profileDir;this.packageRoot=packageRoot;
    const standard=path.resolve(profileDir)===path.join(homedir(),'.dsh/profiles/desktop');
    this.directory=launcherDirectory||(standard?path.join(homedir(),'Applications'):path.join(stateDir,'launchers'));
    this.appPath=path.join(this.directory,'DSH 陪伴启动器.app');
  }
  record(dshVersion){
    const dshApp='/Applications/DeepSeek Harness.app';
    writeJson(path.join(this.stateDir,'integration.json'),{format:1,product:'dsh-companion',profileDir:this.profileDir,dshApp,dshVersion,launcherPath:this.appPath});
  }
  status(){const marker=readJson(path.join(this.appPath,'Contents/Resources/owner.json'),null);return {installed:!!marker&&marker.stateDir===this.stateDir,path:marker?.stateDir===this.stateDir?this.appPath:null};}
  async install(executable){
    if(process.platform!=='darwin')throw new Error('PLATFORM_UNSUPPORTED');
    if([executable,this.stateDir].some(s=>/[\r\n]/.test(s)))throw new Error('LAUNCHER_PATH_INVALID');
    if(fs.existsSync(this.appPath)&&!this.status().installed)throw new Error('LAUNCHER_OWNERSHIP_CONFLICT');
    const temporary=this.appPath+'.creating-'+process.pid;
    if(fs.existsSync(temporary))throw new Error('LAUNCHER_BUSY');
    const mac=path.join(temporary,'Contents/MacOS'), resources=path.join(temporary,'Contents/Resources');
    fs.mkdirSync(mac,{recursive:true});fs.mkdirSync(resources,{recursive:true});
    try{
      fs.copyFileSync(path.join(this.packageRoot,'bin/darwin-arm64/companion-launch'),path.join(mac,'launch'));fs.chmodSync(path.join(mac,'launch'),0o755);
      fs.writeFileSync(path.join(temporary,'Contents/Info.plist'),'<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>local.dsh.companion.launcher</string><key>CFBundleName</key><string>DSH 陪伴启动器</string><key>CFBundleDisplayName</key><string>DSH 陪伴启动器</string><key>CFBundleExecutable</key><string>launch</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>LSUIElement</key><true/></dict></plist>');
      fs.writeFileSync(path.join(resources,'launch.conf'),executable+'\n'+this.stateDir+'\n',{mode:0o600});
      writeJson(path.join(resources,'owner.json'),{product:'dsh-companion',stateDir:this.stateDir});
      await execute('/usr/bin/codesign',['--force','--sign','-','--timestamp=none',temporary]);
      if(fs.existsSync(this.appPath)){
        const backups=path.join(this.stateDir,'launcher-backups');fs.mkdirSync(backups,{recursive:true,mode:0o700});fs.renameSync(this.appPath,path.join(backups,'previous-'+Date.now()+'.app'));
      }
      fs.renameSync(temporary,this.appPath);return this.status();
    }catch(error){fs.rmSync(temporary,{recursive:true,force:true});throw new Error('LAUNCHER_CREATE_FAILED');}
  }
  async remove(){
    if(this.status().installed){const backups=path.join(this.stateDir,'launcher-backups');fs.mkdirSync(backups,{recursive:true,mode:0o700});fs.renameSync(this.appPath,path.join(backups,'removed-'+Date.now()+'.app'));}return this.status();
  }
}
