import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import type { FileItem } from '../types'
import { useTheme } from './theme-provider'
import { Checkbox } from './ui/checkbox'
import { ScrollArea } from './ui/scroll-area'

interface FileExplorerProps {
  data: FileItem[]
  selectedFiles: string[]
  onSelectionChange: (files: string[]) => void
}

export function FileExplorer({ data, selectedFiles, onSelectionChange }: FileExplorerProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {data.map(item => (
          <FileTreeNode
            key={item.path}
            item={item}
            level={0}
            selectedFiles={selectedFiles}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

interface FileTreeNodeProps {
  item: FileItem
  level: number
  selectedFiles: string[]
  onSelectionChange: (files: string[]) => void
}

function FileTreeNode({ item, level, selectedFiles, onSelectionChange }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 1)
  const isSelected = selectedFiles.includes(item.path)
  const { theme } = useTheme()

  // Function to handle folder expansion/collapse
  const handleToggle = () => {
    if (item.file_type === 'Directory') {
      setExpanded(!expanded)
    }
  }

  // Keyboard handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleToggle()
      e.preventDefault()
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    if (item.file_type === 'File') {
      if (checked) {
        onSelectionChange([...selectedFiles, item.path])
      } else {
        onSelectionChange(selectedFiles.filter(path => path !== item.path))
      }
    } else if (item.file_type === 'Directory') {
      // Get all file paths in this folder and its subfolders
      const getAllFilePaths = (node: FileItem): string[] => {
        if (node.file_type === 'File') return [node.path]

        return (node.children || []).flatMap(child => getAllFilePaths(child))
      }

      const filePaths = getAllFilePaths(item)

      if (checked) {
        // Add all files in this folder
        const newSelection = [...new Set([...selectedFiles, ...filePaths])]
        onSelectionChange(newSelection)
      } else {
        // Remove all files in this folder
        onSelectionChange(selectedFiles.filter(path => !filePaths.includes(path)))
      }
    }
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center py-1 px-1 rounded-sm group',
          `hover:bg-${theme === 'dark' ? '[#222]' : '[#e5e5e5]'} cursor-pointer`
        )}
        style={{ paddingLeft: `${level * 12}px` }}
      >
        {item.file_type === 'Directory' ? (
          <button
            type="button"
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            className="mr-1 h-4 w-4 flex items-center justify-center text-muted-foreground"
            aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          className="mr-2 h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          aria-label={`Select ${item.name}`}
        />

        <button
          type="button"
          className="flex items-center gap-2 text-sm text-left w-full"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
        >
          {item.file_type === 'Directory' ? (
            <Folder size={14} className="text-muted-foreground" />
          ) : (
            <File size={14} className="text-muted-foreground" />
          )}
          <span className="truncate">{item.name}</span>

          {item.size && (
            <span className="text-xs text-muted-foreground ml-auto">
              {formatFileSize(item.size)}
            </span>
          )}
        </button>
      </div>

      {item.file_type === 'Directory' && expanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeNode
              key={child.path}
              item={child}
              level={level + 1}
              selectedFiles={selectedFiles}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
