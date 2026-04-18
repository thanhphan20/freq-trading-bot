'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Brush 
} from 'recharts';

import CustomTooltip from './CustomTooltip';

interface StrategyData {
  strategy_id: string;
  strategy_name: string;
}

interface EquityCurveProps {
  data: Array<{ timestamp: string | number; [key: string]: string | number }>;
  strategies: StrategyData[];
  selectedIds: string[];
  colors: string[];
}

const EquityCurve: React.FC<EquityCurveProps> = ({ 
  data, strategies, selectedIds, colors 
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
        <XAxis 
          dataKey="timestamp" 
          stroke="#525252" 
          fontSize={11} 
          tickMargin={12} 
          tickFormatter={(val) => new Date(val).toLocaleDateString()} 
          minTickGap={40} 
        />
        <YAxis stroke="#525252" fontSize={11} domain={['auto', 'auto']} />
        <RechartsTooltip content={<CustomTooltip type="equity" />} />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: "24px", fontSize: "12px", color: "#a3a3a3" }} />
        {strategies.map((strat, i) => (
          <Line 
            key={strat.strategy_id} 
            type="monotone" 
            name={strat.strategy_name} 
            dataKey={strat.strategy_id} 
            stroke={colors[i % colors.length]} 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 6, strokeWidth: 0 }}
            hide={!selectedIds.includes(strat.strategy_id)}
            isAnimationActive={false}
          />
        ))}
        <Brush 
          dataKey="timestamp" 
          height={30} 
          stroke="#3b82f6" 
          fill="#0a0a0a" 
          tickFormatter={(v) => new Date(v).toLocaleDateString()} 
          travellerWidth={12} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default React.memo(EquityCurve);
