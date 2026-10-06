import { Toaster } from 'sonner'
import { MindmapCanvas } from './features/mindmap/components/MindmapCanvas'
import { useSheetsSync } from './features/mindmap/hooks/useSheetsSync'
import { useMindmapStore } from './features/mindmap/store/mindmapStore'
import { HomeScreen } from './features/home/components/HomeScreen'
import { LoginScreen } from './features/auth/LoginScreen'
import { useAuth } from './features/auth/useAuth'
import { useTheme } from './lib/theme'

function App() {
  const { user, loading } = useAuth()
  const currentView = useMindmapStore((s) => s.currentView)
  const theme = useTheme((s) => s.theme)

  useSheetsSync(user ?? null)

  if (loading) return null

  return (
    <>
      {!user ? (
        <LoginScreen />
      ) : currentView === 'home' ? (
        <HomeScreen />
      ) : (
        <MindmapCanvas />
      )}
      <Toaster position="bottom-right" richColors theme={theme} />
    </>
  )
}

export default App
