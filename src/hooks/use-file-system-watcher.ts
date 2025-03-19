import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
// src/hooks/use-file-system-watcher.ts
import { useState } from 'react'
import { useEffect } from 'react'

export function useFileSystemWatcher() {
  const [isWatching, setIsWatching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changedFiles, setChangedFiles] = useState<string[]>([])

  // Set up the event listener for file changes
  useEffect(() => {
    const unlisten = listen<string>('file-system-change', event => {
      setChangedFiles(prev => [...prev, event.payload])
    })

    return () => {
      unlisten.then(unlistenFn => unlistenFn())
    }
  }, [])

  const startWatching = async (): Promise<boolean> => {
    try {
      await invoke<void>('start_watching_filesystem')
      setIsWatching(true)
      return true
    } catch (err) {
      console.error('Error starting file system watcher:', err)
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  const stopWatching = async (): Promise<boolean> => {
    try {
      await invoke<void>('stop_watching_filesystem')
      setIsWatching(false)
      return true
    } catch (err) {
      console.error('Error stopping file system watcher:', err)
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  const watchPath = async (path: string): Promise<boolean> => {
    try {
      await invoke<void>('watch_path', { path })
      return true
    } catch (err) {
      console.error('Error watching path:', err)
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  const unwatchPath = async (path: string): Promise<boolean> => {
    try {
      await invoke<void>('unwatch_path', { path })
      return true
    } catch (err) {
      console.error('Error unwatching path:', err)
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  const clearChangedFiles = () => {
    setChangedFiles([])
  }

  return {
    isWatching,
    error,
    changedFiles,
    startWatching,
    stopWatching,
    watchPath,
    unwatchPath,
    clearChangedFiles,
  }
}
