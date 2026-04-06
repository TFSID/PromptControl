import React from 'react';
import { MAX_TOKENS } from '@/lib/chunking';

interface TokenBarProps {
  tokens: number;
}

export function TokenBar({ tokens }: TokenBarProps) {
  const ratio = Math.min(tokens / MAX_TOKENS, 1.0);
  const pct = ratio * 100;
  const filled = Math.floor(ratio * 28);
  const empty = 28 - filled;
  
  let color = "#00e87a"; // green
  if (ratio >= 0.95) {
    color = "#f04155"; // red
  } else if (ratio >= 0.7) {
    color = "#f5a623"; // amber
  }
  
  const filledStr = "█".repeat(filled);
  const emptyStr = "░".repeat(empty);

  return (
    <div className="bg-[#161923] border border-[#1c2130] rounded-md px-3 py-2 my-1.5">
      <div className="text-[0.62rem] text-[#5a6478] uppercase tracking-[0.09em] mb-1">
        Token Budget
      </div>
      <div className="text-sm font-mono flex items-center flex-wrap">
        <span style={{ color }}>{filledStr}</span>
        <span className="text-[#2e3748]">{emptyStr}</span>
        <span className="ml-2 font-bold" style={{ color }}>
          {tokens.toLocaleString()}
        </span>
        <span className="text-[#5a6478] text-[0.66rem] ml-1">
          / {MAX_TOKENS.toLocaleString()} ({pct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

interface CapacityBarProps {
  chars: number;
  maxChars: number;
  labelR?: string;
}

export function CapacityBar({ chars, maxChars, labelR = "" }: CapacityBarProps) {
  const pct = Math.min((chars / maxChars) * 100, 100);
  
  let color = "#00e87a"; // green
  if (pct >= 95) {
    color = "#f04155"; // red
  } else if (pct >= 70) {
    color = "#f5a623"; // amber
  }

  return (
    <div className="my-1 mb-2">
      <div className="flex justify-between text-[0.62rem] text-[#5a6478] tracking-[0.07em] uppercase mb-1">
        <span>Capacity</span>
        <span>{labelR}</span>
      </div>
      <div className="bg-[#09090c] rounded-[3px] h-[3px] overflow-hidden">
        <div 
          className="h-[3px] rounded-[3px] transition-all duration-250" 
          style={{ width: \`\${pct.toFixed(1)}%\`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
