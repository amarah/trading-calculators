const assert = require('node:assert/strict');
const { probabilityOfProfit } = require('../core.js');

for (const driftPercent of [-20, 0, 30]) {
  const inputs = { direction: 'below', spot: 100, breakeven: 100,
    volatilityPercent: 40, days: 365, driftPercent };
  const result = probabilityOfProfit(inputs);
  const lowerCDF = probabilityOfProfit({ ...inputs, breakeven: result.rangeLow }).probability;
  const upperCDF = probabilityOfProfit({ ...inputs, breakeven: result.rangeHigh }).probability;
  assert.ok(Math.abs(lowerCDF - 0.158655254) < 1e-6);
  assert.ok(Math.abs(upperCDF - 0.841344746) < 1e-6);
  const logCenter = (Math.log(result.rangeLow / 100) + Math.log(result.rangeHigh / 100)) / 2;
  assert.ok(Math.abs(logCenter - (driftPercent / 100 - 0.4 ** 2 / 2)) < 1e-12);
}
console.log('Probability range matches the displayed model');
