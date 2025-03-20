import { AlertTriangle, ArrowRight, Check, FileCode, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFileSystem } from '../hooks/use-file-system'
import { useXmlParser } from '../hooks/use-xml-parser'
import type { FileChange } from '../types'
import { useTheme } from './theme-provider'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Textarea } from './ui/textarea'

interface XmlModeProps {
  selectedFiles: string[]
  currentPrompt: string
  onPromptChange: (prompt: string) => void
  aiResponse: string
  onAiResponseChange: (response: string) => void
}

interface DiffPreview {
  path: string
  original: string
  modified: string
  hasChanges: boolean
}

export function XmlMode({
  selectedFiles,
  currentPrompt,
  onPromptChange,
  aiResponse,
  onAiResponseChange,
}: XmlModeProps) {
  const [diffPreview, setDiffPreview] = useState<DiffPreview[]>([])
  const [activeTab, setActiveTab] = useState('preview')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map())
  const [parsedChanges, setParsedChanges] = useState<FileChange[]>([])
  const { theme } = useTheme()
  const { readFileContent } = useFileSystem()
  const { parseXmlResponse, applyXmlChanges } = useXmlParser()

  // Load file contents when selected files change
  useEffect(() => {
    const loadFileContents = async () => {
      const newFileContents = new Map()

      for (const path of selectedFiles) {
        try {
          const content = await readFileContent(path)
          newFileContents.set(path, content)
        } catch (error) {
          console.error(`Error loading file ${path}:`, error)
          newFileContents.set(path, `// Error loading ${path}: ${error}`)
        }
      }

      setFileContents(newFileContents)
    }

    if (selectedFiles.length > 0) {
      loadFileContents()
    }
  }, [selectedFiles, readFileContent])

  const handleGenerateDiff = async () => {
    if (!aiResponse) return

    try {
      // Parse the XML response
      const changes = await parseXmlResponse(aiResponse)
      setParsedChanges(changes)

      // Generate diff preview
      const preview: DiffPreview[] = []

      for (const change of changes) {
        if (change.action === 'Create') {
          preview.push({
            path: change.path,
            original: '// New file will be created',
            modified: change.changes[0].content,
            hasChanges: true,
          })
        } else if (change.action === 'Delete') {
          const content = fileContents.get(change.path) || '// File not found'
          preview.push({
            path: change.path,
            original: content,
            modified: '// File will be deleted',
            hasChanges: true,
          })
        } else {
          // Rewrite or Modify
          const original = fileContents.get(change.path) || '// File not found'
          let modified = original

          if (change.action === 'Rewrite') {
            modified = change.changes[0].content
          } else if (change.action === 'Modify') {
            modified = original
            for (const c of change.changes) {
              if (c.search && modified.includes(c.search)) {
                modified = modified.replace(c.search, c.content)
              }
            }
          }

          preview.push({
            path: change.path,
            original,
            modified,
            hasChanges: original !== modified,
          })
        }
      }

      setDiffPreview(preview)
      setActiveTab('preview')
    } catch (error) {
      console.error('Error generating diff:', error)
    }
  }

  const handleApplyChanges = async () => {
    if (parsedChanges.length === 0) return

    setApplying(true)

    try {
      await applyXmlChanges(parsedChanges)
      setApplied(true)

      // Reset after showing success message
      setTimeout(() => {
        setApplied(false)
      }, 3000)
    } catch (error) {
      console.error('Error applying changes:', error)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-sm font-semibold">XML MODE</h2>
          <Button
            onClick={handleGenerateDiff}
            size="sm"
            disabled={!aiResponse || selectedFiles.length === 0}
            className="bg-primary/30 hover:bg-primary/40 text-primary-foreground border-none h-8"
          >
            <ArrowRight size={14} className="mr-2" />
            Generate Diff
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prompt</p>
            <Textarea
              placeholder="Type your prompt here..."
              className="min-h-[100px] text-sm font-mono bg-secondary/50 border-border focus-visible:ring-primary resize-none"
              value={currentPrompt}
              onChange={e => onPromptChange(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">AI Response</p>
            <Textarea
              placeholder="Paste AI response here..."
              className="min-h-[100px] text-sm font-mono bg-secondary/50 border-border focus-visible:ring-primary resize-none"
              value={aiResponse}
              onChange={e => onAiResponseChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-3 pt-3 border-b border-border flex justify-between items-center">
            <TabsList
              className={`${theme === 'dark' ? 'bg-[#111]' : 'bg-[#e5e5e5]'} border border-border p-1 h-auto`}
            >
              <TabsTrigger
                value="preview"
                className={`
                  data-[state=active]:bg-${theme === 'dark' ? '[#222]' : '[#d5d5d5]'}
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-none
                  data-[state=active]:border-primary
                  rounded-md px-3 py-1 h-7
                  mx-0.5 border border-transparent
                  transition-colors
                `}
              >
                Preview Changes
              </TabsTrigger>
              <TabsTrigger
                value="xml"
                className={`
                  data-[state=active]:bg-${theme === 'dark' ? '[#222]' : '[#d5d5d5]'}
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-none
                  data-[state=active]:border-primary
                  rounded-md px-3 py-1 h-7
                  mx-0.5 border border-transparent
                  transition-colors
                `}
              >
                XML Response
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={handleApplyChanges}
              disabled={diffPreview.length === 0 || applying || applied}
              size="sm"
              className={
                applied
                  ? 'bg-green-900 hover:bg-green-800 text-green-100 border-none h-8'
                  : 'bg-primary/30 hover:bg-primary/40 text-primary-foreground border-none h-8'
              }
            >
              {applied ? (
                <>
                  <Check size={14} className="mr-2" />
                  Applied
                </>
              ) : applying ? (
                <>
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <FileCode size={14} className="mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>

          <TabsContent value="preview" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="p-3 border-b border-border">
              <div className="text-sm">
                <span className="font-medium">{diffPreview.filter(d => d.hasChanges).length}</span>
                files with changes
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {diffPreview.length > 0 ? (
                  diffPreview.map(diff => (
                    <Card
                      key={diff.path}
                      className={
                        diff.hasChanges
                          ? 'bg-secondary/50 border-primary/50 rounded-none'
                          : 'bg-secondary/50 border-border rounded-none'
                      }
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-primary">{diff.path}</h3>
                          {diff.hasChanges ? (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5">
                              Modified
                            </span>
                          ) : (
                            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5">
                              Unchanged
                            </span>
                          )}
                        </div>

                        {diff.hasChanges ? (
                          <div className="space-y-2">
                            <div
                              className={`text-xs ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#f0f0f0]'} p-2 border border-border overflow-auto max-h-[150px]`}
                            >
                              <pre className="whitespace-pre-wrap text-red-500 line-through">
                                {diff.original}
                              </pre>
                            </div>
                            <div
                              className={`text-xs ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#f0f0f0]'} p-2 border border-border overflow-auto max-h-[150px]`}
                            >
                              <pre className="whitespace-pre-wrap text-green-500">
                                {diff.modified}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`text-xs ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#f0f0f0]'} p-2 border border-border overflow-auto max-h-[150px]`}
                          >
                            <pre className="whitespace-pre-wrap text-muted-foreground">
                              {diff.original}
                            </pre>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                    <AlertTriangle size={24} className="mb-2 text-muted-foreground" />
                    <p>No changes to preview. Generate diff first.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="xml" className="flex-1 overflow-hidden flex flex-col mt-0">
            <ScrollArea className="flex-1">
              <div className="p-3">
                <pre
                  className={`text-xs whitespace-pre-wrap ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#f0f0f0]'} p-3 border border-border font-mono text-foreground`}
                >
                  {aiResponse || 'No XML response yet'}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
