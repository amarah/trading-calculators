const assert = require('node:assert/strict');
const { findBreakevens } = require('../core.js');

assert.throws(() => findBreakevens([
  [0, -Number.MAX_VALUE],
  [Number.MAX_VALUE, Number.MAX_VALUE]
]), /breakeven outside the supported numeric range/);

console.log('Breakeven interpolation rejects numeric overflow');
