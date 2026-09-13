import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { inspectCandidate, sha256 } from './candidate.ts';
import { BENCHMARK_POLICY } from './benchmark.ts';

const PARENT_URL = 'https://forge-replay.invalid/';
const MAX_RESULT_BYTES = 32 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES = 64 * 1024;
const PERMISSIONS =
  "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'; display-capture 'none'";

// Installed in the opaque child before candidate source. Capture the operations
// used by the observer before an untrusted script can replace its globals.
function installObserver({ maxSnapshotBytes, maxTraceBytes }) {
  const realmGlobal = globalThis;
  const apply = Reflect.apply;
  const keys = Object.keys;
  const descriptor = Object.getOwnPropertyDescriptor;
  const create = Object.create;
  const setPrototypeOf = Object.setPrototypeOf;
  const freeze = Object.freeze;
  const defineProperty = Object.defineProperty;
  const isArray = Array.isArray;
  const isInteger = Number.isSafeInteger;
  const isFiniteNumber = Number.isFinite;
  const stringify = JSON.stringify;
  const encode = TextEncoder.prototype.encode.bind(new TextEncoder());
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  const join = Function.prototype.call.bind(Array.prototype.join);
  const sort = Function.prototype.call.bind(Array.prototype.sort);
  const ErrorType = Error;
  const Uint8ArrayType = Uint8Array;
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 450;
  document.body.append(canvas);

  function fail(message) {
    throw new ErrorType(message);
  }
  const plain = (value) => setPrototypeOf(value, null);
  function copy(value) {
    let nodes = 0;
    let characters = 0;
    function visit(item, depth) {
      if (++nodes > 8192 || depth > 16)
        fail('Snapshot structure limit exceeded');
      if (item === null || typeof item === 'boolean') return item;
      if (typeof item === 'number' && isFiniteNumber(item)) return item;
      if (typeof item === 'string') {
        characters += item.length;
        if (characters > maxSnapshotBytes)
          fail('Snapshot string limit exceeded');
        return item;
      }
      if (!item || typeof item !== 'object')
        fail('Snapshot must contain only finite JSON values');
      const list = isArray(item);
      const names = keys(item);
      if (names.length > 8192) fail('Snapshot key limit exceeded');
      if (list) {
        if (item.length !== names.length) fail('Snapshot arrays must be dense');
        for (let index = 0; index < names.length; index++)
          if (names[index] !== '' + index)
            fail('Snapshot arrays cannot have extra properties');
      }
      const result = list ? [] : create(null);
      if (list) setPrototypeOf(result, null);
      sort(names);
      for (let index = 0; index < names.length; index++) {
        const name = names[index];
        characters += name.length;
        if (characters > maxSnapshotBytes) fail('Snapshot key limit exceeded');
        const property = descriptor(item, name);
        if (!property || !('value' in property))
          fail('Snapshot accessors are unsupported');
        defineProperty(result, name, {
          value: visit(property.value, depth + 1),
          enumerable: true,
        });
      }
      return result;
    }
    const result = visit(value, 0);
    const serialized = stringify(result);
    if (encode(serialized).length > maxSnapshotBytes)
      fail('Snapshot byte limit exceeded');
    return { value: result, serialized };
  }
  function exactScore(score) {
    const parsed = copy(score).value;
    if (
      !parsed ||
      isArray(parsed) ||
      keys(parsed).length !== 2 ||
      !isInteger(parsed.completedOrders) ||
      !isInteger(parsed.failedOrders) ||
      parsed.completedOrders < 0 ||
      parsed.failedOrders < 0 ||
      parsed.completedOrders > 3600 ||
      parsed.failedOrders > 3600
    )
      fail('Score must be bounded completedOrders/failedOrders integers');
    return parsed;
  }
  async function run(frames, policy) {
    const runtime = realmGlobal.forgeQualification;
    if (!runtime || typeof runtime !== 'object')
      fail('Missing forgeQualification runtime');
    const methodNames = [
      'reset',
      'input',
      'step',
      'snapshot',
      'isComplete',
      'score',
      'render',
    ];
    const methods = create(null);
    for (let index = 0; index < methodNames.length; index++) {
      const name = methodNames[index];
      if (typeof runtime[name] !== 'function')
        fail('Missing runtime method ' + name);
      methods[name] = runtime[name];
    }
    const invoke = (name, args = []) => {
      const result = apply(methods[name], runtime, args);
      if (result && typeof result.then === 'function')
        fail('Runtime methods must be synchronous');
      return result;
    };
    invoke('reset', [freeze({ seed: policy.seed, ticks: policy.ticks })]);
    let bytes = 0;
    let previousScore;
    const fullStates = plain([]);
    const samples = plain([]);
    function capture(tick) {
      const snapshot = copy(invoke('snapshot'));
      const complete = invoke('isComplete');
      const score = exactScore(invoke('score'));
      if (
        typeof complete !== 'boolean' ||
        complete !== (tick === policy.ticks) ||
        snapshot.value.tick !== tick ||
        snapshot.value.completed !== complete ||
        snapshot.value.completedOrders !== score.completedOrders ||
        snapshot.value.failedOrders !== score.failedOrders ||
        !snapshot.value.state ||
        typeof snapshot.value.state !== 'object'
      )
        fail('Snapshot, completion or score disagrees with replay tick');
      const record = stringify(
        plain({ snapshot: snapshot.value, score, complete }),
      );
      bytes += encode(record).length + 1;
      if (bytes > maxTraceBytes) fail('Full trace byte limit exceeded');
      fullStates[fullStates.length] = record;
      const changed =
        !previousScore ||
        previousScore.completedOrders !== score.completedOrders ||
        previousScore.failedOrders !== score.failedOrders;
      if (
        tick % 30 === 0 ||
        tick % 900 === 599 ||
        tick % 900 === 719 ||
        changed
      )
        samples[samples.length] = snapshot.value;
      previousScore = score;
      return snapshot.serialized;
    }
    const initial = capture(0);
    invoke('render', [canvas]);
    if (
      copy(invoke('snapshot')).serialized !== initial ||
      stringify(exactScore(invoke('score'))) !== stringify(previousScore)
    )
      fail('Render changed initial simulation state or score');
    for (let tick = 0; tick < policy.ticks; tick++) {
      const frame = frames[tick];
      invoke('input', [
        freeze({
          tick: frame.tick,
          buttons: frame.buttons,
          yaw: frame.yaw,
          pitch: frame.pitch,
        }),
      ]);
      invoke('step');
      capture(tick + 1);
    }
    const finalSnapshot = copy(invoke('snapshot')).serialized;
    const finalScore = exactScore(invoke('score'));
    invoke('render', [canvas]);
    if (
      copy(invoke('snapshot')).serialized !== finalSnapshot ||
      stringify(exactScore(invoke('score'))) !== stringify(finalScore)
    )
      fail('Render changed final simulation state or score');
    const hashBytes = new Uint8ArrayType(
      await digest('SHA-256', encode(join(fullStates, '\n'))),
    );
    const hex = '0123456789abcdef';
    let hash = 'sha256:';
    for (let index = 0; index < hashBytes.length; index++)
      hash += hex[hashBytes[index] >> 4] + hex[hashBytes[index] & 15];
    return stringify(
      plain({
        stateHash: hash,
        fullTraceBytes: bytes,
        score: finalScore,
        complete: true,
        samples,
      }),
    );
  }
  return freeze(run);
}

