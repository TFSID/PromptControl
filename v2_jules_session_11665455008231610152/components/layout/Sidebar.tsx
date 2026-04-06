"use client";

import React, { useEffect, useState } from "react";
import { usePromptBuilder } from "@/hooks/usePromptBuilder";
import { MODELS, AUTOMATION_MODES, ChunkStrategy } from "@/app/typing";
import { est, assemble } from "@/lib/chunking";
import { TokenBar } from "@/components/ui/TokenBar";

export function Sidebar() {
  const state = usePromptBuilder();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !state._hasHydrated) {
    return (
      <aside className="w-[300px] h-screen bg-[#0f1117] border-r border-[#1c2130] flex-shrink-0 p-5 overflow-y-auto">
        <div className="animate-pulse bg-[#161923] h-10 w-32 rounded mb-6"></div>
      </aside>
    );
  }

  const {
    jules_api_key, setJulesApiKey,
    llm_api_key, setLlmApiKey,
    llm_model, setLlmModel,
    llm_temperature, setLlmTemperature,
    llm_top_p, setLlmTopP,
    llm_system, setLlmSystem,
    chunk_strategy, setChunkStrategy,
    chunk_size, setChunkSize,
    chunk_overlap, setChunkOverlap,
    jules_title, setJulesTitle,
    jules_source, setJulesSource,
    jules_automation, setJulesAutomation,
    jules_branch, setJulesBranch,
    context_text, prompt_text, uploaded_files, jules_sessions
  } = state;

  const handleStrategyChange = (val: string) => setChunkStrategy(val as ChunkStrategy);

  const assembledPrompt = assemble(context_text, prompt_text, uploaded_files, true);
  const totalTokens = est(assembledPrompt);
  const activeFiles = Object.values(uploaded_files).filter(f => f.enabled).length;
  const totalFiles = Object.keys(uploaded_files).length;

  return (
    <aside className="w-[300px] h-screen bg-[#0f1117] border-r border-[#1c2130] flex-shrink-0 p-5 overflow-y-auto font-mono text-sm flex flex-col gap-6 custom-scrollbar text-[#dde1ec]">
      
      {/* Header */}
      <div>
        <h1 className="font-sans font-extrabold text-3xl tracking-tight leading-tight bg-gradient-to-br from-[#00e87a] via-[#3b8ef3] to-[#9d7dea] text-transparent bg-clip-text">
          Jules<br />Studio
        </h1>
        <div className="text-[10px] text-[#5a6478] tracking-[0.18em] uppercase mt-1 font-bold">
          Prompt Engineering Platform
        </div>
      </div>

      <hr className="border-[#1c2130] my-2" />

      {/* API Keys */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-[11px]">
          🔑 API Keys
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">Jules API Key</label>
          <input
            type="password"
            value={jules_api_key}
            onChange={(e) => setJulesApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">LLM Synthesis Key</label>
          <input
            type="password"
            value={llm_api_key}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
          />
        </div>
      </div>

      <hr className="border-[#1c2130] my-2" />

      {/* LLM Settings */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-[11px]">
          🤖 LLM Settings
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">Model</label>
          <select 
            value={llm_model}
            onChange={(e) => setLlmModel(e.target.value)}
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label className="text-xs text-[#5a6478]">Temperature</label>
            <span className="text-xs">{llm_temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0" max="2" step="0.05"
            value={llm_temperature}
            onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
            className="accent-[#00e87a]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label className="text-xs text-[#5a6478]">Top-P</label>
            <span className="text-xs">{llm_top_p.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={llm_top_p}
            onChange={(e) => setLlmTopP(parseFloat(e.target.value))}
            className="accent-[#00e87a]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">Global System Instruction</label>
          <textarea
            value={llm_system}
            onChange={(e) => setLlmSystem(e.target.value)}
            placeholder="Optional global system instruction..."
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none min-h-[70px]"
          />
        </div>
      </div>

      <hr className="border-[#1c2130] my-2" />

      {/* Chunking */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-[11px]">
          🔀 Chunking
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <label className="text-[#5a6478]">Strategy</label>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="strategy" value="sliding_window" checked={chunk_strategy === "sliding_window"} onChange={(e) => handleStrategyChange(e.target.value)} className="accent-[#00e87a]" /> Sliding Window
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="strategy" value="semantic" checked={chunk_strategy === "semantic"} onChange={(e) => handleStrategyChange(e.target.value)} className="accent-[#00e87a]" /> Semantic
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="strategy" value="hybrid" checked={chunk_strategy === "hybrid"} onChange={(e) => handleStrategyChange(e.target.value)} className="accent-[#00e87a]" /> Hybrid
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 w-1/2">
            <label className="text-xs text-[#5a6478]">Chunk (tok)</label>
            <input
              type="number" step="500" min="1000" max="60000"
              value={chunk_size}
              onChange={(e) => setChunkSize(parseInt(e.target.value) || 1000)}
              className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 w-1/2">
            <label className="text-xs text-[#5a6478]">Overlap (tok)</label>
            <input
              type="number" step="100" min="0" max="5000"
              value={chunk_overlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 0)}
              className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
            />
          </div>
        </div>
      </div>

      <hr className="border-[#1c2130] my-2" />

      {/* Jules Config */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-[11px]">
          🚀 Jules Config
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">Session Title</label>
          <input
            type="text"
            value={jules_title}
            onChange={(e) => setJulesTitle(e.target.value)}
            placeholder="My Feature"
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">Repo Source</label>
          <input
            type="text"
            value={jules_source}
            onChange={(e) => setJulesSource(e.target.value)}
            placeholder="sources/github/owner/repo"
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#5a6478]">Automation Mode</label>
          <select
            value={jules_automation || ""}
            onChange={(e) => setJulesAutomation(e.target.value === "" ? null : e.target.value)}
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
          >
            <option value="">— none (optional) —</option>
            <option value="AUTO_CREATE_PR">AUTO_CREATE_PR</option>
          </select>
        </div>
        {jules_source.trim() && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#5a6478]">Branch</label>
            <input
              type="text"
              value={jules_branch}
              onChange={(e) => setJulesBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
            />
          </div>
        )}
      </div>

      <hr className="border-[#1c2130] my-2" />

      {/* Final Metrics */}
      <div className="flex gap-2">
        <div className="bg-[#161923] border border-[#1c2130] rounded-md p-2 w-1/2 flex flex-col items-start justify-center">
          <div className="text-[10px] text-[#5a6478] tracking-widest uppercase">Files</div>
          <div className="text-[#00e87a] text-lg font-bold">{activeFiles}/{totalFiles}</div>
        </div>
        <div className="bg-[#161923] border border-[#1c2130] rounded-md p-2 w-1/2 flex flex-col items-start justify-center">
          <div className="text-[10px] text-[#5a6478] tracking-widest uppercase">Sessions</div>
          <div className="text-[#00e87a] text-lg font-bold">{jules_sessions.length}</div>
        </div>
      </div>
      <TokenBar tokens={totalTokens} />

    </aside>
  );
}
