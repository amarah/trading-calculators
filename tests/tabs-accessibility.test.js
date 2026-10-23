const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace('addLeg();addLeg();calcOptions();calcRisk();calcEarnings();', '');

function classList(active = false) {
  const values = new Set(active ? ['active'] : []);
  return {
    contains: value => values.has(value),
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    }
  };
}

function element(active = false) {
  return {
    attrs: {},
    classList: classList(active),
    hidden: false,
    setAttribute(name, value) { this.attrs[name] = String(value); }
  };
}

const tablist = element();
const ids = ['options', 'risk', 'earnings', 'greeks', 'pop', 'legs'];
const panels = Object.fromEntries(ids.map(id => [id, element()]));
const tabs = ids.map((id, index) => ({
  ...element(index === 0),
  dataset: { id },
  parentElement: tablist,
  focused: false,
  focus() { this.focused = true; }
}));
const context = vm.createContext({ document: {
  getElementById: id => panels[id],
  querySelectorAll: selector => selector === '.tab' ? tabs : []
} });

vm.runInContext(script, context);

assert.equal(tablist.attrs.role, 'tablist');
assert.equal(tablist.attrs['aria-label'], 'Trading calculator sections');
for (const [index, tab] of tabs.entries()) {
  assert.equal(tab.attrs.role, 'tab');
  assert.equal(tab.attrs['aria-controls'], ids[index]);
  assert.equal(tab.attrs['aria-selected'], String(index === 0));
  assert.equal(tab.tabIndex, index === 0 ? 0 : -1);
  assert.equal(panels[ids[index]].attrs.role, 'tabpanel');
  assert.equal(panels[ids[index]].attrs['aria-labelledby'], `tab-${ids[index]}`);
  assert.equal(panels[ids[index]].hidden, index !== 0);
}

let prevented = false;
tabs[0].onkeydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(tabs[1].attrs['aria-selected'], 'true');
assert.equal(tabs[1].tabIndex, 0);
assert.equal(tabs[1].focused, true);
assert.equal(panels.risk.hidden, false);
assert.equal(panels.options.hidden, true);

tabs[1].onkeydown({ key: 'End', preventDefault() {} });
assert.equal(tabs.at(-1).attrs['aria-selected'], 'true');
assert.equal(tabs.at(-1).focused, true);
assert.equal(panels.legs.hidden, false);

tabs[2].onclick();
assert.equal(tabs[2].attrs['aria-selected'], 'true');
assert.equal(panels.earnings.hidden, false);
assert.equal(tabs.filter(tab => tab.attrs['aria-selected'] === 'true').length, 1);
assert.doesNotMatch(html, /aria-pressed/);

console.log('Tab semantics and keyboard navigation checks passed');
