import { supabase } from './supabase'
import type { Folder, Sheet } from '../features/mindmap/store/mindmapStore'

interface DbSheetMeta {
  id: string
  name: string
}

interface DbSheet extends DbSheetMeta {
  data: { nodes: Sheet['nodes']; edges: Sheet['edges']; mapType?: Sheet['mapType']; thumbnailPath?: string | null }
  is_starred: boolean
  deleted_at: string | null
  last_opened_at: string
  updated_at: string
  folder_id: string | null
}

// シートのメタデータのみ取得（軽量）
export async function fetchSheetsMeta(): Promise<Pick<Sheet, 'id' | 'name'>[]> {
  const { data, error } = await supabase
    .from('sheets')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as DbSheetMeta[]
}

// 特定シートのデータ（nodes/edges）を取得
export async function fetchSheetData(
  id: string
): Promise<Pick<Sheet, 'nodes' | 'edges'>> {
  const { data, error } = await supabase
    .from('sheets')
    .select('data')
    .eq('id', id)
    .single()

  if (error) throw error
  const d = (data as { data: DbSheet['data'] }).data
  return { nodes: d.nodes ?? [], edges: d.edges ?? [] }
}

// 全シートをまとめて取得（初回ロード用）
export async function fetchSheets(): Promise<Sheet[]> {
  const { data, error } = await supabase
    .from('sheets')
    .select('id, name, data, is_starred, deleted_at, last_opened_at, updated_at, folder_id')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data as DbSheet[]).map((s) => ({
    id: s.id,
    name: s.name,
    mapType: s.data?.mapType,
    thumbnailPath: s.data?.thumbnailPath ?? null,
    nodes: s.data?.nodes ?? [],
    edges: s.data?.edges ?? [],
    isStarred: s.is_starred,
    deletedAt: s.deleted_at,
    lastOpenedAt: s.last_opened_at,
    updatedAt: s.updated_at,
    folderId: s.folder_id,
  }))
}

// 単一シートをupsert（user_idはDBトリガーでauth.uid()を自動セット、updated_atはDBトリガーが自動更新）
export async function upsertSheet(sheet: Sheet): Promise<void> {
  const { error } = await supabase.from('sheets').upsert(
    {
      id: sheet.id,
      name: sheet.name,
      data: { mapType: sheet.mapType, nodes: sheet.nodes, edges: sheet.edges, thumbnailPath: sheet.thumbnailPath ?? null },
      is_starred: sheet.isStarred,
      deleted_at: sheet.deletedAt,
      last_opened_at: sheet.lastOpenedAt,
      folder_id: sheet.folderId,
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

// 複数シートをバッチupsert（5件ずつ並列処理）
export async function upsertSheetsBatch(sheets: Sheet[]): Promise<void> {
  const BATCH_SIZE = 5
  for (let i = 0; i < sheets.length; i += BATCH_SIZE) {
    const batch = sheets.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((s) => upsertSheet(s)))
  }
}

export async function deleteSheetFromDb(id: string): Promise<void> {
  const { error } = await supabase.from('sheets').delete().eq('id', id)
  if (error) throw error
}

// 全フォルダを取得
export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Folder[]
}

// 単一フォルダをupsert（user_idはDBトリガーでauth.uid()を自動セット）
export async function upsertFolder(folder: Folder): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .upsert({ id: folder.id, name: folder.name }, { onConflict: 'id' })
  if (error) throw error
}

export async function upsertFoldersBatch(folders: Folder[]): Promise<void> {
  const BATCH_SIZE = 5
  for (let i = 0; i < folders.length; i += BATCH_SIZE) {
    const batch = folders.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((f) => upsertFolder(f)))
  }
}

export async function deleteFolderFromDb(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}
