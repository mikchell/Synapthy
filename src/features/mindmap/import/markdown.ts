import type { LabelSpan } from '../../../types/mindmap'
import { EMPTY_LABEL, IMAGE_SECTION_TITLE } from '../export/outline'

// export/outline.ts が書き出した Markdown（階層をインデントした箇条書き）を、ノードの木に読み戻す
// - 行頭の - * + が1つのノード。深さは行頭の空白の量で決める（2つでも4つでも、タブでもよい）
// - 行頭の > は、直前のノードのメモ。最初の # の見出しは、シート名
// - ** と <strong> で囲んだ文字は太字にする。\ で避けてある記号は、元に戻す
// - 自由配置の画像の節は読み飛ばす。それ以外の Markdown（番号付きリスト・表・見出しの階層など）は対象外
// - 入力は人が選んだファイルなので、大きさとノード数に上限を設ける（ブラウザが固まらないように）

export const IMPORT_LIMITS = {
  fileBytes: 1024 * 1024,
  nodes: 1000,
} as const

export interface OutlineItem {
  label: string
  // ラベル全体が太字（一部分だけのときは labelStyles）
  bold?: boolean
  labelStyles?: LabelSpan[]
  memo?: string
  children: OutlineItem[]
}

export interface Outline {
  // 先頭の # の見出し。なければ空
  title: string
  root: OutlineItem
}

// 画面に出してよい、取り込めない理由
export class ImportError extends Error {}

const HEADING = /^(#{1,6})\s+(.*)$/
const LIST_ITEM = /^(\s*)[-*+]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const ASCII_PUNCT = /[!-/:-@[-`{-~]/
const BOLD_CLOSE: Record<string, string> = { '**': '**', '<strong>': '</strong>' }
const MARKS = ['**', '<strong>', '</strong>']

// \ + 記号 → 記号（CommonMark の規則。書き出しが避けた記号を戻す）
const unescapeText = (text: string) => text.replace(/\\([!-/:-@[-`{-~])/g, '$1')

// 1行分の文字を、ラベルと太字の範囲に読み分ける
function parseLabel(raw: string): Pick<OutlineItem, 'label' | 'bold' | 'labelStyles'> {
  let label = ''
  const spans: LabelSpan[] = []
  let open: { start: number; mark: string } | null = null

  let i = 0
  while (i < raw.length) {
    if (raw[i] === '\\' && i + 1 < raw.length && ASCII_PUNCT.test(raw[i + 1])) {
      label += raw[i + 1]
      i += 2
      continue
    }
    const mark = MARKS.find((m) => raw.startsWith(m, i))
    if (mark && !open && mark !== '</strong>') {
      open = { start: label.length, mark }
      i += mark.length
      continue
    }
    if (mark && open && mark === BOLD_CLOSE[open.mark]) {
      // 空の範囲（** が続くだけ）は作らない。隣り合う範囲は1つにまとめる
      if (label.length > open.start) {
        const last = spans[spans.length - 1]
        if (last && last.end === open.start) last.end = label.length
        else spans.push({ start: open.start, end: label.length, bold: true })
      }
      open = null
      i += mark.length
      continue
    }
    // 対になる印のない ** などは、ただの文字として残す（印の後ろに範囲はまだ無いので、ずれない）
    label += raw[i]
    i++
  }
  if (open) label = label.slice(0, open.start) + open.mark + label.slice(open.start)

  if (spans.length === 1 && spans[0].start === 0 && spans[0].end === label.length) return { label, bold: true }
  return spans.length > 0 ? { label, labelStyles: spans } : { label }
}

export function parseMarkdownOutline(markdown: string): Outline {
  const topLevel: OutlineItem[] = []
  const stack: { indent: number; item: OutlineItem }[] = []
  let title = ''
  let last: OutlineItem | null = null
  let skipping = false
  let count = 0

  for (const line of markdown.replace(/^﻿/, '').split(/\r?\n/)) {
    const heading = HEADING.exec(line)
    if (heading) {
      const text = heading[2].trim()
      if (heading[1].length === 1 && !title) title = unescapeText(text)
      skipping = heading[1].length >= 2 && text === IMAGE_SECTION_TITLE
      last = null
      continue
    }
    if (skipping) continue

    const quote = QUOTE.exec(line)
    if (quote) {
      const text = unescapeText(quote[1].trim())
      if (last && text) last.memo = last.memo === undefined ? text : `${last.memo}\n${text}`
      continue
    }
    const itemLine = LIST_ITEM.exec(line)
    if (!itemLine) continue

    if (++count > IMPORT_LIMITS.nodes) {
      throw new ImportError(`ノードが多すぎて取り込めません（${IMPORT_LIMITS.nodes}個まで）`)
    }
    // 書き出しが、文字のないノードに入れた「（無題）」は、空に戻す
    const itemText = itemLine[2].trim()
    const item: OutlineItem = { ...parseLabel(itemText === EMPTY_LABEL ? '' : itemText), children: [] }
    // 行頭の空白の量が、自分より浅いか同じものを遡って、親を探す
    const indent = itemLine[1].replace(/\t/g, '    ').length
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
    ;(stack.length > 0 ? stack[stack.length - 1].item.children : topLevel).push(item)
    stack.push({ indent, item })
    last = item
  }

  if (topLevel.length === 0) {
    throw new ImportError('取り込める箇条書きが見つかりませんでした。Synapthy から書き出した Markdown を選んでください')
  }
  // 頭が複数あるときは、シート名の中心テーマの下にまとめる
  const root: OutlineItem = topLevel.length === 1 ? topLevel[0] : { label: title || '中心テーマ', children: topLevel }
  return { title, root }
}
