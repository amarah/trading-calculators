const assert = require('node:assert/strict');
const { optionPrice, optionGreeks } = require('../core.js');

assert.throws(() => optionPrice({
  type: 'call', spot: 100, strike: 100, years: 100,
  rate: 10, dividendYield: -10, volatility: 0.2
}), /supported numeric range/);

assert.throws(() => optionGreeks({
  type: 'put', spot: 100, strike: 100, days: 36_500,
  ratePercent: -1000, dividendYieldPercent: 1000, volatility: 0.2
}), /supported numeric range/);

console.log('Black-Scholes numeric overflow is rejected');
