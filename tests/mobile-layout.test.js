const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];

assert.match(style, /@media\(max-width:700px\)/);
assert.match(style, /\.legs\{grid-template-columns:1fr 1fr\}/);
assert.match(style, /\.legs button\{grid-column:1\/-1;width:100%\}/);

console.log('Multi-leg controls use a readable mobile layout');
