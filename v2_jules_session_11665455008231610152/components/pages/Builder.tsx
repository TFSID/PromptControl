"use client";

import React, { useState } from "react";
import { usePromptBuilder } from "@/hooks/usePromptBuilder";
import { 
  CONTEXT_SYSTEM_PROMPT, 
  MAX_TOKENS, 
  MAX_INPUT_CHARS,
  FILE_ICONS
} from "@/app/typing";
import { est, doChunk } from "@/lib/chunking";
import { CapacityBar, TokenBar } from "@/components/ui/TokenBar";
import { FolderOpen, Edit3, Trash2, Settings, ChevronDown, ChevronRight } from "lucide-react";

export function SendToJules() {
  const {
    context_text, prompt_text, uploaded_files, synthesized_prompt,
    jules_api_key, jules_title, jules_source, jules_branch, jules_automation,
    jules_sessions, addJulesSession, clearJulesSessions, setBuildSubPane
  } = usePromptBuilder();

  const [jsrc, setJsrc] = useState<"assembled" | "synthesized" | "raw">("assembled");
  const [isCreating, setIsCreating] = useState(false);

  const { assemble, est } = require("@/lib/chunking");

  let jpmt = "";
  if (jsrc === "assembled") {
    jpmt = assemble(context_text, prompt_text, uploaded_files, true);
  } else if (jsrc === "synthesized") {
    jpmt = synthesized_prompt || prompt_text;
  } else {
    jpmt = prompt_text;
  }

  const jtok = est(jpmt);

  const handleCreateSession = async () => {
    if (!jules_api_key) {
      alert("Set Jules API Key in the sidebar first.");
      return;
    }

    setIsCreating(true);

    try {
      // Simulate API call to Jules
      await new Promise(r => setTimeout(r, 1500));
      
      const success = jpmt.length > 0;
      const result = success 
        ? { id: `js-${Math.random().toString(36).substring(7)}`, name: jules_title || "Untitled Session", prUrl: "https://github.com/example/repo/pull/1" }
        : { error: "Failed to create session" };

      addJulesSession({
        timestamp: new Date().toISOString(),
        success,
        result,
        prompt_preview: jpmt.substring(0, 300),
        tokens: jtok,
        config: {
          title: jules_title,
          source: jules_source,
          branch: jules_branch,
          automation: jules_automation,
        }
      });
      
      if (success) {
        alert("Session created successfully!");
      } else {
        alert("Failed to create session.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8 font-mono text-sm mt-4">
      {/* LEFT PANE */}
      <div className="col-span-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs">
          🚀 Create Jules Session
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <div className="text-[11px] text-[#5a6478] tracking-widest uppercase mb-1">Prompt Source</div>
          <div className="flex flex-col gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="jsrc" value="assembled" checked={jsrc === "assembled"} onChange={(e) => setJsrc(e.target.value as any)} className="accent-[#00e87a]" />
              📦 Assembled (context + prompt + files)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="jsrc" value="synthesized" checked={jsrc === "synthesized"} onChange={(e) => setJsrc(e.target.value as any)} className="accent-[#00e87a]" />
              🤖 Synthesized Output
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="jsrc" value="raw" checked={jsrc === "raw"} onChange={(e) => setJsrc(e.target.value as any)} className="accent-[#00e87a]" />
              ✍️ Raw Prompt Only
            </label>
          </div>
        </div>

        <div className="mt-2">
          <CapacityBar chars={jpmt.length} labelR={`~${jtok.toLocaleString()} tokens`} maxChars={MAX_INPUT_CHARS} />
          {jtok > MAX_TOKENS && (
            <div className="bg-[#161923] text-[#f5a623] p-2 rounded-md border border-[#f5a623]/25 text-xs">
              ⚠ {jtok.toLocaleString()} tokens exceeds LLM limit. Use the LLM Synthesis tab to compress first.
            </div>
          )}
        </div>

        <hr className="border-[#252d3d] my-1" />

        <div className="flex items-center gap-2 text-[#f5a623] font-bold uppercase tracking-widest text-xs">
          ⚙️ Jules Config
        </div>
        
        <div className="flex flex-col gap-1.5 text-xs mt-1">
          {[
            { label: "Title", val: jules_title || "(untitled)" },
            { label: "Source", val: jules_source || "(none)" },
            { label: "Branch", val: jules_branch || "— (not set) —" },
            { label: "Mode", val: jules_automation || "— none —" },
            { label: "API Key", val: jules_api_key ? "✅ set" : "❌ NOT SET" },
          ].map(row => (
            <div key={row.label} className="flex gap-2">
              <span className="text-[#5a6478] w-20">{row.label}:</span>
              <span className="text-[#dde1ec] truncate font-medium">{row.val}</span>
            </div>
          ))}
          <div className="text-[10px] text-[#5a6478] mt-2 italic">Edit config in the sidebar ‹ Jules Config section.</div>
        </div>

        <hr className="border-[#252d3d] my-1" />

        <div className="bg-[#161923] border border-[#1c2130] rounded-md p-3">
          <div className="text-[10px] text-[#5a6478] tracking-widest uppercase mb-2">👁️ Preview Assembled Prompt</div>
          <textarea 
            readOnly 
            value={jpmt.length > 3000 ? jpmt.substring(0, 3000) + "..." : jpmt}
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs text-[#dde1ec] outline-none min-h-[150px] custom-scrollbar"
          />
        </div>

        {!jules_api_key && (
          <div className="bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/25 rounded-md p-2 text-xs font-bold uppercase tracking-widest text-center">
            ⚠ Set Jules API Key in the sidebar first.
          </div>
        )}

        <button 
          onClick={handleCreateSession}
          disabled={!jules_api_key || !jpmt.trim() || isCreating}
          className="w-full bg-[#00e87a]/10 border border-[#00e87a] text-[#00e87a] rounded-md py-3 text-xs font-bold tracking-widest uppercase hover:bg-[#00e87a]/20 disabled:opacity-50 transition-all"
        >
          {isCreating ? "Creating session..." : "🚀 Create Jules Session"}
        </button>

      </div>

      {/* RIGHT PANE */}
      <div className="col-span-7 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[#3b8ef3] font-bold uppercase tracking-widest text-xs">
          📋 Session History
        </div>

        {!jules_sessions.length ? (
          <div className="bg-[#161923] text-[#3b8ef3] p-3 rounded-md border border-[#3b8ef3]/25 text-xs">
            No sessions yet. Create one on the left.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3 w-1/2">
                <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Total</div>
                <div className="text-xl font-bold text-[#00e87a]">{jules_sessions.length}</div>
              </div>
              <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3 w-1/2">
                <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">✅ OK</div>
                <div className="text-xl font-bold text-[#00e87a]">{jules_sessions.filter(s => s.success).length}</div>
              </div>
            </div>

            <button 
              onClick={clearJulesSessions}
              className="w-full bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2.5 px-4 text-xs font-bold tracking-widest uppercase hover:border-[#f04155] hover:text-[#f04155] transition-all"
            >
              🗑️ Clear History
            </button>

            <hr className="border-[#252d3d] my-1" />

            <div className="flex flex-col gap-3">
              {jules_sessions.map((sess, i) => {
                const ts = sess.timestamp.substring(0, 19).replace("T", " ");
                const sc = sess.success ? "bg-[#00e87a]/10 text-[#00e87a] border-[#00e87a]/25" : "bg-[#f04155]/10 text-[#f04155] border-[#f04155]/25";
                const st = sess.success ? "success" : "failed";
                const ttl = sess.config.title || `Session #${jules_sessions.length - i}`;
                const prUrl = sess.result?.prUrl || sess.result?.pullRequestUrl || sess.result?.pr_url;

                return (
                  <div key={i} className="bg-[#161923] border border-[#1c2130] rounded-md p-4 text-xs">
                    <div className="flex justify-between mb-3 border-b border-[#252d3d] pb-2">
                      <div className="font-bold text-[#00e87a] uppercase tracking-widest">{ttl}</div>
                      <div className="text-[10px] text-[#5a6478]">{ts}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border ${sc}`}>
                        {st}
                      </span>
                      <span className="text-[10px] text-[#5a6478] border border-[#252d3d] rounded-full px-2 py-0.5">
                        {sess.tokens.toLocaleString()} tok
                      </span>
                      <span className="text-[10px] text-[#5a6478] border border-[#252d3d] rounded-full px-2 py-0.5 truncate">
                        {sess.config.automation || "—"}
                      </span>
                    </div>

                    {sess.success ? (
                      <div className="bg-[#0c0e14] border border-[#1c2130] border-l-2 border-l-[#00e87a] rounded p-2 mb-3">
                        <div className="text-[9px] text-[#5a6478] tracking-widest mb-1">SESSION ID</div>
                        <div className="text-[11px] text-[#3b8ef3] break-all font-bold">
                          {sess.result?.name || sess.result?.id || sess.result?.sessionId || "N/A"}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#f04155]/10 border border-[#f04155]/25 rounded p-2 mb-3 text-[#f04155]">
                        <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(sess.result, null, 2)}</pre>
                      </div>
                    )}

                    {prUrl && (
                      <a href={prUrl} target="_blank" rel="noreferrer" className="text-[#00e87a] hover:underline mb-3 block text-center font-bold text-[11px] uppercase tracking-widest">
                        🔗 Open Pull Request
                      </a>
                    )}

                    <div className="text-[9px] text-[#5a6478] uppercase tracking-widest mb-1 mt-2">Prompt preview:</div>
                    <div className="bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-[#00e87a] h-[60px] overflow-y-auto text-[10px] whitespace-pre-wrap">
                      {sess.prompt_preview}...
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FileManager() {
  const { uploaded_files, addFile, removeFile, setAllFilesEnabled, clearFiles, setBuildSubPane } = usePromptBuilder();
  const [pasteName, setPasteName] = useState("");
  const [pasteContent, setPasteContent] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (!uploaded_files[file.name]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const ext = "." + (file.name.split(".").pop() || "txt").toLowerCase();
            addFile(file.name, {
              content,
              size: file.size,
              ext,
              enabled: true,
              uploaded_at: new Date().toISOString(),
            });
          };
          reader.readAsText(file);
        }
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAddPaste = () => {
    if (pasteName && pasteContent) {
      const ext = "." + (pasteName.split(".").pop() || "txt").toLowerCase();
      addFile(pasteName, {
        content: pasteContent,
        size: pasteContent.length,
        ext,
        enabled: true,
        uploaded_at: new Date().toISOString(),
      });
      setPasteName("");
      setPasteContent("");
    }
  };

  const activeTokens = Object.values(uploaded_files).filter(f => f.enabled).reduce((acc, f) => acc + est(f.content), 0);
  const totalTokens = Object.values(uploaded_files).reduce((acc, f) => acc + est(f.content), 0);

  return (
    <div className="grid grid-cols-12 gap-8 font-mono text-sm mt-4">
      <div className="col-span-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[#3b8ef3] font-bold uppercase tracking-widest text-xs">
          📤 Upload Files
        </div>
        <div 
          onDrop={handleDrop} 
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-[#252d3d] hover:border-[#3b8ef3] bg-[#0c0e14] rounded-md p-8 text-center text-[#5a6478] transition-colors cursor-pointer"
        >
          Drop files here<br />
          <span className="text-[10px] mt-2 block">Supported: .py .js .ts .html .css .json .md .sql...</span>
        </div>

        <hr className="border-[#252d3d] my-2" />

        <div className="flex items-center gap-2 text-[#f5a623] font-bold uppercase tracking-widest text-xs">
          📋 Paste as File
        </div>
        <input 
          value={pasteName} 
          onChange={e => setPasteName(e.target.value)} 
          placeholder="Filename (e.g. snippet.md)" 
          className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs text-[#dde1ec] focus:border-[#00e87a] outline-none"
        />
        <textarea 
          value={pasteContent} 
          onChange={e => setPasteContent(e.target.value)} 
          placeholder="Paste code or text..." 
          className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs text-[#dde1ec] focus:border-[#00e87a] outline-none min-h-[150px]"
        />
        <button 
          onClick={handleAddPaste} 
          disabled={!pasteName || !pasteContent}
          className="w-full bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all disabled:opacity-50"
        >
          ➕ Add as File
        </button>
      </div>

      <div className="col-span-7 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[#9d7dea] font-bold uppercase tracking-widest text-xs">
          📁 File Library
        </div>

        {Object.keys(uploaded_files).length === 0 ? (
          <div className="text-[#5a6478] text-xs py-2">No files yet. Upload or paste on the left.</div>
        ) : (
          <>
            <div className="flex gap-2">
              <button onClick={() => setAllFilesEnabled(true)} className="flex-1 py-1.5 px-3 rounded-md border border-[#252d3d] bg-[#161923] text-xs font-bold uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-colors">
                ✅ Enable All
              </button>
              <button onClick={() => setAllFilesEnabled(false)} className="flex-1 py-1.5 px-3 rounded-md border border-[#252d3d] bg-[#161923] text-xs font-bold uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-colors">
                ⬜ Disable All
              </button>
              <button onClick={clearFiles} className="flex-1 py-1.5 px-3 rounded-md border border-[#252d3d] bg-[#161923] text-xs font-bold uppercase hover:border-[#f04155] hover:text-[#f04155] transition-colors">
                🗑️ Remove All
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {Object.entries(uploaded_files).map(([name, fd]) => (
                <div key={name} className="flex items-center justify-between bg-[#161923] border border-[#1c2130] rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={fd.enabled} 
                      onChange={(e) => usePromptBuilder.getState().toggleFileEnabled(name, e.target.checked)}
                      className="accent-[#00e87a] w-4 h-4"
                    />
                    <div>
                      <div className="text-[#dde1ec] text-xs font-bold">{FILE_ICONS[fd.ext] || "📄"} {name}</div>
                      <div className="text-[#5a6478] text-[10px] mt-1">{est(fd.content).toLocaleString()} tokens · {(fd.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button onClick={() => removeFile(name)} className="text-[#5a6478] hover:text-[#f04155]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <hr className="border-[#252d3d] my-2" />
            <div className="text-[11px] text-[#5a6478]">
              Library total: <b className="text-[#dde1ec]">{totalTokens.toLocaleString()}</b> tokens &nbsp;·&nbsp; Active: <b className="text-[#00e87a]">{activeTokens.toLocaleString()}</b> tokens
            </div>
          </>
        )}

        <button 
          onClick={() => setBuildSubPane("prompt")}
          className="mt-4 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 px-4 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all w-max"
        >
          ← Back to Prompt Builder
        </button>
      </div>
    </div>
  );
}

export function LiveSummary() {
  const {
    context_text,
    prompt_text,
    uploaded_files,
    setAssembledPrompt,
    setBuildSubPane,
    chunk_strategy,
    chunk_size,
    clearAll,
  } = usePromptBuilder();

  // Helper from chunking logic
  const { assemble } = require("@/lib/chunking");

  const asmb = assemble(context_text, prompt_text, uploaded_files, true);
  const ttok = est(asmb);
  const ctok = est(context_text);
  const ptok = est(prompt_text);
  
  const activeFiles = Object.values(uploaded_files).filter(f => f.enabled);
  const ftok = activeFiles.reduce((acc, f) => acc + est(f.content), 0);
  const nact = activeFiles.length;
  
  const sections = asmb ? asmb.split("---").length : 0;
  
  const breakdownRows = [
    { label: "Context", val: ctok, color: "#3b8ef3" }, // blue
    { label: "Prompt",  val: ptok, color: "#00e87a" }, // green
    { label: "Files",   val: ftok, color: "#9d7dea" }, // purple
  ];

  const handleAssemble = () => {
    setAssembledPrompt(asmb);
    alert("Assembled! See Preview & Export tab."); // Replicating st.success
  };

  const toggleFileEnabled = (name: string, enabled: boolean) => {
    usePromptBuilder.getState().toggleFileEnabled(name, enabled);
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-sm">
      <div className="flex items-center gap-2 text-[#3b8ef3] font-bold uppercase tracking-widest text-xs">
        📊 Live Summary
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
          <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Total Tokens</div>
          <div className="text-xl font-bold text-[#00e87a]">{ttok.toLocaleString()}</div>
        </div>
        <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
          <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Characters</div>
          <div className="text-xl font-bold text-[#00e87a]">{asmb.length.toLocaleString()}</div>
        </div>
        <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
          <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Active Files</div>
          <div className="text-xl font-bold text-[#00e87a]">{nact}</div>
        </div>
        <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-3">
          <div className="text-[10px] text-[#5a6478] uppercase tracking-widest font-mono mb-1">Sections</div>
          <div className="text-xl font-bold text-[#00e87a]">{sections}</div>
        </div>
      </div>

      <hr className="border-[#252d3d] my-1" />

      {/* Breakdown */}
      <div className="flex flex-col gap-2">
        {breakdownRows.map((row) => {
          const pct = Math.max(ttok, 1) > 0 ? (row.val / Math.max(ttok, 1)) * 100 : 0;
          return (
            <div key={row.label} className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span style={{ color: row.color }}>{row.label}</span>
                <span className="text-[#5a6478]">{row.val.toLocaleString()} ({pct.toFixed(1)}%)</span>
              </div>
              <div className="bg-[#09090c] rounded-[2px] h-[2px] w-full">
                <div style={{ width: `${pct}%`, backgroundColor: row.color }} className="h-[2px] rounded-[2px]" />
              </div>
            </div>
          );
        })}
      </div>

      <hr className="border-[#252d3d] my-1" />

      {ttok > MAX_TOKENS ? (
        <div className="bg-[#161923] text-[#f5a623] p-2 rounded-md border border-[#f5a623]/25 text-xs">
          ⚠ Assembled prompt exceeds {MAX_TOKENS.toLocaleString()} tokens.
          ~{Math.ceil(ttok / chunk_size)} chunks via {chunk_strategy.replace("_", " ")}.
        </div>
      ) : (
        <div className="bg-[#161923] text-[#00e87a] p-2 rounded-md border border-[#00e87a]/25 text-xs">
          ✅ Fits within token limit.
        </div>
      )}

      <hr className="border-[#252d3d] my-1" />

      {/* Attached Files Quick View */}
      <div className="flex items-center gap-2 text-[#9d7dea] font-bold uppercase tracking-widest text-xs">
        📎 Attached Files
      </div>

      <div className="flex flex-col gap-1">
        {Object.keys(uploaded_files).length === 0 ? (
          <div className="text-[#5a6478] text-[11px] py-1">No files. Switch to the Files pane to add.</div>
        ) : (
          Object.entries(uploaded_files).map(([name, fd]) => {
            const ext = fd.ext || ".txt";
            const icon = FILE_ICONS[ext.toLowerCase()] || "📄";
            const shortName = name.length > 24 ? "…" + name.slice(-23) : name;
            const ftk = est(fd.content);

            return (
              <div key={name} className="flex items-center gap-2 justify-between bg-[#161923] border border-[#1c2130] rounded-md p-2 hover:border-[#252d3d] transition-colors group">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={fd.enabled} 
                    onChange={(e) => toggleFileEnabled(name, e.target.checked)}
                    className="accent-[#00e87a] w-3 h-3"
                  />
                  <div className="flex flex-col">
                    <span className="text-[#dde1ec] font-medium text-[11px]">{icon} {shortName}</span>
                    <span className="text-[#5a6478] text-[10px] mt-0.5">{ftk.toLocaleString()} tokens</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border ${
                  fd.enabled 
                    ? "bg-[#00e87a]/10 text-[#00e87a] border-[#00e87a]/25" 
                    : "bg-[#f04155]/10 text-[#f04155] border-[#f04155]/25"
                }`}>
                  {fd.enabled ? "on" : "off"}
                </span>
              </div>
            );
          })
        )}
      </div>

      <hr className="border-[#252d3d] my-1 mt-2" />

      {/* Actions */}
      <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs">
        💾 Actions
      </div>
      
      <div className="flex flex-col gap-2 mt-1">
        <button 
          onClick={handleAssemble}
          className="w-full bg-[#00e87a]/10 border border-[#00e87a] text-[#00e87a] rounded-md py-1.5 px-3 text-xs font-bold tracking-widest uppercase hover:bg-[#00e87a]/20 transition-all"
        >
          📋 Assemble Prompt
        </button>
        <button 
          onClick={() => setBuildSubPane("files")}
          className="w-full bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-1.5 px-3 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all"
        >
          📂 Manage Files →
        </button>
        <button 
          onClick={() => {
            if (window.confirm("Are you sure you want to clear context, prompt, and output?")) {
              clearAll();
            }
          }}
          className="w-full bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-1.5 px-3 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] transition-all"
        >
          🗑️ Clear All
        </button>
      </div>
    </div>
  );
}

export default function Builder() {
  const { build_sub, setBuildSubPane } = usePromptBuilder();

  return (
    <div className="flex flex-col h-full text-[#dde1ec] min-h-screen bg-[#09090c] p-6">
      <div className="flex items-center gap-4 mb-6 w-full max-w-5xl mx-auto">
        <button
          onClick={() => setBuildSubPane("prompt")}
          className={`flex-1 py-2 px-4 rounded-md border text-sm font-bold uppercase tracking-wide transition-colors ${
            build_sub === "prompt"
              ? "bg-[#00e87a]/10 border-[#00e87a] text-[#00e87a]"
              : "bg-[#161923] border-[#252d3d] text-[#dde1ec] hover:border-[#00e87a] hover:text-[#00e87a]"
          }`}
        >
          ✍️ Build Prompt
        </button>
        <button
          onClick={() => setBuildSubPane("files")}
          className={`flex-1 py-2 px-4 rounded-md border text-sm font-bold uppercase tracking-wide transition-colors ${
            build_sub === "files"
              ? "bg-[#00e87a]/10 border-[#00e87a] text-[#00e87a]"
              : "bg-[#161923] border-[#252d3d] text-[#dde1ec] hover:border-[#00e87a] hover:text-[#00e87a]"
          }`}
        >
          📂 Manage Files
        </button>
        <button
          onClick={() => setBuildSubPane("jules")}
          className={`flex-1 py-2 px-4 rounded-md border text-sm font-bold uppercase tracking-wide transition-colors ${
            build_sub === "jules"
              ? "bg-[#00e87a]/10 border-[#00e87a] text-[#00e87a]"
              : "bg-[#161923] border-[#252d3d] text-[#dde1ec] hover:border-[#00e87a] hover:text-[#00e87a]"
          }`}
        >
          🚀 Send to Jules
        </button>
      </div>

      <hr className="border-[#252d3d] w-full max-w-5xl mx-auto mb-6" />

      <div className="w-full max-w-5xl mx-auto">
        {build_sub === "prompt" && (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-7 flex flex-col">
              <ContextGenerator />
              <PromptEditor />
            </div>
            <div className="col-span-5">
              <LiveSummary />
            </div>
          </div>
        )}

        {build_sub === "files" && (
          <FileManager />
        )}

        {build_sub === "jules" && (
          <SendToJules />
        )}
      </div>
    </div>
  );
}

export function PromptEditor() {
  const { prompt_text, setPromptText } = usePromptBuilder();
  const tokens = est(prompt_text);

  return (
    <div className="flex flex-col gap-4 font-mono text-sm mt-8">
      <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs">
        ✍️ Main Prompt
      </div>
      <p className="text-xs text-[#5a6478] mb-2">
        Primary instruction — separated from context by `---` in the assembled prompt.
      </p>

      <textarea
        value={prompt_text}
        onChange={e => setPromptText(e.target.value)}
        placeholder="Implement a secure JWT authentication system:\n\n1. User registration with email validation\n2. Login endpoint → access + refresh tokens\n..."
        className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-3 text-xs text-[#dde1ec] focus:border-[#00e87a] focus:ring-1 focus:ring-[#00e87a]/20 outline-none min-h-[220px]"
      />

      <TokenBar tokens={tokens} />
    </div>
  );
}

export function ContextGenerator() {
  const {
    ctx_input_mode,
    setCtxInputMode,
    uploaded_files,
    ctx_selected_files,
    setCtxSelectedFiles,
    ctx_gen_notes,
    setCtxGenNotes,
    context_text,
    setContextText,
    clearContext,
    chunk_strategy,
    chunk_size,
    chunk_overlap,
    setBuildSubPane,
  } = usePromptBuilder();

  const [sysExpanded, setSysExpanded] = useState(false);
  const [sysPrompt, setSysPrompt] = useState(CONTEXT_SYSTEM_PROMPT);
  const [isGenerating, setIsGenerating] = useState(false);

  // Stats for "Files" mode
  const fileNames = Object.keys(uploaded_files);
  const hasFiles = fileNames.length > 0;
  
  const selectedContent = ctx_selected_files
    .filter(name => uploaded_files[name])
    .map(name => `### FILE: ${name} ###\n${uploaded_files[name].content}`)
    .join("\n\n");
  
  const selectedChars = selectedContent.length;
  const selectedTokens = est(selectedContent);

  const handleSelectAll = () => setCtxSelectedFiles(fileNames);
  const handleSelectNone = () => setCtxSelectedFiles([]);

  const toggleFile = (name: string) => {
    if (ctx_selected_files.includes(name)) {
      setCtxSelectedFiles(ctx_selected_files.filter(n => n !== name));
    } else {
      setCtxSelectedFiles([...ctx_selected_files, name]);
    }
  };

  // Stats for "Manual" mode
  const manualChars = ctx_gen_notes.length;
  const manualTokens = est(ctx_gen_notes);

  // Mock Generation logic for now (API call would go here)
  const handleGenerate = async (content: string) => {
    setIsGenerating(true);
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 1000));
    setContextText(`[Generated context from LLM]\n\nBased on input:\n${content.substring(0, 50)}...`);
    setIsGenerating(false);
  };

  const getChunks = (content: string) => {
    if (est(content) <= MAX_TOKENS) return [];
    return doChunk(content, chunk_strategy, chunk_size, chunk_overlap);
  };

  const chunks = ctx_input_mode === "files" ? getChunks(selectedContent) : getChunks(ctx_gen_notes);

  return (
    <div className="flex flex-col gap-4 font-mono text-sm">
      <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs">
        📌 Context Block
        <span className="bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/25 px-2 py-0.5 rounded-full ml-2">
          LLM Powered
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCtxInputMode("files")}
          className={`flex-1 py-1.5 px-3 rounded-md border text-xs font-bold uppercase tracking-wide transition-colors ${
            ctx_input_mode === "files" 
              ? "bg-[#00e87a]/10 border-[#00e87a] text-[#00e87a]" 
              : "bg-[#161923] border-[#252d3d] text-[#dde1ec] hover:border-[#00e87a] hover:text-[#00e87a]"
          }`}
        >
          <FolderOpen className="w-4 h-4 inline-block mr-2" /> From Files
        </button>
        <button
          onClick={() => setCtxInputMode("manual")}
          className={`flex-1 py-1.5 px-3 rounded-md border text-xs font-bold uppercase tracking-wide transition-colors ${
            ctx_input_mode === "manual" 
              ? "bg-[#00e87a]/10 border-[#00e87a] text-[#00e87a]" 
              : "bg-[#161923] border-[#252d3d] text-[#dde1ec] hover:border-[#00e87a] hover:text-[#00e87a]"
          }`}
        >
          <Edit3 className="w-4 h-4 inline-block mr-2" /> Manual
        </button>
      </div>

      <hr className="border-[#252d3d] my-1" />

      {/* MODE: FILES */}
      {ctx_input_mode === "files" && (
        <div className="bg-gradient-to-br from-[#00e87a]/[0.04] to-[#3b8ef3]/[0.04] border border-[#00e87a]/20 rounded-md p-4">
          <div className="inline-flex items-center gap-1 bg-[#00e87a]/10 border border-[#00e87a]/25 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase text-[#00e87a] mb-3">
            ✦ Synthesize Context from Uploaded Files
          </div>
          <p className="text-xs text-[#5a6478] mb-4">
            Select which uploaded files the LLM should read to generate the context block. 
            File contents are concatenated, auto-chunked if they exceed the token limit, 
            then synthesized into a structured project context.
          </p>

          {!hasFiles ? (
            <div className="text-[#5a6478] text-xs py-2">
              ⚠ No files uploaded yet — switch to the <b>Files</b> pane to add files first.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-[10px] text-[#5a6478] uppercase tracking-wider">
                Select files to include in context generation
              </div>
              <div className="flex gap-2">
                <button onClick={handleSelectAll} className="px-3 py-1 bg-[#161923] border border-[#252d3d] rounded text-xs hover:border-[#00e87a] hover:text-[#00e87a] transition-colors">☑ All</button>
                <button onClick={handleSelectNone} className="px-3 py-1 bg-[#161923] border border-[#252d3d] rounded text-xs hover:border-[#00e87a] hover:text-[#00e87a] transition-colors">☐ None</button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {fileNames.map(name => {
                  const fd = uploaded_files[name];
                  const ext = fd.ext || ".txt";
                  const icon = FILE_ICONS[ext.toLowerCase()] || "📄";
                  const checked = ctx_selected_files.includes(name);
                  const shortName = name.length > 22 ? "…" + name.slice(-21) : name;
                  const ftok = est(fd.content);

                  return (
                    <label key={name} className="flex items-center gap-2 cursor-pointer text-xs hover:text-white transition-colors" title={`${name} — ${ftok.toLocaleString()} tokens`}>
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        onChange={() => toggleFile(name)} 
                        className="accent-[#00e87a]"
                      />
                      <span className="truncate">{icon} {shortName}</span>
                    </label>
                  );
                })}
              </div>

              {ctx_selected_files.length > 0 ? (
                <div className="mt-2">
                  <CapacityBar chars={selectedChars} labelR={`${ctx_selected_files.length} file(s) · ${selectedChars.toLocaleString()} chars`} />
                  {selectedTokens > MAX_TOKENS ? (
                    <div className="text-[10px] text-[#f5a623] mt-1">
                      ⚠ Exceeds limit — will process in {chunks.length} chunks ({chunk_strategy.replace("_", " ")})
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#00e87a] mt-1">
                      ✓ {selectedTokens.toLocaleString()} tokens — single LLM pass
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-[#5a6478] mt-2">Select at least one file above.</div>
              )}
            </div>
          )}

          <div className="mt-4">
            <button 
              onClick={() => setSysExpanded(!sysExpanded)}
              className="flex items-center gap-2 text-xs text-[#5a6478] hover:text-[#dde1ec] transition-colors mb-2"
            >
              {sysExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              ⚙️ Customize generation instruction
            </button>
            {sysExpanded && (
              <textarea 
                value={sysPrompt}
                onChange={e => setSysPrompt(e.target.value)}
                className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs text-[#dde1ec] focus:border-[#00e87a] focus:ring-1 focus:ring-[#00e87a]/20 outline-none min-h-[85px] mb-2"
              />
            )}
          </div>

          <button 
            disabled={!hasFiles || ctx_selected_files.length === 0 || isGenerating}
            onClick={() => handleGenerate(selectedContent)}
            className="w-full mt-2 bg-[#00e87a]/10 border border-[#00e87a] text-[#00e87a] rounded-md py-2 text-xs font-bold tracking-widest uppercase hover:bg-[#00e87a]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? "Generating..." : "✦ Generate Context from Files"}
          </button>
        </div>
      )}

      {/* MODE: MANUAL */}
      {ctx_input_mode === "manual" && (
        <div className="bg-gradient-to-br from-[#00e87a]/[0.04] to-[#3b8ef3]/[0.04] border border-[#00e87a]/20 rounded-md p-4">
          <div className="inline-flex items-center gap-1 bg-[#00e87a]/10 border border-[#00e87a]/25 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase text-[#00e87a] mb-3">
            ✏️ Manual Context Input
          </div>
          <p className="text-xs text-[#5a6478] mb-4">
            Type or paste context directly. This can be project metadata, stack info, constraints, or any background the LLM should know. Optionally send it through the LLM for cleanup.
          </p>

          <textarea
            value={ctx_gen_notes}
            onChange={e => setCtxGenNotes(e.target.value)}
            placeholder={"Project: E-commerce checkout rebuild\nStack: Next.js 14, Stripe, PostgreSQL 15, Redis\nConstraints: Must be PCI-DSS compliant.\nGoal: Replace legacy system...\nVersion: v2.0.0"}
            className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-3 text-xs text-[#dde1ec] focus:border-[#00e87a] focus:ring-1 focus:ring-[#00e87a]/20 outline-none min-h-[130px] mb-2"
          />

          <CapacityBar chars={manualChars} labelR={`${manualChars.toLocaleString()} / ${MAX_INPUT_CHARS.toLocaleString()} chars`} />

          {manualChars > 0 && manualTokens > MAX_TOKENS && (
            <div className="text-[10px] text-[#f5a623] mt-1 mb-3">
              ⚠ Exceeds limit — {chunks.length} chunks
            </div>
          )}

          <div className="mt-2">
            <button 
              onClick={() => setSysExpanded(!sysExpanded)}
              className="flex items-center gap-2 text-xs text-[#5a6478] hover:text-[#dde1ec] transition-colors mb-2"
            >
              {sysExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              ⚙️ Customize generation instruction
            </button>
            {sysExpanded && (
              <textarea 
                value={sysPrompt}
                onChange={e => setSysPrompt(e.target.value)}
                className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-xs text-[#dde1ec] focus:border-[#00e87a] focus:ring-1 focus:ring-[#00e87a]/20 outline-none min-h-[85px] mb-2"
              />
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <button 
              disabled={!ctx_gen_notes.trim() || isGenerating}
              onClick={() => handleGenerate(ctx_gen_notes)}
              className="flex-1 bg-[#00e87a]/10 border border-[#00e87a] text-[#00e87a] rounded-md py-2 text-xs font-bold tracking-widest uppercase hover:bg-[#00e87a]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? "Synthesizing..." : "✦ Synthesize via LLM"}
            </button>
            <button 
              disabled={!ctx_gen_notes.trim() || isGenerating}
              onClick={() => setContextText(ctx_gen_notes)}
              className="flex-1 bg-[#161923] border border-[#252d3d] text-[#dde1ec] rounded-md py-2 text-xs font-bold tracking-widest uppercase hover:border-[#00e87a] hover:text-[#00e87a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              📋 Use as-is
            </button>
          </div>
        </div>
      )}

      {/* RESULT REVIEW / EDIT */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-[#00e87a] font-bold uppercase tracking-widest text-xs mb-2">
          📌 Context — Review & Edit
        </div>
        
        {context_text && (
          <div className="flex items-center gap-3 text-[10px] text-[#5a6478] mb-2">
            <span className="bg-[#00e87a]/10 text-[#00e87a] border border-[#00e87a]/25 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              {ctx_input_mode === "files" ? `Generated from ${ctx_selected_files.length} file(s)` : "Manual / Synthesized"}
            </span>
            <span>{context_text.length.toLocaleString()} chars</span>
          </div>
        )}

        <textarea
          value={context_text}
          onChange={e => setContextText(e.target.value)}
          placeholder="Context will appear here after generation. You can also edit it freely at any time."
          className="w-full bg-[#0c0e14] border border-[#1c2130] rounded-md p-3 text-xs text-[#dde1ec] focus:border-[#00e87a] focus:ring-1 focus:ring-[#00e87a]/20 outline-none min-h-[150px]"
        />

        <div className="flex gap-2 mt-3">
          <button 
            onClick={clearContext}
            className="flex-1 py-1.5 px-3 rounded-md border border-[#252d3d] bg-[#161923] text-xs font-bold uppercase tracking-wide hover:border-[#00e87a] hover:text-[#00e87a] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 inline-block mr-2" /> Clear Context
          </button>
          <button 
            onClick={() => setBuildSubPane("files")}
            className="flex-1 py-1.5 px-3 rounded-md border border-[#252d3d] bg-[#161923] text-xs font-bold uppercase tracking-wide hover:border-[#00e87a] hover:text-[#00e87a] transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 inline-block mr-2" /> → Files Pane
          </button>
        </div>
      </div>
    </div>
  );
}
