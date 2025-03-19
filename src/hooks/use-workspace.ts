// src/hooks/use-workspace.ts
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Workspace, WorkspaceFolder } from '../types';

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<Workspace[]>('list_workspaces');
      setWorkspaces(result);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkspace = async (id: string): Promise<Workspace | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<Workspace>('get_workspace', { id });
      return result;
    } catch (err) {
      console.error('Error getting workspace:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<Workspace>('create_workspace', { name });
      await fetchWorkspaces(); // Refresh the list
      return result;
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const addFolderToWorkspace = async (
    workspaceId: string,
    path: string,
    name?: string
  ): Promise<WorkspaceFolder | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<WorkspaceFolder>(
        'add_folder_to_workspace',
        { workspace_id: workspaceId, path, name }
      );

      if (currentWorkspace?.id === workspaceId) {
        const updated = await getWorkspace(workspaceId);
        if (updated) setCurrentWorkspace(updated);
      }

      return result;
    } catch (err) {
      console.error('Error adding folder to workspace:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    isLoading,
    error,
    fetchWorkspaces,
    getWorkspace,
    createWorkspace,
    addFolderToWorkspace,
  };
}