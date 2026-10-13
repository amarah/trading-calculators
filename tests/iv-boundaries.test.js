const assert = require('node:assert/strict');
const { impliedVolatility, optionPrice } = require('../core.js');

for (const type of ['call', 'put']) {
  const inputs = { type, spot: 100, strike: 100, days: 365 };
  assert.throws(() => impliedVolatility({ ...inputs, premium: 0 }), /positive implied volatility/);
  const price = volatility => optionPrice({ type, spot: 100, strike: 100,
    years: 1, volatility });
  assert.throws(() => impliedVolatility({ ...inputs, premium: price(0.00005) }), /0.01% search limit/);
  assert.ok(Math.abs(impliedVolatility({ ...inputs, premium: price(0.0001) }) - 0.0001) < 1e-10);
  assert.ok(Math.abs(impliedVolatility({ ...inputs, premium: price(0.0002) }) - 0.0002) < 1e-10);
  assert.throws(() => impliedVolatility({ ...inputs, premium: 100 }), /500% search limit/);
}

// An in-the-money quote at the discounted intrinsic bound is not a measured IV.
for (const type of ['call', 'put']) {
  const spot = type === 'call' ? 110 : 90;
  const lower = Math.max(0, (type === 'call' ? 1 : -1) *
    (spot * Math.exp(-0.02) - 100 * Math.exp(-0.04)));
  assert.throws(() => impliedVolatility({ type, spot, strike: 100, days: 365,
    ratePercent: 4, dividendYieldPercent: 2, premium: lower }), /positive implied volatility/);
}
console.log('IV search boundary checks passed');
