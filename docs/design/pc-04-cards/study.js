import './forge-card.js';
import { blankCard } from './concepts.js';
import { choices, choiceById as conceptById } from './demo-choices.js';
import { mountMiniDemo } from './mini-demos.js';
import { worldSvg } from './world-scene.js';
import { renderPlayerWait } from './player-wait.js';
import { mountOnboarding } from './onboarding.js';
import { mountHeroSwat } from './hero-swat.js';

const $ = (id) => document.getElementById(id);
const heroSwat = mountHeroSwat($('world'), announce);
const name = (card) => card.title.replaceAll('\n', ' ').replace(/\.$/, '');
const initialHandTitle = $('hand-heading').textContent;
const handHelp = document.querySelector('.hand-header p:not(.eyebrow)');
const initialHandHelp = handHelp.textContent;
const tableTitle = document.querySelector('.stage-top h1');
const initialTableTitle = tableTitle.innerHTML;
const initialHand = choices.map((choice) => choice.id);
let hand = [...initialHand];
let selected = null;
let contributions = [];
let inspected = null;
let disposeDemo = () => {};
let dialogTrigger = null;
let inspectFocusDestination = null;

function announce(text) { $('announcement').textContent = text; }
function makeCard(card) {
  const el = document.createElement('forge-card'); el.card = card;
  el.dataset.cardId = card.id;
  el.toggleAttribute('selected', selected === card.id);
  el.toggleAttribute('committed', contributions.includes(card.id));
  el.toggleAttribute('locked', contributions.length > 0);
  return el;
}
function renderHand() { $('hand').replaceChildren(...hand.map((id) => makeCard(conceptById(id))), makeCard(blankCard)); }
function updateSelection() {
  for (const el of document.querySelectorAll('forge-card')) {
    el.toggleAttribute('selected', el.card.id === selected);
    el.toggleAttribute('committed', contributions.includes(el.card.id));
    el.toggleAttribute('locked', contributions.length > 0);
  }
  const card = conceptById(selected);
  const waiting = contributions.length > 0;
  $('hand-heading').textContent = waiting ? 'Your choice is in.' : initialHandTitle;
  handHelp.textContent = waiting ? 'Your choice is in. You can still inspect the other ideas.' : initialHandHelp;
  tableTitle.innerHTML = waiting ? 'One idea, added.' : initialTableTitle;
  $('preview').disabled = waiting || !card;
  $('preview').textContent = waiting ? '✓ Waiting for the others' : 'Preview contribution →';
  $('selection-title').textContent = waiting ? 'Your idea is in.' : card ? `${name(card)} selected.` : 'Which idea would you add?';
  $('selection-help').textContent = waiting ? 'Waiting for the others. Start again to try another idea.' : card ? 'Review your idea before adding it to the mix.' : 'Select a card to preview its contribution.';
  renderPlayerWait($('player-status'), waiting, heroSwat.play);
}
function drawWorld() {
  heroSwat.reset();
  $('world').innerHTML = worldSvg('3d', contributions.length);
}
function renderMix() {
  $('empty-mix').hidden = contributions.length > 0;
  $('game-title').textContent = contributions.length ? 'Our strange little mix.' : 'The mix starts here.';
  $('contribution-list').replaceChildren(...contributions.map((id, index) => {
    const card = conceptById(id); const item = document.createElement('li');
    const number = document.createElement('span'); number.className = 'mix-index'; number.textContent = String(index + 1).padStart(2, '0');
    const content = document.createElement('div'); const title = document.createElement('strong'); title.textContent = name(card);
    const sub = document.createElement('small'); sub.textContent = 'You · confirmed in local preview'; content.append(title, sub); item.append(number, content); return item;
  }));
  drawWorld();
}
function focusCard(id, target = '.fc-face') {
  const card = [...$('hand').querySelectorAll('forge-card')].find((el) => el.card.id === id);
  card?.querySelector(target)?.focus();
}
function selectCard(id) {
  if (!conceptById(id) || !hand.includes(id) || contributions.length > 0) return;
  selected = selected === id ? null : id;
  updateSelection();
  announce(selected ? `${name(conceptById(id))} selected. Preview contribution is available.` : 'Selection cleared.');
}
function openInspect(id, trigger) {
  const card = conceptById(id); if (!card || !hand.includes(id)) return;
  inspected = id; dialogTrigger = trigger; inspectFocusDestination = null;
  $('inspect-title').textContent = name(card); $('inspect-effect').textContent = card.effect;
  $('inspect-source').textContent = card.source; $('inspect-interpretation').textContent = card.interpretation;
  $('inspect-decision').textContent = contributions.includes(id) ? 'Confirmed by you in this local preview.' : selected === id ? 'Selected by you; not confirmed.' : 'No contribution confirmed.';
  $('inspect-select').disabled = contributions.length > 0;
  $('inspect-select').textContent = contributions.length > 0 ? 'Waiting for the others' : selected === id ? 'Keep this selection →' : 'Select this card →';
  disposeDemo(); $('demo-slot').replaceChildren();
  if (card.demo) disposeDemo = mountMiniDemo($('demo-slot'), card.demo);
  $('inspect-dialog').showModal();
}
document.addEventListener('forge-select', (event) => selectCard(event.detail.cardId));
document.addEventListener('forge-inspect', (event) => openInspect(event.detail.cardId, document.activeElement));
$('inspect-close').addEventListener('click', () => $('inspect-dialog').close());
$('inspect-dialog').addEventListener('close', () => { disposeDemo(); disposeDemo = () => {}; if (inspectFocusDestination) focusCard(inspectFocusDestination); else if (dialogTrigger?.isConnected) dialogTrigger.focus(); });
$('inspect-select').addEventListener('click', () => { const id = inspected; if (selected !== id) selectCard(id); inspectFocusDestination = id; $('inspect-dialog').close(); });
$('preview').addEventListener('click', () => {
  const card = conceptById(selected); if (!card || !hand.includes(card.id) || contributions.length > 0) return;
  $('confirm-card').textContent = name(card); $('confirm-source').textContent = card.source; $('confirm-interpretation').textContent = card.interpretation;
  $('confirm-dialog').showModal();
});
for (const id of ['confirm-close', 'confirm-cancel']) $(id).addEventListener('click', () => $('confirm-dialog').close());
$('confirm-add').addEventListener('click', () => {
  const card = conceptById(selected); if (!card || !hand.includes(card.id) || contributions.length > 0) return;
  contributions.push(card.id); selected = null; $('confirm-dialog').close();
  updateSelection(); renderMix();
  $('wait-title').focus(); announce(`${name(card)} confirmed in local preview. You are chosen. Waiting for Mira and Lance, example players. 1 of 3 choices in. No room request was sent.`);
});
$('reset').addEventListener('click', () => { hand = [...initialHand]; selected = null; contributions = []; renderHand(); updateSelection(); renderMix(); announce('Study reset. Fixed choices restored.'); });
// Old shared mode links still open this fixed presentation.
const pageUrl = new URL(window.location.href);
if (pageUrl.searchParams.has('view')) { pageUrl.searchParams.delete('view'); window.history.replaceState(null, '', pageUrl); }
renderHand(); renderMix(); updateSelection();
mountOnboarding($('onboarding'), $('show-onboarding'));
