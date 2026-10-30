const assert = require('node:assert/strict');
const { optionPayoff, multiLegPayoff } = require('../core.js');

assert.throws(() => optionPayoff({
  strategy: 'call', stockPrice: Number.MAX_VALUE, longStrike: 1,
  longPremium: 0, contractMultiplier: Number.MAX_VALUE
}), /payoff outside the supported numeric range/);

assert.throws(() => multiLegPayoff({
  stockPrice: Number.MAX_VALUE, contractMultiplier: Number.MAX_VALUE,
  legs: [{ side: 'long', type: 'call', strike: 1, premium: 0 }]
}), /payoff outside the supported numeric range/);

console.log('Payoff numeric overflow is rejected');
