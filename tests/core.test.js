const assert = require('node:assert/strict');
const { sizePosition, earningsSummary, probabilityOfProfit, optionPrice, impliedVolatility } = require('../core.js');

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
assert.equal(withZero.exceedance, 1 / 3);

const empirical = earningsSummary({ spot: 100, callPrice: 3, putPrice: 3, historicalMoves: [5, 6, 7, 10] });
assert.equal(empirical.exceedance, 0.75);

assert.throws(() => earningsSummary({ spot: 100, callPrice: -1, putPrice: 2 }), /cannot be negative/);

const above = probabilityOfProfit({ direction: 'above', spot: 100, breakeven: 105,
  volatilityPercent: 30, days: 30 });
const below = probabilityOfProfit({ direction: 'below', spot: 100, breakeven: 105,
  volatilityPercent: 30, days: 30 });
assert.ok(above.probability > 0 && above.probability < 1);
assert.ok(Math.abs(above.probability + below.probability - 1) < 1e-12);
assert.ok(above.rangeLow < 100 && above.rangeHigh > 100);
assert.throws(() => probabilityOfProfit({ direction: 'above', spot: 100, breakeven: 105,
  volatilityPercent: 0, days: 30 }), /greater than zero/);

const premium = optionPrice({ type: 'call', spot: 100, strike: 105, years: 30 / 365,
  rate: 0.04, dividendYield: 0, volatility: 0.35 });
const solved = impliedVolatility({ type: 'call', spot: 100, strike: 105, days: 30,
  ratePercent: 4, premium });
assert.ok(Math.abs(solved - 0.35) < 1e-7);
assert.throws(() => impliedVolatility({ type: 'call', spot: 100, strike: 80, days: 30,
  ratePercent: 0, premium: 10 }), /between/);
assert.throws(() => impliedVolatility({ type: 'put', spot: 100, strike: 100, days: 0,
  premium: 2 }), /positive/);

console.log('core calculation checks passed');
