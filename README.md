# Trading Calculators

A small collection of browser-based tools for practical trading analysis. No backend, API keys, or market-data connection required.

## Included

- **Options Payoff Calculator:** estimates expiration P&L and breakevens for long calls, long puts, vertical spreads, straddles, and strangles. The contract multiplier is configurable for adjusted contracts.
- **Position Sizing & Risk Calculator:** sizes a trade from the account risk limit and stop distance, then caps shares at the chosen account-allocation limit. It reports which limit controls the result.
- **Earnings Move Calculator:** estimates the move implied by an ATM straddle. Historical moves are optional; when supplied, the calculator compares the implied move with the sample.
- **Greeks & IV Calculator:** solves implied volatility and reports Black-Scholes price, delta, gamma, theta, and vega.
- **Probability of Profit Calculator:** estimates the chance of finishing above or below one breakeven under a lognormal model.
- **Multi-Leg Builder:** combines custom long and short call or put legs and charts expiration P&L, with a configurable contract multiplier.

## Run locally

Open `index.html` in a browser. Everything runs on the client.

## Tests

The calculations and page input handlers have dependency-free Node tests:

```bash
node --test tests/*.test.js
```

## Limits

Payoff charts include each option strike within the displayed 50% to 150%
price range. This preserves tight spreads and narrow profit zones when
calculating plotted extrema and breakevens. Results still exclude prices
outside that range and breakevens are rounded for display.

The probability calculator's one-standard-deviation price range uses the same
drift and volatility as its probability estimate. It spans approximately the
16th through 84th percentiles of the modeled terminal price, not a symmetric
band around today's price.

The IV solver searches annualized volatility from 0.01% through 500%. Premiums
at or below discounted intrinsic value, or below the price at the minimum
volatility, produce an input error instead of a misleading floor estimate.
The page does not display Greeks for those quotes.

Results omit commissions, taxes, slippage, liquidity, assignment risk, discrete dividends, and model error unless a calculator says otherwise. The position-sizing tool assumes whole shares and does not model margin. Probability estimates are model outputs, not forecasts.
