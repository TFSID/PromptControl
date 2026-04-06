"use client";

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { usePromptBuilder } from '@/hooks/usePromptBuilder';
import { useTokenWorker } from '@/hooks/useTokenWorker';
import { TokenBar, CapacityBar } from '@/components/ui/TokenBar';
import { est, assemble, MAX_TOKENS, CHARS_PER_TOKEN, do_chunk } from '@/lib/chunking';

const MAX_INPUT_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

function fmt_size(n: number) {
  if (n < 1024) return \`\${n}B\`;
  if (n < 1024 * 1024) return \`\${(n / 1024).toFixed(1)}KB\`;
  return \`\${(n / (1024 * 1024)).toFixed(1)}MB\`;
}

export function Builder() {
  const { 
    build_sub, 
    setField, 
    context_text, 
    prompt_text, 
    uploaded_files,
    ctx_input_mode,
    ctx_gen_notes,
    ctx_selected_files,
    chunk_strategy,
    chunk_size,
    chunk_overlap,
    addFile,
    updateFile,
    removeFile
  } = usePromptBuilder();
  
  const { estimateTokens } = useTokenWorker();

  // --- Derived State (Prompt Tokenization) ---
  const assembledPrompt = useMemo(() => {
    return assemble(context_text, prompt_text, uploaded_files);
  }, [context_text, prompt_text, uploaded_files]);

  const [totalTokens, setTotalTokens] = useState(0);
  const [contextTokens, setContextTokens] = useState(0);
  const [promptTokens, setPromptTokens] = useState(0);
  const [filesTokens, setFilesTokens] = useState(0);
  const [selectedContextTokens, setSelectedContextTokens] = useState(0);

  useEffect(() => {
    estimateTokens(assembledPrompt).then(setTotalTokens);
  }, [assembledPrompt, estimateTokens]);

  useEffect(() => {
    estimateTokens(context_text).then(setContextTokens);
  }, [context_text, estimateTokens]);

  useEffect(() => {
    estimateTokens(prompt_text).then(setPromptTokens);
  }, [prompt_text, estimateTokens]);

  useEffect(() => {
    const calcFilesTokens = async () => {
      let total = 0;
      for (const file of Object.values(uploaded_files)) {
         if (file.enabled) {
            total += await estimateTokens(file.content);
         }
      }
      setFilesTokens(total);
    };
    calcFilesTokens();
  }, [uploaded_files, estimateTokens]);

  const activeFilesCount = useMemo(() => {
    return Object.values(uploaded_files).filter(f => f.enabled).length;
  }, [uploaded_files]);

  // --- Context Selection Logic ---
  const selectedContextFilesContent = useMemo(() => {
    return ctx_selected_files
      .filter(f => uploaded_files[f])
      .map(f => \`### FILE: \${f} ###\\n\${uploaded_files[f].content}\`)
      .join("\\n\\n");
  }, [ctx_selected_files, uploaded_files]);

  const selectedContextChars = selectedContextFilesContent.length;
  
  useEffect(() => {
    estimateTokens(selectedContextFilesContent).then(setSelectedContextTokens);
  }, [selectedContextFilesContent, estimateTokens]);

  // --- Event Handlers (File Upload & Drag/Drop) ---
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const ext = file.name.includes('.') ? \`.\${file.name.split('.').pop()?.toLowerCase()}\` : '';
        addFile(file.name, {
          content,
          size: file.size,
          ext,
          enabled: true,
          uploaded_at: new Date().toISOString()
        });
      };
      reader.readAsText(file);
    });
  }, [addFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // --- View: File Manager ---
  if (build_sub === "files") {
    return (
      <div className="flex flex-col lg:flex-row gap-8 p-4 font-mono text-[#dde1ec]">
        <div className="flex-[5] flex flex-col gap-6">
          <section>
            <div className="uppercase tracking-[0.13em] font-bold text-[#3b8ef3] text-[0.68rem] mb-2 font-sans">
              📤 Upload Files
            </div>
            <p className="text-xs text-[#5a6478] mb-4">
              Drag and drop text-based files below to add them to your prompt context.
            </p>
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-[#252d3d] hover:border-[#00e87a] rounded-md h-32 flex items-center justify-center text-xs text-[#5a6478] bg-[#161923] transition-colors cursor-pointer"
            >
              Drop files here
            </div>
            <hr className="border-[#1c2130] my-4" />
            <button 
              onClick={() => setField("build_sub", "prompt")}
              className="w-full bg-[#1c2130] text-[#dde1ec] px-4 py-2 rounded-md border border-[#252d3d] hover:border-[#00e87a] hover:text-[#00e87a] transition-colors uppercase tracking-widest text-[0.68rem] font-bold"
            >
              ← Back to Prompt Builder
            </button>
          </section>
        </div>

        <div className="flex-[7]">
           <div className="uppercase tracking-[0.13em] font-bold text-[#9d7dea] text-[0.68rem] mb-4 font-sans">
              📁 File Library
           </div>
           {Object.keys(uploaded_files).length === 0 ? (
             <div className="text-[#5a6478] text-sm">No files yet. Drop files on the left to add them.</div>
           ) : (
             <div className="flex flex-col gap-2">
               {Object.entries(uploaded_files).map(([fname, fd]) => (
                 <div key={fname} className="bg-[#161923] border border-[#1c2130] rounded-md p-3 flex justify-between items-center text-xs hover:border-[#252d3d] transition-colors">
                   <div>
                     <div className="font-bold text-[#dde1ec]">{fname}</div>
                     <div className="text-[#5a6478] text-[0.65rem] mt-1">{fmt_size(fd.size)}</div>
                   </div>
                   <div className="flex items-center gap-3">
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={fd.enabled}
                         onChange={(e) => updateFile(fname, { enabled: e.target.checked })}
                         className="accent-[#00e87a]"
                       />
                       <span className={\`text-[0.6rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full \${fd.enabled ? 'bg-[rgba(0,232,122,0.1)] text-[#00e87a] border border-[rgba(0,232,122,0.25)]' : 'bg-[rgba(240,65,85,0.1)] text-[#f04155] border border-[rgba(240,65,85,0.25)]'}\`}>
                         {fd.enabled ? 'Enabled' : 'Disabled'}
                       </span>
                     </label>
                     <button onClick={() => removeFile(fname)} className="text-[#f04155] hover:opacity-75">🗑️</button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    );
  }

  // --- View: Prompt Builder ---
  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4 font-mono text-[#dde1ec]">
      
      {/* Left Column */}
      <div className="flex-[11] flex flex-col gap-6">
        
        {/* Context Block Section */}
        <section>
          <div className="flex items-center gap-2 uppercase tracking-[0.13em] font-bold text-[#00e87a] text-[0.68rem] mb-2 font-sans">
            📌 Context Block
            <span className="bg-[rgba(45,212,191,0.1)] text-[#2dd4bf] border border-[rgba(45,212,191,0.25)] rounded-full px-2 py-[0.11rem] text-[0.59rem] ml-1 tracking-wider uppercase font-bold">
              LLM Powered
            </span>
          </div>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setField("ctx_input_mode", "files")}
              className={\`px-4 py-1.5 rounded-md border text-[0.68rem] font-bold uppercase tracking-widest \${ctx_input_mode === "files" ? "bg-[rgba(0,232,122,0.1)] border-[#00e87a] text-[#00e87a]" : "bg-[#161923] border-[#252d3d] hover:border-[#00e87a] hover:text-[#00e87a]"}\`}
            >
              📂 From Files
            </button>
            <button 
              onClick={() => setField("ctx_input_mode", "manual")}
              className={\`px-4 py-1.5 rounded-md border text-[0.68rem] font-bold uppercase tracking-widest \${ctx_input_mode === "manual" ? "bg-[rgba(0,232,122,0.1)] border-[#00e87a] text-[#00e87a]" : "bg-[#161923] border-[#252d3d] hover:border-[#00e87a] hover:text-[#00e87a]"}\`}
            >
              ✏️ Manual
            </button>
          </div>

          {ctx_input_mode === "files" && (
            <div className="bg-gradient-to-br from-[rgba(0,232,122,0.04)] to-[rgba(59,142,243,0.04)] border border-[rgba(0,232,122,0.18)] rounded-md p-4 mb-4">
               <div className="inline-flex items-center gap-1 bg-[rgba(0,232,122,0.1)] border border-[rgba(0,232,122,0.25)] rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold tracking-widest uppercase text-[#00e87a] mb-2">
                ✦ Synthesize Context from Uploaded Files
              </div>
              <p className="text-[#5a6478] text-[0.65rem] mb-3 leading-relaxed">
                Select which uploaded files the LLM should read to generate the context block. 
                File contents are concatenated, auto-chunked if they exceed the token limit, 
                then synthesized into a structured project context.
              </p>

              {Object.keys(uploaded_files).length === 0 ? (
                 <div className="text-[#5a6478] text-[0.72rem] py-2">
                    ⚠ No files uploaded yet — switch to the <b>Files</b> pane to add files first.
                 </div>
              ) : (
                <>
                  <div className="text-[0.65rem] text-[#5a6478] uppercase tracking-widest mb-2 mt-4">
                    Select files to include in context generation
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => setField("ctx_selected_files", Object.keys(uploaded_files))}
                      className="bg-[#161923] border border-[#252d3d] text-[#dde1ec] text-[0.68rem] px-3 py-1 rounded-md hover:border-[#00e87a]"
                    >☑ All</button>
                    <button 
                      onClick={() => setField("ctx_selected_files", [])}
                      className="bg-[#161923] border border-[#252d3d] text-[#dde1ec] text-[0.68rem] px-3 py-1 rounded-md hover:border-[#00e87a]"
                    >☐ None</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(uploaded_files).map(([fname, fd]) => (
                      <label key={fname} className="flex items-center gap-2 text-xs cursor-pointer text-[#dde1ec]">
                        <input 
                          type="checkbox"
                          checked={ctx_selected_files.includes(fname)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setField("ctx_selected_files", [...ctx_selected_files, fname]);
                            } else {
                              setField("ctx_selected_files", ctx_selected_files.filter(f => f !== fname));
                            }
                          }}
                          className="accent-[#00e87a]"
                        />
                        {fname}
                      </label>
                    ))}
                  </div>

                  {ctx_selected_files.length > 0 && (
                    <>
                      <CapacityBar chars={selectedContextChars} maxChars={MAX_INPUT_CHARS} labelR={\`\${ctx_selected_files.length} files • \${selectedContextChars.toLocaleString()} chars\`} />
                      {selectedContextTokens > MAX_TOKENS ? (
                        <div className="text-[0.62rem] text-[#f5a623] mt-2">
                          ⚠ Exceeds limit — will process in {do_chunk(selectedContextFilesContent, chunk_strategy, chunk_size, chunk_overlap).length} chunks
                        </div>
                      ) : (
                         <div className="text-[0.62rem] text-[#00e87a] mt-2">✓ {selectedContextTokens.toLocaleString()} tokens — single LLM pass</div>
                      )}
                    </>
                  )}

                  <button className="w-full mt-4 bg-[rgba(0,232,122,0.1)] border border-[#00e87a] text-[#00e87a] font-bold text-[0.68rem] tracking-widest uppercase py-2 rounded-md hover:bg-[rgba(0,232,122,0.2)] disabled:opacity-50 disabled:cursor-not-allowed">
                     ✦ Generate Context from Files
                  </button>
                </>
              )}
            </div>
          )}

          {ctx_input_mode === "manual" && (
            <div className="bg-gradient-to-br from-[rgba(0,232,122,0.04)] to-[rgba(59,142,243,0.04)] border border-[rgba(0,232,122,0.18)] rounded-md p-4 mb-4">
               <div className="inline-flex items-center gap-1 bg-[rgba(0,232,122,0.1)] border border-[rgba(0,232,122,0.25)] rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold tracking-widest uppercase text-[#00e87a] mb-2">
                ✏️ Manual Context Input
              </div>
              <p className="text-[#5a6478] text-xs mb-3">
                Type or paste context directly. This can be project metadata, stack info,
                constraints, or any background the LLM should know.
                Optionally send it through the LLM for cleanup.
              </p>
              
              <textarea
                value={ctx_gen_notes}
                onChange={(e) => setField("ctx_gen_notes", e.target.value)}
                className="w-full h-[130px] bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-[0.74rem] focus:border-[#00e87a] focus:ring-1 focus:ring-[rgba(0,232,122,0.17)] outline-none"
                placeholder={"Project: E-commerce checkout rebuild\\nStack: Next.js 14, Stripe, PostgreSQL 15, Redis"}
              />
              <CapacityBar chars={ctx_gen_notes.length} maxChars={MAX_INPUT_CHARS} labelR={\`\${ctx_gen_notes.length.toLocaleString()} / \${MAX_INPUT_CHARS.toLocaleString()} chars\`} />
            </div>
          )}
          
          <div className="mt-4 uppercase tracking-[0.13em] font-bold text-[#00e87a] text-[0.68rem] mb-2 font-sans">
            📌 Context — Review & Edit
          </div>
          <textarea
            value={context_text}
            onChange={(e) => setField("context_text", e.target.value)}
            className="w-full h-[150px] bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-[0.74rem] focus:border-[#00e87a] focus:ring-1 focus:ring-[rgba(0,232,122,0.17)] outline-none mb-4"
            placeholder="Context will appear here after generation.\\nYou can also edit it freely at any time."
          />
        </section>

        <hr className="border-[#1c2130] my-2" />

        {/* Main Prompt Section */}
        <section>
          <div className="uppercase tracking-[0.13em] font-bold text-[#00e87a] text-[0.68rem] mb-1 font-sans">
            ✍️ Main Prompt
          </div>
          <p className="text-xs text-[#5a6478] mb-3">
            Primary instruction — separated from context by \`---\` in the assembled prompt.
          </p>

          <textarea
            value={prompt_text}
            onChange={(e) => setField("prompt_text", e.target.value)}
            className="w-full h-[220px] bg-[#0c0e14] border border-[#1c2130] rounded-md p-2 text-[0.74rem] focus:border-[#00e87a] focus:ring-1 focus:ring-[rgba(0,232,122,0.17)] outline-none mb-2"
            placeholder="Implement a secure JWT authentication system:\\n\\n1. User registration..."
          />
          
          <TokenBar tokens={promptTokens} />
        </section>

      </div>

      {/* Right Column (Live Summary) */}
      <div className="flex-[7] flex flex-col gap-4">
        <section>
          <div className="uppercase tracking-[0.13em] font-bold text-[#3b8ef3] text-[0.68rem] mb-2 font-sans">
            📊 Live Summary
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-2">
              <div className="text-[0.6rem] text-[#5a6478] uppercase tracking-widest">Total Tokens</div>
              <div className="text-xl font-bold text-[#00e87a] font-sans">{totalTokens.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-2">
              <div className="text-[0.6rem] text-[#5a6478] uppercase tracking-widest">Characters</div>
              <div className="text-xl font-bold text-[#00e87a] font-sans">{assembledPrompt.length.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-2">
              <div className="text-[0.6rem] text-[#5a6478] uppercase tracking-widest">Active Files</div>
              <div className="text-xl font-bold text-[#00e87a] font-sans">{activeFilesCount}</div>
            </div>
            <div className="bg-[#0f1117] border border-[#1c2130] rounded-md p-2">
              <div className="text-[0.6rem] text-[#5a6478] uppercase tracking-widest">Sections</div>
              <div className="text-xl font-bold text-[#00e87a] font-sans">
                {assembledPrompt ? assembledPrompt.split("---").length : 0}
              </div>
            </div>
          </div>
          
          <div className="my-3 space-y-2">
            <div className="flex justify-between text-[0.65rem] mb-1 items-center">
              <span className="text-[#3b8ef3]">Context</span>
              <span className="text-[#5a6478]">{contextTokens.toLocaleString()} ({(contextTokens / Math.max(totalTokens, 1) * 100).toFixed(1)}%)</span>
            </div>
            <div className="bg-[#09090c] rounded-full h-0.5"><div className="bg-[#3b8ef3] h-0.5 rounded-full" style={{ width: \`\${(contextTokens / Math.max(totalTokens, 1)) * 100}%\`}}></div></div>

            <div className="flex justify-between text-[0.65rem] mb-1 mt-2 items-center">
              <span className="text-[#00e87a]">Prompt</span>
              <span className="text-[#5a6478]">{promptTokens.toLocaleString()} ({(promptTokens / Math.max(totalTokens, 1) * 100).toFixed(1)}%)</span>
            </div>
            <div className="bg-[#09090c] rounded-full h-0.5"><div className="bg-[#00e87a] h-0.5 rounded-full" style={{ width: \`\${(promptTokens / Math.max(totalTokens, 1)) * 100}%\`}}></div></div>

            <div className="flex justify-between text-[0.65rem] mb-1 mt-2 items-center">
              <span className="text-[#9d7dea]">Files</span>
              <span className="text-[#5a6478]">{filesTokens.toLocaleString()} ({(filesTokens / Math.max(totalTokens, 1) * 100).toFixed(1)}%)</span>
            </div>
            <div className="bg-[#09090c] rounded-full h-0.5"><div className="bg-[#9d7dea] h-0.5 rounded-full" style={{ width: \`\${(filesTokens / Math.max(totalTokens, 1)) * 100}%\`}}></div></div>
          </div>
          
          <hr className="border-[#1c2130] my-4" />
          
          <div className="uppercase tracking-[0.13em] font-bold text-[#dde1ec] text-[0.68rem] mb-3 font-sans">
            💾 Actions
          </div>
          <button 
             onClick={() => setField("build_sub", "files")}
             className="w-full mb-3 bg-[#161923] border border-[#252d3d] text-[#dde1ec] font-bold text-[0.68rem] tracking-widest uppercase py-2 rounded-md hover:border-[#00e87a] hover:text-[#00e87a] transition-colors"
          >
             📂 Manage Files →
          </button>
        </section>
      </div>
    </div>
  );
}
