import { FileData, ChunkStrategy } from "@/typing";

export const CHARS_PER_TOKEN = 4;
export const MAX_TOKENS = 65536;

export function est(text: string): number {
  return Math.max(1, Math.floor(text.length / CHARS_PER_TOKEN));
}

export function sw_chunks(text: string, chunk_tok: number, overlap_tok: number): string[] {
  const cc = chunk_tok * CHARS_PER_TOKEN;
  const oc = overlap_tok * CHARS_PER_TOKEN;
  
  if (text.length <= cc) {
    return [text];
  }
  
  const out: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + cc;
    let chunk = text.substring(start, end);
    
    if (end < text.length) {
      const nl = chunk.lastIndexOf('\n');
      if (nl > cc * 0.5) {
        end = start + nl + 1;
        chunk = text.substring(start, end);
      }
    }
    
    out.push(chunk);
    
    if (end >= text.length) {
      break;
    }
    start = Math.max(0, end - oc);
  }
  
  return out;
}

export function sem_chunks(text: string, max_tok: number): string[] {
  // Python re.split(r'(\n#{1,6}\s|\n---\n|\n\n\n)', text)
  // We use capturing groups so that the split separators are included in the resulting array.
  const parts = text.split(/(\n#{1,6}\s|\n---\n|\n\n\n)/);
  const out: string[] = [];
  let cur: string[] = [];
  let ctok = 0;
  
  for (const p of parts) {
    const pt = est(p);
    if (ctok + pt > max_tok && cur.length > 0) {
      out.push(cur.join(""));
      const last = cur.length > 0 ? cur[cur.length - 1] : "";
      cur = [last, p];
      ctok = est(last) + pt;
    } else {
      cur.push(p);
      ctok += pt;
    }
  }
  
  if (cur.length > 0) {
    out.push(cur.join(""));
  }
  
  const final: string[] = [];
  const mc = max_tok * CHARS_PER_TOKEN;
  
  for (const ch of out) {
    if (ch.length > mc) {
      final.push(...sw_chunks(ch, max_tok, Math.floor(max_tok / 10)));
    } else {
      final.push(ch);
    }
  }
  
  return final.filter(c => c.trim().length > 0);
}

export function do_chunk(text: string, strategy: ChunkStrategy, size: number, overlap: number): string[] {
  if (strategy === "sliding_window") {
    return sw_chunks(text, size, overlap);
  }
  if (strategy === "semantic") {
    return sem_chunks(text, size);
  }
  
  // "hybrid"
  const sem = sem_chunks(text, size);
  const out: string[] = [];
  for (const ch of sem) {
    if (est(ch) > size) {
      out.push(...sw_chunks(ch, size, overlap));
    } else {
      out.push(ch);
    }
  }
  return out;
}

export function assemble(context: string, prompt: string, files: Record<string, FileData>, enabled_only: boolean = true): string {
  const parts: string[] = [];
  
  if (context.trim()) {
    parts.push(`[CONTEXT]\n${context.trim()}`);
  }
  
  if (prompt.trim()) {
    parts.push(`[PROMPT]\n${prompt.trim()}`);
  }
  
  const app: string[] = [];
  for (const [fname, fd] of Object.entries(files)) {
    if (enabled_only && !fd.enabled) {
      continue;
    }
    const ext = fd.ext.replace(/^\./, "");
    app.push(`[FILE: ${fname}]\n\`\`\`${ext}\n${fd.content}\n\`\`\``);
  }
  
  if (app.length > 0) {
    parts.push(`[APPENDICES]\n\n${app.join("\n\n")}`);
  }
  
  return parts.join("\n\n---\n\n");
}
