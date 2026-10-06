import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { fetchSheetData } from '../../../lib/sheetsApi'
import { isSheetLoaded } from '../../../lib/sheetRows'
import { resetHistory } from '../utils/history'
import { useMindmapStore } from '../store/mindmapStore'

// シートのノードの中身を読み込む仕組みの状態
// （初回ロードでは軽い項目だけを取得し、中身は、編集画面でシートを開くときに取得する）
interface SheetLoadStatus {
  // 軽い項目の読み込みが終わっているか。終わるまでは、中身の読み込みを始めない
  ready: boolean
  // シートの中身を読み込めなかったとき、どのシートで、どんなメッセージか
  // （別のシートを開いているときに、前の失敗が表示され続けないよう、シートのIDと一緒に覚える）
  error: { sheetId: string; message: string } | null
  // 「再読み込み」のたびに増やして、読み込みをやり直させる
  attempt: number
  retry: () => void
}

export const useSheetLoadStatus = create<SheetLoadStatus>((set) => ({
  ready: false,
  error: null,
  attempt: 0,
  retry: () => set((s) => ({ error: null, attempt: s.attempt + 1 })),
}))

// 編集画面で開いているシートの中身が未読み込みなら、取得して取り込む
// 別のシートに切り替わったときは、古い結果を捨てる（取得中のシートが、あとから別のシートの上に出てしまわないように）
export function useCurrentSheetLoader(user: User | null) {
  const userId = user?.id ?? null
  const currentView = useMindmapStore((s) => s.currentView)
  const currentSheetId = useMindmapStore((s) => s.currentSheetId)
  const ownerId = useMindmapStore((s) => s.ownerId)
  const needsLoad = useMindmapStore((s) => {
    const current = s.sheets.find((sh) => sh.id === s.currentSheetId)
    return !!current && !isSheetLoaded(current)
  })
  const ready = useSheetLoadStatus((s) => s.ready)
  const attempt = useSheetLoadStatus((s) => s.attempt)

  useEffect(() => {
    // ログイン中のユーザーのデータが読み込めていて、編集画面で、未読み込みのシートを開いているときだけ
    if (!userId || ownerId !== userId || !ready) return
    if (currentView !== 'editor' || !needsLoad) return

    let cancelled = false
    const id = currentSheetId
    useSheetLoadStatus.setState({ error: null })
    fetchSheetData(id)
      .then(({ nodes, edges }) => {
        if (cancelled) return
        useMindmapStore.getState().markSheetLoaded(id, nodes, edges)
        // 取り込んだ内容を、「元に戻す」の起点にする（空のキャンバスには戻らない）
        resetHistory()
      })
      .catch(() => {
        if (!cancelled) useSheetLoadStatus.setState({ error: { sheetId: id, message: 'シートを読み込めませんでした' } })
      })
    return () => {
      cancelled = true
    }
  }, [userId, ownerId, ready, currentView, currentSheetId, needsLoad, attempt])
}

// 指定したシートの中身が未読み込みなら、取得して取り込む（ホームのカードから、シートの中身を含む項目を変えるときに使う）
export async function ensureSheetContent(id: string): Promise<void> {
  const sheet = useMindmapStore.getState().sheets.find((s) => s.id === id)
  if (!sheet || isSheetLoaded(sheet)) return
  const { nodes, edges } = await fetchSheetData(id)
  useMindmapStore.getState().markSheetLoaded(id, nodes, edges)
  if (useMindmapStore.getState().currentSheetId === id) resetHistory()
}
