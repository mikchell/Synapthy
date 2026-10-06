import { toast } from 'sonner'

// 悪用対策の上限。supabase/migrations/20261006000002_add_abuse_limits.sql と必ず同じ値にそろえる
export const LIMITS = {
  sheets: 100, // ごみ箱に入れたシートも数える
  folders: 50,
  nameLength: 100, // シート名・フォルダ名
  sheetBytes: 2 * 1024 * 1024, // 1シート（nodes / edges など）。DB 側だけで検査する
  images: 200, // 1人あたりの画像の枚数（サムネイルも含む）
  imageBytes: 2 * 1024 * 1024, // 1枚あたり
} as const

export type LimitKind = 'sheets' | 'folders' | 'sheetSize' | 'images'

const toMB = (bytes: number) => bytes / 1024 / 1024

const MESSAGES: Record<LimitKind, string> = {
  sheets: `シートは、ごみ箱に入っているものも含めて${LIMITS.sheets}枚までです。不要なシートを完全に削除してください`,
  folders: `フォルダは${LIMITS.folders}個までです。不要なフォルダを削除してください`,
  sheetSize: `このシートは大きすぎて保存できません（${toMB(LIMITS.sheetBytes)}MBまで）。ノードや画像を減らしてください`,
  images: `画像は${LIMITS.images}枚までです。使っていない画像を削除してください`,
}

export const limitMessage = (kind: LimitKind) => MESSAGES[kind]

export const imageTooLargeMessage = `画像サイズが大きすぎます（${toMB(LIMITS.imageBytes)}MBまで）`

// 上限に達したことを画面に表示する。同じ種類のトーストが重なって増えないよう、idをそろえる
export function notifyLimit(kind: LimitKind) {
  toast.error(MESSAGES[kind], { id: `limit:${kind}` })
}

// 名前を上限の長さに収める。文字（コードポイント）の途中で切らないよう、1文字ずつ数える
export function clampName(name: string): string {
  return Array.from(name).slice(0, LIMITS.nameLength).join('')
}

// データベースが返したエラーが、上限によるものかを判定する。上限によるものでなければ null
export function limitKindOf(error: unknown): LimitKind | null {
  if (typeof error !== 'object' || error === null) return null
  const { message, code } = error as { message?: unknown; code?: unknown }
  if (typeof message !== 'string') return null
  if (message.includes('limit_exceeded:sheets')) return 'sheets'
  if (message.includes('limit_exceeded:folders')) return 'folders'
  // CHECK 制約の違反（23514）
  if (code === '23514' && message.includes('sheets_data_size_check')) return 'sheetSize'
  return null
}
