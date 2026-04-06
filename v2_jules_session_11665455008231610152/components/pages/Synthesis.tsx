"use client";

import React, { useState } from "react";
import { usePromptBuilder } from "@/hooks/usePromptBuilder";
import { SynthesisMode, MAX_TOKENS, ChunkResult } from "@/app/typing";
import { est, doChunk, assemble } from "@/lib/chunking";
import { CapacityBar } from "@/components/ui/TokenBar";

// Stub for callLlm since there isn't an actual API to call in this execution context
// You'll replace this with an actual axios/fetch call later in `lib/api/`
async function callLlm(prompt: string, system: string, state: any): Promise<{ok: boolean, response: string}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ok: true, response: `[Synthesized output for chunk of ${est(prompt)} tokens using system: ${system.substring(0, 15)}...]`});
    }, 1500);
  });
}

export default function Synthesis() {
  const state = usePromptBuilder();
  const {
    llm_system, llm_api_key, context_text, prompt_text, uploaded_files, chunk_strategy, chunk_size, chunk_overlap,
    synthesized_prompt, setSynthesizedPrompt, synthesis_history, addSynthesisHistory, setPromptText, setContextText
  } = state;

  const [mode, setMode] = useState<SynthesisMode>("refine");
  const [inputSource, setInputSource] = useState<"assembled" | "prompt_only" | "custom_input">("assembled");
  const [customInput, setCustomInput] = useState("");
  const [customSystem, setCustomSystem] = useState(llm_system);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [previewTab, setPreviewTab] = useState<"rendered" | "raw">("rendered");

  const MODE_SYS = {
    refine: "You are an expert prompt engineer. Refine the following prompt to be clearer, more precise, and more actionable for an AI coding assistant. Remove ambiguity, add specificity. Return only the improved prompt.",
    expand: "You are a senior software architect. Expand the following prompt with additional technical details, edge cases, constraints, and implementation guidance. Return only the expanded prompt.",
    restructure: "You are a technical writer. Restructure the following prompt into a well-organized numbered format with clear sections. Preserve all original intent. Return only the restructured prompt.",
    summarize: "You are an expert at distilling complex instructions. Summarize the following prompt into a concise, high-impact version preserving all critical requirements. Return only the compressed prompt.",
    custom: "",
  };

  const effSys = mode === "custom" ? customSystem : MODE_SYS[mode];

  let sinput = "";
  if (inputSource === "assembled") {
    sinput = assemble(context_text, prompt_text, uploaded_files, true);
  } else if (inputSource === "prompt_only") {
    sinput = prompt_text;
  } else {
    sinput = customInput;
  }

  const stok = est(sinput);
  const willChunk = stok > MAX_TOKENS;
  const prevChunks = willChunk ? doChunk(sinput, chunk_strategy, chunk_size, chunk_overlap) : [];

  const handleSynthesize = async () => {
    if (!sinput.trim()) {
      alert("No input text.");
      return;
    }
    // if (!llm_api_key) {
    //   alert("LLM API key not configured.");
    //   return;
    // }

    setIsSynthesizing(true);
    let results: ChunkResult[] = [];
    let combined = "";

    try {
      if (stok <= MAX_TOKENS) {
        const { ok, response } = await callLlm(sinput, effSys, state);
        results.push({ idx: 1, total: 1, tokens: stok, ok, response });
        if (ok) combined = response;
      } else {
        const responses: string[] = [];
        for (let i = 0; i < prevChunks.length; i++) {
          const ch = prevChunks[i];
          const { ok, response } = await callLlm(ch, effSys, state);
          results.push({ idx: i + 1, total: prevChunks.length, tokens: est(ch), ok, response });
          if (ok) responses.push(response);
        }
        if (responses.length === 1) {
          combined = responses[0];
        } else if (responses.length > 1) {
          combined = responses.map((r, i) => `[CHUNK ${i+1}/${responses.length}]\n${r}`).join("\n\n---\n\n");
        }
      }

      if (combined) {
        setSynthesizedPrompt(combined);
        addSynthesisHistory({
          timestamp: new Date().toISOString(),
          mode,
          inp_tokens: stok,
          chunks: results.length,
          ok: results.filter(r => r.ok).length,
          results
        });
      } else {
        alert("Failed to synthesize. Check logs.");
      }
    } catch (e) {
      console.error(e);
      alert("Synthesis error");
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-[#dde1ec] min-h-screen bg-[#09090c] p-6 font-mono text-sm">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-lg">
          🤖 LLM Prompt Synthesis
        </div>
        <p className="text-xs text-[#5a6478]">
          Refine, expand, restructure, or compress your prompt with the LLM. 
          Inputs exceeding the token limit are automatically chunked and processed in sequence.
        </p>
      </div>

      <hr className="border-[#252d3d] w-full max-w-5xl mx-auto mb-6" />

      <div className="w-full max-w-5xl mx-auto grid grid-cols-12 gap-8">
        {/* LEFT PANE */}
        <div className="col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="text-[11px] text-[#5a6478] tracking-widest uppercase mb-1">Mode</div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "refine", label: "🎯 Refine & Clarify" },
                { id: "expand", label: "📈 Expand & Detail" },
                { id: "restructure", label: "🔄 Restructure" },
                { id: "summarize", label: "📉 Summarize & Compress" },
                { id: "custom", label: "✏️ Custom Instruction" },
              ].map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={(e) => setMode(e.target.value as SynthesisMode)} className="accent-[#00e87a]" />
                  {m.label}
                </label>
              ))}
            </div>

            <div className="mt-2">
              {mode === "custom" ? (
                <textarea 
                  value={customSystem}
                  onChange={(e) => setCustomSystem(e.target.value)}
                  placeholder="You are an expert..."
                  className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs text-[#dde1ec] focus:border-[#00e87a] outline-none min-h-[85px]"
                />
              ) : (
                <div className="bg-[#0c0e14] border border-[#1c2130] rounded-md p-3 text-xs text-[#00e87a] max-h-[65px] overflow-y-auto leading-relaxed">
                  {MODE_SYS[mode as keyof typeof MODE_SYS]}
                </div>
              )}
            </div>
          </div>

          <hr className="border-[#252d3d] w-full" />

          <div className="flex flex-col gap-2">
            <div className="text-[11px] text-[#5a6478] tracking-widest uppercase mb-1">Input Source</div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="source" value="assembled" checked={inputSource === "assembled"} onChange={(e) => setInputSource(e.target.value as any)} className="accent-[#00e87a]" />
                Assembled Prompt (context + prompt + files)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="source" value="prompt_only" checked={inputSource === "prompt_only"} onChange={(e) => setInputSource(e.target.value as any)} className="accent-[#00e87a]" />
                Raw Prompt Only
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="source" value="custom_input" checked={inputSource === "custom_input"} onChange={(e) => setInputSource(e.target.value as any)} className="accent-[#00e87a]" />
                Custom Input
              </label>
            </div>

            <div className="mt-3">
              {inputSource === "assembled" && (
                <div className="bg-[#161923] p-3 rounded-md text-xs text-[#3b8ef3] border border-[#3b8ef3]/25">
                  Assembled prompt — {est(assemble(context_text, prompt_text, uploaded_files, true)).toLocaleString()} tokens
                </div>
              )}
              {inputSource === "prompt_only" && (
                <div className="bg-[#161923] p-3 rounded-md text-xs text-[#3b8ef3] border border-[#3b8ef3]/25">
                  Raw prompt — {est(prompt_text).toLocaleString()} tokens
                </div>
              )}
              {inputSource === "custom_input" && (
                <textarea 
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter text to synthesize..."
                  className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-3 text-xs text-[#dde1ec] focus:border-[#00e87a] outline-none min-h-[170px]"
                />
              )}
            </div>

            <div className="mt-2">
              <CapacityBar chars={sinput.length} labelR={`~${stok.toLocaleString()} tokens / ${MAX_TOKENS.toLocaleString()} max`} />
              
              {willChunk && (
                <div className="text-[10px] text-[#f5a623] mt-2 mb-2">
                  ⚠ Will process in {prevChunks.length} chunks
                  <div className="flex flex-wrap gap-1 mt-2">
                    {prevChunks.map((c, i) => (
                      <span key={i} className="bg-[#3b8ef3]/10 border border-[#3b8ef3]/25 rounded text-[10px] px-2 py-0.5 text-[#3b8ef3] font-bold">
                        #{i+1} · {est(c).toLocaleString()}tok
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              disabled={isSynthesizing || !sinput.trim()}
              onClick={handleSynthesize}
              className="w-full mt-2 bg-[#00e87a]/10 border border-[#00e87a] text-[#00e87a] rounded-md py-2.5 px-4 text-xs font-bold tracking-widest uppercase hover:bg-[#00e87a]/20 transition-all disabled:opacity-50"
            >
              {isSynthesizing ? "Synthesizing..." : "🚀 Synthesize"}
            </button>
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="col-span-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs">
            📤 Synthesis Output
          </div>

          {!synthesized_prompt ? (
            <div className="text-[#5a6478] text-xs py-8 text-center flex flex-col items-center">
              No synthesis yet.
              <span className="text-[10px] opacity-60 mt-2 block">Run a synthesis on the left to see output here.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="bg-[#3b8ef3]/10 text-[#3b8ef3] border border-[#3b8ef3]/25 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  gemini-flash-latest
                </span>
                <span className="bg-[#00e87a]/10 text-[#00e87a] border border-[#00e87a]/25 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {est(synthesized_prompt).toLocaleString()} est. tok
                </span>
              </div>

              <div className="flex border-b border-[#252d3d]">
                <button 
                  onClick={() => setPreviewTab("rendered")}
                  className={`py-2 px-4 text-xs font-bold uppercase tracking-widest transition-colors ${previewTab === "rendered" ? "text-[#00e87a] border-b-2 border-[#00e87a] bg-[#00e87a]/[0.04]" : "text-[#5a6478] hover:text-[#dde1ec]"}`}
                >
                  Rendered Preview
                </button>
                <button 
                  onClick={() => setPreviewTab("raw")}
                  className={`py-2 px-4 text-xs font-bold uppercase tracking-widest transition-colors ${previewTab === "raw" ? "text-[#00e87a] border-b-2 border-[#00e87a] bg-[#00e87a]/[0.04]" : "text-[#5a6478] hover:text-[#dde1ec]"}`}
                >
                  Raw / Edit
                </button>
              </div>

              {previewTab === "rendered" ? (
                <div className="bg-[#0c0e14] border border-[#1c2130] rounded-md p-4 text-xs leading-relaxed max-h-[440px] overflow-y-auto whitespace-pre-wrap">
                  {synthesized_prompt.trim()}
                </div>
              ) : (
                <textarea 
                  value={synthesized_prompt}
                  onChange={(e) => setSynthesizedPrompt(e.target.value)}
                  className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-3 text-xs text-[#dde1ec] focus:border-[#00e87a] outline-none min-h-[380px]"
                />
              )}

              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => { setPromptText(synthesized_prompt); alert("Copied to Main Prompt!"); }}
                  className="flex-1 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 px-2 text-[10px] font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all"
                >
                  📋 Copy → Prompt
                </button>
                <button 
                  onClick={() => { setContextText(synthesized_prompt); alert("Copied to Context!"); }}
                  className="flex-1 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 px-2 text-[10px] font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all"
                >
                  📄 Copy → Context
                </button>
                <button 
                  onClick={() => setSynthesizedPrompt("")}
                  className="flex-1 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 px-2 text-[10px] font-bold tracking-widest uppercase hover:border-[#f04155] hover:text-[#f04155] transition-all"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>
          )}

          {synthesis_history.length > 0 && (
            <>
              <hr className="border-[#252d3d] my-2" />
              <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs mb-2">
                🕐 History
              </div>
              <div className="flex flex-col gap-2">
                {synthesis_history.slice(-5).reverse().map((he, i) => {
                  const sc = he.ok === he.chunks ? "bg-[#00e87a]/10 text-[#00e87a] border-[#00e87a]/25" : "bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/25";
                  const ts = he.timestamp.substring(0, 19).replace("T", " ");
                  return (
                    <div key={i} className="bg-[#161923] border border-[#1c2130] border-l-4 border-l-[#00e87a] rounded-md p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <b className="capitalize">{he.mode}</b>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border ${sc}`}>
                          {he.ok}/{he.chunks} ok
                        </span>
                      </div>
                      <div className="text-[10px] text-[#5a6478]">
                        {ts} · {he.inp_tokens.toLocaleString()} tok in
                      </div>
                    </div>
                  );
                })}
                <button 
                  onClick={() => state.clearSynthesisHistory()}
                  className="w-full mt-2 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 text-xs font-bold tracking-widest uppercase hover:border-[#f04155] hover:text-[#f04155] transition-all"
                >
                  🗑️ Clear History
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
