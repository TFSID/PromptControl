import { CHARS_PER_TOKEN, ChunkStrategy, FileData } from "@/app/typing";

export function est(text: string): number {
  return Math.max(1, Math.floor(text.length / CHARS_PER_TOKEN));
}

export function swChunks(text: string, chunkTok: number, overlapTok: number): string[] {
  const cc = chunkTok * CHARS_PER_TOKEN;
  const oc = overlapTok * CHARS_PER_TOKEN;
  
  if (text.length <= cc) {
    return [text];
  }

  const out: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + cc;
    let chunk = text.slice(start, end);

    if (end < text.length) {
      const nl = chunk.lastIndexOf("\n");
      if (nl > cc * 0.5) {
        end = start + nl + 1;
        chunk = text.slice(start, end);
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

export function semChunks(text: string, maxTok: number): string[] {
  // Regex to split by \n followed by 1-6 hashes and a space, or \n---\n, or \n\n\n
  const parts = text.split(/(\n#{1,6}\s|\n---\n|\n\n\n)/g);
  
  const out: string[] = [];
  let cur: string[] = [];
  let ctok = 0;

  for (const p of parts) {
    const pt = est(p);
    if (ctok + pt > maxTok && cur.length > 0) {
      out.push(cur.join(""));
      const last = cur[cur.length - 1] || "";
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

  const finalChunks: string[] = [];
  const mc = maxTok * CHARS_PER_TOKEN;

  for (const ch of out) {
    if (ch.length > mc) {
      finalChunks.push(...swChunks(ch, maxTok, Math.floor(maxTok / 10)));
    } else {
      finalChunks.push(ch);
    }
  }

  return finalChunks.filter(c => c.trim() !== "");
}

export function doChunk(text: string, strategy: ChunkStrategy, size: number, overlap: number): string[] {
  if (strategy === "sliding_window") {
    return swChunks(text, size, overlap);
  }
  
  if (strategy === "semantic") {
    return semChunks(text, size);
  }

  // hybrid
  const sem = semChunks(text, size);
  const out: string[] = [];
  
  for (const ch of sem) {
    if (est(ch) > size) {
      out.push(...swChunks(ch, size, overlap));
    } else {
      out.push(ch);
    }
  }

  return out;
}

export function assemble(context: string, prompt: string, files: Record<string, FileData>, enabledOnly = true): string {
  const parts: string[] = [];

  if (context.trim() !== "") {
    parts.push(`[CONTEXT]\n${context.trim()}`);
  }

  if (prompt.trim() !== "") {
    parts.push(`[PROMPT]\n${prompt.trim()}`);
  }

  const app: string[] = [];

  for (const [fname, fd] of Object.entries(files)) {
    if (enabledOnly && fd.enabled === false) {
      continue;
    }
    
    // remove leading dot from ext
    const ext = fd.ext.replace(/^\./, "");
    app.push(`[FILE: ${fname}]\n\`\`\`${ext}\n${fd.content}\n\`\`\``);
  }

  if (app.length > 0) {
    parts.push("[APPENDICES]\n\n" + app.join("\n\n"));
  }

  return parts.join("\n\n---\n\n");
}
