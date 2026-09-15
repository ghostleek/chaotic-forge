import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const server = await createServer({
  configFile: false,
  envFile: false,
  appType: 'custom',
  // Match the application's Vinext next/image implementation without starting its Worker.
  resolve: {
    alias: {
      'next/image': fileURLToPath(
        new URL('../node_modules/vinext/dist/shims/image.js', import.meta.url),
      ),
    },
  },
  css: { postcss: { plugins: [] } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true },
});
after(() => server.close());
const { RoomStatus } = await server.ssrLoadModule(
  '/components/party-forge/room-status.tsx',
);
const roster = [
  {
    id: 'a',
    name: 'Kahhow',
    avatar: 'marmalade',
    presence: 'present',
    contribution: 'deciding',
  },
  {
    id: 'b',
    name: 'Mira',
    avatar: 'lilac',
    presence: 'present',
    contribution: 'chosen',
  },
  {
    id: 'c',
    name: 'Lance',
    avatar: 'tuxedo',
    presence: 'reconnecting',
    contribution: 'deciding',
  },
];
const render = (props = {}) =>
  renderToStaticMarkup(
    createElement(RoomStatus, {
      participants: roster,
      localParticipantId: 'a',
      roundNumber: 1,
      selection: {
        label: 'Private local choice',
        submitting: false,
        onConfirm() {},
      },
      ...props,
    }),
  );
const confirmDisabled = (html) =>
  /<button[^>]*disabled=""[^>]*>(?:Confirm my card|Sending|Reconnecting|Waiting for your turn|✓ Chosen)/.test(
    html,
  );

void test('selection and pending requests never become confirmed contributions', () => {
  const selected = render();
  assert.match(selected, /1 \/ 3 instructions confirmed/);
  assert.equal(confirmDisabled(selected), false);
  const pending = render({
    selection: {
      label: 'Private local choice',
      submitting: true,
      onConfirm() {},
    },
  });
  assert.match(pending, /1 \/ 3 instructions confirmed/);
  assert.match(pending, /Sending your choice/);
  assert.equal(confirmDisabled(pending), true);
  assert.doesNotMatch(pending, /Ready to play/);
});

void test('a disconnected accepted choice is retained and counted', () => {
  const html = render({
    participants: roster.map((p) =>
      p.id === 'c' ? { ...p, contribution: 'chosen' } : p,
    ),
  });
  assert.match(html, /2 \/ 3 instructions confirmed/);
  assert.match(html, /Reconnecting/);
  assert.match(html, /Choice saved/);
  assert.match(html, /Waiting for Kahhow</);
});

void test('only required editors count; upcoming editor cannot confirm', () => {
  const participants = roster.map((p, i) => ({
    ...p,
    presence: 'present',
    contribution: ['chosen', 'watching', 'up-next'][i],
  }));
  const html = render({
    participants,
    phase: 'additions',
    localParticipantId: 'c',
  });
  assert.match(html, /1 \/ 2 additions confirmed/);
  assert.match(html, /Watching/);
  assert.match(html, /Up next/);
  assert.match(html, /Waiting for Lance</);
  assert.equal(confirmDisabled(html), true);
  const watching = render({
    participants,
    phase: 'additions',
    localParticipantId: 'b',
  });
  assert.doesNotMatch(watching, /Private local choice/);
});

void test('viewer disconnection labels stale state and blocks confirmation without inventing peer absence', () => {
  const html = render({
    connection: 'reconnecting',
    participants: roster.map((p) => ({ ...p, presence: 'present' })),
  });
  assert.match(html, /Room updates paused/);
  assert.match(html, /1 \/ 3 instructions confirmed · last known/);
  assert.equal(confirmDisabled(html), true);
  assert.doesNotMatch(html, /data-status="reconnecting"/);
});

void test('error, empty roster, privacy and six-player display remain honest', () => {
  const failed = render({
    selection: {
      label: 'Private local choice',
      submitting: false,
      error: 'Choice rejected. Try again.',
      onConfirm() {},
    },
  });
  assert.match(failed, /1 \/ 3 instructions confirmed/);
  assert.match(failed, /role="alert"/);
  assert.equal(confirmDisabled(failed), false);
  const rosterMarkup = failed.match(/<ul[\s\S]*?<\/ul>/)[0];
  assert.doesNotMatch(rosterMarkup, /Private local choice/);
  assert.doesNotMatch(
    render({ localParticipantId: 'missing' }),
    /Private local choice/,
  );
  const empty = render({ participants: [] });
  assert.match(empty, /Waiting for players/);
  assert.doesNotMatch(empty, /Everyone’s idea is in|Choices complete/);
  const six = [
    ...roster,
    ...roster.map((p) => ({ ...p, id: `${p.id}-2` })),
  ].map((p) => ({ ...p, contribution: 'chosen' }));
  assert.match(render({ participants: six }), /6 \/ 6 instructions confirmed/);
  assert.equal(
    (render({ participants: six }).match(/data-player-id=/g) || []).length,
    6,
  );
});

void test('accepted status never certifies a stale local draft or error', () => {
  const participants = roster.map((p) =>
    p.id === 'a' ? { ...p, contribution: 'chosen' } : p,
  );
  for (const label of ['', 'Stale private draft']) {
    const html = render({
      participants,
      selection: {
        label,
        submitting: false,
        error: 'Old rejection',
        onConfirm() {},
      },
    });
    assert.match(html, /Your contribution is confirmed/);
    assert.match(html, /Choice saved/);
    assert.match(html, /Your choice is kept. Waiting for the others./);
    assert.doesNotMatch(
      html,
      /Stale private draft|Select a card first|Old rejection|role="alert"/,
    );
  }
});

void test('avatar choices are controlled, optional, and accessible', () => {
  assert.doesNotMatch(render(), /Use Marmalade cat/);
  const html = render({ onAvatarChange() {} });
  assert.match(html, /aria-label="Use Marmalade cat" aria-pressed="true"/);
  assert.equal((html.match(/aria-label="Use .*? cat"/g) || []).length, 6);
  assert.match(html, /aria-label="Use Midnight cat"/);
  assert.match(html, /shape-rendering="crispEdges"/);
});

void test('one confirmed participant does not complete a three-player room', () => {
  const html = render({ participants: [{ ...roster[0], contribution: 'chosen' }], expectedContributions: 3 });
  assert.match(html, /1 \/ 3 instructions confirmed/);
  assert.match(html, /Waiting for more players to join/);
  assert.doesNotMatch(html, /Everyone’s idea is in|Next comes forging/);
});
