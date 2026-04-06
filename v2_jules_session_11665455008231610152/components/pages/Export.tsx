"use client";

import React, { useState } from "react";
import { usePromptBuilder } from "@/hooks/usePromptBuilder";
import { MAX_TOKENS } from "@/app/typing";
import { est, doChunk, assemble } from "@/lib/chunking";
import { TokenBar } from "@/components/ui/TokenBar";

export default function Export() {
  const state = usePromptBuilder();
  const {
    context_text, prompt_text, uploaded_files, chunk_strategy, chunk_size, chunk_overlap,
    ctx_input_mode, ctx_selected_files, ctx_gen_notes, ctx_gen_info,
    jules_title, jules_source, jules_branch, jules_automation, jules_sessions, synthesized_prompt
  } = state;

  const aexp = assemble(context_text, prompt_text, uploaded_files, true);
  const texp = est(aexp);
  
  const [ps, setPs] = useState(chunk_strategy);
  const [pcs, setPcs] = useState(chunk_size);
  const [pco, setPco] = useState(chunk_overlap);

  const ecks = texp > MAX_TOKENS ? doChunk(aexp, ps, pcs, pco) : [];

  const handleDownloadTxt = (content: string, prefix: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prefix}_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      prompt_studio: {
        context: context_text,
        prompt: prompt_text,
        synthesized: synthesized_prompt,
        assembled: aexp,
        total_tokens: texp,
      },
      context_generation: {
        mode: ctx_input_mode,
        selected_files: ctx_selected_files,
        manual_notes: ctx_gen_notes,
        chunks: ctx_gen_info,
      },
      files: Object.fromEntries(
        Object.entries(uploaded_files).map(([k, v]) => [
          k, { ext: v.ext, size: v.size, enabled: v.enabled, tokens: est(v.content) }
        ])
      ),
      jules_config: {
        title: jules_title,
        source: jules_source,
        branch: jules_branch,
        automation: jules_automation,
      },
      sessions: jules_sessions.map(s => ({
        timestamp: s.timestamp,
        success: s.success,
        tokens: s.tokens,
        config: s.config,
        result: s.result,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jules_session_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full text-[#dde1ec] min-h-screen bg-[#09090c] p-6 font-mono text-sm">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-lg">
          📊 Assembled Prompt — Preview & Export
        </div>

        <div className="grid grid-cols-5 gap-2 mt-4">
          <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
            <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Total Tokens</div>
            <div className="text-xl font-bold text-[#00e87a]">{texp.toLocaleString()}</div>
          </div>
          <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
            <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Characters</div>
            <div className="text-xl font-bold text-[#00e87a]">{aexp.length.toLocaleString()}</div>
          </div>
          <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
            <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Lines</div>
            <div className="text-xl font-bold text-[#00e87a]">{aexp.split("\n").length.toLocaleString()}</div>
          </div>
          <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
            <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Active Files</div>
            <div className="text-xl font-bold text-[#00e87a]">{Object.values(uploaded_files).filter(f => f.enabled).length}</div>
          </div>
          <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
            <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Sections</div>
            <div className="text-xl font-bold text-[#00e87a]">{aexp ? aexp.split("---").length : 0}</div>
          </div>
        </div>

        <TokenBar tokens={texp} />
      </div>

      <hr className="border-[#252d3d] w-full max-w-5xl mx-auto mb-6" />

      <div className="w-full max-w-5xl mx-auto grid grid-cols-12 gap-8">
        {/* LEFT PANE */}
        <div className="col-span-7 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs">
            📄 Full Assembled Prompt
          </div>
          <textarea
            readOnly
            value={aexp}
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-4 text-xs text-[#dde1ec] outline-none min-h-[470px] whitespace-pre-wrap leading-relaxed"
          />
          <button 
            onClick={() => handleDownloadTxt(aexp, "jules_prompt")}
            className="w-full mt-2 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2.5 px-4 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all"
          >
            ⬇️ Download Assembled (.txt)
          </button>
          {synthesized_prompt && (
            <button 
              onClick={() => handleDownloadTxt(synthesized_prompt, "jules_synth")}
              className="w-full mt-2 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2.5 px-4 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all"
            >
              ⬇️ Download Synthesized (.txt)
            </button>
          )}
        </div>

        {/* RIGHT PANE */}
        <div className="col-span-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[#3b8ef3] font-bold uppercase tracking-widest text-xs">
            🔀 Chunk Simulator
          </div>

          {!aexp.trim() ? (
            <div className="bg-[#161923] text-[#3b8ef3] p-3 rounded-md border border-[#3b8ef3]/25 text-xs">
              Build your prompt first.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#5a6478]">Strategy</label>
                <select 
                  value={ps} 
                  onChange={(e) => setPs(e.target.value as any)}
                  className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs focus:border-[#00e87a] outline-none"
                >
                  <option value="sliding_window">Sliding Window</option>
                  <option value="semantic">Semantic</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <label className="text-xs text-[#5a6478]">Chunk size (tokens)</label>
                  <span className="text-xs">{pcs}</span>
                </div>
                <input type="range" min="1000" max="60000" step="500" value={pcs} onChange={(e) => setPcs(parseInt(e.target.value))} className="accent-[#00e87a]" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <label className="text-xs text-[#5a6478]">Overlap (tokens)</label>
                  <span className="text-xs">{pco}</span>
                </div>
                <input type="range" min="0" max="5000" step="100" value={pco} onChange={(e) => setPco(parseInt(e.target.value))} className="accent-[#00e87a]" />
              </div>

              {texp > MAX_TOKENS ? (
                <div className="mt-2">
                  <div className="text-[11px] text-[#f5a623] mb-2 font-bold tracking-widest uppercase">
                    ⚠ Split into {ecks.length} chunks
                  </div>
                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {ecks.map((c, i) => (
                      <div key={i} className="bg-[#161923] border border-[#1c2130] rounded-md p-3">
                        <div className="text-[10px] text-[#5a6478] mb-1 font-bold tracking-widest uppercase">
                          Chunk {i+1}/{ecks.length} — {est(c).toLocaleString()} tokens
                        </div>
                        <textarea 
                          readOnly 
                          value={c.length > 900 ? c.substring(0, 900) + "..." : c} 
                          className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-[10px] text-[#dde1ec] outline-none h-[120px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#161923] text-[#00e87a] p-3 rounded-md border border-[#00e87a]/25 text-xs font-bold uppercase tracking-widest">
                  ✅ One pass ({texp.toLocaleString()} / {MAX_TOKENS.toLocaleString()})
                </div>
              )}
            </div>
          )}

          <hr className="border-[#252d3d] my-2" />

          <div className="flex items-center gap-2 text-[#f5a623] font-bold uppercase tracking-widest text-xs">
            📦 Export Session JSON
          </div>

          <button 
            onClick={handleExportJson}
            className="w-full bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2.5 px-4 text-xs font-bold tracking-widest uppercase hover:border-[#f5a623] hover:text-[#f5a623] transition-all"
          >
            ⬇️ Export Session (.json)
          </button>
        </div>
      </div>
    </div>
  );
}
