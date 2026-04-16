"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ZAxis, Brush } from "recharts";
import { ArrowUpCircle, ArrowDownCircle, ShieldCheck, Activity, Target, Clock, TrendingDown, Maximize2, X } from "lucide-react";

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


export default function Dashboard() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  
  // Trạng thái bật tắt Fullscreen
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/strategies")
      .then((res) => res.json())
      .then((data) => {
        const strats = (data.strategies || []).map((s: Strategy) => ({
          ...s,
          abs_profit: Math.abs(s.total_profit_abs || 0)
        }));
        setStrategies(strats);
      });

    fetch("/api/equity-curve")
      .then((res) => res.json())
      .then((data) => {
        if (data.curve) {
          const groupedData = data.curve.reduce((acc: Record<string, ChartRow>, row: RawCurveRow) => {
            if (!acc[row.timestamp]) acc[row.timestamp] = { timestamp: row.timestamp };
            acc[row.timestamp][row.strategy_id] = row.cumulative_profit;
            return acc;
          }, {});
          setChartData(Object.values(groupedData) as ChartRow[]);
        }
      });

    fetch("/api/daily-performance")
      .then((res) => res.json())
      .then((data) => {
        if (data.performance) {
          const groupedData = data.performance.reduce((acc: Record<string, DailyRow>, row: RawPerformanceRow) => {
            if (!acc[row.date]) acc[row.date] = { date: row.date };
            acc[row.date][row.strategy_id] = row.daily_profit_abs;
            return acc;
          }, {});
          
          const sorted = (Object.values(groupedData) as DailyRow[]).sort((a: DailyRow, b: DailyRow) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
          setDailyData(sorted);
        }
      });
  }, []);

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f43f5e", "#fff", "#8b5cf6"];

  const renderFullscreen = () => {
    if (!fullscreenChart) return null;

    return (
      <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur flex flex-col p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
            <Maximize2 className="w-6 h-6 text-blue-500" /> 
            {fullscreenChart === 'equity' ? 'Equity Curve (USDT)' : 
             fullscreenChart === 'daily' ? 'Daily PnL Distribution' :
             fullscreenChart === 'winrate' ? 'Risk & Reward Landscape' : ''}
          </h2>
          <button 
            onClick={() => setFullscreenChart(null)}
            className="p-2 bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
          {fullscreenChart === 'equity' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="timestamp" stroke="#737373" tickFormatter={(val) => new Date(val).toLocaleDateString()} minTickGap={50} />
                <YAxis stroke="#737373" domain={['auto', 'auto']} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }} labelFormatter={(l) => new Date(l).toLocaleString()} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                {strategies.map((strat, i) => (
                  <Line key={strat.strategy_id} type="monotone" name={strat.strategy_name} dataKey={strat.strategy_id} stroke={colors[i % colors.length]} strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                ))}
                {/* Thanh Zoom/Brush Phóng To Thu Nhỏ Đáy Khung */}
                <Brush dataKey="timestamp" height={40} stroke="#3b82f6" fill="#171717" tickFormatter={(v) => new Date(v).toLocaleDateString()} travellerWidth={15} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {fullscreenChart === 'daily' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#737373" />
                <YAxis stroke="#737373" />
                <RechartsTooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                {strategies.map((strat, i) => (
                  <Bar key={strat.strategy_id} dataKey={strat.strategy_id} name={strat.strategy_name} stackId="a" fill={colors[i % colors.length]} />
                ))}
                {/* Thanh Zoom/Brush Phóng To Thu Nhỏ Đáy Khung */}
                <Brush dataKey="date" height={40} stroke="#10b981" fill="#171717" travellerWidth={15} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {fullscreenChart === 'winrate' && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" dataKey="win_rate" name="Win Rate" unit="%" stroke="#737373" domain={[0, 100]} />
                <YAxis type="number" dataKey="max_drawdown" name="Max Drawdown" unit=" U" stroke="#737373" />
                {/* ZAxis fix error (no negative size allowed) */}
                <ZAxis type="number" dataKey="abs_profit" range={[100, 1000]} name="Total Profit | " />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                {strategies.map((strat, i) => (
                  <Scatter key={strat.strategy_id} name={strat.strategy_name} data={[strat]} fill={colors[i % colors.length]} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
      {renderFullscreen()}
      
      <header className="mb-6 flex justify-between items-center bg-neutral-900 border border-neutral-800 p-5 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-3">
            <Activity className="text-blue-500 w-8 h-8" />
            Freqtrade Alpha Dashboard
          </h1>
          <p className="text-neutral-400 mt-1">Multi-bot Real-time Analytics & Equity Tracking</p>
        </div>
      </header>

      {/* Grid chính: Equity Curve (2 cột) + Rankings (1 cột) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg relative group">
          <button onClick={() => setFullscreenChart('equity')} className="absolute top-4 right-4 p-2 bg-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-700 z-10 cursor-pointer">
            <Maximize2 className="w-5 h-5 text-neutral-300" />
          </button>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-neutral-200">
            Equity Curve (USDT)
          </h2>
          <div className="flex-1 min-h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="timestamp" stroke="#737373" fontSize={12} tickMargin={10} tickFormatter={(val) => new Date(val).toLocaleDateString()} minTickGap={30} />
                <YAxis stroke="#737373" fontSize={12} domain={['auto', 'auto']} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }} itemStyle={{ color: "#e5e5e5" }} labelFormatter={(l) => new Date(l).toLocaleString()} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                {strategies.map((strat, i) => (
                  <Line key={strat.strategy_id} type="monotone" name={strat.strategy_name} dataKey={strat.strategy_id} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                ))}
                {/* THANH SCROLL ZOOM CỦA TRADING (BRUSH) */}
                <Brush dataKey="timestamp" height={25} stroke="#3b82f6" fill="#171717" tickFormatter={(v) => new Date(v).toLocaleDateString()} travellerWidth={10} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg overflow-hidden flex flex-col h-[560px]">
          <h2 className="text-xl font-semibold mb-6 text-neutral-200 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Live Rankings
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
            {strategies.map((strat: Strategy, idx) => (
               <div key={strat.strategy_id} className="bg-neutral-950 p-5 rounded-lg border border-neutral-800 relative transition-transform hover:scale-[1.02]">
                 <div className="absolute top-0 right-0 p-2 text-xs font-mono font-bold text-neutral-500 bg-neutral-900 rounded-bl-lg">RANK #{idx + 1}</div>
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
                   <div><div className="text-neutral-500 flex items-center gap-1 mb-1"><Target className="w-3 h-3"/> Win Rate</div><div className="text-neutral-200 font-medium">{(strat.win_rate || 0).toFixed(1)}%</div></div>
                   <div><div className="text-neutral-500 flex items-center gap-1 mb-1"><Activity className="w-3 h-3"/> Sharpe</div><div className="text-neutral-200 font-medium">{(strat.sharpe_ratio || 0).toFixed(2)}</div></div>
                   <div><div className="text-neutral-500 flex items-center gap-1 mb-1"><TrendingDown className="w-3 h-3"/> Max DD</div><div className="text-rose-400 font-medium">{(strat.max_drawdown || 0).toFixed(2)} U</div></div>
                   <div><div className="text-neutral-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3"/> Avg Time</div><div className="text-neutral-200 font-medium">{(strat.avg_duration_min || 0).toFixed(0)}m</div></div>
                 </div>
               </div>
            ))}
            {strategies.length === 0 && (
              <div className="text-neutral-500 text-sm py-10 text-center flex items-center justify-center flex-col h-full">Waiting for backend sync...</div>
            )}
          </div>
        </div>
      </div>

      {/* Grid phụ: Các biểu đồ phân tích bổ sung nằm khít nhau */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Daily PnL Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-col relative group h-[450px]">
          <button onClick={() => setFullscreenChart('daily')} className="absolute top-4 right-4 p-2 bg-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-700 z-10 cursor-pointer">
            <Maximize2 className="w-5 h-5 text-neutral-300" />
          </button>
          <h2 className="text-xl font-semibold mb-6 text-neutral-200 flex items-center gap-2">
            Daily Insights & PnL Distribution
          </h2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#737373" fontSize={12} tickMargin={10} minTickGap={30} />
                <YAxis stroke="#737373" fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }} itemStyle={{ color: "#e5e5e5" }} />
                <Legend iconType="square" wrapperStyle={{ paddingTop: "10px" }} />
                {strategies.map((strat, i) => (
                  <Bar key={strat.strategy_id} dataKey={strat.strategy_id} name={strat.strategy_name} stackId="a" fill={colors[i % colors.length]} />
                ))}
                {/* THANH SCROLL ZOOM CỦA TRADING (BRUSH) */}
                <Brush dataKey="date" height={25} stroke="#10b981" fill="#171717" travellerWidth={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win Rate vs Drawdown Landscape */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-col relative group h-[450px]">
          <button onClick={() => setFullscreenChart('winrate')} className="absolute top-4 right-4 p-2 bg-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-700 z-10 cursor-pointer">
            <Maximize2 className="w-5 h-5 text-neutral-300" />
          </button>
          <h2 className="text-xl font-semibold mb-6 text-neutral-200 flex items-center gap-2">
            Risk & Reward Landscape
          </h2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" dataKey="win_rate" name="Win Rate" unit="%" stroke="#737373" domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="max_drawdown" name="Max DD" unit=" U" stroke="#737373" reversed={false} />
                <ZAxis type="number" dataKey="abs_profit" range={[60, 400]} name="Profit" />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", color: "#f5f5f5" }} />
                <Legend iconType="circle" />
                {strategies.map((strat, i) => (
                  <Scatter key={strat.strategy_id} name={strat.strategy_name} data={[strat]} fill={colors[i % colors.length]} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
