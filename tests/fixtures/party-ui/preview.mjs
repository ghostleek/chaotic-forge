import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, preview } from 'vite';

// Build the actual component without a product route or the Worker server.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const table = process.argv.includes('--table');
const source = table
  ? `${root}/docs/design/pc-04-cards`
  : fileURLToPath(new URL('./', import.meta.url));
const output = await mkdtemp(
  join(tmpdir(), table ? 'forge-card-table-' : 'forge-room-status-'),
);
const config = {
  configFile: false,
  envFile: false,
  root: source,
  publicDir: `${root}/public`,
  resolve: {
    alias: { 'next/image': `${root}/node_modules/vinext/dist/shims/image.js` },
  },
  // The installed image shim uses build-time environment defaults.
  define: { 'process.env': JSON.stringify({ NODE_ENV: 'production' }) },
  css: { postcss: { plugins: [] } },
  build: {
    outDir: output,
    emptyOutDir: false,
    ...(table
      ? {
          rolldownOptions: {
            input: {
              study: `${source}/index.html`,
              play: `${source}/play.html`,
            },
          },
        }
      : {}),
  },
  preview: { host: '127.0.0.1', port: Number(process.env.PARTY_UI_PORT || 4319), strictPort: true },
};
try {
  await build(config);
  const server = await preview(config);
  server.printUrls();
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      server.httpServer.close(() => {
        void rm(output, { recursive: true, force: true }).then(() =>
          process.exit(0),
        );
      });
    });
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}
