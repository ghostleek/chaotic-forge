// One presentation state for the whole page. Never mutates game/card state.
export function avatarSource(avatar, mode) {
  return `./assets/avatars/${avatar}${mode === '3d' ? '-3d' : ''}.svg`;
}

export function applyPresentation(mode) {
  const resolved = mode === '2d' ? '2d' : '3d';
  document.documentElement.dataset.presentation = resolved;
  for (const image of document.querySelectorAll('img[data-avatar]')) {
    image.src = avatarSource(image.dataset.avatar, resolved);
    image.alt = `${image.dataset.avatar} cat · ${resolved === '3d' ? 'sculpted vector' : 'flat sprite'}`;
  }
  // Keep the same visual mode between the overview and the card table.
  for (const link of document.querySelectorAll('a[data-presentation-link]')) {
    const destination = new URL(link.getAttribute('href'), window.location.href);
    destination.searchParams.set('view', resolved);
    link.href = destination.href;
  }
  const current = new URL(window.location.href);
  current.searchParams.set('view', resolved);
  window.history.replaceState(null, '', current);
}
