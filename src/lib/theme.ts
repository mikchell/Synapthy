import { create } from 'zustand'

// ライト／ダークのテーマ切り替え
// - 自分で選んだことがなければ OS の設定に従う（OS 側を変えると追従する）
// - ボタンで切り替えると、その選択をブラウザに保存して優先する
// 実際の色は index.css の変数で、<html data-theme="..."> によって切り替わる

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'synaptique-theme'
const systemQuery = window.matchMedia('(prefers-color-scheme: dark)')

function savedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

const systemTheme = (): Theme => (systemQuery.matches ? 'dark' : 'light')

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

interface ThemeStore {
  theme: Theme
  toggleTheme: () => void
}

export const useTheme = create<ThemeStore>((set, get) => ({
  theme: savedTheme() ?? systemTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 保存できない環境（プライベートウィンドウなど）でも、その場の切り替えは行う
    }
    apply(next)
    set({ theme: next })
  },
}))

apply(useTheme.getState().theme)

// 自分で選んでいない間は、OS の設定変更に追従する
systemQuery.addEventListener('change', () => {
  if (savedTheme()) return
  const next = systemTheme()
  apply(next)
  useTheme.setState({ theme: next })
})
