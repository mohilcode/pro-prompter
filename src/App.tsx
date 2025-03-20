// Modified App.tsx with fixed types
import { FolderPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FileExplorer } from './components/file-explorer'
import { ModeToggle } from './components/mode-toggle'
import { PromptLibrary } from './components/prompt-library'
import { SimpleMode } from './components/simple-mode'
import { ThemeProvider, useTheme } from './components/theme-provider'
import { ThemeToggle } from './components/theme-toggle'
import { Button } from './components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable'
import { WorkspaceSelector } from './components/workspace-selector'
import { XmlMode } from './components/xml-mode'
import { useFileSystem } from './hooks/use-file-system'
import { useWorkspace } from './hooks/use-workspace'

function AppContent() {
  const [mode, setMode] = useState<'simple' | 'xml'>('simple')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const { theme } = useTheme()
  const { fileTree, openDirectoryDialog, isLoading, removeRootFolder, loadAllWorkspaceFolders } =
    useFileSystem()
  const {
    currentWorkspace,
    createWorkspace,
    addFolderToWorkspace,
    removeFolderFromWorkspace,
    setCurrentWorkspace,
    getWorkspace,
    fetchWorkspaces,
  } = useWorkspace()

  // Add a state for accent color
  const [accentColor, setAccentColor] = useState<'cyan' | 'crimson' | 'purple' | 'green' | 'gray'>(
    'cyan'
  )

  // Add this function to handle accent color change
  const handleAccentChange = (color: 'cyan' | 'crimson' | 'purple' | 'green' | 'gray') => {
    setAccentColor(color)
    document.documentElement.setAttribute('data-accent', color)
  }

  // Set the initial accent color when the component mounts
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor)
  }, [accentColor])

  // Handle opening a new folder
  // In App.tsx, update the handleOpenFolder function with more debugging and error handling
  const handleOpenFolder = async () => {
    const directory = await openDirectoryDialog()
    if (!directory) return

    try {
      let workspaceToUse = currentWorkspace

      if (!workspaceToUse) {
        const folderName = directory.split('/').pop() || 'New Workspace'

        // 1) Create the new workspace
        const created = await createWorkspace(folderName)
        if (!created) {
          console.error('Failed to create workspace')
          return
        }

        // 2) Set as current workspace
        workspaceToUse = created
        setCurrentWorkspace(created)

        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // 3) Add the folder to the workspace
      const addedFolder = await addFolderToWorkspace(workspaceToUse.id, directory)
      if (!addedFolder) {
        console.error('Failed to add folder to workspace')
        return
      }

      // 4) Refresh workspaces and reload file tree
      await fetchWorkspaces()

      // Get a fresh instance of the workspace
      const refreshedWorkspace = await getWorkspace(workspaceToUse.id)
      if (refreshedWorkspace) {
        setCurrentWorkspace(refreshedWorkspace)
        await loadAllWorkspaceFolders(refreshedWorkspace)
      }
    } catch (error) {
      console.error('Error in handleOpenFolder:', error)
    }
  }

  const handleRemoveRootFolder = async (path: string) => {
    // First remove from file tree
    removeRootFolder(path)

    // Then remove from workspace if applicable
    if (currentWorkspace) {
      // Find the folder in the workspace
      const folder = currentWorkspace.folders.find(f => f.path === path)
      if (folder) {
        await removeFolderFromWorkspace(currentWorkspace.id, folder.id)
      }
    }
  }

  return (
    <main
      className={`flex h-screen flex-col ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#f5f5f5]'} text-foreground font-mono relative overflow-hidden`}
    >
      {/* Grid background - increased opacity and thickness */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            theme === 'dark'
              ? 'linear-gradient(rgba(100, 100, 100, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 100, 100, 0.2) 1px, transparent 1px)'
              : 'linear-gradient(rgba(100, 100, 100, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 100, 100, 0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <header
        className={`border-b border-border ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#f5f5f5]'} z-10`}
      >
        <div className="flex h-14 items-center px-4 justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight">PROPROMPTER</h1>
            <span className="text-xs text-muted-foreground">v1.0</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-primary">{selectedFiles.length} files selected</span>

            {/* Add workspace selector */}
            <WorkspaceSelector onOpenFolder={handleOpenFolder} />

            <div className="flex items-center gap-2">
              <div className="flex border border-border rounded-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleAccentChange('cyan')}
                  className={`w-5 h-5 ${accentColor === 'cyan' ? 'ring-1 ring-white' : ''}`}
                  style={{ background: '#0891b2' }}
                  aria-label="Cyan accent"
                />
                <button
                  type="button"
                  onClick={() => handleAccentChange('crimson')}
                  className={`w-5 h-5 ${accentColor === 'crimson' ? 'ring-1 ring-white' : ''}`}
                  style={{ background: '#dc2626' }}
                  aria-label="Crimson accent"
                />
                <button
                  type="button"
                  onClick={() => handleAccentChange('purple')}
                  className={`w-5 h-5 ${accentColor === 'purple' ? 'ring-1 ring-white' : ''}`}
                  style={{ background: '#7c3aed' }}
                  aria-label="Purple accent"
                />
                <button
                  type="button"
                  onClick={() => handleAccentChange('green')}
                  className={`w-5 h-5 ${accentColor === 'green' ? 'ring-1 ring-white' : ''}`}
                  style={{ background: '#16a34a' }}
                  aria-label="Green accent"
                />
                <button
                  type="button"
                  onClick={() => handleAccentChange('gray')}
                  className={`w-5 h-5 ${accentColor === 'gray' ? 'ring-1 ring-white' : ''}`}
                  style={{ background: '#6b7280' }}
                  aria-label="Gray accent"
                />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden z-10">
        <ResizablePanelGroup direction="horizontal">
          {/* File Explorer - Now Resizable */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <div
              className={`h-full border-r border-border flex flex-col ${theme === 'dark' ? 'bg-[#0A0A0A]/80' : 'bg-[#f0f0f0]/80'}`}
            >
              <div className="p-2 border-b border-border flex justify-between items-center">
                <h2 className="text-sm font-semibold px-2 py-1">FILE EXPLORER</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-border bg-transparent hover:bg-secondary text-foreground"
                  onClick={handleOpenFolder}
                >
                  <FolderPlus size={14} className="mr-2" />
                  ADD FOLDER
                </Button>
              </div>
              <div className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : fileTree.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No folders open. Click "Add Folder" to get started.
                  </div>
                ) : (
                  <FileExplorer
                    data={fileTree}
                    selectedFiles={selectedFiles}
                    onSelectionChange={setSelectedFiles}
                    onRemoveRootFolder={handleRemoveRootFolder}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main Content */}
          <ResizablePanel defaultSize={75}>
            <div
              className={`h-full flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#0A0A0A]/90' : 'bg-[#f5f5f5]/90'}`}
            >
              <div className="border-b border-border p-2 flex items-center justify-between">
                <ModeToggle currentMode={mode} onModeChange={setMode} />
                <div className="text-xs text-muted-foreground">
                  {currentWorkspace &&
                    `Workspace: ${currentWorkspace.name} (${currentWorkspace.folders.length} folders)`}
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel defaultSize={70}>
                    <div className="h-full flex flex-col overflow-hidden">
                      {mode === 'simple' ? (
                        <SimpleMode
                          selectedFiles={selectedFiles}
                          currentPrompt={currentPrompt}
                          onPromptChange={setCurrentPrompt}
                        />
                      ) : (
                        <XmlMode
                          selectedFiles={selectedFiles}
                          currentPrompt={currentPrompt}
                          onPromptChange={setCurrentPrompt}
                          aiResponse={aiResponse}
                          onAiResponseChange={setAiResponse}
                        />
                      )}
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel defaultSize={30} minSize={20}>
                    <div
                      className={`h-full border-l border-border flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#0A0A0A]/80' : 'bg-[#f0f0f0]/80'}`}
                      style={{ zIndex: 10 }}
                    >
                      <PromptLibrary
                        currentPrompt={currentPrompt}
                        onPromptChange={setCurrentPrompt}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppContent />
    </ThemeProvider>
  )
}
