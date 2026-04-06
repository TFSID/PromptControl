export function countTokens(text: string): number {
  return Math.max(1, Math.floor(text.length / 4));
}

self.onmessage = (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  try {
    if (type === 'COUNT_TOKENS') {
      const count = countTokens(payload);
      self.postMessage({ id, result: count });
    } else {
      self.postMessage({ id, error: \`Unknown command: \${type}\` });
    }
  } catch (error: any) {
    self.postMessage({ id, error: error.message });
  }
};
