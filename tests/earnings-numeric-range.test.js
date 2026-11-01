const assert = require('node:assert/strict');
const { earningsSummary } = require('../core.js');

assert.throws(() => earningsSummary({
  spot: Number.MAX_VALUE,
  callPrice: 1,
  putPrice: 1,
  historicalMoves: [Number.MAX_VALUE, Number.MAX_VALUE]
}), /earnings statistics outside the supported numeric range/);

console.log('Earnings statistics reject numeric overflow');
