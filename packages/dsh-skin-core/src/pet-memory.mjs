import {isCommanderSkin} from './host-compatibility.mjs';

export function petMemorySettings(manifest,contentKey,state){
  const defaults=manifest?.modules?.pet?.config?.interactionMemory??(isCommanderSkin(contentKey)?{enabledDefault:false,preferenceDefault:''}:null);
  if(!defaults)return null;
  const saved=state.overrides?.[manifest.id]?.pet?.interactionMemory??{};
  return {enabled:saved.enabled??defaults.enabledDefault,preference:saved.preference??defaults.preferenceDefault,defaults:{enabled:defaults.enabledDefault,preference:defaults.preferenceDefault}};
}
