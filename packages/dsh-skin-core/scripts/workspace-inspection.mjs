// Read-only CSS and layout observations for synthetic official-UI fixtures.
export function inspectWorkspace(){
  const parse=value=>{const n=value.match(/[\d.]+/g)?.map(Number);return n?.length>=3?[n[0],n[1],n[2],n[3]??1]:[0,0,0,0];};
  const backdrop=element=>{
    const layers=[];for(let e=element;e;e=e.parentElement)layers.unshift(parse(getComputedStyle(e).backgroundColor));
    return layers.reduce((base,[r,g,b,a])=>[r*a+base[0]*(1-a),g*a+base[1]*(1-a),b*a+base[2]*(1-a)],[255,255,255]);
  };
  const lum=rgb=>rgb.slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
  const metric=e=>{if(!e)return null;const s=getComputedStyle(e),rgb=parse(s.color),bg=backdrop(e),rect=e.getBoundingClientRect();return {text:e.textContent.slice(0,90),color:s.color,effectiveCssBackground:bg.map(x=>Math.round(x)),contrast:Number(((Math.max(lum(rgb),lum(bg))+.05)/(Math.min(lum(rgb),lum(bg))+.05)).toFixed(2)),fontSize:s.fontSize,fontWeight:s.fontWeight,width:rect.width,height:rect.height,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,overflowX:s.overflowX,outline:s.outline,boxShadow:s.boxShadow};};
  const code=[...document.querySelectorAll('pre')].find(e=>e.textContent.includes('PetReply'));
  const leaf=[...document.querySelectorAll('*')].find(e=>!e.children.length&&e.textContent.includes('合成读取成功'));
  const p=[...document.querySelectorAll('p')].find(e=>e.textContent.startsWith('本次工作记录'));
  const input=document.querySelector('[data-composer-input]');
  const codeColors=code?[...new Map([...code.querySelectorAll('span')].filter(e=>e.children.length===0&&e.textContent.trim()).map(e=>[getComputedStyle(e).color,metric(e)])).values()]:[];
  const inputAncestors=[];for(let e=input;e&&inputAncestors.length<5;e=e.parentElement)inputAncestors.push({tag:e.tagName,...metric(e)});
  return {base:document.body.style.getPropertyValue('--dsw-alias-bg-base'),viewport:{width:innerWidth,height:innerHeight,rootScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth},paragraph:metric(p),tableHeader:metric(document.querySelector('th')),tableCell:metric(document.querySelector('td')),inlineCode:metric(document.querySelector('p code')),link:metric(document.querySelector('a[href="https://example.invalid/fixture"]')),code:metric(code),codeColors,toolOutput:metric(leaf),input:metric(input),inputFocused:document.activeElement===input,inputAncestors,selection:p?{text:window.getSelection()?.toString(),color:getComputedStyle(p,'::selection').color,background:getComputedStyle(p,'::selection').backgroundColor}:null,note:'CSS alpha backgrounds composited through ancestors; image/overlay pixels are observed visually, not included in ratios'};
}
