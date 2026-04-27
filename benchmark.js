const numShapes = 10000;
const shapes = [];
for (let i = 0; i < numShapes; i++) {
  shapes.push({ type: 'rect', x: 10, y: 10, w: 100, h: 100, stroke: '#000000', fill: 'transparent', lineWidth: 2 });
}

console.log(`Benchmarking deep copy for ${numShapes} objects...`);

const startJson = performance.now();
for (let i = 0; i < 100; i++) {
  JSON.parse(JSON.stringify(shapes));
}
const endJson = performance.now();
console.log(`JSON.parse(JSON.stringify): ${(endJson - startJson).toFixed(2)} ms`);

const startClone = performance.now();
for (let i = 0; i < 100; i++) {
  structuredClone(shapes);
}
const endClone = performance.now();
console.log(`structuredClone: ${(endClone - startClone).toFixed(2)} ms`);
