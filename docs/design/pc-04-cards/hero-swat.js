import './hero-swat.css';

// A decorative interaction only. The table remains the owner of every choice.
export function mountHeroSwat(world, announce) {
  let generation = 0;
  let animations = [];
  let extras = [];
  let scene = null;
  let trigger = null;
  world.dataset.heroState = 'idle';

  function reset() {
    generation++;
    for (const animation of animations) animation.cancel();
    animations = [];
    for (const extra of extras) extra.remove();
    extras = [];
    if (scene) scene.style.visibility = '';
    world.dataset.heroState = 'idle';
  }

  function play() {
    if (world.dataset.heroState !== 'idle') return;
    scene = world.querySelector('svg');
    if (!scene) return;
    trigger = document.activeElement;
    const current = ++generation;
    world.dataset.heroState = 'swatting';
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const bounds = world.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      world.scrollIntoView({ block: 'center', behavior: 'instant' });
    }

    const cat = document.createElement('div');
    cat.className = 'hero-swat-cat';
    cat.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = '/party-forge/avatars/lilac.svg';
    image.alt = '';
    const paw = document.createElement('span');
    paw.className = 'hero-swat-paw';
    cat.append(image, paw);

    const recovery = document.createElement('div');
    recovery.className = 'hero-swat-recovery';
    recovery.hidden = true;
    const caption = document.createElement('p');
    caption.textContent = 'Mira got a little carried away.';
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.textContent = 'Bring it back ↶';
    restore.addEventListener('click', () => {
      reset();
      if (trigger?.isConnected) trigger.focus();
      announce('The world is back. Your choice is unchanged.');
    });
    recovery.append(caption, restore);
    world.append(cat, recovery);
    extras = [cat, recovery];

    function finish() {
      if (generation !== current) return;
      world.dataset.heroState = 'away';
      scene.style.visibility = 'hidden';
      cat.hidden = true;
      recovery.hidden = false;
      // Keep focus with this interaction only if the user has not moved on.
      if (document.activeElement === trigger)
        restore.focus({ preventScroll: true });
      announce(
        'Mira swatted the illustrative world away. Your choice is unchanged. Bring it back is available.',
      );
    }
    if (reduced) {
      finish();
      return;
    }
    animations = [
      cat.animate(
        [
          {
            transform: 'translate(-150%, 90%) rotate(-18deg)',
            opacity: 0,
            offset: 0,
          },
          {
            transform: 'translate(-20%, -12%) rotate(-12deg)',
            opacity: 1,
            offset: 0.28,
          },
          {
            transform: 'translate(22%, 0) rotate(12deg)',
            opacity: 1,
            offset: 0.42,
          },
          {
            transform: 'translate(14%, 0) rotate(-8deg)',
            opacity: 1,
            offset: 0.62,
          },
          {
            transform: 'translate(-140%, 90%) rotate(-18deg)',
            opacity: 0,
            offset: 1,
          },
        ],
        { duration: 1800, easing: 'ease-in-out', fill: 'forwards' },
      ),
      paw.animate(
        [
          { transform: 'scaleX(.25) rotate(35deg)' },
          { transform: 'scaleX(1) rotate(-30deg)', offset: 0.45 },
          { transform: 'scaleX(.3) rotate(30deg)' },
        ],
        { duration: 480, delay: 450, fill: 'both', easing: 'ease-out' },
      ),
      scene.animate(
        [
          { transform: 'translateX(0) rotate(0deg)', offset: 0 },
          { transform: 'translateX(-5px) rotate(-2deg)', offset: 0.08 },
          { transform: 'translateX(120vw) rotate(24deg)', offset: 1 },
        ],
        {
          duration: 850,
          delay: 620,
          fill: 'forwards',
          easing: 'cubic-bezier(.45,0,.8,.4)',
        },
      ),
    ];
    void Promise.all(animations.map((animation) => animation.finished))
      .then(finish)
      .catch(() => {
        // Reset and redraw cancel in-flight animations without changing table state.
      });
  }

  window.addEventListener('resize', () => {
    if (world.dataset.heroState === 'swatting') reset();
  });
  return { play, reset };
}
