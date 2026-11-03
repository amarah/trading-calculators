const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../core.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace('addLeg();addLeg();calcOptions();calcRisk();calcEarnings();', '');
const values = {oType:'call',oSpot:'100',oK1:'100',oP1:'3',oK2:'110',oP2:'1',
  oQty:'1',oMult:'100',lSpot:'100',lQty:'1',lMult:'100'};
const elements = Object.fromEntries(Object.entries(values).map(([id,value])=>[id,{value}]));
for (const id of ['oResults','lResults','oChart','lChart']) {
  elements[id] = { innerHTML:'', attrs:{},
    setAttribute(name,value){this.attrs[name]=value;},
    removeAttribute(name){delete this.attrs[name];} };
}
const row = { querySelector: selector => ({value: ({'.ls':'Long','.lt':'Call','.lk':'100','.lp':'3'})[selector]}) };
const context = vm.createContext({TradingCalc:api,document:{
  getElementById:id=>elements[id],querySelectorAll:selector=>selector==='.legs'?[row]:[]}});
vm.runInContext(script,context);
for (const [handler, spot, chart, result] of [
  ['calcOptions','oSpot','oChart','oResults'],['calcLegs','lSpot','lChart','lResults']]) {
  vm.runInContext(handler+'()',context,{timeout:1000});
  assert.match(elements[chart].innerHTML, /<svg/);
  elements[spot].value = '';
  vm.runInContext(handler+'()',context,{timeout:1000});
  assert.match(elements[result].innerHTML,/Check inputs/);
  assert.equal(elements[chart].innerHTML,'');
  assert.equal(elements[chart].attrs['aria-label'],undefined);
  elements[spot].value='0.001';
  vm.runInContext(handler+'()',context,{timeout:1000});
  assert.doesNotMatch(elements[result].innerHTML,/Check inputs|Infinity|NaN/);
  assert.match(elements[chart].innerHTML,/<svg/);
  assert.doesNotMatch(elements[chart].innerHTML,/Infinity|NaN/);
}

for (const points of [
  [[90, 25], [110, 75]],
  [[90, -75], [110, -25]],
]) {
  vm.runInContext(`drawChart(${JSON.stringify(points)}, 'oChart')`, context, {timeout:1000});
  const zeroLine = elements.oChart.innerHTML.match(/<line[^>]* y1="([^"]+)"/);
  assert.ok(zeroLine, 'chart should include a zero-profit line');
  assert.ok(Number(zeroLine[1]) >= 25 && Number(zeroLine[1]) <= 215,
    'zero-profit line should stay inside the plotted area');
}

assert.match(elements.oChart.attrs['aria-label'], /P&L ranges from -\$75\.00 to -\$25\.00/);
console.log('Payoff charts clear invalid results, support sub-cent prices, and keep zero visible');
