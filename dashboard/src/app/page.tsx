"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, ZAxis, Brush 
} from "recharts";
import { 
  ArrowUpCircle, ArrowDownCircle, ShieldCheck, Activity, 
  Target, Clock, TrendingDown, Maximize2, X, Filter, Eye, EyeOff, Loader2
} from "lucide-react";

import EquityCurve from "@/components/charts/EquityCurve";
import DailyPerformance from "@/components/charts/DailyPerformance";
import RiskReturnScatter from "@/components/charts/RiskReturnScatter";

interface Strategy {
  strategy_id: string;
  strategy_name: string;
  bot_name: string;
  total_profit_abs: number;
  total_profit_pct: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  avg_duration_min: number;
  abs_profit: number;
}

interface ChartRow {
  timestamp: string;
  [key: string]: string | number;
}

interface DailyRow {
  date: string;
  [key: string]: string | number;
}

interface RawCurveRow {
  timestamp: string;
  strategy_id: string;
  cumulative_profit: number;
}

interface RawPerformanceRow {
  date: string;
  strategy_id: string;
  daily_profit_abs: number;
}

interface DemoData {
  generated_at: string;
  strategies: Strategy[];
  equityCurve: RawCurveRow[];
  dailyPerformance: RawPerformanceRow[];
}

import { IS_DEMO_MODE } from "@/lib/db";
import demoDataImport from "@/data/demo_data.json";
const demoData = demoDataImport as unknown as DemoData;

