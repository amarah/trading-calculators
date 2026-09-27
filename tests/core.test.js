const assert = require('node:assert/strict');
const { sizePosition, earningsSummary } = require('../core.js');

const capped = sizePosition({ account: 10_000, riskPercent: 1, entry: 100, stop: 99.90, target: 110 });
assert.equal(capped.riskShares, 1000);
assert.equal(capped.allocationShares, 100);
assert.equal(capped.shares, 100);
assert.equal(capped.capitalUsed, 10_000);
assert.equal(capped.constraint, 'Buying power');

const riskLimited = sizePosition({ account: 10_000, riskPercent: 1, entry: 100, stop: 95, target: 110 });
assert.equal(riskLimited.shares, 20);
assert.equal(riskLimited.actualRisk, 100);
assert.equal(riskLimited.constraint, 'Risk limit');

const halfAccount = sizePosition({ account: 10_000, riskPercent: 10, entry: 100, stop: 99, target: 110, maxAllocationPercent: 50 });
assert.equal(halfAccount.shares, 50);
assert.equal(halfAccount.capitalUsed, 5000);

assert.throws(() => sizePosition({ account: 10_000, riskPercent: 1, entry: 100, stop: 100, target: 110 }), /different/);
assert.throws(() => sizePosition({ account: 10_000, riskPercent: 1, entry: 0, stop: 90, target: 110 }), /positive/);

const noHistory = earningsSummary({ spot: 100, callPrice: 3, putPrice: 2, historicalMoves: ['', ' '] });
assert.equal(noHistory.impliedMove, 0.05);
assert.equal(noHistory.average, null);

const withZero = earningsSummary({ spot: 100, callPrice: 3, putPrice: 2, historicalMoves: [0, 4, 8] });
assert.equal(withZero.average, 4);
assert.equal(withZero.sampleStdDev, 0.04);

assert.throws(() => earningsSummary({ spot: 100, callPrice: -1, putPrice: 2 }), /cannot be negative/);

console.log('core calculations: 8 checks passed');
