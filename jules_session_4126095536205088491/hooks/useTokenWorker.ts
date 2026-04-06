"use client";

import { useEffect, useRef, useState } from 'react';

// Using a module worker format that correctly loads with Next.js
export function useTokenWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<number, { resolve: (val: number) => void, reject: (err: any) => void }>>(new Map());
  const idCounter = useRef(0);
  
  // To avoid constant creation/destruction of worker, keep one instance
  useEffect(() => {
    // In next.js app router we use a generic worker instantiation
    // Note: Next.js has built-in support for workers using this syntax
    workerRef.current = new Worker(new URL('@/lib/chunking.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data;
      const callback = callbacksRef.current.get(id);
      
      if (callback) {
        if (error) {
          callback.reject(new Error(error));
        } else {
          callback.resolve(result);
        }
        callbacksRef.current.delete(id);
      }
    };
    
    return () => {
      workerRef.current?.terminate();
      callbacksRef.current.clear();
    };
  }, []);
  
  const estimateTokens = async (text: string): Promise<number> => {
    if (!workerRef.current) {
      // Fallback if worker not ready
      return Math.max(1, Math.floor(text.length / 4));
    }
    
    return new Promise((resolve, reject) => {
      const id = ++idCounter.current;
      callbacksRef.current.set(id, { resolve, reject });
      workerRef.current?.postMessage({ id, type: 'COUNT_TOKENS', payload: text });
    });
  };
  
  return { estimateTokens };
}
