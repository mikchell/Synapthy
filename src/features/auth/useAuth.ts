import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { clearSignedUrlCache } from '../../lib/imageApi'
import { supabase } from '../../lib/supabase'
import { resetHistory } from '../mindmap/history'
import { useMindmapStore } from '../mindmap/store/mindmapStore'

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin
// 旧バージョンが使っていた保存先。いまは使っていないが、残っていれば消す
const LEGACY_STORAGE_KEY = 'ore-no-mindmap-storage'

// 端末に残るキャッシュは、いまログインしている人のものだけにする。
// 別の人でログインした・ログアウトした・セッションが切れたときは、前の人のデータを捨てる
// （共有端末で、前の人のマインドマップが次の人のアカウントに保存されるのを防ぐため）
function syncCacheOwner(userId: string | null) {
  if (useMindmapStore.getState().claimOwnership(userId)) {
    resetHistory()
    clearSignedUrlCache()
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 画面にユーザーを渡す前に持ち主を合わせる（前の人のデータが一瞬でも映らないように）
    const applySession = (session: Session | null) => {
      syncCacheOwner(session?.user.id ?? null)
      setUser(session?.user ?? null)
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: APP_URL },
    })

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      // ログアウトできていないのにキャッシュだけ消すと、保存されていない状態になるので何もしない
      toast.error('ログアウトに失敗しました')
      return
    }
    syncCacheOwner(null)
    useMindmapStore.persist.clearStorage()
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }

  return { user, loading, signInWithGoogle, signOut }
}
