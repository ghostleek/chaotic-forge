/** Exact text is intentional: edits never silently match the saved-demo shortcut. */
export const INSTRUCTION_STARTERS = [
  { title: 'Chrome Dino', text: 'Chrome offline Dino run', sprite: 'snake', hint: 'Running and spike jumps. Pair with Mario for the authored online remix; no API call.' },
  { title: 'Mario', text: 'Mario', sprite: 'bounce', hint: 'Stomps, meat power-ups and extra lives. Pair with Chrome Dino; confirm your card.' },
  { title: 'Double stomp points', text: 'Double stomp points', sprite: 'alien', hint: 'Dino remix: each stomp adds 200 points. Choose once after a round.' },
  { title: 'Double meat points', text: 'Double meat points', sprite: 'food', hint: 'Dino remix: meat adds 100 points. Choose once after a round.' },
  { title: 'Finish bonus', text: 'Finish bonus', sprite: 'bounce', hint: 'Dino remix: completing the course adds another 250 points. Choose once after a round.' },
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
