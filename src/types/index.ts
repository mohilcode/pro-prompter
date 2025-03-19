export type FileType = 'File' | 'Directory'

export interface FileItem {
  path: string
  name: string
  file_type: FileType
  children?: FileItem[]
  size?: number
}

export interface PromptTag {
  id: string
  name: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  tags: PromptTag[]
  created_at: number
  updated_at: number
}

export interface Workspace {
  id: string
  name: string
  folders: WorkspaceFolder[]
  created_at: number
  updated_at: number
}

export interface WorkspaceFolder {
  id: string
  path: string
  name: string
}

export interface FileChange {
  path: string
  action: 'Create' | 'Rewrite' | 'Modify' | 'Delete'
  changes: Array<{
    description: string
    search?: string
    content: string
  }>
}

export interface ChangeResult {
  path: string
  action: 'Create' | 'Rewrite' | 'Modify' | 'Delete'
  success: boolean
  message?: string
}
