import { invoke } from '@tauri-apps/api/core'
// src/hooks/use-xml-parser.ts
import { useState } from 'react'
import type { ChangeResult, FileChange } from '../types'

export function useXmlParser() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateXmlPrompt = async (files: string[], prompt: string): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<string>('generate_xml_prompt', { files, prompt })
    } catch (err) {
      console.error('Error generating XML prompt:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const generateXmlPromptForWorkspace = async (
    workspaceId: string,
    prompt: string,
    useGitIgnore = true
  ): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<string>('generate_xml_prompt_for_workspace', {
        workspace_id: workspaceId,
        prompt,
        use_git_ignore: useGitIgnore,
      })
    } catch (err) {
      console.error('Error generating XML prompt for workspace:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const parseXmlResponse = async (xml: string): Promise<FileChange[]> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<FileChange[]>('parse_xml_response', { xml })
    } catch (err) {
      console.error('Error parsing XML response:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const applyXmlChanges = async (changes: FileChange[]): Promise<ChangeResult[]> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<ChangeResult[]>('apply_xml_changes', { changes })
    } catch (err) {
      console.error('Error applying XML changes:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const undoLastChange = async (): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<string | null>('undo_last_change')
    } catch (err) {
      console.error('Error undoing last change:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const undoFileChange = async (filePath: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      return await invoke<boolean>('undo_file_change', { file_path: filePath })
    } catch (err) {
      console.error('Error undoing file change:', err)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    generateXmlPrompt,
    generateXmlPromptForWorkspace,
    parseXmlResponse,
    applyXmlChanges,
    undoLastChange,
    undoFileChange,
  }
}
