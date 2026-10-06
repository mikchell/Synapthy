import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useMindmapStore, type Folder, type Sheet } from '../store/mindmapStore'
import { resetHistory } from '../history'
import {
  fetchSheets,
  upsertSheet,
  upsertSheetsBatch,
  deleteSheetFromDb,
  fetchFolders,
  upsertFoldersBatch,
  deleteFolderFromDb,
} from '../../../lib/sheetsApi'

const NODE_DEBOUNCE_MS = 1000   // ノード・エッジ変更の保存間隔
const SHEET_DEBOUNCE_MS = 2000  // シートメタ変更の保存間隔
const FOLDER_DEBOUNCE_MS = 1000 // フォルダ変更の保存間隔

// name/star/trash/最終使用日時/所属フォルダのいずれかが変わったら再保存が必要
const metaKeyOf = (s: Sheet) =>
  `${s.name}|${s.isStarred}|${s.deletedAt ?? ''}|${s.lastOpenedAt}|${s.folderId ?? ''}`
const folderKeyOf = (f: Folder) => f.name

export function useSheetsSync(user: User | null) {
  const loadSheets = useMindmapStore((s) => s.loadSheets)
  const loadFolders = useMindmapStore((s) => s.loadFolders)
  const setIsSaving = useMindmapStore((s) => s.setIsSaving)
  const nodes = useMindmapStore((s) => s.nodes)
  const edges = useMindmapStore((s) => s.edges)
  const sheets = useMindmapStore((s) => s.sheets)
  const folders = useMindmapStore((s) => s.folders)

  const initializedRef = useRef(false)
  const prevSheetIdsRef = useRef<string[]>([])
  const prevMetaRef = useRef<Record<string, string>>({})
  const prevFolderIdsRef = useRef<string[]>([])
  const prevFolderMetaRef = useRef<Record<string, string>>({})
  const nodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sheetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const folderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ログイン時にSupabaseからシート・フォルダを読み込む
  useEffect(() => {
    if (!user) {
      initializedRef.current = false
      prevSheetIdsRef.current = []
      prevFolderIdsRef.current = []
      return
    }

    Promise.all([fetchSheets(), fetchFolders()])
      .then(([fetchedSheets, fetchedFolders]) => {
        if (fetchedSheets.length > 0) {
          loadSheets(fetchedSheets)
          // サーバーから読み込んだ内容を「元に戻す」の起点にする（読み込み前の状態には戻さない）
          resetHistory()
          prevSheetIdsRef.current = fetchedSheets.map((s) => s.id)
          prevMetaRef.current = Object.fromEntries(fetchedSheets.map((s) => [s.id, metaKeyOf(s)]))
        } else {
          // DBが空ならlocalStorageの初期データをDBに保存
          const { sheets: local, nodes: n, edges: e, currentSheetId } = useMindmapStore.getState()
          const toSave = local.map((s) =>
            s.id === currentSheetId ? { ...s, nodes: n, edges: e } : s
          )
          prevSheetIdsRef.current = toSave.map((s) => s.id)
          prevMetaRef.current = Object.fromEntries(toSave.map((s) => [s.id, metaKeyOf(s)]))
          upsertSheetsBatch(toSave).catch(() => toast.error('シートの保存に失敗しました'))
        }

        if (fetchedFolders.length > 0) {
          loadFolders(fetchedFolders)
          prevFolderIdsRef.current = fetchedFolders.map((f) => f.id)
          prevFolderMetaRef.current = Object.fromEntries(fetchedFolders.map((f) => [f.id, folderKeyOf(f)]))
        } else {
          const { folders: localFolders } = useMindmapStore.getState()
          prevFolderIdsRef.current = localFolders.map((f) => f.id)
          prevFolderMetaRef.current = Object.fromEntries(localFolders.map((f) => [f.id, folderKeyOf(f)]))
          if (localFolders.length > 0) {
            upsertFoldersBatch(localFolders).catch(() => toast.error('フォルダの保存に失敗しました'))
          }
        }

        initializedRef.current = true
      })
      .catch(() => toast.error('データの読み込みに失敗しました'))
  }, [user?.id])

  // ノード・エッジ変更時：現在のシートをDebounce保存
  useEffect(() => {
    if (!initializedRef.current) return

    const { sheets: s, currentSheetId } = useMindmapStore.getState()
    const currentSheet = s.find((sh) => sh.id === currentSheetId)
    if (!currentSheet) return

    setIsSaving(true)
    if (nodeTimerRef.current) clearTimeout(nodeTimerRef.current)
    nodeTimerRef.current = setTimeout(() => {
      upsertSheet({ ...currentSheet, nodes, edges })
        .then(() => {
          setIsSaving(false)
          useMindmapStore.getState().touchSheetUpdatedAt(currentSheet.id)
        })
        .catch(() => { setIsSaving(false); toast.error('変更の保存に失敗しました') })
    }, NODE_DEBOUNCE_MS)

    return () => {
      if (nodeTimerRef.current) clearTimeout(nodeTimerRef.current)
    }
  }, [nodes, edges])

  // シートの追加・削除・名前/スター/ゴミ箱/最終使用日時/フォルダの変更を検知してDBに反映
  const sheetKey = sheets.map((s) => `${s.id}:${metaKeyOf(s)}`).join(',')
  useEffect(() => {
    if (!initializedRef.current) return

    const { nodes: n, edges: e, currentSheetId } = useMindmapStore.getState()
    const currentIds = sheets.map((s) => s.id)
    const prevIds = prevSheetIdsRef.current

    // 完全に削除されたシート（配列から消えたもの）をDBから削除
    const deletedIds = prevIds.filter((id) => !currentIds.includes(id))
    deletedIds.forEach((id) => deleteSheetFromDb(id).catch(() => toast.error('シートの削除に失敗しました')))

    // メタ情報が実際に変わったシートのみ再送信（無関係なシートのupdated_atを更新しない）
    const changed = sheets.filter((s) => prevMetaRef.current[s.id] !== metaKeyOf(s))
    if (changed.length > 0) {
      setIsSaving(true)
      if (sheetTimerRef.current) clearTimeout(sheetTimerRef.current)
      sheetTimerRef.current = setTimeout(() => {
        const payload = changed.map((s) =>
          s.id === currentSheetId ? { ...s, nodes: n, edges: e } : s
        )
        upsertSheetsBatch(payload)
          .then(() => {
            setIsSaving(false)
            payload.forEach((s) => useMindmapStore.getState().touchSheetUpdatedAt(s.id))
          })
          .catch(() => { setIsSaving(false); toast.error('シートの保存に失敗しました') })
      }, SHEET_DEBOUNCE_MS)
    }

    prevSheetIdsRef.current = currentIds
    prevMetaRef.current = Object.fromEntries(sheets.map((s) => [s.id, metaKeyOf(s)]))

    return () => {
      if (sheetTimerRef.current) clearTimeout(sheetTimerRef.current)
    }
  }, [sheetKey])

  // フォルダの作成・削除・リネームを検知してDBに反映
  const folderKey = folders.map((f) => `${f.id}:${folderKeyOf(f)}`).join(',')
  useEffect(() => {
    if (!initializedRef.current) return

    const currentIds = folders.map((f) => f.id)
    const prevIds = prevFolderIdsRef.current

    const deletedIds = prevIds.filter((id) => !currentIds.includes(id))
    deletedIds.forEach((id) => deleteFolderFromDb(id).catch(() => toast.error('フォルダの削除に失敗しました')))

    const changed = folders.filter((f) => prevFolderMetaRef.current[f.id] !== folderKeyOf(f))
    if (changed.length > 0) {
      if (folderTimerRef.current) clearTimeout(folderTimerRef.current)
      folderTimerRef.current = setTimeout(() => {
        upsertFoldersBatch(changed).catch(() => toast.error('フォルダの保存に失敗しました'))
      }, FOLDER_DEBOUNCE_MS)
    }

    prevFolderIdsRef.current = currentIds
    prevFolderMetaRef.current = Object.fromEntries(folders.map((f) => [f.id, folderKeyOf(f)]))

    return () => {
      if (folderTimerRef.current) clearTimeout(folderTimerRef.current)
    }
  }, [folderKey])
}
