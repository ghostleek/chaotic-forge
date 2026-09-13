import { migrateLocal, prepareHostConfig } from './party-host-process.mjs';

console.log(await migrateLocal(await prepareHostConfig()));
