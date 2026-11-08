const fail=()=>{throw new Error('BACKEND_CANDIDATE_INVALID');};
const finite=x=>typeof x==='number'&&Number.isFinite(x),sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,63}$/.test(x);
// This is an adapter-owned table for exactly the two private candidates, not a
// new skin manifest extension or a general geometry format.
export function validateCandidateMap(map){
 if(map?.format!==1||map.privateOnly!==true||!map.contents||Object.keys(map.contents).length!==2)fail();
 for(const [key,e]of Object.entries(map.contents)){
  const g=e.geometry;if(!sha(key)||!['legacy','master'].includes(e.group)||!g||g.canvas?.join(',')!=='640,360'||!finite(g.defaultSize)||g.defaultSize<=0||g.defaultSize>1000||g.ground?.length!==2||!g.ground.every(finite)||g.hitBounds?.length!==4||!g.hitBounds.every(finite)||g.hitRows?.length!==360)fail();
  for(const row of g.hitRows){if(!Array.isArray(row)||row.length%2)fail();let previous=0;for(let i=0;i<row.length;i+=2){if(!Number.isInteger(row[i])||!Number.isInteger(row[i+1])||row[i]<previous||row[i+1]<=row[i]||row[i+1]>640)fail();previous=row[i+1];}}
  if(!Object.keys(e.requiredAssets||{}).length||!Object.entries(e.requiredAssets).every(([a,h])=>id(a)&&sha(h)))fail();
  for(const action of ['idle','react'])if(!e.media?.[action]||!/^[a-z][a-z0-9-]+\.webm$/.test(e.media[action].file)||!sha(e.media[action].sha256))fail();
  if(!Array.isArray(e.props)||e.props.length>2)fail();
  for(const p of e.props)if(!['book','cup'].includes(p.id)||!id(p.asset)||!e.requiredAssets[p.asset]||!finite(p.referenceHeight)||p.referenceHeight<=0||p.groundOffset?.length!==2||!p.groundOffset.every(finite)||p.geometry?.prepared_size?.length!==2||!p.geometry.prepared_size.every(v=>finite(v)&&v>0)||!p.geometry.anchors?.ground?.every(finite))fail();
 }
 return map;
}
