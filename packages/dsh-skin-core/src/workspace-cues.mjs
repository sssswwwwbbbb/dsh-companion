export const cuePresentationDefaults={seconds:4,position:'above-input',effect:'fade'};
export const cuePositions=['above-input','top-right','bottom-right','bottom-bar'];
export const cueEffects=['none','fade','slide'];
export function cuePresentation(cue,override={}){
  return {seconds:override.seconds??cue.seconds??cuePresentationDefaults.seconds,position:override.position??cue.position??cuePresentationDefaults.position,effect:override.effect??cue.effect??cuePresentationDefaults.effect,...(cue.colors?{colors:cue.colors}:{})};
}
