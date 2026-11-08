const events=[];
function log(type,data={}){const event={at:Date.now(),type,...data};events.push(event);document.querySelector('#receipt').textContent=JSON.stringify(event,null,2);void fetch('/evidence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)});}
document.querySelectorAll('[data-native]').forEach(button=>button.addEventListener('click',async()=>{
 log('user-command',{action:button.dataset.native});
 try{const r=await fetch('/native/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:button.dataset.native})}),v=await r.json();if(!r.ok)throw new Error(JSON.stringify(v));log('native-action',v);}catch(e){log('error',{message:String(e)});}
}));
window.__integration={snapshot:()=>({at:Date.now(),events,desktopOnly:true})};
