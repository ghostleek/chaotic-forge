// Fixed authored-demo choices from PC-02 cards.ts and PC-03 initialCardSchema
// at merged base e529e74c7cbff5e63db7184734f553ae559bb27d.
// These are supported preset IDs; this local preview does not submit room commands.
export const choices = [
  { id: 'knockback', slot: 'fps', title: 'Knockback.', source: 'Authored demo · FPS / Knockback', effect: 'Aim. Fire. Push the zombie back.', interpretation: 'Aimed shots repel the nearest visible zombie and push it away.' },
  { id: 'pursuers', slot: 'zombies', title: 'Hot on\nyour heels.', source: 'Authored demo · Zombies / Pursuers', effect: 'Keep moving. The zombies follow you.', interpretation: 'Zombies pursue the player and interrupt nearby cooking through contact.' },
  { id: 'quick-orders', slot: 'cooking', title: 'Quick\norders.', source: 'Authored demo · Cooking / Quick orders', effect: 'Prepare one portion. Cook it. Deliver.', demo: 'fixed-order-rush', interpretation: 'Prepare, cook, collect and deliver one portion per valid order.' },
  { id: 'counter-ricochet', slot: 'fps', title: 'Bank\nthe shot.', source: 'Authored demo · FPS / Counter ricochet', effect: 'Bounce a shot off the marked counter.', interpretation: 'Aimed shots can reflect once from the marked counter to hit a zombie.' },
  { id: 'noise-seekers', slot: 'zombies', title: 'Dinner\ndraws a crowd.', source: 'Authored demo · Zombies / Noise seekers', effect: 'Cooking attracts the zombies.', interpretation: 'Zombies approach an active cooking station; otherwise they pursue the player.' },
  { id: 'batch-orders', slot: 'cooking', title: 'Make it\na double.', source: 'Authored demo · Cooking / Batch orders', effect: 'Prepare two portions. Cook and deliver together.', interpretation: 'Prepare two portions before cooking and deliver the batch as one valid order.' },
];
export const choiceById = (id) => choices.find((choice) => choice.id === id);
