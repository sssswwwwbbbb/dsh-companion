import {randomUUID} from 'node:crypto';
const active=job=>['queued','downloading','cancelling'].includes(job.status);
export class SkinDownloads {
  constructor(controller,{concurrency=2}={}){this.controller=controller;this.concurrency=concurrency;this.jobs=[];this.running=new Set();this.disposed=false;this.suspended=false;this.epoch=Date.now();this.revision=0;}
  status(){return {epoch:this.epoch,revision:this.revision,concurrency:this.concurrency,jobs:this.jobs.map(({abort,...job})=>({...job}))};}
  add({releaseId,id:skinId,title,size}={}){
    const license=this.controller.entitlement.require();if(this.suspended)throw new Error('SKIN_DOWNLOAD_PAUSED');if(this.disposed)throw new Error('PLUGIN_DISPOSED');
    if(!/^skin_[a-f0-9-]{36}$/.test(releaseId||''))throw new Error('SKIN_NOT_FOUND');
    const existing=this.jobs.find(job=>active(job)&&(job.releaseId===releaseId||skinId&&job.skinId===skinId));if(existing)return this.status();
    this.jobs.unshift({id:randomUUID(),releaseId,licenseId:license.licenseId,skinId:typeof skinId==='string'?skinId.slice(0,64):null,title:typeof title==='string'?title.slice(0,100):'皮肤下载',status:'queued',bytes:0,total:Number.isSafeInteger(size)&&size>0?size:0,createdAt:Date.now(),error:null});
    this.revision++;this.trim();
    this.pump();return this.status();
  }
  trim(){let terminal=0;this.jobs=this.jobs.filter(job=>active(job)||terminal++<20);}
  pump(){
    while(!this.disposed&&!this.suspended&&this.running.size<this.concurrency){
      // Preserve the user's click order while displaying newest tasks first.
      const job=[...this.jobs].reverse().find(job=>job.status==='queued');if(!job)return;
      job.status='downloading';this.revision++;job.abort=new AbortController();
      const task=this.run(job).finally(()=>{this.running.delete(task);delete job.abort;this.trim();this.pump();});this.running.add(task);
    }
  }
  async run(job){
    try{
      if(this.controller.entitlement.require().licenseId!==job.licenseId)throw new Error('SKIN_DOWNLOAD_LICENSE_CHANGED');
      const result=await this.controller.downloadSkin({releaseId:job.releaseId,licenseId:job.licenseId,signal:job.abort.signal,onProgress:({bytes,total})=>{job.bytes=bytes;job.total=total;this.revision++;}});
      job.status='completed';job.contentKey=result.skinImport.contentKey;job.bytes=job.total;job.finishedAt=Date.now();
    }catch(error){job.status=job.abort.signal.aborted?'cancelled':'failed';job.error=job.status==='failed'?/^[A-Z_]+$/.test(error.message||'')?error.message:'DOWNLOAD_FAILED':null;job.finishedAt=Date.now();}
    finally{this.revision++;}
  }
  cancel({id}={}){
    const job=this.jobs.find(job=>job.id===id);if(!job||!active(job))return this.status();
    if(job.status==='queued'){job.status='cancelled';job.finishedAt=Date.now();}
    else {job.status='cancelling';job.abort.abort(new Error('SKIN_DOWNLOAD_CANCELLED'));}
    this.revision++;return this.status();
  }
  async cancelAll(){this.suspended=true;for(const job of this.jobs)if(active(job))this.cancel({id:job.id});await Promise.allSettled([...this.running]);}
  resume(){this.suspended=false;this.pump();}
  async dispose(){this.disposed=true;for(const job of this.jobs)if(active(job))this.cancel({id:job.id});await Promise.allSettled([...this.running]);}
}
