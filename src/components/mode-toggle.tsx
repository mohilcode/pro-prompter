import { Code, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from './theme-provider'
import { Button } from './ui/button'

interface ModeToggleProps {
  currentMode: 'simple' | 'xml'
  onModeChange: (mode: 'simple' | 'xml') => void
}

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  const { theme } = useTheme()

  return (
    <div
      className={`flex items-center ${theme === 'dark' ? 'bg-[#111]' : 'bg-[#e5e5e5]'} rounded-sm p-1 border border-border`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('simple')}
        className={cn(
          'gap-2 rounded-sm text-sm h-8 px-3',
          currentMode === 'simple'
            ? `${theme === 'dark' ? 'bg-[#222]' : 'bg-[#d5d5d5]'} text-primary border-primary/50`
            : `hover:${theme === 'dark' ? 'bg-[#222]' : 'bg-[#d5d5d5]'} text-muted-foreground`
        )}
      >
        <FileText size={16} />
        <span>Simple Mode</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('xml')}
        className={cn(
          'gap-2 rounded-sm text-sm h-8 px-3',
          currentMode === 'xml'
            ? `${theme === 'dark' ? 'bg-[#222]' : 'bg-[#d5d5d5]'} text-primary border-primary/50`
            : `hover:${theme === 'dark' ? 'bg-[#222]' : 'bg-[#d5d5d5]'} text-muted-foreground`
        )}
      >
        <Code size={16} />
        <span>XML Mode</span>
      </Button>
    </div>
  )
}
