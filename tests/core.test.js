const assert = require('node:assert/strict');
const { sizePosition, earningsSummary, optionPayoff, probabilityOfProfit, findBreakevens,
  optionPrice, optionGreeks, impliedVolatility } = require('../core.js');

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

assert.equal(optionPayoff({ strategy: 'call', stockPrice: 110, longStrike: 100,
  longPremium: 3, contracts: 2 }), 1400);
assert.equal(optionPayoff({ strategy: 'put', stockPrice: 90, longStrike: 100,
  longPremium: 3 }), 700);
assert.equal(optionPayoff({ strategy: 'bull', stockPrice: 120, longStrike: 100,
  longPremium: 6, shortStrike: 110, shortPremium: 2 }), 600);
assert.equal(optionPayoff({ strategy: 'bear', stockPrice: 80, longStrike: 100,
  longPremium: 6, shortStrike: 90, shortPremium: 2 }), 600);
assert.equal(optionPayoff({ strategy: 'straddle', stockPrice: 110, longStrike: 100,
  longPremium: 4, shortPremium: 3 }), 300);
assert.equal(optionPayoff({ strategy: 'strangle', stockPrice: 120, longStrike: 90,
  longPremium: 2, shortStrike: 110, shortPremium: 3 }), 500);
assert.throws(() => optionPayoff({ strategy: 'bull', stockPrice: 100, longStrike: 110,
  longPremium: 2, shortStrike: 100, shortPremium: 1 }), /long strike below/);
assert.throws(() => optionPayoff({ strategy: 'unknown', stockPrice: 100,
  longStrike: 100, longPremium: 2 }), /not supported/);

const above = probabilityOfProfit({ direction: 'above', spot: 100, breakeven: 105,
  volatilityPercent: 30, days: 30 });
const below = probabilityOfProfit({ direction: 'below', spot: 100, breakeven: 105,
  volatilityPercent: 30, days: 30 });
assert.ok(above.probability > 0 && above.probability < 1);
assert.ok(Math.abs(above.probability + below.probability - 1) < 1e-12);
assert.ok(above.rangeLow < 100 && above.rangeHigh > 100);
assert.throws(() => probabilityOfProfit({ direction: 'above', spot: 100, breakeven: 105,
  volatilityPercent: 0, days: 30 }), /greater than zero/);

assert.deepEqual(findBreakevens([[90, -10], [100, 0], [110, 10]]), [100]);
assert.deepEqual(findBreakevens([[0, -1], [4, 3]]), [1]);
assert.deepEqual(findBreakevens([[0, 1], [1, 0], [2, 0], [3, -1]]), [1, 2]);
assert.throws(() => findBreakevens([[1, 1], [1, -1]]), /strictly increasing/);

const greekInputs = { spot: 100, strike: 105, days: 60, ratePercent: 4,
  dividendYieldPercent: 2, volatility: 0.3 };
const callGreeks = optionGreeks({ type: 'call', ...greekInputs });
const putGreeks = optionGreeks({ type: 'put', ...greekInputs });
assert.ok(Math.abs(callGreeks.delta - putGreeks.delta -
  Math.exp(-0.02 * 60 / 365)) < 1e-7);
const years = greekInputs.days / 365;
const step = 1e-5;
const priceAt = time => optionPrice({ type: 'call', spot: greekInputs.spot,
  strike: greekInputs.strike, years: time, rate: 0.04, dividendYield: 0.02,
  volatility: greekInputs.volatility });
const numericalTheta = (priceAt(years - step) - priceAt(years + step)) / (2 * step);
assert.ok(Math.abs(callGreeks.theta - numericalTheta) < 1e-4);
assert.throws(() => optionGreeks({ type: 'call', ...greekInputs, volatility: 0 }), /positive/);
assert.throws(() => optionPrice({ type: 'other', spot: 100, strike: 100,
  years: 1, volatility: 0.2 }), /call or put/);
assert.throws(() => optionPrice({ type: 'call', spot: 100, strike: 100,
  years: 0, volatility: 0.2 }), /positive/);

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
