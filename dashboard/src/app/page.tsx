"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpCircle, ArrowDownCircle, ShieldCheck, Activity, Target, Clock, TrendingDown } from "lucide-react";

export default function Dashboard() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/strategies")
      .then((res) => res.json())
      .then((data) => setStrategies(data.strategies || []));

    fetch("/api/equity-curve")
      .then((res) => res.json())
      .then((data) => {
        if (data.curve) {
          // data.curve is flat: [{strategy_id, timestamp, cumulative_profit}, ...]
          // Group by timestamp for recharts: { timestamp: "...", strat1: 10, strat2: 15 }
          const groupedData = data.curve.reduce((acc: any, row: any) => {
            if (!acc[row.timestamp]) acc[row.timestamp] = { timestamp: row.timestamp };
            acc[row.timestamp][row.strategy_id] = row.cumulative_profit;
            return acc;
          }, {});
          setChartData(Object.values(groupedData));
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
      <header className="mb-8 flex justify-between items-center bg-neutral-900 border border-neutral-800 p-5 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-3">
            <Activity className="text-blue-500 w-8 h-8" />
            Freqtrade Alpha Dashboard
          </h1>
          <p className="text-neutral-400 mt-1">Multi-bot Real-time Analytics & Equity Tracking</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-neutral-200">
            Equity Curve (USDT)
          </h2>
          <div className="h-[550px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#737373" 
                  fontSize={12} 
                  tickMargin={10} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString()}
                  minTickGap={30}
                />
                <YAxis stroke="#737373" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }}
                  itemStyle={{ color: "#e5e5e5" }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                {strategies.map((strat: any, i) => {
                  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f43f5e"];
                  return (
                    <Line
                      key={strat.strategy_id}
                      type="monotone"
                      name={strat.strategy_id}
                      dataKey={strat.strategy_id}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg overflow-hidden flex flex-col">
          <h2 className="text-xl font-semibold mb-6 text-neutral-200 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Live Rankings
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
            {strategies.map((strat: any, idx) => (
              <div key={strat.strategy_id} className="bg-neutral-950 p-5 rounded-lg border border-neutral-800 relative transition-transform hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-2 text-xs font-mono font-bold text-neutral-500 bg-neutral-900 rounded-bl-lg">
                  RANK #{idx + 1}
                </div>
                <h3 className="font-semibold text-lg text-neutral-200 truncate pr-16">{strat.strategy_name}</h3>
                <p className="text-xs text-neutral-500 mb-2">Bot: {strat.bot_name}</p>
                
                <div className="mt-3 flex justify-between items-end border-b border-neutral-800 pb-3 mb-3">
                  <div>
                    <span className={`text-2xl font-bold flex items-center gap-1 ${strat.total_profit_abs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {strat.total_profit_abs >= 0 ? <ArrowUpCircle className="w-5 h-5"/> : <ArrowDownCircle className="w-5 h-5"/>}
                      {Math.abs(strat.total_profit_abs).toFixed(2)} U
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${strat.total_profit_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                       {strat.total_profit_pct > 0 ? '+' : ''}{strat.total_profit_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <div className="text-neutral-500 flex items-center gap-1 mb-1"><Target className="w-3 h-3"/> Win Rate</div>
                    <div className="text-neutral-200 font-medium">{(strat.win_rate || 0).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 flex items-center gap-1 mb-1"><Activity className="w-3 h-3"/> Sharpe</div>
                    <div className="text-neutral-200 font-medium">{(strat.sharpe_ratio || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 flex items-center gap-1 mb-1"><TrendingDown className="w-3 h-3"/> Max DD</div>
                    <div className="text-rose-400 font-medium">{(strat.max_drawdown || 0).toFixed(2)} U</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3"/> Avg Time</div>
                    <div className="text-neutral-200 font-medium">{(strat.avg_duration_min || 0).toFixed(0)}m</div>
                  </div>
                </div>
              </div>
            ))}
            {strategies.length === 0 && (
              <div className="text-neutral-500 text-sm py-10 text-center flex items-center justify-center flex-col h-full">
                <div className="w-8 h-8 border-4 border-neutral-700 border-t-neutral-500 rounded-full animate-spin mb-4"></div>
                Waiting for backend sync...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
