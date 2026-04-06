import { describe, it, expect } from 'vitest';
import { est, sw_chunks, sem_chunks, do_chunk, assemble } from './chunking';

describe('chunking utilities', () => {
  it('should estimate tokens correctly', () => {
    expect(est('abcd')).toBe(1);
    expect(est('abcdefgh')).toBe(2);
    expect(est('a')).toBe(1);
  });

  it('should perform sliding window chunking', () => {
    // 10 chars = 2 tokens (if CHARS_PER_TOKEN is 4, 10/4 = 2.5, est gives max(1, floor(10/4)) = 2)
    const text = 'abcdefghijklmno'; // 15 chars
    // chunk_tok = 2 (cc = 8)
    // overlap_tok = 1 (oc = 4)
    // 1st chunk: abcdefgh (8 chars)
    // next start: 8 - 4 = 4
    // 2nd chunk: efghijkl (8 chars)
    // next start: 12 - 4 = 8
    // 3rd chunk: ijklmno (7 chars)
    
    const chunks = sw_chunks(text, 2, 1);
    expect(chunks).toEqual(['abcdefgh', 'efghijkl', 'ijklmno']);
  });

  it('should perform semantic chunking', () => {
    const text = "Part 1\n---\nPart 2\n\n\nPart 3";
    const max_tok = 1000;
    const chunks = sem_chunks(text, max_tok);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join("")).toEqual(text);
  });

  it('should assemble prompt correctly', () => {
    const context = 'My context';
    const prompt = 'My prompt';
    const files = {
      'test.js': {
        content: 'console.log("hello");',
        size: 21,
        ext: '.js',
        enabled: true,
        uploaded_at: '2023-01-01'
      },
      'test.py': {
        content: 'print("hello")',
        size: 14,
        ext: '.py',
        enabled: false,
        uploaded_at: '2023-01-01'
      }
    };
    
    const assembled = assemble(context, prompt, files, true);
    
    expect(assembled).toContain('[CONTEXT]\nMy context');
    expect(assembled).toContain('[PROMPT]\nMy prompt');
    expect(assembled).toContain('[FILE: test.js]\n```js\nconsole.log("hello");\n```');
    expect(assembled).not.toContain('test.py');
    expect(assembled.split('\n\n---\n\n').length).toBe(3);
  });
});
