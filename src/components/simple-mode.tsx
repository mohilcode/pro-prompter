import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Textarea } from "./ui/textarea"
import { Copy, Check } from "lucide-react"
import { Card } from "./ui/card"
import { Toggle } from "./ui/toggle"
import { useTheme } from "./theme-provider"
import { useFileSystem } from "../hooks/use-file-system"

interface SimpleModeProps {
  selectedFiles: string[]
  currentPrompt: string
  onPromptChange: (prompt: string) => void
}

export function SimpleMode({ selectedFiles, currentPrompt, onPromptChange }: SimpleModeProps) {
  const [includeFilePaths, setIncludeFilePaths] = useState(true)
  const [includeFileContents, setIncludeFileContents] = useState(true)
  const [includePrompt, setIncludePrompt] = useState(true)
  const [copied, setCopied] = useState(false)
  const [fileContents, setFileContents] = useState<Map<string, { content: string, size: number }>>(new Map())
  const { theme } = useTheme()
  const { copyToClipboard, readFileContent } = useFileSystem()

  // Load file contents for selected files
  const loadFileContents = async () => {
    const newFileContents = new Map(fileContents);

    for (const path of selectedFiles) {
      if (!newFileContents.has(path)) {
        try {
          const content = await readFileContent(path);
          // Get file size approximation
          const size = new Blob([content]).size;
          newFileContents.set(path, { content, size });
        } catch (error) {
          console.error(`Error loading file ${path}:`, error);
          newFileContents.set(path, {
            content: `// Error loading ${path}: ${error}`,
            size: 0
          });
        }
      }
    }

    setFileContents(newFileContents);
  };

  // Load file contents when selected files change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      loadFileContents();
    }
  }, [selectedFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalTokenCount = () => {
    // Rough estimation: 1 token ≈ 4 characters
    let count = 0;

    // Count prompt tokens
    if (includePrompt && currentPrompt) {
      count += Math.ceil(currentPrompt.length / 4);
    }

    // Count file contents tokens
    if (includeFileContents) {
      for (const path of selectedFiles) {
        const fileData = fileContents.get(path);
        if (fileData) {
          count += Math.ceil(fileData.content.length / 4);
        }
      }
    }

    return count;
  };

  const handleCopy = async () => {
    try {
      let textToCopy = "";

      // Add prompt if enabled
      if (includePrompt && currentPrompt) {
        textToCopy += `${currentPrompt}\n\n`;
      }

      // Add file contents
      for (const path of selectedFiles) {
        const fileData = fileContents.get(path);
        if (fileData) {
          if (includeFilePaths) {
            textToCopy += `File: ${path}\n`;
          }

          if (includeFileContents) {
            textToCopy += `${fileData.content}\n\n`;
          }
        }
      }

      // Copy to clipboard using backend
      await copyToClipboard(textToCopy);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying content:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-sm font-semibold">SIMPLE MODE</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Include file paths</span>
              <Toggle
                pressed={includeFilePaths}
                onPressedChange={setIncludeFilePaths}
                className="bg-secondary data-[state=on]:bg-primary/30 data-[state=on]:text-primary border-border h-6"
              >
                {includeFilePaths ? "ON" : "OFF"}
              </Toggle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Include file contents</span>
              <Toggle
                pressed={includeFileContents}
                onPressedChange={setIncludeFileContents}
                className="bg-secondary data-[state=on]:bg-primary/30 data-[state=on]:text-primary border-border h-6"
              >
                {includeFileContents ? "ON" : "OFF"}
              </Toggle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Include prompt</span>
              <Toggle
                pressed={includePrompt}
                onPressedChange={setIncludePrompt}
                className="bg-secondary data-[state=on]:bg-primary/30 data-[state=on]:text-primary border-border h-6"
              >
                {includePrompt ? "ON" : "OFF"}
              </Toggle>
            </div>
          </div>
        </div>

        <Textarea
          placeholder="Type your prompt here..."
          className="min-h-[100px] text-sm font-mono bg-secondary/50 border-border focus-visible:ring-primary resize-none"
          value={currentPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <div className="text-sm">
            <span className="font-medium">{selectedFiles.length}</span> files selected
            <span className="text-muted-foreground ml-2">(~{totalTokenCount()} tokens)</span>
          </div>
          <Button
            onClick={handleCopy}
            disabled={selectedFiles.length === 0 && !currentPrompt}
            size="sm"
            className="bg-primary/30 hover:bg-primary/40 text-primary-foreground border-none h-8"
          >
            {copied ? (
              <>
                <Check size={14} className="mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} className="mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {includePrompt && currentPrompt && (
              <Card className="bg-secondary/50 border-border rounded-none">
                <div className="p-3">
                  <h3 className="text-sm font-medium mb-2 text-primary">Prompt</h3>
                  <pre
                    className={`text-xs whitespace-pre-wrap ${theme === "dark" ? "bg-[#0A0A0A]" : "bg-[#f0f0f0]"} p-2 rounded-none border border-border text-foreground`}
                  >
                    {currentPrompt}
                  </pre>
                </div>
              </Card>
            )}

            {selectedFiles.map((path) => {
              const fileData = fileContents.get(path);
              return (
                <Card key={path} className="bg-secondary/50 border-border rounded-none">
                  <div className="p-3">
                    {includeFilePaths && (
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-primary">{path}</h3>
                        <span className="text-xs text-muted-foreground">
                          {fileData ? formatFileSize(fileData.size) : "Loading..."}
                        </span>
                      </div>
                    )}

                    {includeFileContents && (
                      <pre
                        className={`text-xs whitespace-pre-wrap ${theme === "dark" ? "bg-[#0A0A0A]" : "bg-[#f0f0f0]"} p-2 rounded-none border border-border overflow-auto max-h-[200px] text-foreground`}
                      >
                        {fileData?.content || "Loading..."}
                      </pre>
                    )}
                  </div>
                </Card>
              );
            })}

            {selectedFiles.length === 0 && !currentPrompt && (
              <div className="text-center py-8 text-muted-foreground">
                Select files and/or add a prompt to preview content
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}