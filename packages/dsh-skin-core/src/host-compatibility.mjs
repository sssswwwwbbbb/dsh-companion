// These immutable built-ins were validated against both DSH releases. Keep
// their content keys stable so existing selections and native routing survive.
const commanderSkins = new Set([
  '3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16',
  '8e9284c97dd17cf8e24233492a6596893dc6473a296fee106c45227a65d9681f',
  '1f579f330a936860908e4b8c9d258d0379df60fa8c512cbd3e1e4cc97e8cd3b1',
  '3ce0bc2599f01e25b4d6e21af35d2695496d86878c8b9234dd39b6da7f1ef1c6',
  'c55d6e9a829f3a4a36781dcb65293769d9936a94f6375748fcd856963a71c246',
  '20b4d4a3dc84ec5aa27fd61c0287cbf0d6c6a01e5b0811169e7f70c49fa30b53',
  '4cc753bda84d3b19888321e2c233142022ea88cf442f7839d563b1c56ff1f0ed',
  '3a8c9a9b97ac1d76509f6524edf54d48d36e33f468d106abacd92689493b75b5',
]);
export const isCommanderSkin = contentKey => commanderSkins.has(contentKey);
const builtInSkins = new Set([
  ...commanderSkins,
  '4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b',
]);

export function supportsSkinHost(manifest, contentKey, dshVersion) {
  return manifest.dshVersions.includes(dshVersion) ||
    dshVersion === '0.2.2-rc.1' && builtInSkins.has(contentKey);
}
