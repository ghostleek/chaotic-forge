import {
  prepareHostConfig,
  migrateLocal,
  startHost,
} from './party-host-process.mjs';

const index = process.argv.indexOf('--port');
const port = index === -1 ? 3107 : Number(process.argv[index + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid local port');
const config = await prepareHostConfig();
await migrateLocal(config);
const host = await startHost({ config, port });
console.log(`Built Worker running at ${host.baseURL}`);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    stopping = true;
    await host.stop();
    process.exit(0);
  });
host.child.once('exit', async (code) => {
  if (stopping) return;
  await host.stop();
  process.exit(code ?? 1);
});
