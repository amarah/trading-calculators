(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TradingCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function finiteNumber(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${name} must be a number.`);
    return number;
  }

  function sizePosition({ account, riskPercent, entry, stop, target, maxAllocationPercent = 100 }) {
    account = finiteNumber(account, 'Account value');
    riskPercent = finiteNumber(riskPercent, 'Risk per trade');
    entry = finiteNumber(entry, 'Entry price');
    stop = finiteNumber(stop, 'Stop price');
    target = finiteNumber(target, 'Target price');
    maxAllocationPercent = finiteNumber(maxAllocationPercent, 'Max allocation');
    if (account <= 0 || entry <= 0 || stop < 0 || target < 0) {
      throw new Error('Account value and entry must be positive; stop and target cannot be negative.');
    }
    if (riskPercent <= 0 || riskPercent > 100) {
      throw new Error('Risk per trade must be greater than 0% and no more than 100%.');
    }
    if (maxAllocationPercent <= 0 || maxAllocationPercent > 100) {
      throw new Error('Max allocation must be greater than 0% and no more than 100%.');
    }
    const riskPerShare = Math.abs(entry - stop);
    if (riskPerShare === 0) throw new Error('Entry and stop prices must be different.');
    const riskBudget = account * riskPercent / 100;
    const allocationBudget = account * maxAllocationPercent / 100;
    const riskShares = Math.floor(riskBudget / riskPerShare);
    const allocationShares = Math.floor(allocationBudget / entry);
    const shares = Math.max(0, Math.min(riskShares, allocationShares));
    return {
      riskBudget,
      allocationBudget,
      riskShares,
      allocationShares,
      shares,
      capitalUsed: shares * entry,
      actualRisk: shares * riskPerShare,
      targetPnL: shares * Math.abs(target - entry),
      rewardRisk: Math.abs(target - entry) / riskPerShare,
      constraint: allocationShares < riskShares ? 'Buying power' : 'Risk limit'
    };
  }

  function earningsSummary({ spot, callPrice, putPrice, historicalMoves = [] }) {
    spot = finiteNumber(spot, 'Stock price');
    callPrice = finiteNumber(callPrice, 'Call price');
    putPrice = finiteNumber(putPrice, 'Put price');
    if (spot <= 0 || callPrice < 0 || putPrice < 0) {
      throw new Error('Stock price must be positive; option prices cannot be negative.');
    }
    const moves = historicalMoves
      .filter(value => String(value).trim() !== '')
      .map(value => finiteNumber(value, 'Historical move'));
    if (moves.some(value => value < 0)) throw new Error('Historical moves cannot be negative.');
    const straddle = callPrice + putPrice;
    const impliedMove = straddle / spot;
    if (!moves.length) return { straddle, impliedMove, average: null, sampleStdDev: null, exceedance: null };
    const average = moves.reduce((sum, value) => sum + value, 0) / moves.length;
    const sampleStdDev = moves.length > 1
      ? Math.sqrt(moves.reduce((sum, value) => sum + (value - average) ** 2, 0) / (moves.length - 1)) / 100
      : null;
    return { straddle, impliedMove, average, sampleStdDev, exceedance: null };
  }

  return { sizePosition, earningsSummary };
});
