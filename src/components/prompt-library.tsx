import { Bookmark, ChevronDown, ChevronUp, Save, Search, Tag, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { usePrompts } from '../hooks/use-prompts'
import { cn } from '../lib/utils'
import type { Prompt, PromptTag } from '../types'
import { useTheme } from './theme-provider'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'

interface PromptLibraryProps {
  currentPrompt: string
  onPromptChange: (prompt: string) => void
}

export function PromptLibrary({ currentPrompt, onPromptChange }: PromptLibraryProps) {
  const { prompts, savePrompt, deletePrompt } = usePrompts()
  const [promptName, setPromptName] = useState('')
  const [promptTags, setPromptTags] = useState<PromptTag[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Recent', 'All'])
  const { theme } = useTheme()

  const handleSavePrompt = async () => {
    if (!promptName.trim() || !currentPrompt.trim()) return

    await savePrompt(promptName, currentPrompt, promptTags)
    setPromptName('')
    setPromptTags([])
  }

  const handleDeletePrompt = async (id: string) => {
    await deletePrompt(id)
  }

  const handleAddTag = () => {
    if (!currentTag.trim()) return

    // Check if tag already exists
    if (promptTags.some(tag => tag.name === currentTag)) return

    const newTag: PromptTag = {
      id: `tag-${Date.now()}`,
      name: currentTag,
    }

    setPromptTags([...promptTags, newTag])
    setCurrentTag('')
  }

  const handleRemoveTag = (tagId: string) => {
    setPromptTags(promptTags.filter(t => t.id !== tagId))
  }

  const handleUsePrompt = (content: string) => {
    onPromptChange(content)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  // Group prompts by category (if category exists, otherwise use "Custom")
  const promptsByCategory = prompts.reduce(
    (acc, prompt) => {
      const category = 'Custom' // Adjust if your backend has categories
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(prompt)
      return acc
    },
    {} as Record<string, Prompt[]>
  )

  // Filter prompts by search term
  const filteredPromptsByCategory = Object.entries(promptsByCategory).reduce(
    (acc, [category, categoryPrompts]) => {
      const filtered = categoryPrompts.filter(
        p =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tags.some(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {} as Record<string, Prompt[]>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold mb-2">PROMPT LIBRARY</h2>

        <div className="space-y-2">
          <Input
            placeholder="Prompt name"
            value={promptName}
            onChange={e => setPromptName(e.target.value)}
            className="text-sm font-mono bg-secondary/50 border-border focus-visible:ring-primary"
          />

          <div className="flex gap-2">
            <Input
              placeholder="Add tags"
              value={currentTag}
              onChange={e => setCurrentTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              className="text-sm font-mono bg-secondary/50 border-border focus-visible:ring-primary flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddTag}
              disabled={!currentTag.trim()}
              className="border-border bg-secondary/50 hover:bg-secondary text-foreground h-9"
            >
              <Tag size={14} />
            </Button>
          </div>

          {promptTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {promptTags.map(tag => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs bg-secondary text-foreground hover:bg-secondary/80"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Button
            onClick={handleSavePrompt}
            className="w-full bg-primary/30 hover:bg-primary/40 text-primary-foreground border-none"
            disabled={!promptName.trim() || !currentPrompt.trim()}
          >
            <Save size={14} className="mr-2" />
            Save Current Prompt
          </Button>
        </div>
      </div>

      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search saved prompts..."
            className="pl-8 text-sm font-mono bg-secondary/50 border-border focus-visible:ring-primary"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.keys(filteredPromptsByCategory).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No prompts found</div>
          ) : (
            Object.entries(filteredPromptsByCategory).map(([category, promptsInCategory]) => (
              <div key={category} className="mb-3">
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium"
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {expandedCategories.includes(category) ? (
                    <ChevronUp size={14} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={14} className="text-muted-foreground" />
                  )}
                </button>

                {expandedCategories.includes(category) && (
                  <div className="mt-1 space-y-1">
                    {promptsInCategory.map(prompt => (
                      <div
                        key={prompt.id}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm',
                          `hover:bg-${theme === 'dark' ? '[#222]' : '[#e5e5e5]'} transition-colors`,
                          'flex items-start gap-2'
                        )}
                      >
                        <Bookmark size={14} className="mt-0.5 text-muted-foreground" />
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium truncate flex items-center justify-between">
                            <span>{prompt.title}</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-red-500 ml-2"
                              onClick={() => handleDeletePrompt(prompt.id)}
                              aria-label={`Delete prompt: ${prompt.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground truncate w-full text-left"
                            onClick={() => handleUsePrompt(prompt.content)}
                          >
                            {prompt.content.substring(0, 60)}
                            {prompt.content.length > 60 ? '...' : ''}
                          </button>
                          {prompt.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prompt.tags.map(tag => (
                                <Badge
                                  key={tag.id}
                                  variant="outline"
                                  className="text-xs px-1 py-0 border-border text-muted-foreground"
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
