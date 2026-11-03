import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLicenseService} from '../licensing/server.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const service=await createLicenseService({stateDir:path.join(root,'.local/console-preview'),port:43129,consoleEnabled:true,consoleOrigin:'http://127.0.0.1:43129',consoleEnvironment:'preview'});
console.log('Console preview ready at http://127.0.0.1:43129/manage/');
process.on('SIGTERM',()=>service.close().then(()=>process.exit(0)));
process.on('SIGINT',()=>service.close().then(()=>process.exit(0)));
