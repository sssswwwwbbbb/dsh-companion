import path from 'node:path';import {fileURLToPath} from 'node:url';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export const lab=path.join(root,'.local/dsh-commander-native-20261105');
export const stage=path.join(lab,'staging');
export const report=path.join(root,'reports/dsh-commander-native-2026-11-05');
