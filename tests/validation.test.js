const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../core.js');

const long = { account: 10000, riskPercent: 1, entry: 100, stop: 95, target: 110 };
const short = { ...long, stop: 105, target: 90 };
assert.equal(api.sizePosition(short).targetPnL, 200);
assert.equal(api.sizePosition(long).rewardRisk, 2);
for (const target of [90, 100]) assert.throws(() => api.sizePosition({ ...long, target }), /Target must/);
for (const target of [100, 110]) assert.throws(() => api.sizePosition({ ...short, target }), /Target must/);

for (const missing of ['', ' ', null, undefined, false, []]) {
  assert.throws(() => api.earningsSummary({spot: 100, callPrice: missing, putPrice: 2}), /required/);
  assert.throws(() => api.sizePosition({...long, stop: missing}), /required/);
  assert.throws(() => api.impliedVolatility({type: 'call', spot: 100, strike: 100, days: 30, premium: missing}), /required/);
}
assert.equal(api.earningsSummary({spot: '100', callPrice: '0', putPrice: '2'}).straddle, 2);
assert.equal(api.earningsSummary({spot: 100, callPrice: 0, putPrice: 2, historicalMoves: ['', ' ', 0]}).average, 0);

// Exercise the actual page handler so blank fields cannot be coerced to zero
// before reaching core validation.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fields = { gType: 'call', gS: '100', gK: '100', gPrem: '', gDays: '30', gR: '0', gQ: '0' };
const elements = Object.fromEntries(Object.entries(fields).map(([id, value]) => [id, {value}]));
elements.gResults = {innerHTML: ''};
const context = vm.createContext({ TradingCalc: api, document: {
  getElementById: id => elements[id], querySelectorAll: () => []
}});
vm.runInContext(script.replace('addLeg();addLeg();calcOptions();calcRisk();calcEarnings();', ''), context);
vm.runInContext('calcGreeks()', context);
assert.match(elements.gResults.innerHTML, /Option premium is required/);

Object.assign(elements, {
  oType: {value: 'call'}, oSpot: {value: ''}, oK1: {value: '100'}, oP1: {value: '2'},
  oK2: {value: ''}, oP2: {value: ''}, oQty: {value: '1'}, oResults: {innerHTML: ''}
});
vm.runInContext('calcOptions()', context);
assert.match(elements.oResults.innerHTML, /Stock price is required/);

Object.assign(elements, {
  oType: {value: 'bear'}, oSpot: {value: '100'}, oK1: {value: '95'}, oP1: {value: '4'},
  oK2: {value: '105'}, oP2: {value: '1'}, oQty: {value: '1'}, oResults: {innerHTML: ''}
});
vm.runInContext('calcOptions()', context);
assert.match(elements.oResults.innerHTML, /long strike above the short strike/);
console.log('input validation and page handler regression tests passed');
