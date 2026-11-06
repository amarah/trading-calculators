const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../core.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace('addLeg();addLeg();calcOptions();calcRisk();calcEarnings();', '');
const elements = {
  rAcct: {value: '10000'},
  rPct: {value: '1'},
  rAlloc: {value: '100'},
  rEntry: {value: '100'},
  rStop: {value: '95'},
  rTarget: {value: '110'},
  rResults: {innerHTML: ''},
};
let keydown;
const document = {
  getElementById: id => elements[id],
  querySelectorAll: () => [],
  addEventListener(type, listener) {
    if (type === 'keydown') keydown = listener;
  },
};
vm.runInContext(script, vm.createContext({TradingCalc: api, document}), {timeout: 1000});
assert.equal(typeof keydown, 'function');

let prevented = false;
keydown({
  key: 'Enter',
  target: {
    matches: selector => selector === 'input,select',
    closest: selector => selector === 'section' ? {id: 'risk'} : null,
  },
  preventDefault() { prevented = true; },
});

assert.equal(prevented, true);
assert.match(elements.rResults.innerHTML, /Shares/);
assert.match(elements.rResults.innerHTML, />20</);

console.log('Enter calculates the active tool from its inputs');
