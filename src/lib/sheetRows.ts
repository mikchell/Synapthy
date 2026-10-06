import type { Sheet } from '../types/sheet'

// ノードの中身（nodes / edges）を読み込んでいるか。
// 読み込んでいないシートは、中身が空になっている。そのシートの中身を DB に書き込んではいけない（空で上書きして消してしまうため）。
// loaded が未設定のシート（この仕組みの導入前の端末のキャッシュなど）は、中身を持っているので、読み込み済みとして扱う
export const isSheetLoaded = (sheet: Pick<Sheet, 'loaded'>): boolean => sheet.loaded !== false

// シートの軽い項目の行（ノードの中身を含まない）。初回ロードで取得する
export interface SheetMetaRow {
  id: string
  name: string
  is_starred: boolean
  deleted_at: string | null
  last_opened_at: string
  updated_at: string
  folder_id: string | null
  // data（JSONB）の中の項目。PostgREST の「別名:data->>キー」で取り出す（値がなければ null）
  map_type: string | null
  thumbnail_path: string | null
  line_color: string | null
}

// fetchSheetsMeta の select。data そのもの（ノードの中身）は取得しない
export const SHEET_META_COLUMNS =
  'id, name, is_starred, deleted_at, last_opened_at, updated_at, folder_id, ' +
  'map_type:data->>mapType, thumbnail_path:data->>thumbnailPath, line_color:data->>lineColor'

// 軽い項目の行から、中身が空で、読み込んでいない状態のシートを作る
export function sheetFromMetaRow(row: SheetMetaRow): Sheet {
  return {
    id: row.id,
    name: row.name,
    mapType: row.map_type === 'free' || row.map_type === 'linear' ? row.map_type : undefined,
    thumbnailPath: row.thumbnail_path ?? null,
    lineColor: row.line_color ?? null,
    nodes: [],
    edges: [],
    loaded: false,
    isStarred: row.is_starred,
    deletedAt: row.deleted_at,
    lastOpenedAt: row.last_opened_at,
    updatedAt: row.updated_at,
    folderId: row.folder_id,
  }
}

// 保存するシートを、保存のしかたで振り分ける
// - full: 読み込み済み。行全体（ノードの中身を含む）を保存する
// - metaOnly: 読み込んでいない。名前などの列だけを更新する（ノードの中身には触れない）
export function planSheetWrites<T extends Pick<Sheet, 'loaded'>>(sheets: T[]): { full: T[]; metaOnly: T[] } {
  return {
    full: sheets.filter((s) => isSheetLoaded(s)),
    metaOnly: sheets.filter((s) => !isSheetLoaded(s)),
  }
}
