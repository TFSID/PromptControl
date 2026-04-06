export const MAX_TOKENS = 65536;
export const CHARS_PER_TOKEN = 4;
export const MAX_INPUT_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

export const JULES_API_URL = "https://jules.googleapis.com/v1alpha/sessions";
export const LLM_API_URL = "https://api-ai.tegarfirman.site/v1/generate";
export const DEFAULT_MODEL = "gemini-flash-latest";

export const SUPPORTED_EXTENSIONS = [
  ".txt", ".md", ".html", ".htm", ".js", ".ts", ".jsx", ".tsx",
  ".css", ".scss", ".sass", ".less", ".json", ".xml", ".yaml",
  ".yml", ".toml", ".ini", ".cfg", ".env", ".sh", ".bash",
  ".py", ".java", ".c", ".cpp", ".go", ".rs", ".rb", ".php",
  ".sql", ".graphql", ".vue", ".svelte", ".csv", ".log",
];

export const AUTOMATION_MODES = [null, "AUTO_CREATE_PR"];

export const MODELS = [
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-flash-2.0",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

export const CONTEXT_SYSTEM_PROMPT =
  "You are a senior technical writer and project analyst. " +
  "Given raw notes, descriptions, or documentation below, synthesize a clean, " +
  "structured project context block. Include: project name/goal, tech stack, " +
  "key constraints, relevant versions or environment details, and any critical " +
  "background information. Be concise but complete. " +
  "Return ONLY the formatted context block — no preamble, no explanation.";

export const FILE_ICONS: Record<string, string> = {
  ".py": "🐍", ".js": "📜", ".ts": "📘", ".jsx": "⚛️", ".tsx": "⚛️",
  ".html": "🌐", ".htm": "🌐", ".css": "🎨", ".scss": "🎨", ".sass": "🎨",
  ".json": "📋", ".yaml": "📋", ".yml": "📋", ".xml": "📋",
  ".md": "📝", ".txt": "📄", ".sql": "🗄️", ".sh": "⚙️", ".bash": "⚙️",
  ".go": "🐹", ".rs": "🦀", ".rb": "💎", ".php": "🐘",
  ".java": "☕", ".c": "⚙️", ".cpp": "⚙️", ".vue": "💚",
  ".toml": "🔧", ".ini": "🔧", ".cfg": "🔧", ".env": "🔑",
  ".csv": "📊", ".log": "📋", ".graphql": "◈",
};

export const TEMPLATES: Record<string, string> = {
  "🏗️ Feature": "Implement {feature_name} with the following requirements:\n\n1. {requirement_1}\n2. {requirement_2}\n3. {requirement_3}\n\nFollow existing code patterns and ensure proper error handling, testing, and documentation.",
  "🐛 Bug Fix": "Fix the bug described below:\n\nBug Description: {description}\nSteps to Reproduce: {steps}\nExpected: {expected}\nActual: {actual}\n\nProvide a minimal, targeted fix with explanation.",
  "♻️ Refactor": "Refactor {file_path} to:\n\n- Improve readability\n- Eliminate duplication\n- Apply {pattern} pattern\n- Maintain all existing tests\n\nDo not change external behavior.",
  "📚 Docs": "Generate comprehensive documentation for {target}:\n\n- API reference with parameters and return types\n- Usage examples\n- Edge cases\n- Integration guide",
  "🧪 Tests": "Write comprehensive tests for {module}:\n\n- Unit tests for all public functions\n- Integration tests\n- Edge case coverage\n- Mock external dependencies\n- >90% coverage",
};

export type ChunkStrategy = "sliding_window" | "semantic" | "hybrid";
export type SynthesisMode = "refine" | "expand" | "restructure" | "summarize" | "custom";
export type InputMode = "files" | "manual";
export type BuildSubPane = "prompt" | "jules" | "files";

export interface FileData {
  content: string;
  size: number;
  ext: string;
  enabled: boolean;
  uploaded_at: string;
}

export interface ChunkResult {
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
  results: ChunkResult[];
}

export interface PromptBuilderState {
  uploaded_files: Record<string, FileData>;
  context_text: string;
  ctx_gen_notes: string;
  ctx_gen_info: ChunkResult[];
  ctx_selected_files: string[];
  ctx_input_mode: InputMode;
  prompt_text: string;
  synthesized_prompt: string;
  jules_sessions: JulesSession[];
  jules_api_key: string;
  llm_api_key: string;
  llm_model: string;
  llm_temperature: number;
  llm_top_p: number;
  llm_system: string;
  jules_source: string;
  jules_branch: string;
  jules_automation: string | null;
  jules_title: string;
  chunk_strategy: ChunkStrategy;
  chunk_size: number;
  chunk_overlap: number;
  assembled_prompt: string;
  synthesis_history: SynthesisHistoryEntry[];
  build_sub: BuildSubPane;
  _hasHydrated: boolean;
}
