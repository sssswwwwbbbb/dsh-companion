// These immutable built-ins were validated against both DSH releases. Keep
// their content keys stable so existing selections and native routing survive.
const builtInSkins = new Set([
  '3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16',
  '4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b',
]);

export function supportsSkinHost(manifest, contentKey, dshVersion) {
  return manifest.dshVersions.includes(dshVersion) ||
    dshVersion === '0.2.2-rc.1' && builtInSkins.has(contentKey);
}
