// ノードの文字の装飾（太字・色）
//
// ラベル（label）は今まで通りの文字列のまま持ち、装飾は範囲ごとの配列（labelStyles）として別に持つ。
// HTML は保存しない（描画時に React の要素へ変換する）ので、XSS の経路を増やさない。

export interface LabelSpan {
  start: number // 範囲の先頭（含む）。label の UTF-16 インデックス（input の selectionStart と同じ単位）
  end: number // 範囲の末尾（含まない）
  bold?: boolean
  color?: string
}

export interface LabelSegment {
  text: string
  bold?: boolean
  color?: string
}

// 文字の色パレット（ライト・ダークのどちらでも読める中間の濃さ）。保存・描画ともにこの中の値だけ受け付ける
export const TEXT_COLORS = [
  { label: '赤', value: '#dc2626' },
  { label: 'オレンジ', value: '#ea580c' },
  { label: '緑', value: '#16a34a' },
  { label: '青', value: '#2563eb' },
  { label: '紫', value: '#7c3aed' },
] as const

const ALLOWED_COLORS: ReadonlySet<string> = new Set(TEXT_COLORS.map((c) => c.value))

export const safeTextColor = (color: unknown): string | undefined =>
  typeof color === 'string' && ALLOWED_COLORS.has(color) ? color : undefined

interface CharStyle {
  bold?: boolean
  color?: string
}

const sameStyle = (a: CharStyle, b: CharStyle) => !!a.bold === !!b.bold && a.color === b.color

// 範囲の配列 → 1文字ずつの装飾の配列
function toCharStyles(length: number, spans: LabelSpan[] | undefined): CharStyle[] {
  const chars: CharStyle[] = Array.from({ length }, () => ({}))
  for (const s of spans ?? []) {
    const from = Math.max(0, Math.min(s.start, length))
    const to = Math.max(from, Math.min(s.end, length))
    for (let i = from; i < to; i++) {
      if (s.bold) chars[i].bold = true
      const color = safeTextColor(s.color)
      if (color) chars[i].color = color
    }
  }
  return chars
}

// 1文字ずつの装飾 → 同じ装飾が続く範囲にまとめる（装飾のない文字は含めない）
function fromCharStyles(chars: CharStyle[]): LabelSpan[] {
  const spans: LabelSpan[] = []
  let i = 0
  while (i < chars.length) {
    const style = chars[i]
    if (!style.bold && !style.color) {
      i++
      continue
    }
    let j = i + 1
    while (j < chars.length && sameStyle(chars[j], style)) j++
    const span: LabelSpan = { start: i, end: j }
    if (style.bold) span.bold = true
    if (style.color) span.color = style.color
    spans.push(span)
    i = j
  }
  return spans
}

// 文字が書き換わったとき、装飾の範囲を新しい文字に合わせてずらす
// 古い文字と新しい文字で先頭・末尾の共通部分を除き、変わった部分の前後はそのまま、変わった部分は装飾なしにする
export function remapSpans(oldLabel: string, newLabel: string, spans: LabelSpan[] | undefined): LabelSpan[] | undefined {
  if (!spans || spans.length === 0 || oldLabel === newLabel) return spans
  let prefix = 0
  const maxPrefix = Math.min(oldLabel.length, newLabel.length)
  while (prefix < maxPrefix && oldLabel[prefix] === newLabel[prefix]) prefix++
  let suffix = 0
  const maxSuffix = Math.min(oldLabel.length, newLabel.length) - prefix
  while (suffix < maxSuffix && oldLabel[oldLabel.length - 1 - suffix] === newLabel[newLabel.length - 1 - suffix]) suffix++

  const oldChars = toCharStyles(oldLabel.length, spans)
  const next: CharStyle[] = [
    ...oldChars.slice(0, prefix),
    // 挿入された文字は、直前の文字の装飾を引き継がない（意図しない太字・色の持ち越しを防ぐ）
    ...Array.from({ length: newLabel.length - prefix - suffix }, () => ({})),
    ...oldChars.slice(oldLabel.length - suffix),
  ]
  const result = fromCharStyles(next)
  return result.length > 0 ? result : undefined
}

// 範囲の太字・色（ツールバーで「いま選んでいる範囲がどの装飾か」を表示するため）
// 範囲の中で装飾が揃っていなければ、bold は null、color は null（＝混ざっている）にする
export function rangeStyle(label: string, spans: LabelSpan[] | undefined, start: number, end: number): { bold: boolean | null; color: string | undefined | null } {
  const range = toCharStyles(label.length, spans).slice(Math.max(0, start), Math.max(0, end))
  if (range.length === 0) return { bold: false, color: undefined }
  const first = range[0]
  return {
    bold: range.every((c) => !!c.bold === !!first.bold) ? !!first.bold : null,
    color: range.every((c) => c.color === first.color) ? first.color : null,
  }
}

// 範囲に太字を付ける。範囲がすべて太字なら外す
export function toggleBold(label: string, spans: LabelSpan[] | undefined, start: number, end: number): LabelSpan[] | undefined {
  const chars = toCharStyles(label.length, spans)
  const range = chars.slice(start, end)
  if (range.length === 0) return spans
  const allBold = range.every((c) => c.bold)
  for (let i = start; i < end; i++) {
    if (allBold) delete chars[i].bold
    else chars[i].bold = true
  }
  const result = fromCharStyles(chars)
  return result.length > 0 ? result : undefined
}

// 範囲の太字を、付ける／外すのどちらかに揃える（toggleBold と違い、現在の状態に関係なく指定どおりにする）
export function setBold(label: string, spans: LabelSpan[] | undefined, start: number, end: number, bold: boolean): LabelSpan[] | undefined {
  const chars = toCharStyles(label.length, spans)
  for (let i = Math.max(0, start); i < Math.min(end, chars.length); i++) {
    if (bold) chars[i].bold = true
    else delete chars[i].bold
  }
  const result = fromCharStyles(chars)
  return result.length > 0 ? result : undefined
}

// 範囲に色を付ける。color が undefined なら色を外す
export function setColor(label: string, spans: LabelSpan[] | undefined, start: number, end: number, color: string | undefined): LabelSpan[] | undefined {
  const safe = safeTextColor(color)
  const chars = toCharStyles(label.length, spans)
  if (end <= start) return spans
  for (let i = start; i < Math.min(end, chars.length); i++) {
    if (safe) chars[i].color = safe
    else delete chars[i].color
  }
  const result = fromCharStyles(chars)
  return result.length > 0 ? result : undefined
}

// 表示用：同じ装飾が続く文字ごとに区切る
export function toSegments(label: string, spans: LabelSpan[] | undefined): LabelSegment[] {
  if (!spans || spans.length === 0) return [{ text: label }]
  const chars = toCharStyles(label.length, spans)
  const segments: LabelSegment[] = []
  let i = 0
  while (i < label.length) {
    let j = i + 1
    while (j < label.length && sameStyle(chars[j], chars[i])) j++
    const seg: LabelSegment = { text: label.slice(i, j) }
    if (chars[i].bold) seg.bold = true
    if (chars[i].color) seg.color = chars[i].color
    segments.push(seg)
    i = j
  }
  return segments
}
