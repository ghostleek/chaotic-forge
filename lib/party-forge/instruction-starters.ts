/** Exact text is intentional: edits never silently match the saved-demo shortcut. */
export const INSTRUCTION_STARTERS = [
  {
    title: 'Snake',
    text: 'Snake',
    sprite: 'snake',
    hint: 'Growing snake. Pair with Space Invaders for the saved demo; no API call.',
  },
  {
    title: 'Space Invaders',
    text: 'Space Invaders',
    sprite: 'alien',
    hint: 'Descending aliens and shooting. Pair with Snake in either order for the saved demo.',
  },
  {
    title: 'Bounce',
    text: 'Bounce a ball between platforms and collect food. Steer left and right.',
    sprite: 'bounce',
    hint: 'Custom platform movement. Requires your API key or an authenticated admin.',
  },
  {
    title: 'Wraparound',
    text: 'Let the player wrap around the edges instead of hitting a wall.',
    sprite: 'bounce',
    hint: 'Custom modifier: preserve earlier rules and add edge wrapping. Requires API access.',
  },
  {
    title: 'Invader obstacles',
    text: 'Add slow descending invaders as obstacles to avoid.',
    sprite: 'alien',
    hint: 'Custom modifier: aliens become obstacles. Requires API access.',
  },
  {
    title: 'High stakes',
    text: 'Make collecting food valuable, but deduct points each time we get hit.',
    sprite: 'food',
    hint: 'Custom scoring: valuable food and a hit penalty. Requires API access.',
  },
] as const;
