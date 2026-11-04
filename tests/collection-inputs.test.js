const assert = require('node:assert/strict');
const { earningsSummary, payoffPriceGrid, findBreakevens } = require('../core.js');

assert.throws(() => earningsSummary({
  spot: 100,
  callPrice: 3,
  putPrice: 2,
  historicalMoves: '5,6,7'
}), /Historical moves must be supplied as a list/);

assert.throws(() => payoffPriceGrid(100, '90,110'), /Strikes must be supplied as a list/);
assert.throws(() => findBreakevens('90,-10;110,10'), /Payoff points must be supplied as a list/);

const sparseStrikes = Array(1);
assert.throws(() => payoffPriceGrid(100, sparseStrikes), /Strike is required/);

const sparsePoints = Array(2);
assert.throws(() => findBreakevens(sparsePoints), /finite price and P&L/);

console.log('Collection inputs reject malformed and sparse values');
