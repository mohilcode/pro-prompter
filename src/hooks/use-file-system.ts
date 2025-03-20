// src/hooks/use-file-system.ts
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useEffect, useState } from 'react'
import type { FileItem, Workspace } from '../types'
import { useWorkspace } from './use-workspace'

export function useFileSystem() {
  const [fileTree, setFileTree] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get workspace information
  const { currentWorkspace } = useWorkspace()

  // Load all folders in current workspace when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      loadAllWorkspaceFolders(currentWorkspace)
    } else {
      setFileTree([])
    }
  }, [currentWorkspace])

  // Load all folders from a workspace
  const loadAllWorkspaceFolders = async (workspace: Workspace) => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear previous file tree
      setFileTree([])

      // Load each folder in the workspace
      const newFileTree: FileItem[] = []

      for (const folder of workspace.folders) {
        try {
          const options = { use_git_ignore: true }
          const result = await invoke<FileItem>('scan_directory', {
            path: folder.path,
            options,
          })
          newFileTree.push(result)
        } catch (err) {
          console.error(`Error scanning directory ${folder.path}:`, err)
          // Continue loading other folders even if one fails
        }
      }

      setFileTree(newFileTree)
    } catch (err) {
      console.error('Error loading workspace folders:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const scanDirectory = async (path: string, useGitIgnore = true) => {
    setIsLoading(true)
    setError(null)

    try {
      const options = { use_git_ignore: useGitIgnore }
      const result = await invoke<FileItem>('scan_directory', { path, options })

      // Instead of replacing the file tree, append the new directory
      setFileTree(prevTree => [...prevTree, result])

      return result
    } catch (err) {
      console.error('Error scanning directory:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const removeRootFolder = async (path: string) => {
    setFileTree(prevTree => prevTree.filter(item => item.path !== path))
  }

  const readFileContent = async (path: string): Promise<string> => {
    try {
      return await invoke<string>('read_file_content', { path })
    } catch (err) {
      console.error('Error reading file:', err)
      throw err
    }
  }

  const openDirectoryDialog = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select a folder',
      })

      if (selected && !Array.isArray(selected)) {
        return selected
      }
    } catch (err) {
      console.error('Error opening directory dialog:', err)
      setError(err instanceof Error ? err.message : String(err))
    }
    return null
  }

  const generateCopyContent = async (files: string[], prompts: string[]): Promise<string> => {
    try {
      return await invoke<string>('generate_copy_content', { files, prompts })
    } catch (err) {
      console.error('Error generating copy content:', err)
      throw err
    }
  }

  const copyToClipboard = async (content: string): Promise<void> => {
    try {
      await invoke<void>('copy_to_clipboard', { content })
    } catch (err) {
      console.error('Error copying to clipboard:', err)
      throw err
    }
  }

  return {
    fileTree,
    isLoading,
    error,
    scanDirectory,
    removeRootFolder,
    readFileContent,
    openDirectoryDialog,
    generateCopyContent,
    copyToClipboard,
    loadAllWorkspaceFolders,
  }
}
