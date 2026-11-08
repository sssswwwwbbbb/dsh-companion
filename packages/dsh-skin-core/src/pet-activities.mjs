import {isCommanderSkin} from './host-compatibility.mjs';

// Existing accepted skins keep their identity and native media mapping.
export function petActivitySettings(manifest,contentKey,state){
  const config=manifest?.modules.pet?.config;
  const descriptions=config?.activityDescriptions??(isCommanderSkin(contentKey)?{
    react:'轻轻侧头，安静回应一次',walk:'沿屏幕向左走一小段，然后回到待机',
  }:null);
  if(!descriptions)return null;
  const saved=state.overrides[manifest.id]?.pet?.activities??{};
  return {enabled:saved.enabled??false,intervalMinutes:saved.intervalMinutes??3,
    actions:Object.entries(descriptions).map(([id,description])=>({id,description,enabled:saved.actions?.[id]!==false}))};
}
