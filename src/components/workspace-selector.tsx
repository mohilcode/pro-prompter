import { Check, ChevronDown, FolderPlus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspace } from '../hooks/use-workspace'
import { cn } from '../lib/utils'
import type { Workspace } from '../types'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'

interface WorkspaceSelectorProps {
  onOpenFolder: () => Promise<void>
}

export function WorkspaceSelector({ onOpenFolder }: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    createWorkspace,
    deleteWorkspace,
    isLoading,
    fetchWorkspaces,
  } = useWorkspace()

  // Refresh workspaces list when the component mounts
  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Get the button's position for dropdown positioning
    if (!isOpen) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setButtonRect(rect)
      // Refresh workspaces when opening dropdown
      fetchWorkspaces()
    }
    setIsOpen(!isOpen)
  }

  const handleSelectWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace)
    setIsOpen(false)
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    try {
      const workspace = await createWorkspace(newWorkspaceName)
      if (workspace) {
        setCurrentWorkspace(workspace)
        setIsCreating(false)
        setNewWorkspaceName('')
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
    }
  }

  const handleDeleteWorkspace = async (
    e: React.MouseEvent | React.KeyboardEvent,
    workspaceId: string
  ) => {
    e.stopPropagation() // Important: This prevents the parent button click

    if (confirm('Are you sure you want to delete this workspace?')) {
      try {
        const success = await deleteWorkspace(workspaceId)
        if (!success) {
          alert('Failed to delete workspace. Please check the console for details.')
        }
      } catch (error) {
        console.error('Error deleting workspace:', error)
        alert('Error deleting workspace. Check console for details.')
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRect &&
        (e.clientX < buttonRect.left ||
          e.clientX > buttonRect.right ||
          e.clientY < buttonRect.top ||
          e.clientY > buttonRect.bottom + 300)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, buttonRect])

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        onClick={handleToggle}
        className="flex items-center justify-between w-48 text-left font-normal"
      >
        <span className="truncate">
          {currentWorkspace ? currentWorkspace.name : 'Select Workspace'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {isOpen &&
        buttonRect &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${buttonRect.bottom + 8}px`,
              left: `${buttonRect.left}px`,
              width: '256px',
              zIndex: 9999,
            }}
          >
            <Card className="shadow-lg border border-border overflow-hidden">
              <div className="max-h-64 overflow-y-auto space-y-1 p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : (
                  <>
                    {workspaces.map(workspace => (
                      <button
                        key={workspace.id}
                        onClick={() => handleSelectWorkspace(workspace)}
                        type="button"
                        className={cn(
                          'w-full text-left flex items-center justify-between px-3 py-2 cursor-pointer',
                          'hover:bg-accent hover:text-accent-foreground rounded-md',
                          currentWorkspace?.id === workspace.id &&
                            'bg-accent text-accent-foreground'
                        )}
                      >
                        <div className="flex items-center">
                          {currentWorkspace?.id === workspace.id && (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          <span className="truncate">{workspace.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">
                            {workspace.folders.length} folder
                            {workspace.folders.length !== 1 ? 's' : ''}
                          </span>

                          {/* Changed from div to button */}
                          <button
                            onClick={e => handleDeleteWorkspace(e, workspace.id)}
                            type="button"
                            className="h-6 w-6 p-0 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive rounded-md"
                            aria-label={`Delete workspace ${workspace.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {!isCreating ? (
                  <div className="flex space-x-1 pt-2 border-t mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setIsCreating(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Workspace
                    </Button>

                    {currentWorkspace && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={onOpenFolder}
                      >
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Add Folder
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t mt-2 space-y-2">
                    <Input
                      placeholder="Workspace name"
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      className="text-sm"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleCreateWorkspace()
                        } else if (e.key === 'Escape') {
                          setIsCreating(false)
                          setNewWorkspaceName('')
                        }
                      }}
                    />
                    <div className="flex space-x-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={handleCreateWorkspace}
                        disabled={!newWorkspaceName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setIsCreating(false)
                          setNewWorkspaceName('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>,
          document.body
        )}
    </div>
  )
}
