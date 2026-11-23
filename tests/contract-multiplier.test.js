const assert = require('node:assert/strict');
const { optionPayoff, multiLegPayoff } = require('../core.js');

const option = {
  strategy: 'call', stockPrice: 110, longStrike: 100, longPremium: 3,
};
const legs = [{ side: 'long', type: 'call', strike: 100, premium: 3 }];

for (const contractMultiplier of [0.5, 1.5, 99.9]) {
  assert.throws(
    () => optionPayoff({ ...option, contractMultiplier }),
    /contract multiplier must be positive whole numbers/,
  );
  assert.throws(
    () => multiLegPayoff({ stockPrice: 110, legs, contractMultiplier }),
    /contract multiplier must be positive whole numbers/,
  );
}

assert.equal(optionPayoff({ ...option, contractMultiplier: 150 }), 1050);
assert.equal(multiLegPayoff({ stockPrice: 110, legs, contractMultiplier: 150 }), 1050);

console.log('Payoff functions require whole-number contract multipliers');
