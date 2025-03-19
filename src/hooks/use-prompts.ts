// src/hooks/use-prompts.ts
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Prompt, PromptTag } from '../types';

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<Prompt[]>('get_prompts');
      setPrompts(result);
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompt = async (title: string, content: string, tags: PromptTag[]): Promise<Prompt | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<Prompt>('save_prompt', { title, content, tags });
      await fetchPrompts(); // Refresh the list
      return result;
    } catch (err) {
      console.error('Error saving prompt:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePrompt = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await invoke<void>('delete_prompt', { id });
      await fetchPrompts(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Error deleting prompt:', err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Load prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, []);

  return {
    prompts,
    isLoading,
    error,
    fetchPrompts,
    savePrompt,
    deletePrompt,
  };
}