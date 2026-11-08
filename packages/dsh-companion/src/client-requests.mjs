// Request ordering for the existing plugin page. Independent of React so the
// stop priority and stale-response rules can be exercised without a browser.
export function createClientRequestGate(){
  let revision=0,normal=null,stop=null;
  return {
    beginNormal(){if(normal||stop)return null;return normal={revision:++revision};},
    beginStop(){if(stop)return null;normal=null;return stop={revision:++revision};},
    current(ticket){return ticket!==null&&ticket.revision===revision&&(ticket===normal||ticket===stop);},
    finish(ticket){if(ticket===normal){normal=null;return true;}if(ticket===stop){stop=null;return true;}return false;},
    stamp(){return normal||stop?null:revision;},
    refreshCurrent(stamp){return stamp===revision&&!normal&&!stop;},
    cancelled(error){return /\bSKIN_(?:STOP_REQUESTED|OPERATION_SUPERSEDED)\b/.test(error?.message||'');},
    get busy(){return !!(normal||stop);},
  };
}

// Catalog browsing and downloads have independent request lanes. Preserve a
// newer lane when a slower ordinary status/save response reaches the page.
export function mergeCompanionSnapshot(previous,next){
  if(!previous||previous.license?.licenseId!==next.license?.licenseId)return next;
  const oldMarket=previous.skin?.market,newMarket=next.skin?.market;
  const keepMarket=oldMarket&&newMarket&&(oldMarket.revision??0)>(newMarket.revision??0);
  let market=keepMarket?oldMarket:newMarket;
  // Acquisitions are permanent for one license. A late status cannot refund
  // a slot in the UI after a download refreshed the quota.
  const quota=oldMarket?.quota?.used>newMarket?.quota?.used?oldMarket.quota:newMarket?.quota;
  if(market&&quota)market={...market,quota};
  return {...next,...(market?{skin:{...next.skin,market}}:{}),skinDownloads:mergeSkinDownloads(previous.skinDownloads,next.skinDownloads)};
}
export function mergeSkinDownloads(previous,next){
  if(!previous)return next;if(!next)return previous;
  return (previous.epoch??0)>(next.epoch??0)||(previous.epoch??0)===(next.epoch??0)&&(previous.revision??0)>(next.revision??0)?previous:next;
}
