const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../core.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace('addLeg();addLeg();calcOptions();calcRisk();calcEarnings();', '');
const fields = {oType:'bull',oSpot:'100',oK1:'100.1',oP1:'0.05',
  oK2:'100.2',oP2:'0',oQty:'1',oMult:'100',lSpot:'100',lQty:'1',lMult:'100'};
const elements = Object.fromEntries(Object.entries(fields).map(([id,value])=>[id,{value}]));
for (const id of ['oResults','lResults','oChart','lChart']) {
  elements[id] = {innerHTML:'',setAttribute(){},removeAttribute(){}};
}
const legs = [
  {side:'long',type:'call',strike:100.1,premium:0.025},
  {side:'short',type:'call',strike:100.2,premium:0},
  {side:'short',type:'call',strike:100.2,premium:0},
  {side:'long',type:'call',strike:100.3,premium:0.025}
];
const rows = legs.map(leg=>({querySelector(selector){return {value:leg[
  {'.ls':'side','.lt':'type','.lk':'strike','.lp':'premium'}[selector]]};}}));
const context = vm.createContext({TradingCalc:api,document:{
  getElementById:id=>elements[id],querySelectorAll:selector=>selector==='.legs'?rows:[]}});
vm.runInContext(script,context);
vm.runInContext('calcOptions()',context);
assert.match(elements.oResults.innerHTML,/100\.15/);
vm.runInContext('calcLegs()',context);
assert.match(elements.lResults.innerHTML,/100\.15, 100\.25/);
assert.match(elements.lResults.innerHTML,/Highest plotted P&L<\/small><strong>\$5\.00/);

const grid = api.payoffPriceGrid(100,[100.1,100.2,100.2,100.3,10,200]);
assert.equal(grid[0],50);
assert.equal(grid.at(-1),150);
assert.equal(grid.filter(x=>x===100.2).length,1);
assert.ok(grid.includes(100.1) && grid.includes(100.3));
assert.ok(grid.every((x,i)=>i===0 || x>grid[i-1]));
const points = grid.map(stockPrice=>[stockPrice,api.multiLegPayoff({stockPrice,legs})]);
const roots = api.findBreakevens(points);
assert.ok(Math.abs(roots[0]-100.15)<1e-9);
assert.ok(Math.abs(roots[1]-100.25)<1e-9);
assert.throws(()=>api.payoffPriceGrid(0,[]),/positive/);
assert.throws(()=>api.payoffPriceGrid(100,[NaN]),/number/);
console.log('Narrow payoff extrema and breakevens are retained');
