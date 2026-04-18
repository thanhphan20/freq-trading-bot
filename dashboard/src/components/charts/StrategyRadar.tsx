'use client';

import React, { useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';

interface Strategy {
  strategy_id: string;
  strategy_name: string;
  total_profit_pct: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  avg_duration_min: number;
}

interface StrategyRadarProps {
  strategies: Strategy[];
  selectedIds: string[];
  colors: string[];
}

const StrategyRadar: React.FC<StrategyRadarProps> = ({ 
  strategies, selectedIds, colors 
}) => {
  const radarData = useMemo(() => {
    // Limit to top 5 selected for clarity
    const selected = strategies
      .filter(s => selectedIds.includes(s.strategy_id))
      .slice(0, 5);

    if (selected.length === 0) return [];

    // Normalization helper
    const normalize = (val: number, min: number, max: number) => {
      if (max === min) return 50;
      return ((val - min) / (max - min)) * 100;
    };

    // Calculate bounds for normalization
    const bounds = {
      profit: { min: Math.min(...strategies.map(s => s.total_profit_pct)), max: Math.max(...strategies.map(s => s.total_profit_pct)) },
      winRate: { min: 0, max: 100 },
      sharpe: { min: 0, max: 4 },
      drawdown: { min: Math.min(...strategies.map(s => s.max_drawdown)), max: 0 },
      duration: { min: Math.min(...strategies.map(s => s.avg_duration_min)), max: Math.max(...strategies.map(s => s.avg_duration_min)) }
    };

    const metrics = [
      { name: 'Profitability', key: 'profit' },
      { name: 'Consistency', key: 'winRate' },
      { name: 'Efficiency', key: 'sharpe' },
      { name: 'Stability', key: 'stability' },
      { name: 'Speed', key: 'speed' }
    ];

    return metrics.map(m => {
      const row: Record<string, string | number> = { subject: m.name };
      selected.forEach(s => {
        let value = 0;
        if (m.key === 'profit') value = normalize(s.total_profit_pct, bounds.profit.min, bounds.profit.max);
        if (m.key === 'winRate') value = s.win_rate;
        if (m.key === 'sharpe') value = normalize(s.sharpe_ratio, bounds.sharpe.min, bounds.sharpe.max);
        if (m.key === 'stability') value = normalize(s.max_drawdown, bounds.drawdown.min, bounds.drawdown.max);
        if (m.key === 'speed') value = 100 - normalize(s.avg_duration_min, bounds.duration.min, bounds.duration.max); // Invert duration
        
        row[s.strategy_id] = Math.max(0, Math.min(100, value));
      });
      return row;
    });
  }, [strategies, selectedIds]);

  const activeStrategies = strategies
    .filter(s => selectedIds.includes(s.strategy_id))
    .slice(0, 5);

  if (activeStrategies.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
        <PolarGrid stroke="#262626" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#737373', fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        {activeStrategies.map((strat, i) => (
          <Radar
            key={strat.strategy_id}
            name={strat.strategy_name}
            dataKey={strat.strategy_id}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.3}
          />
        ))}
        <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "10px" }} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px', fontSize: '11px' }}
          itemStyle={{ padding: '2px 0' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default React.memo(StrategyRadar);
