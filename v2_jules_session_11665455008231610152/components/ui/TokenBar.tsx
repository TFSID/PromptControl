import React from "react";
import { MAX_TOKENS, MAX_INPUT_CHARS } from "@/app/typing";

interface CapacityBarProps {
  chars: number;
  labelR?: string;
  maxChars?: number;
}

export function CapacityBar({ chars, labelR = "", maxChars = MAX_INPUT_CHARS }: CapacityBarProps) {
  const ratio = Math.min(chars / maxChars, 1);
  const pct = ratio * 100;
  
  let colorClass = "bg-[#00e87a]"; // green
  if (ratio >= 0.95) {
    colorClass = "bg-[#f04155]"; // red
  } else if (ratio >= 0.7) {
    colorClass = "bg-[#f5a623]"; // amber
  }

  return (
    <div className="my-2 mb-3">
      <div className="flex justify-between text-[10px] text-[#5a6478] uppercase tracking-wider mb-1">
        <span>Capacity</span>
        <span>{labelR}</span>
      </div>
      <div className="bg-[#09090c] rounded-[3px] h-[3px] overflow-hidden w-full">
        <div 
          className={`h-[3px] rounded-[3px] transition-all duration-250 ${colorClass}`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

interface TokenBarProps {
  tokens: number;
  maxTokens?: number;
}

export function TokenBar({ tokens, maxTokens = MAX_TOKENS }: TokenBarProps) {
  const ratio = Math.min(tokens / maxTokens, 1);
  const pct = ratio * 100;
  const filled = Math.floor(ratio * 28);
  const empty = Math.max(0, 28 - filled);
  
  let color = "#00e87a";
  if (ratio >= 0.95) color = "#f04155";
  else if (ratio >= 0.7) color = "#f5a623";

  return (
    <div className="bg-[#161923] border border-[#1c2130] rounded-md p-3 my-2 w-full">
      <div className="text-[10px] text-[#5a6478] uppercase tracking-wider mb-2 font-mono">
        Token Budget
      </div>
      <div className="flex items-center gap-2 text-sm font-mono flex-wrap">
        <div className="flex select-none">
          <span style={{ color }}>{"█".repeat(filled)}</span>
          <span style={{ color: "#2e3748" }}>{"░".repeat(empty)}</span>
        </div>
        <span style={{ color }} className="font-bold">
          {tokens.toLocaleString()}
        </span>
        <span className="text-[#5a6478] text-[10.5px]">
          / {maxTokens.toLocaleString()} ({pct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
