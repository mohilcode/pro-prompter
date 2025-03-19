import { FolderPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FileExplorer } from './components/file-explorer'
import { ModeToggle } from './components/mode-toggle'
import { PromptLibrary } from './components/prompt-library'
import { SimpleMode } from './components/simple-mode'
import { ThemeProvider, useTheme } from './components/theme-provider'
import { ThemeToggle } from './components/theme-toggle'
import { Button } from './components/ui/button'
import { XmlMode } from './components/xml-mode'
import { useFileSystem } from './hooks/use-file-system'
import { useWorkspace } from './hooks/use-workspace'

function AppContent() {
  const [mode, setMode] = useState<'simple' | 'xml'>('simple')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const { theme } = useTheme()
  const { fileTree, openDirectoryDialog, currentDirectory, isLoading } = useFileSystem()
  const { currentWorkspace, createWorkspace, addFolderToWorkspace } = useWorkspace()

  // Add a new state for accent color
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
  const handleOpenFolder = async () => {
    const directory = await openDirectoryDialog()
    if (directory && !currentWorkspace) {
      // If no workspace is active, create one
      const name = directory.split('/').pop() || 'New Workspace'
      const workspace = await createWorkspace(name)
      if (workspace) {
        await addFolderToWorkspace(workspace.id, directory)
      }
    } else if (directory && currentWorkspace) {
      // Add to existing workspace
      await addFolderToWorkspace(currentWorkspace.id, directory)
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
            <span className="text-xs text-muted-foreground">
              {currentDirectory ? `Directory: ${currentDirectory}` : 'No directory selected'}
            </span>
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
        {/* File Explorer */}
        <div
          className={`w-72 border-r border-border flex flex-col ${theme === 'dark' ? 'bg-[#0A0A0A]/80' : 'bg-[#f0f0f0]/80'}`}
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
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#0A0A0A]/90' : 'bg-[#f5f5f5]/90'}`}
        >
          <div className="border-b border-border p-2 flex items-center justify-between">
            <ModeToggle currentMode={mode} onModeChange={setMode} />
            <div className="text-xs text-muted-foreground">
              {currentWorkspace ? `Workspace: ${currentWorkspace.name}` : 'No workspace selected'}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
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

            <div
              className={`w-80 border-l border-border flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#0A0A0A]/80' : 'bg-[#f0f0f0]/80'}`}
            >
              <PromptLibrary currentPrompt={currentPrompt} onPromptChange={setCurrentPrompt} />
            </div>
          </div>
        </div>
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
