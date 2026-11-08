export const validSkinLimit=value=>Number.isInteger(value)&&value>=0&&value<=100000;
export function skinQuota(license){
  const limit=license.skinLimit??0,acquiredIds=[...new Set(license.skinIds||[])];
  return {limit,used:acquiredIds.length,remaining:limit===0?null:Math.max(0,limit-acquiredIds.length),acquiredIds};
}
// Entitlement is permanent for this skin ID, including subsequent versions.
// Uninstalling client files never calls or changes this server-side ledger.
export function grantSkin(license,id){
  const quota=skinQuota(license);if(quota.acquiredIds.includes(id))return false;
  if(quota.limit!==0&&quota.used>=quota.limit)throw new Error('SKIN_DOWNLOAD_LIMIT_REACHED');
  license.skinIds=[...quota.acquiredIds,id];return true;
}
