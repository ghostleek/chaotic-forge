// TEST FIXTURE ONLY. Exercises isolation/rendering, not externally generated gameplay.
let x = 20;
self.onmessage = ({ data }) => {
  if (data.type === 'reset') x = 20;
  else x = (x + (data.keys.includes(' ') ? 20 : 5)) % 500;
  self.postMessage({ type: 'frame', status: 'playing', score: x, rects: [{ x, y: 50, w: 20, h: 20, color: '#ccff99' }], message: 'Test fixture' });
};
