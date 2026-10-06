(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TradingCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function finiteNumber(value, name) {
    if (value === null || typeof value === 'boolean' ||
        (typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`${name} is required and must be a number.`);
    }
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
    if ((stop < entry && target <= entry) || (stop > entry && target >= entry)) {
      throw new Error('Target must be above entry for a long trade or below entry for a short trade.');
    }
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
    const exceedance = moves.filter(value => value / 100 >= impliedMove).length / moves.length;
    return { straddle, impliedMove, average, sampleStdDev, exceedance };
  }

  function optionPayoff({ strategy, stockPrice, longStrike, longPremium,
    shortStrike = 0, shortPremium = 0, contracts = 1, contractMultiplier = 100 }) {
    stockPrice = finiteNumber(stockPrice, 'Stock price');
    longStrike = finiteNumber(longStrike, 'Long strike');
    longPremium = finiteNumber(longPremium, 'Long premium');
    contracts = finiteNumber(contracts, 'Contracts');
    contractMultiplier = finiteNumber(contractMultiplier, 'Contract multiplier');
    if (!['call', 'put', 'bull', 'bear', 'straddle', 'strangle'].includes(strategy)) {
      throw new Error('Strategy is not supported.');
    }
    if (stockPrice < 0 || longStrike <= 0 || longPremium < 0 ||
        contracts <= 0 || !Number.isInteger(contracts) || contractMultiplier <= 0) {
      throw new Error('Prices and contracts must be valid nonnegative values; strikes and contracts must be positive.');
    }
    const needsShortStrike = ['bull', 'bear', 'strangle'].includes(strategy);
    const needsShortPremium = ['bull', 'bear', 'straddle', 'strangle'].includes(strategy);
    if (needsShortStrike) {
      shortStrike = finiteNumber(shortStrike, 'Short strike');
      if (shortStrike <= 0) throw new Error('Short strike must be greater than zero.');
    }
    if (needsShortPremium) {
      shortPremium = finiteNumber(shortPremium, 'Second premium');
      if (shortPremium < 0) throw new Error('Second premium cannot be negative.');
    }
    if (strategy === 'bull' && longStrike >= shortStrike) {
      throw new Error('A bull call spread needs the long strike below the short strike.');
    }
    if (strategy === 'bear' && longStrike <= shortStrike) {
      throw new Error('A bear put spread needs the long strike above the short strike.');
    }
    if (strategy === 'strangle' && longStrike >= shortStrike) {
      throw new Error('A strangle needs the put strike below the call strike.');
    }
    const call = strike => Math.max(stockPrice - strike, 0);
    const put = strike => Math.max(strike - stockPrice, 0);
    let perShare;
    if (strategy === 'call') perShare = call(longStrike) - longPremium;
    else if (strategy === 'put') perShare = put(longStrike) - longPremium;
    else if (strategy === 'bull') {
      perShare = call(longStrike) - call(shortStrike) - (longPremium - shortPremium);
    } else if (strategy === 'bear') {
      perShare = put(longStrike) - put(shortStrike) - (longPremium - shortPremium);
    } else if (strategy === 'straddle') {
      perShare = call(longStrike) + put(longStrike) - longPremium - shortPremium;
    } else {
      perShare = call(shortStrike) + put(longStrike) - longPremium - shortPremium;
    }
    return perShare * contractMultiplier * contracts;
  }

  function multiLegPayoff({ stockPrice, legs, contracts = 1, contractMultiplier = 100 }) {
    stockPrice = finiteNumber(stockPrice, 'Stock price');
    contracts = finiteNumber(contracts, 'Contracts');
    contractMultiplier = finiteNumber(contractMultiplier, 'Contract multiplier');
    if (stockPrice < 0 || contracts <= 0 || !Number.isInteger(contracts) ||
        contractMultiplier <= 0) {
      throw new Error('Stock price cannot be negative; contracts and multiplier must be positive.');
    }
    if (!Array.isArray(legs) || !legs.length) throw new Error('Add at least one option leg.');
    const perShare = legs.reduce((sum, leg, index) => {
      const side = String(leg.side).toLowerCase();
      const type = String(leg.type).toLowerCase();
      const strike = finiteNumber(leg.strike, `Leg ${index + 1} strike`);
      const premium = finiteNumber(leg.premium, `Leg ${index + 1} premium`);
      if (!['long', 'short'].includes(side) || !['call', 'put'].includes(type)) {
        throw new Error(`Leg ${index + 1} must have a valid side and option type.`);
      }
      if (strike <= 0 || premium < 0) {
        throw new Error(`Leg ${index + 1} needs a positive strike and a nonnegative premium.`);
      }
      const intrinsic = type === 'call'
        ? Math.max(stockPrice - strike, 0) : Math.max(strike - stockPrice, 0);
      return sum + (side === 'long' ? 1 : -1) * (intrinsic - premium);
    }, 0);
    return perShare * contractMultiplier * contracts;
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

  function probabilityOfProfit({ direction, spot, breakeven, volatilityPercent,
    days, driftPercent = 0 }) {
    spot = finiteNumber(spot, 'Stock price');
    breakeven = finiteNumber(breakeven, 'Breakeven price');
    const volatility = finiteNumber(volatilityPercent, 'Annualized IV') / 100;
    days = finiteNumber(days, 'Days to expiry');
    const drift = finiteNumber(driftPercent, 'Expected drift') / 100;
    if (!['above', 'below'].includes(direction)) {
      throw new Error('Profit direction must be above or below.');
    }
    if (spot <= 0 || breakeven <= 0 || volatility <= 0 || days <= 0) {
      throw new Error('Prices, annualized IV, and days to expiry must be greater than zero.');
    }
    const years = days / 365;
    const standardDeviation = volatility * Math.sqrt(years);
    const z = (Math.log(breakeven / spot) - (drift - volatility ** 2 / 2) * years)
      / standardDeviation;
    const probability = direction === 'above' ? 1 - normalCdf(z) : normalCdf(z);
    return {
      probability,
      standardDeviation,
      rangeLow: spot * Math.exp(-standardDeviation),
      rangeHigh: spot * Math.exp(standardDeviation)
    };
  }

  function findBreakevens(points) {
    if (!Array.isArray(points) || points.length < 2) return [];
    const normalized = points.map(point => {
      if (!Array.isArray(point) || point.length < 2 ||
          !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
        throw new Error('Payoff points must contain finite price and P&L values.');
      }
      return [point[0], point[1]];
    });
    for (let index = 1; index < normalized.length; index += 1) {
      if (normalized[index][0] <= normalized[index - 1][0]) {
        throw new Error('Payoff prices must be strictly increasing.');
      }
    }
    const roots = [];
    const isZero = value => Math.abs(value) <= 1e-9;
    const add = value => {
      const previous = roots[roots.length - 1];
      if (previous === undefined || Math.abs(value - previous) > 1e-8 * Math.max(1, Math.abs(value))) {
        roots.push(value);
      }
    };
    for (let index = 0; index < normalized.length; index += 1) {
      const [price, pnl] = normalized[index];
      const previousZero = index > 0 && isZero(normalized[index - 1][1]);
      const nextZero = index + 1 < normalized.length && isZero(normalized[index + 1][1]);
      if (isZero(pnl) && (!previousZero || !nextZero)) add(price);
      if (index > 0) {
        const [previousPrice, previousPnl] = normalized[index - 1];
        if (!isZero(previousPnl) && !isZero(pnl) && Math.sign(previousPnl) !== Math.sign(pnl)) {
          add(previousPrice - previousPnl * (price - previousPrice) / (pnl - previousPnl));
        }
      }
    }
    return roots.sort((left, right) => left - right);
  }

  function optionPrice({ type, spot, strike, years, rate = 0, dividendYield = 0, volatility }) {
    spot = finiteNumber(spot, 'Stock price');
    strike = finiteNumber(strike, 'Strike');
    years = finiteNumber(years, 'Time to expiry');
    rate = finiteNumber(rate, 'Risk-free rate');
    dividendYield = finiteNumber(dividendYield, 'Dividend yield');
    volatility = finiteNumber(volatility, 'Volatility');
    if (!['call', 'put'].includes(type)) throw new Error('Option type must be call or put.');
    if (spot <= 0 || strike <= 0 || years <= 0 || volatility <= 0) {
      throw new Error('Stock price, strike, time, and volatility must be positive.');
    }
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

  function optionGreeks({ type, spot, strike, days, ratePercent = 0,
    dividendYieldPercent = 0, volatility }) {
    spot = finiteNumber(spot, 'Stock price');
    strike = finiteNumber(strike, 'Strike');
    days = finiteNumber(days, 'Days to expiry');
    volatility = finiteNumber(volatility, 'Volatility');
    const rate = finiteNumber(ratePercent, 'Risk-free rate') / 100;
    const dividendYield = finiteNumber(dividendYieldPercent, 'Dividend yield') / 100;
    if (!['call', 'put'].includes(type)) throw new Error('Option type must be call or put.');
    if (spot <= 0 || strike <= 0 || days <= 0 || volatility <= 0) {
      throw new Error('Stock price, strike, time, and volatility must be positive.');
    }
    const years = days / 365;
    const rootTime = Math.sqrt(years);
    const d1 = (Math.log(spot / strike) +
      (rate - dividendYield + volatility ** 2 / 2) * years) / (volatility * rootTime);
    const d2 = d1 - volatility * rootTime;
    const density = Math.exp(-(d1 ** 2) / 2) / Math.sqrt(2 * Math.PI);
    const spotDiscount = Math.exp(-dividendYield * years);
    const strikeDiscount = Math.exp(-rate * years);
    const decay = -(spot * spotDiscount * density * volatility) / (2 * rootTime);
    const theta = type === 'call'
      ? decay - rate * strike * strikeDiscount * normalCdf(d2)
        + dividendYield * spot * spotDiscount * normalCdf(d1)
      : decay + rate * strike * strikeDiscount * normalCdf(-d2)
        - dividendYield * spot * spotDiscount * normalCdf(-d1);
    return {
      price: optionPrice({ type, spot, strike, years, rate, dividendYield, volatility }),
      delta: type === 'call' ? spotDiscount * normalCdf(d1) : -spotDiscount * normalCdf(-d1),
      gamma: spotDiscount * density / (spot * volatility * rootTime),
      theta,
      vega: spot * spotDiscount * density * rootTime
    };
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

  return { sizePosition, earningsSummary, optionPayoff, multiLegPayoff,
    probabilityOfProfit, findBreakevens, optionPrice, optionGreeks, impliedVolatility };
});
