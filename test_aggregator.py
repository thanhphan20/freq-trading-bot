"""Minimal check for aggregator math: compounding vs summing, Sharpe scale-freedom."""
import sys
import pandas as pd

sys.path.insert(0, "user_data")
from aggregator import compound_returns, calculate_sharpe

# Issue #7 example: +50% then -50%. Sum = 0%, true compounded = -25%.
r = pd.Series([0.5, -0.5])
assert abs(compound_returns(r) - (-0.25)) < 1e-12, compound_returns(r)
assert abs(compound_returns(pd.Series([0.1, 0.1])) - 0.21) < 1e-12

# Sharpe on a return series must be scale-free (independent of stake size).
daily = pd.Series([0.01, -0.005, 0.02, -0.01, 0.015] * 10)
assert abs(calculate_sharpe(daily) - calculate_sharpe(daily * 1000)) < 1e-9

# Degenerate inputs still guarded.
assert calculate_sharpe(pd.Series([0.01] * 5)) == 0.0
assert calculate_sharpe(pd.Series([0.01])) == 0.0

print("ok")