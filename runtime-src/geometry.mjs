// Electron's native Integer converter rejects JavaScript -0, including the
// result of Math.round(-0.1). Keep signed monitor coordinates, normalize zero,
// and reject values outside the native signed 32-bit coordinate range.
export function nativeCoordinate(value) {
  if (!Number.isFinite(value)) return undefined;
  const integer = Math.round(value);
  if (integer < -2147483648 || integer > 2147483647) return undefined;
  return integer === 0 ? 0 : integer;
}

export function nativePosition(x, y) {
  const left = nativeCoordinate(x), top = nativeCoordinate(y);
  return left === undefined || top === undefined ? undefined : { x: left, y: top };
}
