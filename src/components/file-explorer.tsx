import { ChevronDown, ChevronRight, File, Folder, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../lib/utils'
import type { FileItem } from '../types'
import { useTheme } from './theme-provider'
import { Checkbox } from './ui/checkbox'
import { ScrollArea } from './ui/scroll-area'

interface FileExplorerProps {
  data: FileItem[]
  selectedFiles: string[]
  onSelectionChange: (files: string[]) => void
  onRemoveRootFolder?: (path: string) => void
}

export function FileExplorer({
  data,
  selectedFiles,
  onSelectionChange,
  onRemoveRootFolder,
}: FileExplorerProps) {
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
            onRemoveRootFolder={onRemoveRootFolder}
            isRootNode={true}
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
  onRemoveRootFolder?: (path: string) => void
  isRootNode?: boolean
}

function FileTreeNode({
  item,
  level,
  selectedFiles,
  onSelectionChange,
  onRemoveRootFolder,
  isRootNode = false,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 1)
  const { theme } = useTheme()

  // Determine if this is a folder
  const isFolder = item.file_type === 'Directory'

  // Get all file paths in this folder and its subfolders - using useMemo to avoid recalculation
  const allFilePaths = useMemo(() => {
    const getAllFilePaths = (node: FileItem): string[] => {
      if (node.file_type === 'File') return [node.path]
      return (node.children || []).flatMap(child => getAllFilePaths(child))
    }

    return isFolder ? getAllFilePaths(item) : [item.path]
  }, [item, isFolder])

  // Calculate checked and indeterminate states directly during render
  let isChecked = false
  let isIndeterminate = false

  if (isFolder) {
    if (allFilePaths.length > 0) {
      const allSelected = allFilePaths.every(path => selectedFiles.includes(path))
      const someSelected = allFilePaths.some(path => selectedFiles.includes(path))

      isChecked = allSelected
      isIndeterminate = someSelected && !allSelected
    }
  } else {
    isChecked = selectedFiles.includes(item.path)
  }

  // Function to handle folder expansion/collapse
  const handleToggle = () => {
    if (isFolder) {
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
    if (!isFolder) {
      if (checked) {
        onSelectionChange([...selectedFiles, item.path])
      } else {
        onSelectionChange(selectedFiles.filter(path => path !== item.path))
      }
    } else {
      if (checked) {
        // Add all files in this folder
        const newSelection = [...new Set([...selectedFiles, ...allFilePaths])]
        onSelectionChange(newSelection)
      } else {
        // Remove all files in this folder
        onSelectionChange(selectedFiles.filter(path => !allFilePaths.includes(path)))
      }
    }
  }

  // Handle removing a root folder
  const handleRemoveFolder = () => {
    if (onRemoveRootFolder) {
      onRemoveRootFolder(item.path)
    }
  }

  // Count files in directory for display
  const fileCount = useMemo(() => {
    if (isFolder && item.children) {
      // Count only the immediate files (not including subdirectories)
      return item.children.filter(child => child.file_type === 'File').length
    }
    return 0
  }, [isFolder, item.children])

  return (
    <div>
      <div
        className={cn(
          'flex items-center py-1 px-1 rounded-sm group',
          `hover:bg-${theme === 'dark' ? '[#222]' : '[#e5e5e5]'} cursor-pointer`,
          isRootNode && 'font-semibold bg-primary/5'
        )}
        style={{ paddingLeft: `${level * 12}px` }}
      >
        {isFolder ? (
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
          checked={isChecked}
          data-state={isIndeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'}
          onCheckedChange={handleCheckboxChange}
          className={cn(
            'mr-2 h-4 w-4 border-border',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            'data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:border-primary/50'
          )}
          aria-label={`Select ${item.name}`}
        />

        <button
          type="button"
          className="flex items-center gap-2 text-sm text-left w-full"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
        >
          {isFolder ? (
            <Folder
              size={14}
              className={cn('text-muted-foreground', isRootNode && 'text-primary')}
            />
          ) : (
            <File size={14} className="text-muted-foreground" />
          )}
          <span className="truncate">{item.name}</span>

          {/* Only show size for files, or file count for directories */}
          {!isFolder && item.size ? (
            <span className="text-xs text-muted-foreground ml-auto">
              {formatFileSize(item.size)}
            </span>
          ) : (
            isFolder &&
            fileCount > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </span>
            )
          )}
        </button>

        {/* Add remove button for root folders */}
        {isRootNode && isFolder && onRemoveRootFolder && (
          <button
            type="button"
            onClick={handleRemoveFolder}
            className="ml-2 p-1 h-6 w-6 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
            aria-label={`Remove folder ${item.name}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isFolder && expanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeNode
              key={child.path}
              item={child}
              level={level + 1}
              selectedFiles={selectedFiles}
              onSelectionChange={onSelectionChange}
              onRemoveRootFolder={onRemoveRootFolder}
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
