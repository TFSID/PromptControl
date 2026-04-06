import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { PromptBuilderStore, PromptBuilderState, FileData } from '@/typing';
import { get, set, del } from 'idb-keyval';

// IndexedDB storage implementation for Zustand
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

const initialState: PromptBuilderState = {
  // Files
  uploaded_files: {},
  
  // Context Generator
  context_text: "",
  ctx_gen_notes: "",
  ctx_gen_info: [],
  ctx_selected_files: [],
  ctx_input_mode: "files",
  
  // Prompt Editor
  prompt_text: "",
  synthesized_prompt: "",
  assembled_prompt: "",
  
  // Jules Config
  jules_sessions: [],
  jules_api_key: "",
  jules_source: "",
  jules_branch: "main",
  jules_automation: null,
  jules_title: "",
  
  // LLM Config
  llm_api_key: "",
  llm_model: "gemini-flash-latest",
  llm_temperature: 1.0,
  llm_top_p: 0.95,
  llm_system: "",
  
  // Chunking Config
  chunk_strategy: "sliding_window",
  chunk_size: 8000,
  chunk_overlap: 800,
  
  // Synthesis
  synthesis_history: [],
  
  // UI State
  build_sub: "prompt",
  _confirm_clear: false,
};

export const usePromptBuilder = create<PromptBuilderStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setField: (field, value) => set((state) => ({ ...state, [field]: value })),
      
      updateFile: (filename: string, data: Partial<FileData>) => set((state) => {
        const file = state.uploaded_files[filename];
        if (!file) return state;
        return {
          uploaded_files: {
            ...state.uploaded_files,
            [filename]: { ...file, ...data },
          }
        };
      }),
      
      addFile: (filename: string, data: FileData) => set((state) => ({
        uploaded_files: {
          ...state.uploaded_files,
          [filename]: data,
        }
      })),
      
      removeFile: (filename: string) => set((state) => {
        const { [filename]: _, ...rest } = state.uploaded_files;
        return { uploaded_files: rest };
      }),
      
      clearAll: () => set((state) => ({
        context_text: "",
        ctx_gen_notes: "",
        ctx_gen_info: [],
        prompt_text: "",
        synthesized_prompt: "",
        assembled_prompt: "",
        _confirm_clear: false,
      })),
    }),
    {
      name: 'jules-prompt-studio-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
