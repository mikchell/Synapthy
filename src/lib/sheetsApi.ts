import { supabase } from './supabase'
import type { Folder, Sheet } from '../types/sheet'
import { isSheetLoaded, planSheetWrites, sheetFromMetaRow, SHEET_META_COLUMNS, type SheetMetaRow } from './sheetRows'

interface DbSheetMeta {
  id: string
  name: string
}

interface DbSheet extends DbSheetMeta {
  data: { nodes: Sheet['nodes']; edges: Sheet['edges']; mapType?: Sheet['mapType']; thumbnailPath?: string | null; lineColor?: string | null }
  is_starred: boolean
  deleted_at: string | null
  last_opened_at: string
  updated_at: string
  folder_id: string | null
}

// シートの軽い項目（名前・スター・フォルダ・サムネイルなど）だけを取得する（初回ロード用）
// ノードの中身（data）は取得しない。各シートは、中身が空で、loaded が false の状態になる
export async function fetchSheetsMeta(): Promise<Sheet[]> {
  const { data, error } = await supabase
    .from('sheets')
    .select(SHEET_META_COLUMNS)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as unknown as SheetMetaRow[]).map(sheetFromMetaRow)
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

// 複数シートのノードの中身を、まとめて取得する（完全削除の前に、画像の保存場所を調べるため）
export async function fetchSheetsContent(
  ids: string[]
): Promise<Map<string, Pick<Sheet, 'nodes' | 'edges'>>> {
  const result = new Map<string, Pick<Sheet, 'nodes' | 'edges'>>()
  const CHUNK_SIZE = 10 // 1回の応答が大きくなりすぎないよう、分けて取得する
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from('sheets')
      .select('id, data')
      .in('id', ids.slice(i, i + CHUNK_SIZE))
    if (error) throw error
    for (const row of data as { id: string; data: DbSheet['data'] }[]) {
      result.set(row.id, { nodes: row.data?.nodes ?? [], edges: row.data?.edges ?? [] })
    }
  }
  return result
}

// 単一シートをupsert（user_idはDBトリガーでauth.uid()を自動セット、updated_atはDBトリガーが自動更新）
// ノードの中身を含む行全体を書き込むので、読み込んでいないシート（中身が空）を渡されたら拒否する
// （空で上書きして、データを消してしまわないための最後の安全網。保存の振り分けは saveSheets が行う）
export async function upsertSheet(sheet: Sheet): Promise<void> {
  if (!isSheetLoaded(sheet)) {
    throw new Error('中身を読み込んでいないシートは、全体を保存できません')
  }
  const { error } = await supabase.from('sheets').upsert(
    {
      id: sheet.id,
      name: sheet.name,
      data: { mapType: sheet.mapType, nodes: sheet.nodes, edges: sheet.edges, thumbnailPath: sheet.thumbnailPath ?? null, lineColor: sheet.lineColor ?? null },
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

// 読み込んでいないシートの、名前・スター・ごみ箱・最終使用日時・フォルダの変更だけを保存する
// data 列（ノードの中身）には触れない。サムネイルと線の色は data の中にあるので、ここでは保存できない
// （それらを変えるシートは、先に中身を読み込んでおく）
export async function updateSheetMeta(sheet: Sheet): Promise<void> {
  const { error } = await supabase
    .from('sheets')
    .update({
      name: sheet.name,
      is_starred: sheet.isStarred,
      deleted_at: sheet.deletedAt,
      last_opened_at: sheet.lastOpenedAt,
      folder_id: sheet.folderId,
    })
    .eq('id', sheet.id)
  if (error) throw error
}

// シートを保存する。読み込み済みのシートは行全体を、読み込んでいないシートは列だけを保存する
export async function saveSheets(sheets: Sheet[]): Promise<void> {
  const { full, metaOnly } = planSheetWrites(sheets)
  await upsertSheetsBatch(full)
  const BATCH_SIZE = 5
  for (let i = 0; i < metaOnly.length; i += BATCH_SIZE) {
    await Promise.all(metaOnly.slice(i, i + BATCH_SIZE).map((s) => updateSheetMeta(s)))
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
