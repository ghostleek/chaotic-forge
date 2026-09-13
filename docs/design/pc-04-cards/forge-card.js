/**
 * Reusable, dependency-free card. Set element.card to a concept object.
 * Attributes: selected, committed, locked. Events bubble: forge-select, forge-inspect; event.detail.cardId identifies the concept. No room side effects.
 * Load cards.css once in the containing document.
 */
export class ForgeCard extends HTMLElement {
  static observedAttributes = ['selected', 'committed', 'locked'];
  #card;
  set card(value) { this.#card = value; this.render(); }
  get card() { return this.#card; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.updateState(); }
  emit(action) { this.dispatchEvent(new CustomEvent(`forge-${action}`, { bubbles: true, detail: { cardId: this.#card.id } })); }
  updateState() {
    const selected = this.hasAttribute('selected');
    const committed = this.hasAttribute('committed');
    const locked = this.hasAttribute('locked');
    const face = this.querySelector('.fc-face');
    if (face?.tagName === 'BUTTON') { face.setAttribute('aria-pressed', String(selected)); face.disabled = committed || locked; }
    const state = this.querySelector('.fc-state');
    if (state) state.textContent = this.#card?.blank ? '' : committed ? 'Your contribution ✓' : locked ? 'Waiting' : selected ? 'Selected ✓' : 'Preset option';
  }
  render() {
    const card = this.#card;
    if (!card) return;
    this.classList.add('forge-card');
    this.classList.toggle('fc-blank', Boolean(card.blank));
    this.replaceChildren();
    const head = document.createElement('div'); head.className = 'fc-top';
    const mark = document.createElement('span'); mark.textContent = card.blank ? 'THE WILD IDEA' : `${(card.slot || 'FORGE').toUpperCase()} / DEMO OPTION`;
    const status = document.createElement('span'); status.className = 'fc-state';
    head.append(mark, status);
    const face = document.createElement(card.blank ? 'div' : 'button'); face.className = 'fc-face';
    if (!card.blank) { face.type = 'button'; face.setAttribute('aria-label', `Select ${card.title.replaceAll('\n', ' ').replace(/\.$/, '')}`); face.addEventListener('click', () => this.emit('select')); }
    const title = document.createElement('h3'); title.className = 'fc-title'; title.textContent = card.title;
    const effect = document.createElement('p'); effect.className = 'fc-effect'; effect.textContent = card.effect;
    face.append(title, effect);
    const footer = document.createElement('div'); footer.className = 'fc-footer';
    if (card.blank) {
      footer.textContent = 'Concept only · unavailable in demo';
    } else {
      const inspect = document.createElement('button'); inspect.type = 'button'; inspect.className = 'fc-inspect'; inspect.textContent = card.demo ? 'Show me ↗' : 'Details ↗';
      inspect.setAttribute('aria-label', `${card.demo ? 'Show me' : 'Details for'} ${card.title.replaceAll('\n', ' ').replace(/\.$/, '')}`);
      inspect.addEventListener('click', () => this.emit('inspect'));
      footer.append(inspect);
    }
    this.append(head, face, footer);
    this.updateState();
  }
}
if (!customElements.get('forge-card')) customElements.define('forge-card', ForgeCard);
