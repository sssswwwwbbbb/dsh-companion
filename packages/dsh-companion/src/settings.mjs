export const defaults = Object.freeze({ packId:'whale-maid-demo', profile: 'free', size: 100, autonomous: true, followMouse: false, visible: true, autoStart:true, startupEnabled:true, launcherEnabled:false });
export const actions = new Set(['idle', 'look', 'stretch', 'eat', 'play', 'greet', 'react', 'sleep-in', 'sleep', 'wake']);

export function validatedSettings(value, previous = defaults) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_SETTINGS');
  const allowed = new Set(Object.keys(defaults));
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error('UNKNOWN_SETTING');
  const next = { ...previous };
  for (const [key, input] of Object.entries(value)) {
    if (key === 'packId') {
      if(typeof input!=='string'||!/^[a-z][a-z0-9-]{2,63}$/.test(input))throw new Error('PACK_INVALID');
    } else if (key === 'profile') {
      if (!['free', 'gentle', 'lively'].includes(input)) throw new Error('INVALID_PROFILE');
    } else if (key === 'size') {
      if (!Number.isFinite(input) || input < 70 || input > 140) throw new Error('INVALID_SIZE');
    } else if (typeof input !== 'boolean') throw new Error('INVALID_BOOLEAN');
    next[key] = input;
  }
  return next;
}

export function clampToDisplay(pet, display) {
  const { width, height } = display;
  pet.setBounds(width, height, pet.halfWidth, pet.petHeight);
  return pet;
}
