'use client';

import React from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

import CustomTooltip from './CustomTooltip';

interface StrategyData {
  strategy_id: string;
  strategy_name: string;
  max_drawdown: number;
  win_rate: number;
  abs_profit: number;
}

interface RiskReturnScatterProps {
  strategies: StrategyData[];
  selectedIds: string[];
  colors: string[];
}

const RiskReturnScatter: React.FC<RiskReturnScatterProps> = ({ 
  strategies, selectedIds, colors 
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis type="number" dataKey="max_drawdown" name="Drawdown" unit="%" stroke="#525252" fontSize={11} reversed />
        <YAxis type="number" dataKey="win_rate" name="Win Rate" unit="%" stroke="#525252" fontSize={11} />
        <ZAxis type="number" dataKey="abs_profit" range={[100, 600]} name="Profit" />
        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip type="scatter" />} />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: "24px", fontSize: "12px" }} />
        {strategies.map((strat, i) => (
          <Scatter 
            key={strat.strategy_id} 
            name={strat.strategy_name} 
            data={[strat]} 
            fill={colors[i % colors.length]} 
            hide={!selectedIds.includes(strat.strategy_id)}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default React.memo(RiskReturnScatter);
