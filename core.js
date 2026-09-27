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

  function erf(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    return sign * (1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
      - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x));
  }

  function normalCdf(value) {
    return 0.5 * (1 + erf(value / Math.SQRT2));
  }

  function optionPrice({ type, spot, strike, years, rate = 0, dividendYield = 0, volatility }) {
    const rootTime = Math.sqrt(years);
    const d1 = (Math.log(spot / strike) + (rate - dividendYield + volatility ** 2 / 2) * years)
      / (volatility * rootTime);
    const d2 = d1 - volatility * rootTime;
    return type === 'call'
      ? spot * Math.exp(-dividendYield * years) * normalCdf(d1)
        - strike * Math.exp(-rate * years) * normalCdf(d2)
      : strike * Math.exp(-rate * years) * normalCdf(-d2)
        - spot * Math.exp(-dividendYield * years) * normalCdf(-d1);
  }

  function impliedVolatility({ type, spot, strike, days, ratePercent = 0,
    dividendYieldPercent = 0, premium }) {
    spot = finiteNumber(spot, 'Stock price');
    strike = finiteNumber(strike, 'Strike');
    days = finiteNumber(days, 'Days to expiry');
    premium = finiteNumber(premium, 'Option premium');
    const rate = finiteNumber(ratePercent, 'Risk-free rate') / 100;
    const dividendYield = finiteNumber(dividendYieldPercent, 'Dividend yield') / 100;
    if (!['call', 'put'].includes(type)) throw new Error('Option type must be call or put.');
    if (spot <= 0 || strike <= 0 || days <= 0 || premium < 0) {
      throw new Error('Stock price, strike, and time must be positive; premium cannot be negative.');
    }
    const years = days / 365;
    const discountedSpot = spot * Math.exp(-dividendYield * years);
    const discountedStrike = strike * Math.exp(-rate * years);
    const lower = type === 'call'
      ? Math.max(0, discountedSpot - discountedStrike)
      : Math.max(0, discountedStrike - discountedSpot);
    const upper = type === 'call' ? discountedSpot : discountedStrike;
    const tolerance = 1e-8;
    if (premium < lower - tolerance || premium > upper + tolerance) {
      throw new Error(`Premium must be between ${lower.toFixed(2)} and ${upper.toFixed(2)}.`);
    }
    let lowVol = 0.0001;
    let highVol = 5;
    const highPrice = optionPrice({ type, spot, strike, years, rate, dividendYield, volatility: highVol });
    if (premium > highPrice + tolerance) {
      throw new Error('Implied volatility is above the 500% search limit.');
    }
    for (let index = 0; index < 80; index += 1) {
      const volatility = (lowVol + highVol) / 2;
      const price = optionPrice({ type, spot, strike, years, rate, dividendYield, volatility });
      if (price > premium) highVol = volatility;
      else lowVol = volatility;
    }
    return (lowVol + highVol) / 2;
  }

  return { sizePosition, earningsSummary, optionPrice, impliedVolatility };
});
