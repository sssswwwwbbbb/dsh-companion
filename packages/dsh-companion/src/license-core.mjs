import { verify, sign, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const productId = 'dsh-companion';
export const isPermanentLicense = value => value?.permanent === true && value.expiresAt === null;
export function signedEnvelope(value, privateKey) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64url') };
}
export function verifiedEnvelope(envelope, publicKey, {maxPayloadLength=16384}={}) {
  if (!envelope || typeof envelope.payload !== 'string' || envelope.payload.length > maxPayloadLength || !/^[A-Za-z0-9_-]+$/.test(envelope.payload) || typeof envelope.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(envelope.signature)) throw new Error('LICENSE_INVALID');
  try {
    if (!verify(null, Buffer.from(envelope.payload), publicKey, Buffer.from(envelope.signature, 'base64url'))) throw new Error();
    return JSON.parse(Buffer.from(envelope.payload, 'base64url').toString());
  } catch { throw new Error('LICENSE_INVALID'); }
}
export function verifyLicense(envelope, { publicKey, deviceId, now = Date.now(), allowExpired = false }) {
  const value = verifiedEnvelope(envelope, publicKey);
  if (![1,2].includes(value.format) || value.product !== productId || typeof value.licenseId !== 'string' || value.deviceId !== deviceId || !Array.isArray(value.entitlements) || !value.entitlements.includes('companion')) throw new Error('LICENSE_DEVICE_MISMATCH');
  const permanent=value.format===2&&isPermanentLicense(value);
  if ((value.format===2&&!permanent)||(value.format===1&&value.permanent===true)||![value.issuedAt,value.offlineUntil,value.renewAfter].every(Number.isSafeInteger)||(!permanent&&(!Number.isSafeInteger(value.expiresAt)||value.offlineUntil>value.expiresAt))||value.issuedAt>now+300000) throw new Error('LICENSE_INVALID');
  if (permanent&&(value.offlineUntil<value.issuedAt||value.renewAfter<value.issuedAt||value.renewAfter>value.offlineUntil)) throw new Error('LICENSE_INVALID');
  if (!allowExpired && !permanent && now > value.expiresAt) throw new Error('LICENSE_EXPIRED');
  // A permanent license keeps the installed content usable offline; only online
  // features depend on the renewable offline window. Limited licenses keep it.
  if (!allowExpired && !permanent && now > value.offlineUntil) throw new Error('LICENSE_RENEW_REQUIRED');
  return value;
}
let cachedDevice;
export function deviceIdentity() {
  if (cachedDevice) return cachedDevice;
  if (process.platform !== 'darwin') throw new Error('PLATFORM_UNSUPPORTED');
  let uuid;
  try { uuid = execFileSync('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding:'utf8', timeout:3000 }).match(/"IOPlatformUUID"\s*=\s*"([A-Fa-f0-9-]{36})"/)?.[1]; } catch {}
  if (!uuid) throw new Error('DEVICE_ID_UNAVAILABLE');
  cachedDevice = createHash('sha256').update(productId + ':device-v1:' + uuid.toUpperCase()).digest('hex');
  return cachedDevice;
}
