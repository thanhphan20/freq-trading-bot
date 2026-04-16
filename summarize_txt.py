import os
import re

summary_dir = "/Users/golden-owl/Repo/personal-projects/ft_userdata/user_data/backtest_summaries"
files = [f for f in os.listdir(summary_dir) if f.endswith(".txt")]

bot_stats = []

for file in files:
    strat_name = file.replace("_summary.txt", "")
    filepath = os.path.join(summary_dir, file)
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "FAILED" in content:
        continue
        
    lines = content.split('\n')
    drawdown = 0.0
    sharpe = 0.0
    profit_abs = 0.0
    profit_pct = "0%"
    trades = 0
    win_rate = 0.0
    
    for line in lines:
        if "│ Absolute drawdown" in line:
            m = re.search(r'│\s+([0-9\.]+)\s+USDT', line)
            if m:
                drawdown = float(m.group(1))
        if "│ Sharpe" in line:
            m = re.search(r'│\s+(-?[0-9\.]+)\s+│', line)
            if m:
                sharpe = float(m.group(1))
            
    # Tìm dòng bảng Strategy Summary ở cuối
    for line in reversed(lines):
        if line.startswith("│ ") and "USDT" in line and "%" in line:
            parts = [p.strip() for p in line.split("│")]
            if len(parts) >= 9:
                try:
                    trades = int(parts[2])
                    profit_abs = float(parts[4])
                    profit_pct = parts[5]
                    win_str = parts[7].split()[-1]
                    win_rate = float(win_str)
                except Exception:
                    pass
            break
            
    bot_stats.append({
        "strategy": strat_name,
        "profit": profit_abs,
        "profit_pct": profit_pct,
        "trades": trades,
        "drawdown": drawdown,
        "sharpe": sharpe,
        "win_rate": win_rate
    })

# Xếp hạng theo Profit
bot_stats.sort(key=lambda x: x["profit"], reverse=True)

print(f"{'Strategy':<25} | {'Profit (USDT)':<15} | {'Profit %':<10} | {'Trades':<8} | {'Win Rate':<8} | {'Max DD':<10} | {'Sharpe':<10}")
print("-" * 105)
for bot in bot_stats[:15]: 
    print(f"{bot['strategy'][:25]:<25} | {bot['profit']:<15.2f} | {bot['profit_pct']:<10} | {bot['trades']:<8} | {bot['win_rate']:<8.1f} | {bot['drawdown']:<10.2f} | {bot['sharpe']:<10.2f}")
