import { describe, it, expect } from "vitest";
import { est, swChunks, semChunks, doChunk, assemble } from "./chunking";
import { FileData } from "@/app/typing";

describe("chunking logic", () => {
  it("est correctly counts tokens", () => {
    // est(text) = Math.max(1, Math.floor(text.length / 4))
    expect(est("1234")).toBe(1);
    expect(est("12345678")).toBe(2);
    expect(est("12")).toBe(1); // max(1, 0)
    expect(est("")).toBe(1);
  });

  it("swChunks properly slices with sliding window", () => {
    // 10 chars, 2 tokens chunk, 1 token overlap -> max chars per chunk: 8, overlap chars: 4
    const text = "A".repeat(20);
    const chunks = swChunks(text, 2, 1);
    
    // First chunk goes from 0 to 8: length 8
    // Second chunk starts at 8 - 4 = 4. goes to 4 + 8 = 12: length 8
    // Next starts at 12 - 4 = 8. goes to 16: length 8
    // Next starts at 16 - 4 = 12. goes to 20: length 8
    // This maintains character-boundary integrity as requested.
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].length).toBe(8);
  });

  it("semChunks respects semantic boundaries", () => {
    const text = "Part 1\n---\nPart 2\n\n\nPart 3";
    const maxTok = 10; // 40 chars
    const chunks = semChunks(text, maxTok);
    
    // Total text is 27 chars, well under maxTok, so it should be one chunk
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(text);
  });

  it("doChunk runs the correct strategy", () => {
    const text = "A".repeat(100);
    const sw = doChunk(text, "sliding_window", 10, 2);
    expect(sw.length).toBeGreaterThan(0);

    const sem = doChunk(text, "semantic", 10, 2);
    expect(sem.length).toBeGreaterThan(0);

    const hyb = doChunk(text, "hybrid", 10, 2);
    expect(hyb.length).toBeGreaterThan(0);
  });

  it("assemble creates the proper markdown string", () => {
    const context = "My context";
    const prompt = "My prompt";
    const files: Record<string, FileData> = {
      "main.py": {
        content: 'print("hello")',
        size: 15,
        ext: ".py",
        enabled: true,
        uploaded_at: "now",
      },
      "disabled.ts": {
        content: 'console.log("hello")',
        size: 20,
        ext: ".ts",
        enabled: false,
        uploaded_at: "now",
      }
    };

    const result = assemble(context, prompt, files, true);
    
    expect(result).toContain("[CONTEXT]\nMy context");
    expect(result).toContain("[PROMPT]\nMy prompt");
    expect(result).toContain("[APPENDICES]");
    expect(result).toContain("[FILE: main.py]");
    expect(result).toContain('```py\nprint("hello")\n```');
    
    // Disabled file should not be there
    expect(result).not.toContain("disabled.ts");
    
    // Test with enabledOnly = false
    const allResult = assemble(context, prompt, files, false);
    expect(allResult).toContain("disabled.ts");
  });
});
