// Phaser supplies scene/game lifecycle, Loader, AnimationState, TweenManager,
// Sprite direction, Container props, input hit tests and camera background.
// Work priority, interrupted-intent restoration and video action authoring are ours.
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class Engine {
 constructor(manifest,log){this.manifest=manifest;this.log=log;this.enabled=false;this.game=null;this.intent='idle';this.sequence=0;this.commandRevision=0;this.mediaMode=new URLSearchParams(location.search).get('media')==='frames'?'frames':'video';}
 beginCommand(){this.commandRevision++;}
 async apply(){
  if(this.game)await this.stop();this.enabled=true;const self=this;
  const Scene=class extends Phaser.Scene {
   preload(){for(const [name,a] of Object.entries(self.manifest.actions))if(name!=='look'){if(self.mediaMode==='video')this.load.video(name,'/assets/'+a.video,true);else this.load.spritesheet(name,'/assets/'+a.sheet,{frameWidth:a.frameWidth,frameHeight:a.frameHeight});}this.load.svg('book','/book.svg');}
   create(){
    self.scene=this;self.actor=(self.mediaMode==='video'?this.add.video(0,0,'idle'):this.add.sprite(0,0,'idle')).setDisplaySize(420,236.25);self.book=this.add.image(45,68,'book').setDisplaySize(80,50).setVisible(false);
    self.character=this.add.container(innerWidth*.3,innerHeight*.62,[self.actor,self.book]);
    self.actor.setInteractive({pixelPerfect:true,alphaTolerance:80}).on('pointerdown',()=>window.dispatchEvent(new CustomEvent('scene-user-interaction')));
    if(self.mediaMode==='frames'){
     for(const name of Object.keys(self.manifest.actions))if(name!=='look')self.addAnimation(name);
     self.actor.on('animationstart',a=>self.log('phaser-animation-start',{name:a.key}));self.actor.on('animationcomplete',a=>self.log('phaser-animation-end',{name:a.key}));self.actor.on('animationrepeat',a=>self.log('phaser-animation-loop',{name:a.key}));
    }else for(const event of ['play','complete','loop'])self.actor.on(event,()=>self.log('phaser-video-'+event,{name:self.action}));
    self.play('idle');self.log('phaser-scene-ready',{mediaMode:self.mediaMode});
   }
  };
  this.game=new Phaser.Game({type:Phaser.AUTO,parent:'actor-root',width:innerWidth,height:innerHeight,transparent:true,antialias:true,scene:Scene,audio:{noAudio:true},render:{powerPreference:'low-power'}});
  for(let i=0;i<120;i++){if(this.actor&&(this.mediaMode==='frames'||this.actor.video?.readyState>=2)){this.actor.setDisplaySize(420,236.25);return;}await sleep(50);}throw new Error('PHASER_NOT_READY');
 }
 addAnimation(name){const a=this.manifest.actions[name];this.scene.anims.create({key:name,frames:this.scene.anims.generateFrameNumbers(name,{start:0,end:a.frames-1}),frameRate:a.fps,repeat:a.loop?-1:0});}
 cancel(){this.sequence++;this.move?.stop();this.move=null;this.actor?.stop();}
 play(name,facing){this.actor.setFlipX(facing===undefined?this.actor.flipX:facing==='right');this.action=name;if(this.mediaMode==='video'){this.actor.stop();this.actor.changeSource(name,false);this.actor.setCurrentTime(0);this.actor.play(this.manifest.actions[name].loop);this.actor.setDisplaySize(420,236.25);}else this.actor.play(name);return name;}
 async waitAnimation(name,sequence=this.sequence){
  const seconds=this.manifest.actions[name].seconds;await sleep(seconds*1000+30);return this.enabled&&sequence===this.sequence;
 }
 async idle(){this.cancel();this.book.setVisible(false);this.cup?.setVisible(false);this.play('idle');}
 async walk(fast=false){
  this.cancel();this.book.setVisible(false);this.cup?.setVisible(false);const name=fast?'run':'walk',a=this.manifest.actions[name],m=this.manifest.movement[name],dir=fast?-1:1;this.play(name,fast?'left':'right');
  const target=Phaser.Math.Clamp(this.character.x+dir*m.distance,115,innerWidth-115);
  this.move=this.scene.tweens.add({targets:this.character,x:target,delay:m.lead*1000,duration:(a.seconds-m.lead-m.tail)*1000,ease:'Linear',onComplete:()=>this.log('phaser-movement-end',{x:this.character.x})});return name;
 }
 async sit(){this.cancel();const sequence=this.sequence;this.play('sit-start');if(await this.waitAnimation('sit-start',sequence)){this.play('sit-loop');this.book.setVisible(true);}}
 async wake(){this.cancel();const sequence=this.sequence;this.book.setVisible(false);this.cup?.setVisible(false);this.play('sit-end');if(await this.waitAnimation('sit-end',sequence))this.play('idle');}
 async work(active){const command=this.commandRevision;if(this.action?.startsWith('sit-'))await this.wake();if(!this.enabled||command!==this.commandRevision)throw new Error('COMMAND_SUPERSEDED');this.cancel();this.book.setVisible(false);this.cup?.setVisible(false);this.play(active?'react':'idle');if(active){if(this.mediaMode==='video')this.actor.setLoop(true);else this.actor.play({key:'react',repeat:-1});}}
 async interact(){const command=this.commandRevision;if(this.action?.startsWith('sit-'))await this.wake();if(!this.enabled||command!==this.commandRevision)throw new Error('COMMAND_SUPERSEDED');this.cancel();this.book.setVisible(false);this.cup?.setVisible(false);return this.play('react');}
 async extend(){
  if(!(this.mediaMode==='video'?this.scene.cache.video.exists('look'):this.scene.textures.exists('look')))await new Promise((resolve,reject)=>{this.scene.load.once('complete',resolve);this.scene.load.once('loaderror',reject);const a=this.manifest.actions.look;if(this.mediaMode==='video')this.scene.load.video('look','/assets/'+a.video,true);else this.scene.load.spritesheet('look','/assets/'+a.sheet,{frameWidth:a.frameWidth,frameHeight:a.frameHeight});this.scene.load.svg('cup','/cup.svg');this.scene.load.start();});
  if(!this.cup){this.cup=this.scene.add.image(60,65,'cup').setDisplaySize(42,48).setVisible(false);this.character.add(this.cup);}
  if(this.mediaMode==='frames'&&!this.scene.anims.exists('look'))this.addAnimation('look');this.log('extra-action-and-prop-registered',{action:'look',prop:'cup',mediaMode:this.mediaMode});
 }
 async look(){this.cancel();this.play('look');this.cup.setVisible(true);return 'look';}
 async position(x=.3,y=.62){this.character.setPosition(innerWidth*x,innerHeight*y);}
 showProp(name,on){this.book?.setVisible(name==='book'&&on);this.cup?.setVisible(name==='cup'&&on);}
 sample(){return {engine:'Phaser',mediaMode:this.mediaMode,enabled:this.enabled,x:this.character?.x??null,y:this.character?.y??null,facing:this.actor?.flipX?'right':'left',source:this.actor?this.action:null,time:this.mediaMode==='video'?this.actor?.getCurrentTime():this.actor?.anims.currentFrame?.index,decoded:this.mediaMode==='video'?!!this.actor?.video&&this.actor.video.readyState>=2:!!this.actor?.texture,paused:this.mediaMode==='video'?!this.actor?.isPlaying():!this.actor?.anims.isPlaying,roots:document.querySelectorAll('#actor-root canvas').length,canvas:!!this.game,sceneChildren:this.scene?.children?.length,renderer:this.game?.renderer?.type};}
 async stop(){this.enabled=false;this.cancel();this.game?.destroy(true);this.game=null;this.actor=null;this.character=null;this.scene=null;this.book=null;this.cup=null;this.log('phaser-game-destroyed');await sleep(50);}
}
