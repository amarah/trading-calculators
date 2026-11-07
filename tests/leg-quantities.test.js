const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { multiLegPayoff } = require('../core.js');

const ratioSpread = {
  stockPrice: 110,
  legs: [
    { side: 'long', type: 'call', strike: 100, premium: 4, quantity: 1 },
    { side: 'short', type: 'call', strike: 105, premium: 2, quantity: 2 }
  ]
};

assert.equal(multiLegPayoff(ratioSpread), 0);
assert.equal(multiLegPayoff({
  ...ratioSpread,
  contracts: 3,
  contractMultiplier: 10
}), 0);

const singleLeg = { side: 'long', type: 'call', strike: 100, premium: 4 };
assert.equal(multiLegPayoff({ stockPrice: 110, legs: [singleLeg] }), 600);
assert.throws(() => multiLegPayoff({
  stockPrice: 110,
  legs: [{ ...singleLeg, quantity: 0 }]
}), /positive whole-number quantity/);
assert.throws(() => multiLegPayoff({
  stockPrice: 110,
  legs: [{ ...singleLeg, quantity: 1.5 }]
}), /positive whole-number quantity/);

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(html, /class="lq"[^>]+aria-label="Leg \$\{n\}: Quantity"/);
assert.match(html, /quantity:r\.querySelector\('\.lq'\)\.value/);

console.log('per-leg quantity checks passed');
