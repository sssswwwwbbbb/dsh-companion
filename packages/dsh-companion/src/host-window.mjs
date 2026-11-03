// All coordinates are logical desktop pixels, the same units Electron uses.
export function hostWindowBounds(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  const result={};
  for(const key of ['x','y','width','height']){
    if(!Number.isFinite(value[key]))return;
    const integer=Math.round(value[key]);
    if(integer < -2147483648 || integer > 2147483647)return;
    result[key]=integer===0?0:integer;
  }
  if(result.width<320||result.height<240||result.width>16384||result.height>16384)return;
  return result;
}

export function introBounds(value,workArea,displayBounds=workArea) {
  const remembered=hostWindowBounds(value);
  const area=remembered?displayBounds:workArea;
  const width=Math.min(remembered?.width||1280,area.width),height=Math.min(remembered?.height||820,area.height);
  const x=Math.max(area.x,Math.min(remembered?.x??area.x+(area.width-width)/2,area.x+area.width-width));
  const y=Math.max(area.y,Math.min(remembered?.y??area.y+(area.height-height)/2,area.y+area.height-height));
  return {x:Math.round(x)||0,y:Math.round(y)||0,width:Math.round(width),height:Math.round(height)};
}
