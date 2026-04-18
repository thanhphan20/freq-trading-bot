'use client';

import React from 'react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number }>;
  label?: string;
  type?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, type }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg shadow-2xl backdrop-blur-md z-50">
        <p className="text-neutral-400 text-xs mb-2 font-mono uppercase tracking-widest">
          {type === 'daily' ? label : new Date(label || '').toLocaleString()}
        </p>
        <div className="space-y-2">
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-medium text-neutral-200">{entry.name}</span>
              </div>
              <span className={`text-sm font-bold ${entry.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {entry.value.toFixed(2)} {type === 'equity' || type === 'daily' ? 'USDT' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default React.memo(CustomTooltip);
