# 📈 Freqtrade Alpha - Multi-Bot Dashboard 

An advanced architectural setup for [Freqtrade](https://www.freqtrade.io/) that enables running multiple strategies in parallel (Multi-bot) and aggregating their performance into a beautiful, real-time Next.js Dashboard.

## 🚀 Features
- **Multi-Bot Architecture:** Run 5 distinct Freqtrade strategies simultaneously (`BinHV45`, `ClucMay72018`, `UniversalMACD`, `SmoothScalp`, `Bandtastic`) via a single `docker-compose.multi.yml`.
- **Live Aggregator Engine:** A background Python service (`aggregator.py`) that constantly listens and aggregates completely isolated bot `sqlite` DBs into one queryable DB.
- **Deep Analytics GUI:** A Next.js frontend that calculates `Max Drawdown`, `Sharpe Ratio`, `Win Rate`, and aggregates 10,000+ trades into a clean, smooth Hourly Equity Curve.
- **Demo Mode Engine:** Support for instantly loading backtest `.zip` result data to stress test the UI without waiting.

## 🛠 Prerequisites
- Docker & Docker Compose
- Node.js 18+ & npm
- MacOS/Linux environment.

---

## 🚦 Getting Started

### 1. Launch the Multi-Bot Trading Engine (Backend)
This will spawn the 5 distinct Freqtrade instances along with the Aggregator bot. All running entirely isolated in Dry-Run.
```bash
docker compose -f docker-compose.multi.yml up -d
```

### 2. Start the Analytics Dashboard (Frontend)
```bash
cd dashboard
npm install
npm run dev
```
Navigate to `http://localhost:3000` to view your dashboard.

### 3. (Optional) Load Demo Mode
If you don't want to wait hours for the bots to naturally close dry-run trades, you can instantly populate the Dashboard UI with 8,000+ trades parsed from historical `backtest` files.
```bash
docker compose run --rm --entrypoint python3 freqtrade /freqtrade/user_data/load_demo.py
```

## 🔒 Security
- All Exchange API keys (Binance, etc.) in `config.json` are excluded from Git natively.
- `.sqlite` databases are local-only and will never push to Github.