const COLORS = ["#3b82f6", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#f472b6", "#2dd4bf", "#fb7185", "#e5e7eb", "#818cf8"];


export default function Dashboard() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // 1. Fetch Strategies
    fetch("/api/strategies")
      .then((res) => res.json())
      .then((data) => {
        const strats = (data.strategies || []).map((s: Strategy) => ({
          ...s,
          abs_profit: Math.abs(s.total_profit_abs || 0)
        }));
        setStrategies(strats);
        setSelectedIds(strats.map((s: Strategy) => s.strategy_id));
      });

    // 2. Fetch Equity Curve
    fetch("/api/equity-curve")
      .then((res) => res.json())
      .then((data) => {
        const raw = data.curve || [];
        // Group by timestamp to create multi-line chart data
        const grouped: { [key: string]: ChartRow } = {};
        raw.forEach((row: RawCurveRow) => {
          if (!grouped[row.timestamp]) {
            grouped[row.timestamp] = { timestamp: row.timestamp };
          }
          grouped[row.timestamp][row.strategy_id] = row.cumulative_profit;
        });
        
        const sorted = Object.values(grouped).sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // OPTIMIZATION: If data is too dense, decimate it (keep every 2nd point)
        const optimized = sorted.length > 500 
          ? sorted.filter((_, i) => i % 2 === 0) 
          : sorted;

        setChartData(optimized);
      });

    // 3. Fetch Daily Performance
    fetch("/api/daily-performance")
      .then((res) => res.json())
      .then((data) => {
        const raw = data.performance || [];
        const grouped: { [key: string]: DailyRow } = {};
        raw.forEach((row: RawPerformanceRow) => {
          if (!grouped[row.date]) {
            grouped[row.date] = { date: row.date };
          }
          grouped[row.date][row.strategy_id] = row.daily_profit_abs;
        });
        setDailyData(Object.values(grouped).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ));
      });
  }, []);

  // Filtered computed values
  const filteredStrategies = useMemo(() => 
    strategies.filter(s => selectedIds.includes(s.strategy_id)),
    [strategies, selectedIds]
  );

  const toggleStrategy = (id: string) => {
    setIsToggling(true);
    // Use a small delay to allow the spinner to render before the heavy chart update
    setTimeout(() => {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
      // Wait for the next tick to turn off the spinner
      setTimeout(() => setIsToggling(false), 100);
    }, 10);
  };

  const toggleAll = () => {
    if (selectedIds.length === strategies.length) setSelectedIds([]);
    else setSelectedIds(strategies.map(s => s.strategy_id));
  };

  const isCloud = !IS_DEMO_MODE && strategies.length > 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
      
      {/* Fullscreen Overlay */}
      {fullscreenChart && (
        <div className="fixed inset-0 z-50 bg-neutral-950/98 flex flex-col p-8 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-neutral-100 flex items-center gap-4">
              <Maximize2 className="w-8 h-8 text-blue-500" /> 
              {fullscreenChart === 'equity' ? 'Equity Curve Analysis' : 
               fullscreenChart === 'daily' ? 'Daily PnL Distribution' :
               fullscreenChart === 'winrate' ? 'Risk & Reward Matrix' : ''}
            </h2>
            <button 
              onClick={() => setFullscreenChart(null)}
              className="p-3 bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 rounded-full transition-all hover:rotate-90 cursor-pointer"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          <div className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 shadow-2xl min-h-0">
            {fullscreenChart === 'equity' && (
              <EquityCurve 
                data={chartData} 
                strategies={strategies} 
                selectedIds={selectedIds} 
                colors={COLORS} 
              />
            )}
            {fullscreenChart === 'daily' && (
              <DailyPerformance 
                data={dailyData} 
                strategies={strategies} 
                selectedIds={selectedIds} 
                colors={COLORS} 
              />
            )}
          </div>
        </div>
      )}

      {/* Header & Brand */}
      <header className="mb-8 flex flex-col lg:flex-row justify-between lg:items-center bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-blue-500/10 transition-colors" />
        
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Activity className="text-blue-500 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-100 font-mono">
                AlphaVault<span className="text-blue-500">_</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-widest flex items-center gap-1.5 ${
                  IS_DEMO_MODE ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {isCloud && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                  {IS_DEMO_MODE ? "Historical Data" : "Cloud Sync Active"}
                </span>
                <p className="text-neutral-500 text-xs">
                  {IS_DEMO_MODE 
                    ? `Backtest: ${new Date(demoData.generated_at).toLocaleDateString()}`
                    : "Live performance aggregator"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 lg:mt-0 flex items-center gap-4 relative z-10">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-1">Total Strategies</span>
              <span className="text-2xl font-bold text-neutral-200">{strategies.length}</span>
           </div>
           <div className="w-[1px] h-10 bg-neutral-800 mx-2" />
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-1">Status</span>
              <span className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> SECURE
              </span>
           </div>
        </div>
      </header>

      {/* Model Filtering Section */}
      <div className="mb-8 bg-neutral-900/40 border border-neutral-800/50 p-4 rounded-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-neutral-400 text-sm font-medium">
            <Filter className="w-4 h-4" />
            <span>Strategy Selector</span>
          </div>
          <button 
            onClick={toggleAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-1 cursor-pointer"
          >
            {selectedIds.length === strategies.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {strategies.map((strat, i) => {
            const isSelected = selectedIds.includes(strat.strategy_id);
            return (
              <button
                key={strat.strategy_id}
                onClick={() => toggleStrategy(strat.strategy_id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? "bg-neutral-800 border-neutral-700 text-neutral-100" 
                    : "bg-transparent border-neutral-800 text-neutral-500 grayscale opacity-50 hover:opacity-80"
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? COLORS[i % COLORS.length] : "#404040" }} />
                {strat.strategy_name}
                {isSelected ? <Eye className="w-3 h-3 text-neutral-400" /> : <EyeOff className="w-3 h-3 text-neutral-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* Main Equity Chart */}
        <div className="xl:col-span-2 flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative group min-w-0">
          <button 
            onClick={() => setFullscreenChart('equity')} 
            className="absolute top-6 right-6 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
            title="Maximize View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-500" /> Equity Curve <span className="text-neutral-500 font-normal text-sm font-mono">(USDT)</span>
            </h2>
            <div className="flex gap-4">
               <div className="text-right">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Selected Profit</div>
                  <div className={`text-sm font-bold ${filteredStrategies.reduce((a, b) => a + (b.total_profit_abs || 0), 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {filteredStrategies.reduce((a, b) => a + (b.total_profit_abs || 0), 0).toFixed(2)} U
                  </div>
               </div>
            </div>
          </div>
          <div className="flex-1 min-h-[450px] w-full min-w-0 relative">
            {isToggling && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-xl transition-all">
                <div className="flex flex-col items-center gap-3 bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800 shadow-2xl">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Syncing...</span>
                </div>
              </div>
            )}
            <EquityCurve 
              data={chartData} 
              strategies={strategies} 
              selectedIds={selectedIds} 
              colors={COLORS} 
            />
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[600px] min-w-0">
          <h2 className="text-xl font-bold mb-8 text-neutral-100 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Performance Leaderboard
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
            {filteredStrategies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 italic text-sm text-center">
                <EyeOff className="w-8 h-8 mb-3 opacity-20" />
                Select strategies to compare performance
              </div>
            ) : (
              filteredStrategies.map((strat, idx) => (
                <div key={strat.strategy_id} className="bg-neutral-950/50 p-5 rounded-xl border border-neutral-800/50 relative transition-all hover:bg-neutral-800/30 hover:border-blue-500/30 group">
                  <div className="absolute top-0 right-0 p-2 text-[10px] font-mono font-bold text-neutral-600 bg-neutral-900 rounded-bl-lg group-hover:text-blue-400 transition-colors">#{idx + 1}</div>
                  <h3 className="font-bold text-neutral-200 truncate pr-16 group-hover:text-white transition-colors">{strat.strategy_name}</h3>
                  <p className="text-[10px] text-neutral-500 mb-4 uppercase tracking-wider">Bot Instance: {strat.bot_name}</p>
                  
                  <div className="flex justify-between items-end mb-4 bg-neutral-900/50 p-3 rounded-lg">
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Total PnL</div>
                      <span className={`text-xl font-bold flex items-center gap-2 ${strat.total_profit_abs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {strat.total_profit_abs >= 0 ? <ArrowUpCircle className="w-4 h-4"/> : <ArrowDownCircle className="w-4 h-4"/>}
                        {Math.abs(strat.total_profit_abs).toFixed(2)} U
                      </span>
                    </div>
                    <div className="text-right">
                       <span className={`text-sm font-bold px-2 py-0.5 rounded ${strat.total_profit_pct >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {strat.total_profit_pct > 0 ? '+' : ''}{strat.total_profit_pct.toFixed(2)}%
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                    <div className="group/item relative cursor-help">
                      <div className="text-neutral-500 mb-0.5 flex items-center gap-1"><Target className="w-3 h-3"/> Win Rate</div>
                      <div className="text-neutral-200 font-bold">{(strat.win_rate || 0).toFixed(1)}%</div>
                      <div className="absolute bottom-full left-0 mb-2 w-32 p-2 bg-neutral-800 text-[10px] text-neutral-300 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity z-20 pointer-events-none border border-neutral-700 shadow-xl">
                        Percentage of winning trades vs total trades.
                      </div>
                    </div>
                    <div className="group/item relative cursor-help">
                      <div className="text-neutral-500 mb-0.5 flex items-center gap-1"><Activity className="w-3 h-3"/> Sharpe</div>
                      <div className="text-neutral-200 font-bold">{(strat.sharpe_ratio || 0).toFixed(2)}</div>
                      <div className="absolute bottom-full left-0 mb-2 w-32 p-2 bg-neutral-800 text-[10px] text-neutral-300 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity z-20 pointer-events-none border border-neutral-700 shadow-xl">
                        Risk-adjusted return ratio. Higher is better.
                      </div>
                    </div>
                    <div className="group/item relative cursor-help">
                      <div className="text-neutral-500 mb-0.5 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Max DD</div>
                      <div className="text-rose-400 font-bold">{(strat.max_drawdown || 0).toFixed(2)} U</div>
                      <div className="absolute bottom-full left-0 mb-2 w-32 p-2 bg-neutral-800 text-[10px] text-neutral-300 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity z-20 pointer-events-none border border-neutral-700 shadow-xl">
                        Deepest peak-to-trough decline in equity.
                      </div>
                    </div>
                    <div className="group/item relative cursor-help">
                      <div className="text-neutral-500 mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Avg Dur</div>
                      <div className="text-neutral-200 font-bold">{(strat.avg_duration_min || 0).toFixed(0)}m</div>
                      <div className="absolute bottom-full left-0 mb-2 w-32 p-2 bg-neutral-800 text-[10px] text-neutral-300 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity z-20 pointer-events-none border border-neutral-700 shadow-xl">
                        Average time per trade in minutes.
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Daily PnL Bar Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col relative group h-[480px] min-w-0">
          <button 
            onClick={() => setFullscreenChart('daily')} 
            className="absolute top-6 right-6 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold mb-8 text-neutral-100 flex items-center gap-3">
             <TrendingDown className="w-5 h-5 text-emerald-500" /> Daily Distribution
          </h2>
          <div className="flex-1 w-full min-w-0">
            <DailyPerformance 
              data={dailyData} 
              strategies={strategies} 
              selectedIds={selectedIds} 
              colors={COLORS} 
            />
          </div>
        </div>

        {/* Win Rate vs Drawdown Landscape */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col relative group h-[480px] min-w-0">
          <h2 className="text-xl font-bold mb-8 text-neutral-100 flex items-center gap-3">
            <Target className="w-5 h-5 text-amber-500" /> Risk/Reward Matrix
          </h2>
          <div className="flex-1 w-full min-w-0">
            <RiskReturnScatter 
              strategies={strategies} 
              selectedIds={selectedIds} 
              colors={COLORS} 
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #171717;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #404040;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #525252;
        }
      `}</style>
    </div>
  );
}
