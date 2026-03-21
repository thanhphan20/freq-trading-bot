#!/bin/bash

STRATEGIES=("Supertrend" "GodStra" "UniversalMACD" "Bandtastic" "Heracles" "Heracles" "CustomStoplossWithPSAR")
# We exclude NostalgiaForInfinityX7 for now as it failed with segfault

mkdir -p user_data/backtest_results

for strategy in "${STRATEGIES[@]}"; do
    echo "Running backtest for $strategy..."
    docker compose run --rm freqtrade backtesting --strategy $strategy --timeframe 5m --timerange 20251001-20260301 --config /freqtrade/user_data/config.json --export signals --export-filename user_data/backtest_results/${strategy}_results.json > user_data/backtest_results/${strategy}_summary.txt 2>&1
done
