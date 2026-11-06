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
