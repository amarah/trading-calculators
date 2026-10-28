const assert = require('node:assert/strict');
const { probabilityOfProfit } = require('../core.js');

for (const driftPercent of [-100_000, 100_000]) {
  assert.throws(() => probabilityOfProfit({
    direction: 'above', spot: 100, breakeven: 100,
    volatilityPercent: 20, days: 3650, driftPercent
  }), /price range outside the supported numeric range/);
}

console.log('Probability ranges reject numeric overflow and underflow');
