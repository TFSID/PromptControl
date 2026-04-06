export type ChunkStrategy = "sliding_window" | "semantic" | "hybrid";

export type SynthesisMode = "refine" | "expand" | "restructure" | "summarize" | "custom";

export interface FileData {
  content: string;
  size: number;
  ext: string;
  enabled: boolean;
  uploaded_at: string;
}

export interface ChunkInfo {
  idx: number;
  total: number;
  tokens: number;
  ok: boolean;
  response: string;
}

export interface JulesSession {
  timestamp: string;
  success: boolean;
  result: any;
  prompt_preview: string;
  tokens: number;
  config: {
    title: string;
    source: string;
    branch: string;
    automation: string | null;
  };
}

export interface SynthesisHistoryEntry {
  timestamp: string;
  mode: SynthesisMode;
  inp_tokens: number;
  chunks: number;
  ok: number;
  results: ChunkInfo[];
}

export interface PromptBuilderState {
  // Files
  uploaded_files: Record<string, FileData>;
  
  // Context Generator
  context_text: string;
  ctx_gen_notes: string;
  ctx_gen_info: ChunkInfo[];
  ctx_selected_files: string[];
  ctx_input_mode: "files" | "manual";
  
  // Prompt Editor
  prompt_text: string;
  synthesized_prompt: string;
  assembled_prompt: string;
  
  // Jules Config
  jules_sessions: JulesSession[];
  jules_api_key: string;
  jules_source: string;
  jules_branch: string;
  jules_automation: string | null;
  jules_title: string;
  
  // LLM Config
  llm_api_key: string;
  llm_model: string;
  llm_temperature: number;
  llm_top_p: number;
  llm_system: string;
  
  // Chunking Config
  chunk_strategy: ChunkStrategy;
  chunk_size: number;
  chunk_overlap: number;
  
  // Synthesis
  synthesis_history: SynthesisHistoryEntry[];
  
  // UI State
  build_sub: "prompt" | "jules" | "files";
  _confirm_clear: boolean;
}

// Global actions to manipulate store (assuming zustand or similar context)
export interface PromptBuilderActions {
  setField: <K extends keyof PromptBuilderState>(field: K, value: PromptBuilderState[K]) => void;
  updateFile: (filename: string, data: Partial<FileData>) => void;
  addFile: (filename: string, data: FileData) => void;
  removeFile: (filename: string) => void;
  clearAll: () => void;
}

export type PromptBuilderStore = PromptBuilderState & PromptBuilderActions;
