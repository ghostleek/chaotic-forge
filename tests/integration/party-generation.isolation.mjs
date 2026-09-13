import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { chromium } from '@playwright/test';

// Local authored boundary smoke only. This is not the production runtime, a
// generated-build qualification, a trusted scorer, or a CPU/memory sandbox.
// References: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
// https://playwright.dev/docs/api/class-browsercontext#browser-context-route
const parentUrl = 'https://forge-parent.invalid/';
const scriptNonce = 'pc09a-authored-probe';
const resultKeys = [
  'parentDomDenied',
  'parentCookieDenied',
  'parentStorageDenied',
  'ownCookieDenied',
  'ownStorageDenied',
  'topNavigationDenied',
  'popupDenied',
  'fetchDenied',
  'geolocationDenied',
];

test(
  'authored iframe probe cannot access parent state, navigate, or make fetch/frame requests',
  {
    timeout: 30_000,
  },
  async (t) => {
    const source = await readFile(
      new URL(
        '../fixtures/party-generated-builds/isolation-probe.js',
        import.meta.url,
      ),
      'utf8',
    );
    const browser = await chromium.launch({
      channel: 'chrome',
      chromiumSandbox: true,
    });
    t.after(() => browser.close());
    const context = await browser.newContext({
      serviceWorkers: 'block',
      permissions: [],
    });
    const routedRequests = [];
    const requestEvents = [];
    context.on('request', (request) => requestEvents.push(request.url()));
    // No server and no live network: fulfill the parent and abort every other
    // context request. Unexpected requests fail the assertions below, so the
    // test cannot mistake this defensive interception for working iframe CSP.
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      routedRequests.push(url);
      if (url !== parentUrl) {
        await route.abort('blockedbyclient');
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        headers: {
          'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${scriptNonce}'; frame-src 'self'; connect-src https:; base-uri 'none'; object-src 'none'`,
          'Permissions-Policy':
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), display-capture=()',
        },
        body: '<!doctype html><title>PC09A authored boundary probe</title><main id="sentinel">parent intact</main>',
      });
    });
    const page = await context.newPage();
    await page.goto(parentUrl);
    const framePolicy = `default-src 'none'; script-src 'nonce-${scriptNonce}'; connect-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
    const srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${framePolicy}"><title>Authored probe</title><body><script nonce="${scriptNonce}">${source}</script></body>`;
    await page.evaluate(
      ({ srcdoc, resultKeys }) => {
        document.cookie = 'sentinel=parent-only; SameSite=Strict; Secure';
        localStorage.setItem('sentinel', 'parent-only');
        const frame = document.createElement('iframe');
        frame.id = 'authored-probe';
        frame.title = 'Authored isolation probe';
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.setAttribute(
          'allow',
          "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'; display-capture 'none'",
        );
        frame.referrerPolicy = 'no-referrer';
        window.probeMessages = {
          accepted: [],
          rejectedSource: 0,
          rejectedShape: 0,
        };
        const exactKeys = (value, keys) =>
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value).length === keys.length &&
          keys.every((key) => Object.hasOwn(value, key));
        window.addEventListener('message', (event) => {
          // A sandbox without allow-same-origin has an opaque origin; "null"
          // alone is insufficient because another opaque frame could spoof it.
          if (event.source !== frame.contentWindow || event.origin !== 'null') {
            window.probeMessages.rejectedSource++;
            return;
          }
          const data = event.data;
          if (
            !exactKeys(data, ['type', 'results', 'violations']) ||
            data.type !== 'pc09a-isolation-probe/v1' ||
            !exactKeys(data.results, resultKeys) ||
            !resultKeys.every(
              (key) => typeof data.results[key] === 'boolean',
            ) ||
            !Array.isArray(data.violations) ||
            data.violations.length > 8 ||
            !data.violations.every(
              (value) => typeof value === 'string' && value.length <= 40,
            )
          ) {
            window.probeMessages.rejectedShape++;
            return;
          }
          // These are untrusted diagnostic claims, never a score or authority.
          window.probeMessages.accepted.push(data);
        });
        frame.srcdoc = srcdoc;
        document.body.append(frame);
      },
      { srcdoc, resultKeys },
    );

    await page.waitForFunction(
      () => window.probeMessages.accepted.length === 1,
      null,
      {
        timeout: 10_000,
      },
    );
    const message = await page.evaluate(() => window.probeMessages.accepted[0]);
    assert.deepEqual(
      message.results,
      Object.fromEntries(resultKeys.map((key) => [key, true])),
    );
    assert.ok(
      message.violations.includes('connect-src'),
      'fetch must produce a CSP violation',
    );
    assert.ok(
      message.violations.includes('frame-src'),
      'nested frame must produce a CSP violation',
    );

    // Reject a valid-shaped report from the wrong window, then a malformed
    // report from the actual opaque-origin child. Neither enters accepted data.
    await page.evaluate(
      (message) => window.postMessage(message, location.origin),
      message,
    );
    const child = page
      .frames()
      .find((frame) => frame.parentFrame() === page.mainFrame());
    assert.ok(child, 'sandboxed child exists');
    await child.evaluate(() =>
      parent.postMessage(
        {
          type: 'pc09a-isolation-probe/v1',
          results: { score: 999999 },
          violations: [],
        },
        'https://forge-parent.invalid',
      ),
    );
    await page.waitForFunction(
      () =>
        window.probeMessages.rejectedSource === 1 &&
        window.probeMessages.rejectedShape === 1,
    );
    assert.equal(
      await page.evaluate(() => window.probeMessages.accepted.length),
      1,
    );
    assert.equal(page.url(), parentUrl);
    assert.equal(context.pages().length, 1, 'no popup may be created');
    assert.deepEqual(
      await page.evaluate(() => ({
        text: document.querySelector('#sentinel').textContent,
        cookie: document.cookie,
        storage: localStorage.getItem('sentinel'),
      })),
      {
        text: 'parent intact',
        cookie: 'sentinel=parent-only',
        storage: 'parent-only',
      },
    );
    assert.deepEqual(
      routedRequests,
      [parentUrl],
      'no external request may reach the route guard',
    );
    assert.deepEqual(
      requestEvents,
      [parentUrl],
      'no other context request may be observed',
    );
    t.diagnostic(
      `Chrome ${browser.version()}; authored probe; 9 denials; connect/frame CSP violations; 2 rejected messages; 0 external context requests.`,
    );
  },
);
