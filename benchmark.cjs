const { performance } = require('perf_hooks');

const shapes = [];
for (let i = 0; i < 10000; i++) {
  shapes.push({
    type: 'rect',
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    w: Math.random() * 100,
    h: Math.random() * 100,
    stroke: '#06d6a0',
    fill: 'transparent',
    lineWidth: 2
  });
}

function benchJson() {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    JSON.parse(JSON.stringify(shapes));
  }
  const end = performance.now();
  return end - start;
}

function benchClone() {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    structuredClone(shapes);
  }
  const end = performance.now();
  return end - start;
}

console.log(`JSON.parse/stringify: ${benchJson()}ms`);
console.log(`structuredClone: ${benchClone()}ms`);
