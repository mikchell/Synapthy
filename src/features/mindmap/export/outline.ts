import type { Edge, Node } from '@xyflow/react'
import type { AnyNodeData, MindmapNodeData } from '../../../types/mindmap'
import { toSegments } from '../utils/labelStyle'

// マインドマップを、階層をインデントした Markdown の箇条書きにする
// - つなぎ方（エッジ）をたどって階層を作り、同じ階層の順番は画面の上から下（同じ高さなら左から右）
// - メモは、そのノードの下に引用（> ）として入れる
// - 太字は ** で囲む（文字の色は Markdown で表せないので、捨てる）。** が効かない場所だけ <strong> を使う
// - 画像だけのノードは「（画像）」、自由配置の画像は末尾にまとめる
// 書き出した Markdown は、import/markdown.ts で読み戻せる。記号の扱いを変えるときは、あちらも合わせる

export const EMPTY_LABEL = '（無題）'
const IMAGE_LABEL = '（画像）'
export const IMAGE_SECTION_TITLE = '画像（自由に配置したもの）'

// Markdown の記号として解釈されないように、文字の前に \ を付ける
const escapeInline = (text: string) => text.replace(/([\\`*_[\]<>])/g, '\\$1')

// 行の頭にあると、箇条書きの中で見出し・箇条書き・番号付きリスト・コードブロックとして解釈される記号も、\ で避ける
// （> は escapeInline が避けている）
const escapeLineStart = (text: string) =>
  text.replace(/^(\s*)(?:([#+~-])|(\d+)([.)]))/, (_, space: string, mark?: string, digits?: string, delim?: string) =>
    mark ? `${space}\\${mark}` : `${space}${digits}\\${delim}`)

const isSpace = (c: string) => /\s/.test(c)
const isPunct = (c: string) => /[\p{P}\p{S}]/u.test(c)
const firstChar = (s: string) => Array.from(s)[0] ?? ''
const lastChar = (s: string) => Array.from(s.slice(-2)).at(-1) ?? ''

// ** は、文字の前後に空白があると効かない。空白は外に出して囲む
// 記号（「」や（）など）に接する側は、その外側が空白か記号でないと効かない（CommonMark の規則）ので、
// 効かないときは <strong> で囲む。before / after は、囲む文字の前と後ろに続く文字
const bold = (text: string, before: string, after: string) => {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!m || !m[2]) return text
  const prev = lastChar(before + m[1])
  const next = firstChar(m[3] + after)
  const opens = !isPunct(firstChar(m[2])) || prev === '' || isSpace(prev) || isPunct(prev)
  const closes = !isPunct(lastChar(m[2])) || next === '' || isSpace(next) || isPunct(next)
  const [open, close] = opens && closes ? ['**', '**'] : ['<strong>', '</strong>']
  return `${m[1]}${open}${m[2]}${close}${m[3]}`
}

function labelToMarkdown(data: MindmapNodeData): string {
  // 改行は空白に置き換える（箇条書きの1行にするため。文字数は変わらないので、装飾の範囲もずれない）
  const label = (data.label ?? '').replace(/[\r\n]/g, ' ')
  if (!label.trim()) return data.image ? IMAGE_LABEL : EMPTY_LABEL

  const hasSpans = !!data.labelStyles && data.labelStyles.length > 0
  // 太字かどうかが同じ範囲は、色が違っても1つにまとめる（** が続くのを避ける）
  const parts: { text: string; bold: boolean }[] = []
  for (const seg of toSegments(label, data.labelStyles)) {
    // 一部分の装飾があるときはそれを優先し、なければノード全体の太字に従う
    const isBold = !!(hasSpans ? seg.bold : data.bold)
    const text = escapeInline(seg.text)
    const last = parts[parts.length - 1]
    if (last && last.bold === isBold) last.text += text
    else parts.push({ text, bold: isBold })
  }
  let line = ''
  parts.forEach((part, i) => {
    line += part.bold ? bold(part.text, line, parts[i + 1]?.text ?? '') : part.text
  })
  return escapeLineStart(line.trim())
}

const memoLines = (memo: unknown): string[] =>
  typeof memo === 'string'
    ? memo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : []

export function buildMarkdownOutline(sheetName: string, nodes: Node<AnyNodeData>[], edges: Edge[]): string {
  const mindmapNodes = nodes.filter((n) => n.type === 'mindmapNode')
  const imageNodes = nodes.filter((n) => n.type === 'imageNode')
  const byId = new Map(mindmapNodes.map((n) => [n.id, n]))

  const byPosition = (a: Node<AnyNodeData>, b: Node<AnyNodeData>) =>
    a.position.y - b.position.y || a.position.x - b.position.x

  // 親 → 子の一覧と、親を持つノードの集合（マインドマップのノード同士のエッジだけ）
  const children = new Map<string, Node<AnyNodeData>[]>()
  const hasParent = new Set<string>()
  const seenEdge = new Set<string>()
  for (const e of edges) {
    const child = byId.get(e.target)
    if (!byId.has(e.source) || !child || e.source === e.target) continue
    const key = `${e.source}>${e.target}`
    if (seenEdge.has(key)) continue
    seenEdge.add(key)
    children.set(e.source, [...(children.get(e.source) ?? []), child])
    hasParent.add(e.target)
  }

  const lines: string[] = [`# ${escapeInline(sheetName.trim() || '無題のマップ')}`, '']
  const visited = new Set<string>()

  const walk = (node: Node<AnyNodeData>, depth: number) => {
    visited.add(node.id)
    const data = node.data as MindmapNodeData
    const indent = '  '.repeat(depth)
    lines.push(`${indent}- ${labelToMarkdown(data)}`)
    for (const line of memoLines(data.memo)) lines.push(`${indent}  > ${escapeLineStart(escapeInline(line))}`)
    // 親が複数あるノードは、最初に見つけた親の下にだけ出す（同じものを二重に出さない）
    for (const child of [...(children.get(node.id) ?? [])].sort(byPosition)) {
      if (!visited.has(child.id)) walk(child, depth + 1)
    }
  }

  // 親のいないノードが、階層の頭（中心テーマを先頭にする）
  const roots = mindmapNodes
    .filter((n) => !hasParent.has(n.id))
    .sort((a, b) => Number(!!(b.data as MindmapNodeData).isRoot) - Number(!!(a.data as MindmapNodeData).isRoot) || byPosition(a, b))
  for (const root of roots) walk(root, 0)
  // 輪になっていて、頭が見つからなかったノードも、取りこぼさない
  for (const n of [...mindmapNodes].sort(byPosition)) if (!visited.has(n.id)) walk(n, 0)

  if (imageNodes.length > 0) {
    lines.push('', `## ${IMAGE_SECTION_TITLE}`, '')
    for (let i = 0; i < imageNodes.length; i++) lines.push(`- ${IMAGE_LABEL}`)
  }

  return lines.join('\n') + '\n'
}
