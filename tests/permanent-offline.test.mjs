import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { signedEnvelope, verifyLicense } from '../packages/dsh-companion/src/license-core.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const day = 24 * 60 * 60 * 1000;
const base = { product: 'dsh-companion', licenseId: 'lic_test', deviceId: 'device-a', entitlements: ['companion'] };

test('a permanent license keeps working after its offline window expires', () => {
  const now = Date.now();
  const receipt = signedEnvelope({ ...base, format: 2, permanent: true, expiresAt: null, issuedAt: now - 30 * day, offlineUntil: now - 10 * day, renewAfter: now - 20 * day }, privateKey);
  const claims = verifyLicense(receipt, { publicKey, deviceId: 'device-a', now });
  assert.equal(claims.permanent, true);
});

test('a limited license still requires renewal once the offline window expires', () => {
  const now = Date.now();
  const receipt = signedEnvelope({ ...base, format: 1, expiresAt: now + 5 * day, issuedAt: now - 30 * day, offlineUntil: now - day, renewAfter: now - 2 * day }, privateKey);
  assert.throws(() => verifyLicense(receipt, { publicKey, deviceId: 'device-a', now }), /LICENSE_RENEW_REQUIRED/);
});

test('device mismatch and forged signatures stay rejected for permanent licenses', () => {
  const now = Date.now();
  const receipt = signedEnvelope({ ...base, format: 2, permanent: true, expiresAt: null, issuedAt: now - day, offlineUntil: now + day, renewAfter: now + day / 2 }, privateKey);
  assert.throws(() => verifyLicense(receipt, { publicKey, deviceId: 'device-b', now }), /LICENSE_DEVICE_MISMATCH/);
  const forged = { payload: receipt.payload, signature: receipt.signature.slice(0, -2) + 'AA' };
  assert.throws(() => verifyLicense(forged, { publicKey, deviceId: 'device-a', now }), /LICENSE_INVALID/);
});
