// 線（エッジ）の色。シートごとに1つ設定し、そのシートの線すべてに適用する
// 文字の色と同じパレットを使い、保存・描画ともにこの中の値だけ受け付ける
// 「標準」（色なし）のときはテーマの色（--c-line）を使うので、ダークモードでも見やすい
import { TEXT_COLORS } from './labelStyle'

export const LINE_COLORS = TEXT_COLORS

const ALLOWED: ReadonlySet<string> = new Set(LINE_COLORS.map((c) => c.value))

export const safeLineColor = (color: unknown): string | undefined =>
  typeof color === 'string' && ALLOWED.has(color) ? color : undefined
