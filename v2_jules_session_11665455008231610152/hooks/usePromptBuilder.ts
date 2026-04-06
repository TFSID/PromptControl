import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import { 
  PromptBuilderState, 
  FileData, 
  ChunkResult, 
  InputMode, 
  ChunkStrategy,
  JulesSession,
  SynthesisHistoryEntry,
  BuildSubPane
} from "@/app/typing";

// Initial state, matching Python setup
const initialState: PromptBuilderState = {
  uploaded_files: {},
  context_text: "",
  ctx_gen_notes: "",
  ctx_gen_info: [],
  ctx_selected_files: [],
  ctx_input_mode: "files",
  prompt_text: "",
  synthesized_prompt: "",
  jules_sessions: [],
  jules_api_key: "",
  llm_api_key: "",
  llm_model: "gemini-flash-latest",
  llm_temperature: 1.0,
  llm_top_p: 0.95,
  llm_system: "",
  jules_source: "",
  jules_branch: "main",
  jules_automation: null,
  jules_title: "",
  chunk_strategy: "sliding_window",
  chunk_size: 8000,
  chunk_overlap: 800,
  assembled_prompt: "",
  synthesis_history: [],
  build_sub: "prompt",
  _hasHydrated: false,
};

// Define actions for our store
export interface PromptBuilderActions {
  // Hydration status
  setHasHydrated: (state: boolean) => void;

  // File operations
  addFile: (filename: string, fileData: FileData) => void;
  removeFile: (filename: string) => void;
  toggleFileEnabled: (filename: string, enabled: boolean) => void;
  setAllFilesEnabled: (enabled: boolean) => void;
  clearFiles: () => void;
  
  // Context generator operations
  setContextText: (text: string) => void;
  setCtxGenNotes: (notes: string) => void;
  setCtxGenInfo: (info: ChunkResult[]) => void;
  setCtxSelectedFiles: (files: string[]) => void;
  setCtxInputMode: (mode: InputMode) => void;
  clearContext: () => void;

  // Prompt operations
  setPromptText: (text: string) => void;
  setSynthesizedPrompt: (text: string) => void;
  setAssembledPrompt: (text: string) => void;

  // Jules operations
  addJulesSession: (session: JulesSession) => void;
  clearJulesSessions: () => void;

  // Settings operations
  setJulesApiKey: (key: string) => void;
  setLlmApiKey: (key: string) => void;
  setLlmModel: (model: string) => void;
  setLlmTemperature: (temp: number) => void;
  setLlmTopP: (topP: number) => void;
  setLlmSystem: (system: string) => void;
  
  // Jules Config operations
  setJulesSource: (source: string) => void;
  setJulesBranch: (branch: string) => void;
  setJulesAutomation: (auto: string | null) => void;
  setJulesTitle: (title: string) => void;

  // Chunking ops
  setChunkStrategy: (strategy: ChunkStrategy) => void;
  setChunkSize: (size: number) => void;
  setChunkOverlap: (overlap: number) => void;

  // Synthesis operations
  addSynthesisHistory: (entry: SynthesisHistoryEntry) => void;
  clearSynthesisHistory: () => void;

  // Navigation ops
  setBuildSubPane: (pane: BuildSubPane) => void;

  // Global actions
  clearAll: () => void;
}

export type PromptBuilderStore = PromptBuilderState & PromptBuilderActions;

// Custom storage combining localStorage for simple data and IndexedDB for large files
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // We store standard config in localstorage, large things like files in IDB.
    // For simplicity, Zustand serializes the entire store into a single string.
    // Given the potential size of `uploaded_files`, we put the whole store in IDB.
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export const usePromptBuilder = create<PromptBuilderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions implementation
      addFile: (filename, fileData) => 
        set((state) => ({ 
          uploaded_files: { ...state.uploaded_files, [filename]: fileData } 
        })),

      removeFile: (filename) => 
        set((state) => {
          const newFiles = { ...state.uploaded_files };
          delete newFiles[filename];
          return { uploaded_files: newFiles };
        }),

      toggleFileEnabled: (filename, enabled) =>
        set((state) => ({
          uploaded_files: {
            ...state.uploaded_files,
            [filename]: { ...state.uploaded_files[filename], enabled }
          }
        })),

      setAllFilesEnabled: (enabled) =>
        set((state) => {
          const newFiles: Record<string, FileData> = {};
          for (const key of Object.keys(state.uploaded_files)) {
            newFiles[key] = { ...state.uploaded_files[key], enabled };
          }
          return { uploaded_files: newFiles };
        }),

      clearFiles: () => set({ uploaded_files: {} }),

      setContextText: (text) => set({ context_text: text }),
      setCtxGenNotes: (notes) => set({ ctx_gen_notes: notes }),
      setCtxGenInfo: (info) => set({ ctx_gen_info: info }),
      setCtxSelectedFiles: (files) => set({ ctx_selected_files: files }),
      setCtxInputMode: (mode) => set({ ctx_input_mode: mode }),
      clearContext: () => set({ 
        context_text: "", 
        ctx_gen_notes: "", 
        ctx_gen_info: [], 
        ctx_selected_files: [] 
      }),

      setPromptText: (text) => set({ prompt_text: text }),
      setSynthesizedPrompt: (text) => set({ synthesized_prompt: text }),
      setAssembledPrompt: (text) => set({ assembled_prompt: text }),

      addJulesSession: (session) => 
        set((state) => ({ jules_sessions: [session, ...state.jules_sessions] })),
      clearJulesSessions: () => set({ jules_sessions: [] }),

      setJulesApiKey: (key) => set({ jules_api_key: key }),
      setLlmApiKey: (key) => set({ llm_api_key: key }),
      setLlmModel: (model) => set({ llm_model: model }),
      setLlmTemperature: (temp) => set({ llm_temperature: temp }),
      setLlmTopP: (topP) => set({ llm_top_p: topP }),
      setLlmSystem: (system) => set({ llm_system: system }),

      setJulesSource: (source) => set({ jules_source: source }),
      setJulesBranch: (branch) => set({ jules_branch: branch }),
      setJulesAutomation: (auto) => set({ jules_automation: auto }),
      setJulesTitle: (title) => set({ jules_title: title }),

      setChunkStrategy: (strategy) => set({ chunk_strategy: strategy }),
      setChunkSize: (size) => set({ chunk_size: size }),
      setChunkOverlap: (overlap) => set({ chunk_overlap: overlap }),

      addSynthesisHistory: (entry) => 
        set((state) => ({ synthesis_history: [...state.synthesis_history, entry] })),
      clearSynthesisHistory: () => set({ synthesis_history: [] }),

      setBuildSubPane: (pane) => set({ build_sub: pane }),

      clearAll: () => set({
        context_text: "",
        ctx_gen_notes: "",
        ctx_gen_info: [],
        prompt_text: "",
        synthesized_prompt: "",
        assembled_prompt: "",
      }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "jules-studio-storage",
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Do not persist the hydration status
      partialize: (state) => {
        const { _hasHydrated, ...rest } = state as any;
        return rest;
      },
    }
  )
);