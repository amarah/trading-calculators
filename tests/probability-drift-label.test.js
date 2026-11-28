const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

assert.match(html, /<label for="pDrift">Annualized expected drift \(%\)<\/label>/);
assert.match(readme, /Expected drift is an annualized percentage/);

console.log('Probability drift horizon is explicit');
