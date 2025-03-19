import * as React from 'react'

type Theme = 'dark' | 'light'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
}

const ThemeContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, defaultTheme = 'dark', ...props }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme)

  React.useEffect(() => {
    // Check if we have a theme preference in localStorage
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
    }
  }, [])

  React.useEffect(() => {
    const root = window.document.documentElement

    // Remove the old theme class
    root.classList.remove('light', 'dark')

    // Add the new theme class
    root.classList.add(theme)

    // Save the theme preference
    localStorage.setItem('theme', theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme)
    },
  }

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
