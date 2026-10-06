import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

// ライト／ダークの切り替えボタン
export function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggleTheme)
  const label = theme === 'dark' ? 'ライトモードにする' : 'ダークモードにする'

  return (
    <button
      onClick={toggleTheme}
      data-tour="theme-toggle"
      title={label}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 8,
        border: '1px solid var(--c-border)',
        background: 'none',
        color: 'var(--c-text-2)',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
