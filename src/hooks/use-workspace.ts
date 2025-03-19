import { invoke } from '@tauri-apps/api/core'
// src/hooks/use-workspace.ts
import { useCallback, useEffect, useState } from 'react'
import type { Workspace, WorkspaceFolder } from '../types'

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<Workspace[]>('list_workspaces')
      setWorkspaces(result)
    } catch (err) {
      console.error('Error fetching workspaces:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getWorkspace = async (id: string): Promise<Workspace | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<Workspace>('get_workspace', { id })
      return result
    } catch (err) {
      console.error('Error getting workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<Workspace>('create_workspace', { name })
      await fetchWorkspaces() // Refresh the list
      return result
    } catch (err) {
      console.error('Error creating workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const updateWorkspace = async (id: string, name: string): Promise<Workspace | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<Workspace>('update_workspace', { id, name })
      await fetchWorkspaces() // Refresh the list

      // Update current workspace if needed
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(result)
      }

      return result
    } catch (err) {
      console.error('Error updating workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const deleteWorkspace = async (id: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      await invoke<void>('delete_workspace', { id })
      await fetchWorkspaces() // Refresh the list

      // If we just deleted the current workspace, set it to null
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null)
      }

      return true
    } catch (err) {
      console.error('Error deleting workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const addFolderToWorkspace = async (
    workspaceId: string,
    path: string,
    name?: string
  ): Promise<WorkspaceFolder | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<WorkspaceFolder>('add_folder_to_workspace', {
        workspace_id: workspaceId,
        path,
        name,
      })

      if (currentWorkspace?.id === workspaceId) {
        const updated = await getWorkspace(workspaceId)
        if (updated) setCurrentWorkspace(updated)
      }

      return result
    } catch (err) {
      console.error('Error adding folder to workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const removeFolderFromWorkspace = async (
    workspaceId: string,
    folderId: string
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      await invoke<void>('remove_folder_from_workspace', {
        workspace_id: workspaceId,
        folder_id: folderId,
      })

      if (currentWorkspace?.id === workspaceId) {
        const updated = await getWorkspace(workspaceId)
        if (updated) setCurrentWorkspace(updated)
      }

      return true
    } catch (err) {
      console.error('Error removing folder from workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateFolder = async (
    workspaceId: string,
    folderId: string,
    name: string
  ): Promise<WorkspaceFolder | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<WorkspaceFolder>('update_folder', {
        workspace_id: workspaceId,
        folder_id: folderId,
        name,
      })

      if (currentWorkspace?.id === workspaceId) {
        const updated = await getWorkspace(workspaceId)
        if (updated) setCurrentWorkspace(updated)
      }

      return result
    } catch (err) {
      console.error('Error updating folder:', err)
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const getAllFilesInWorkspace = async (
    workspaceId: string,
    useGitIgnore = true
  ): Promise<string[]> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<string[]>('get_all_files_in_workspace', {
        workspace_id: workspaceId,
        use_git_ignore: useGitIgnore,
      })
    } catch (err) {
      console.error('Error getting all files in workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Load workspaces on mount
  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    isLoading,
    error,
    fetchWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addFolderToWorkspace,
    removeFolderFromWorkspace,
    updateFolder,
    getAllFilesInWorkspace,
  }
}