/**
 * Local replay of manually inspected candidate source. Never a production scorer
 * or a hard process-memory sandbox. State and scores remain untrusted runtime
 * observations; behavior must be independently inspected against each rule.
 */
export async function replayCandidate({
  candidateBytes,
  expectedStage,
  parentBytes,
  wallTimeMs = 30_000,
  maxOutputBytes = MAX_RESULT_BYTES,
}) {
  if (!Number.isInteger(wallTimeMs) || wallTimeMs < 100 || wallTimeMs > 60_000)
    throw new Error(
      'Replay wall time must be between 100 and 60000 milliseconds',
    );
  if (
    !Number.isInteger(maxOutputBytes) ||
    maxOutputBytes < 1024 ||
    maxOutputBytes > MAX_RESULT_BYTES
  )
    throw new Error('Replay output must be between 1024 bytes and 32 MiB');
  if (process.platform === 'win32')
    throw new Error('Replay process-group watchdog is qualified only on POSIX');
  const intake = inspectCandidate(candidateBytes, expectedStage, parentBytes);
  const started = performance.now();
  const nonce = randomBytes(24).toString('hex');
  let server;
  let timer;
  let expired = false;
  let browserPid = null;
  let groupKillSent = false;
  function forceKill() {
    // Playwright launches this process as its own process-group leader on POSIX.
    // Only the PID returned by our own launchServer is ever targeted.
    const child = server?.process();
    if (
      !groupKillSent &&
      child?.pid &&
      child.exitCode === null &&
      child.signalCode === null
    ) {
      try {
        process.kill(-child.pid, 'SIGKILL');
        groupKillSent = true;
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  }
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      try {
        forceKill();
      } finally {
        const error = new Error(
          `Replay exceeded ${wallTimeMs} ms wall-time limit; own Chrome process group killed`,
        );
        error.browserPid = browserPid;
        reject(error);
      }
    }, wallTimeMs);
  });
  async function execute() {
    server = await chromium.launchServer({
      channel: 'chrome',
      chromiumSandbox: true,
      env: {},
      host: '127.0.0.1',
      timeout: wallTimeMs,
    });
    browserPid = server.process().pid;
    if (expired) {
      forceKill();
      throw new Error('Replay deadline expired during Chrome startup');
    }
    const browser = await chromium.connect(server.wsEndpoint(), {
      timeout: wallTimeMs,
    });
    const context = await browser.newContext({
      serviceWorkers: 'block',
      permissions: [],
      acceptDownloads: false,
    });
    const networkAttempts = [];
    await context.route('**/*', async (route) => {
      if (route.request().url() !== PARENT_URL) {
        if (networkAttempts.length < 16)
          networkAttempts.push(route.request().url().slice(0, 512));
        await route.abort('blockedbyclient');
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        headers: {
          'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-src 'self'; base-uri 'none'; object-src 'none'`,
          'Permissions-Policy':
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), display-capture=()',
        },
        body: '<!doctype html><title>Isolated local qualification replay</title><body></body>',
      });
    });
    await context.routeWebSocket('**/*', (socket) => socket.close());
    async function initializeRealm() {
      const page = await context.newPage();
      await page.goto(PARENT_URL);
      const policy = `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
      await page.evaluate(
        ({ nonce, policy, permissions }) => {
          const frame = document.createElement('iframe');
          frame.setAttribute('sandbox', 'allow-scripts');
          frame.setAttribute('allow', permissions);
          frame.referrerPolicy = 'no-referrer';
          frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><body><script nonce="${nonce}">/* trusted empty bootstrap */</script></body>`;
          document.body.append(frame);
        },
        { nonce, policy, permissions: PERMISSIONS },
      );
      const child = page
        .frames()
        .find((frame) => frame.parentFrame() === page.mainFrame());
      if (!child) throw new Error('Opaque replay iframe did not initialize');
      await child.waitForLoadState();
      const observer = await child.evaluateHandle(installObserver, {
        maxSnapshotBytes: MAX_SNAPSHOT_BYTES,
        maxTraceBytes: MAX_RESULT_BYTES,
      });
      // Start candidate diagnostics only after Playwright's context init scripts.
      // Its service-worker block can itself throw in an opaque-origin frame.
      const pageErrors = [];
      page.on('pageerror', (error) => {
        if (pageErrors.length < 8) pageErrors.push(error.message.slice(0, 512));
      });
      await child.evaluate(
        ({ source, nonce }) => {
          const script = document.createElement('script');
          script.nonce = nonce;
          script.textContent = source;
          document.body.append(script);
        },
        { source: intake.candidate.source, nonce },
      );
      return { page, observer, pageErrors };
    }
    const proposals = [
      ...intake.candidate.witnessTraceProposals,
      {
        contributionId: null,
        witnessId: 'completing-run',
        ...intake.candidate.completingTraceProposal,
      },
    ];
    const traces = [];
    let outputBytes = 0;
    async function observe(observer, frames) {
      const encoded = await observer.evaluate(
        (run, { frames, policy }) => run(frames, policy),
        { frames, policy: BENCHMARK_POLICY },
      );
      if (typeof encoded !== 'string')
        throw new Error('Replay observer returned a non-string result');
      outputBytes += Buffer.byteLength(encoded, 'utf8');
      if (outputBytes > maxOutputBytes)
        throw new Error('Replay exceeded total output byte limit');
      const run = JSON.parse(encoded);
      if (
        !/^sha256:[a-f0-9]{64}$/.test(run.stateHash) ||
        !Array.isArray(run.samples) ||
        run.samples.length > 3601
      )
        throw new Error('Replay observer result shape invalid');
      return run;
    }
    const summary = (run) => ({
      stateHash: run.stateHash,
      score: run.score,
      complete: run.complete,
    });
    for (const proposal of proposals) {
      const runs = [];
      let resetRepeat;
      for (let repeat = 0; repeat < 2; repeat++) {
        // Re-evaluate exact source in a fresh opaque realm. Reset alone cannot
        // detect startup randomness or mutable state captured outside reset().
        const { page, observer, pageErrors } = await initializeRealm();
        runs.push(await observe(observer, proposal.frames));
        if (repeat === 0)
          resetRepeat = await observe(observer, proposal.frames);
        if (pageErrors.length)
          throw new Error('Candidate browser error: ' + pageErrors[0]);
        if (networkAttempts.length)
          throw new Error(
            'Candidate attempted requests outside the synthetic parent',
          );
        if (page.url() !== PARENT_URL || context.pages().length !== 1)
          throw new Error('Replay parent navigation or popup detected');
        await page.close();
      }
      const freshInitializationDeterministic =
        runs[0].stateHash === runs[1].stateHash;
      const resetDeterministic = runs[0].stateHash === resetRepeat.stateHash;
      traces.push({
        contributionId: proposal.contributionId,
        witnessId: proposal.witnessId,
        deterministic: freshInitializationDeterministic && resetDeterministic,
        freshInitializationDeterministic,
        resetDeterministic,
        first: runs[0],
        repeat: summary(runs[1]),
        resetRepeat: summary(resetRepeat),
      });
    }
    const result = {
      status: 'replayed-unverified',
      artifactHash: sha256(candidateBytes),
      sourceHash: intake.report.sourceHash,
      browser: browser.version(),
      browserPid,
      chromiumSandbox: true,
      opaqueOrigin: true,
      freshSourceRealmsPerTrace: 2,
      sameRealmResetRunsPerTrace: 2,
      wallTimeMs,
      elapsedMs: Math.round(performance.now() - started),
      outputBytes,
      networkAttempts,
      memoryLimitQualified: false,
      osNetworkIsolationQualified: false,
      behavioralAcceptance: false,
      productionContractCompatible: false,
      sourceExecutedInNode: false,
      deterministic: traces.every((trace) => trace.deterministic),
      completingTraceHasOrder:
        traces[traces.length - 1].first.score.completedOrders > 0,
      traces,
    };
    if (Buffer.byteLength(JSON.stringify(result), 'utf8') > maxOutputBytes)
      throw new Error('Replay report exceeds output byte limit');
    return result;
  }
  try {
    return await Promise.race([execute(), deadline]);
  } finally {
    clearTimeout(timer);
    forceKill();
    if (server) await server.kill();
  }
}
