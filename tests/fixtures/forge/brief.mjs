// Authored fixture. Never production or observed model output.
export const brief = {
  title: 'Fixture maze combat',
  disposition: 'build',
  summary: 'Authored fixture for generation plumbing.',
  controls: 'Arrows to move; Space to fire.',
  rules: ['Collect pellets and avoid enemies.'],
  winner: 'Highest local score.',
  ties: 'Equal scores share a rank.',
  endCondition: 'Sixty seconds or no lives.',
  contributions: [
    {
      input: 'snake',
      mechanics: 'A growing trail.',
      acceptance: 'Collecting food extends the trail.',
    },
    {
      input: 'invaders',
      mechanics: 'Descending enemies.',
      acceptance: 'A shot removes an enemy.',
    },
  ],
  sources: [],
  adaptations: ['Authored test fixture; not researched.'],
  questions: [],
};
