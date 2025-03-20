import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useState } from 'react'
import type { FileItem } from '../types'

export function useFileSystem() {
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scanDirectory = async (path: string, useGitIgnore = true) => {
    setIsLoading(true)
    setError(null)

    try {
      const options = { use_git_ignore: useGitIgnore }
      const result = await invoke<FileItem>('scan_directory', { path, options })

      // Include the root folder itself in the file tree, not just its children
      setFileTree([result])
      setCurrentDirectory(path)
    } catch (err) {
      console.error('Error scanning directory:', err)
      setError(err instanceof Error ? err.message : String(err))
      setFileTree([])
    } finally {
      setIsLoading(false)
    }
  }

  const removeRootFolder = async (path: string) => {
    setFileTree(prevTree => prevTree.filter(item => item.path !== path))

    // If we're removing the current directory, reset it
    if (currentDirectory === path) {
      setCurrentDirectory(null)
    }
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
        await scanDirectory(selected)
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
    currentDirectory,
    fileTree,
    isLoading,
    error,
    scanDirectory,
    removeRootFolder,
    readFileContent,
    openDirectoryDialog,
    generateCopyContent,
    copyToClipboard,
  }
}