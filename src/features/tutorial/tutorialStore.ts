import { create } from 'zustand'
import { supabase } from '../../lib/supabase'

// ガイドツアーの進行状態（画面をまたいで使うので、ストアで持つ）
interface TutorialState {
  active: boolean
  stepIndex: number
  start: () => void
  setStepIndex: (index: number) => void
  close: () => void
}

export const useTutorialStore = create<TutorialState>((set) => ({
  active: false,
  stepIndex: 0,
  start: () => set({ active: true, stepIndex: 0 }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
  close: () => set({ active: false }),
}))

// 開発用：完了フラグを消して、ガイドツアーを最初から始め直す
export async function resetTutorial(): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { tutorialCompleted: false } })
  if (error) throw error
  useTutorialStore.getState().start()
}

// 完了（またはスキップ）したことを、ユーザー情報に保存する。次回以降は自動では始まらない
// 保存に失敗しても、ツアーそのものは閉じる（次のログインでもう一度出るだけ）
export function markTutorialCompleted(): void {
  supabase.auth.updateUser({ data: { tutorialCompleted: true } }).catch(() => {})
}
