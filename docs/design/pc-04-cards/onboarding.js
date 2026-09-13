const dismissalKey = 'forge-card-onboarding-dismissed';
let dismissedInMemory = false;

function wasDismissed() {
  try {
    return dismissedInMemory || sessionStorage.getItem(dismissalKey) === 'true';
  } catch {
    return dismissedInMemory;
  }
}

/** Mount one introduction per page. The opener can restore it at any time. */
export function mountOnboarding(container, opener) {
  if (!container) return () => {};

  container.innerHTML = `
    <section class="forge-onboarding" aria-labelledby="onboarding-title">
      <div class="onboarding-copy">
        <p class="onboarding-eyebrow">BEFORE YOUR FIRST CARD</p>
        <h2 id="onboarding-title" tabindex="-1">A little idea. A whole new game.</h2>
        <p class="onboarding-instruction">Pick one fixed demo option, read its details, then confirm. Together, choose one FPS, one zombie, and one cooking option.</p>
        <p class="onboarding-preview">This is a local preview. Other players are examples; your choices stay in this browser.</p>
      </div>
      <button class="onboarding-start" type="button">Let’s play <span aria-hidden="true">→</span></button>
      <button class="onboarding-dismiss" type="button" aria-label="Dismiss introduction"><span aria-hidden="true">×</span></button>
    </section>`;

  const start = container.querySelector('.onboarding-start');
  const close = container.querySelector('.onboarding-dismiss');
  const title = container.querySelector('#onboarding-title');

  function setVisible(visible) {
    container.hidden = !visible;
    opener?.setAttribute('aria-expanded', String(visible));
  }

  function dismiss() {
    dismissedInMemory = true;
    try {
      sessionStorage.setItem(dismissalKey, 'true');
    } catch {
      // Dismissal still works when browser storage is unavailable.
    }
    setVisible(false);
    document.getElementById('hand-heading')?.focus();
  }

  function show() {
    setVisible(true);
    title.focus();
  }

  if (container.id) opener?.setAttribute('aria-controls', container.id);
  setVisible(!wasDismissed());
  start.addEventListener('click', dismiss);
  close.addEventListener('click', dismiss);
  opener?.addEventListener('click', show);

  return () => {
    start.removeEventListener('click', dismiss);
    close.removeEventListener('click', dismiss);
    opener?.removeEventListener('click', show);
  };
}
