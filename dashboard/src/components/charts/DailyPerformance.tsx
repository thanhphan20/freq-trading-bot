'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Brush 
} from 'recharts';

import CustomTooltip from './CustomTooltip';

interface DailyPerformanceProps {
  data: any[];
  strategies: any[];
  selectedIds: string[];
  colors: string[];
}

const DailyPerformance: React.FC<DailyPerformanceProps> = ({ 
  data, strategies, selectedIds, colors 
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#525252" 
          fontSize={11} 
          tickMargin={12} 
          minTickGap={40} 
        />
        <YAxis stroke="#525252" fontSize={11} />
        <RechartsTooltip content={<CustomTooltip type="daily" />} />
        <Legend iconType="square" wrapperStyle={{ paddingTop: "24px", fontSize: "12px" }} />
        {strategies.map((strat, i) => (
          <Bar 
            key={strat.strategy_id} 
            dataKey={strat.strategy_id} 
            name={strat.strategy_name} 
            stackId="a" 
            fill={colors[i % colors.length]} 
            hide={!selectedIds.includes(strat.strategy_id)}
            isAnimationActive={false}
          />
        ))}
        <Brush 
          dataKey="date" 
          height={30} 
          stroke="#10b981" 
          fill="#0a0a0a" 
          travellerWidth={12} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default React.memo(DailyPerformance);
