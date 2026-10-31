const assert = require('node:assert/strict');
const { sizePosition } = require('../core.js');

assert.throws(() => sizePosition({
  account: Number.MAX_VALUE,
  riskPercent: 100,
  entry: 1,
  stop: 0,
  target: Number.MAX_VALUE
}), /position values outside the supported numeric range/);

console.log('Position sizing numeric overflow is rejected');
