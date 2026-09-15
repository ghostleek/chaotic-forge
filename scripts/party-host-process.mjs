import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { checkBuild } from './party-host-check.mjs';

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
export const hostEnvironment = {
  ...process.env,
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_WRITE_LOGS: 'false',
  MINIFLARE_REGISTRY_PATH: resolve('.wrangler/registry'),
};

/** @param {{ directory?: string, proofToken?: string, vars?: Record<string,string> }} [options] */
export async function prepareHostConfig({
  directory = '.wrangler/party-host',
  proofToken,
  vars = {},
} = {}) {
  const built = await checkBuild();
  await mkdir(directory, { recursive: true });
  const config = {
    name: 'mechanic-forge-local',
    main: resolve('dist/server', built.main),
    compatibility_date: built.compatibility_date,
    compatibility_flags: built.compatibility_flags,
    assets: { directory: resolve('dist/client') },
    d1_databases: built.d1_databases.map((db) => ({
      ...db,
      migrations_dir: resolve('dist/.openai/drizzle'),
    })),
    r2_buckets: built.r2_buckets ?? [],
    vars,
    no_bundle: true,
    rules: built.rules,
  };
  if (proofToken) {
    // This separate local-only wrapper imports the actual built application. It is never packaged.
    const entry = resolve(directory, 'proof.mjs');
    await writeFile(
      entry,
      `import app from ${JSON.stringify(config.main)};\nimport { proofRequest } from ${JSON.stringify(resolve('scripts/party-host-proof.ts'))};\nexport default { fetch(request, env, ctx) { return new URL(request.url).pathname.startsWith('/__party_host_proof') ? proofRequest(request, env.PROOF_TOKEN) : app.fetch(request, env, ctx); } };\n`,
    );
    config.main = entry;
    config.no_bundle = false;
    config.vars = { ...vars, PROOF_TOKEN: proofToken };
  }
  const configPath = resolve(directory, 'wrangler.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

export async function migrateLocal(config, persistTo = '.wrangler/state') {
  const child = spawn(
    process.execPath,
    [
      wrangler,
      'd1',
      'migrations',
      'apply',
      'DB',
      '--local',
      '--config',
      config,
      '--persist-to',
      resolve(persistTo),
    ],
    { env: hostEnvironment, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  child.stdout.on('data', (data) => {
    output += data;
  });
  child.stderr.on('data', (data) => {
    output += data;
  });
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error(`D1 migration failed (${code}): ${output}`);
  return output;
}

export async function startHost({
  config,
  persistTo = '.wrangler/state',
  port = 3107,
}) {
  // Refuse an existing listener instead of accidentally testing another host.
  const probe = createServer();
  await new Promise((resolveReady, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolveReady));
  });
  const child = spawn(
    process.execPath,
    [
      wrangler,
      'dev',
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--inspector-port',
      '0',
      '--config',
      config,
      '--persist-to',
      resolve(persistTo),
    ],
    { env: hostEnvironment, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  );
  let output = '';
  child.stdout.on('data', (data) => {
    output = (output + data).slice(-16_000);
  });
  child.stderr.on('data', (data) => {
    output = (output + data).slice(-16_000);
  });
  const baseURL = `http://127.0.0.1:${port}`;
  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    const killGroup = (signal) => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, signal);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    };
    if (child.exitCode !== null || child.signalCode !== null) {
      killGroup('SIGKILL');
      return;
    }
    const exited = once(child, 'exit');
    killGroup('SIGTERM');
    const timer = setTimeout(() => {
      killGroup('SIGKILL');
    }, 5000);
    await exited;
    clearTimeout(timer);
    // Wrangler can exit before its inspector workerd. Clean up this owned group too.
    killGroup('SIGKILL');
  }
  try {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error(`Worker exited (${child.exitCode}): ${output}`);
      try {
        const response = await fetch(baseURL, {
          signal: AbortSignal.timeout(1000),
        });
        await response.arrayBuffer();
        if (response.ok) return { baseURL, stop, child, output: () => output };
      } catch {
        /* Wait for workerd to listen. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Worker did not become ready: ${output}`);
  } catch (error) {
    await stop();
    throw error;
  }
}
