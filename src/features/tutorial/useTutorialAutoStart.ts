import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { useTutorialStore } from './tutorialStore'

// 登録からこの期間内の人にだけ、自動で出す（すでに使っている人には出さない）
const NEW_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// 初めて登録した人（完了フラグが無く、登録から間もない人）に、ガイドツアーを自動で始める
export function useTutorialAutoStart(user: User | null) {
  const start = useTutorialStore((s) => s.start)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!user) {
      startedRef.current = false
      return
    }
    if (startedRef.current) return
    if (user.user_metadata?.tutorialCompleted) return
    const createdAt = Date.parse(user.created_at)
    // 開発環境では、登録日に関係なく出して、動作を確認できるようにする
    if (!import.meta.env.DEV && (Number.isNaN(createdAt) || Date.now() - createdAt > NEW_USER_WINDOW_MS)) return
    startedRef.current = true
    start()
  }, [user, start])
}
