import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function checkBuild() {
  const source = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
  const packaged = JSON.parse(
    await readFile('dist/.openai/hosting.json', 'utf8'),
  );
  assert.deepEqual(
    packaged,
    source,
    'Packaged hosting identity/bindings differ',
  );
  assert.equal(source.d1, 'DB');
  const config = JSON.parse(
    await readFile('dist/server/wrangler.json', 'utf8'),
  );
  assert.equal(config.d1_databases[0].binding, 'DB');
  assert.ok((await stat(resolve('dist/server', config.main))).size > 0);
  assert.ok(
    (await readdir('dist/client/_next/static/chunks')).some((f) =>
      f.endsWith('.js'),
    ),
  );
  const migrations = (await readdir('drizzle')).filter((f) =>
    f.endsWith('.sql'),
  );
  assert.ok(migrations.length, 'D1 schema migrations must be packaged');
  for (const path of [...migrations, 'meta/_journal.json']) {
    assert.equal(
      await readFile(`dist/.openai/drizzle/${path}`, 'utf8'),
      await readFile(`drizzle/${path}`, 'utf8'),
    );
  }
  // Proof handlers never enter the deployable output.
  async function inspect(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = `${path}/${entry.name}`;
      if (entry.isDirectory()) await inspect(file);
      else if (entry.name.endsWith('.js'))
        assert.ok(
          !(await readFile(file, 'utf8')).includes('__party_host_proof'),
          file,
        );
    }
  }
  await inspect('dist/server');
  return config;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await checkBuild();
  console.log(
    'Worker entrypoint, browser assets, Site identity, DB binding and packaged migrations verified.',
  );
}
