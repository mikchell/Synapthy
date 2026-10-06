import type { Edge, Node } from '@xyflow/react'
import type { AnyNodeData, MindmapNodeData } from '../../../types/mindmap'
import { toSegments } from '../utils/labelStyle'

// マインドマップを、階層をインデントした Markdown の箇条書きにする
// - つなぎ方（エッジ）をたどって階層を作り、同じ階層の順番は画面の上から下（同じ高さなら左から右）
// - メモは、そのノードの下に引用（> ）として入れる
// - 太字は ** で囲む（文字の色は Markdown で表せないので、捨てる）
// - 画像だけのノードは「（画像）」、自由配置の画像は末尾にまとめる

const EMPTY_LABEL = '（無題）'
const IMAGE_LABEL = '（画像）'

// Markdown の記号として解釈されないように、文字の前に \ を付ける
const escapeInline = (text: string) => text.replace(/([\\`*_[\]<>])/g, '\\$1')

// ** は文字の前後に空白があると効かないので、空白は外に出して囲む
const bold = (text: string) => {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!m || !m[2]) return text
  return `${m[1]}**${m[2]}**${m[3]}`
}

function labelToMarkdown(data: MindmapNodeData): string {
  // 改行は空白に置き換える（箇条書きの1行にするため。文字数は変わらないので、装飾の範囲もずれない）
  const label = (data.label ?? '').replace(/[\r\n]/g, ' ')
  if (!label.trim()) return data.image ? IMAGE_LABEL : EMPTY_LABEL

  const hasSpans = !!data.labelStyles && data.labelStyles.length > 0
  const text = toSegments(label, data.labelStyles)
    .map((seg) => {
      const escaped = escapeInline(seg.text)
      // 一部分の装飾があるときはそれを優先し、なければノード全体の太字に従う
      return (hasSpans ? seg.bold : data.bold) ? bold(escaped) : escaped
    })
    .join('')
  return text.trim()
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
    for (const line of memoLines(data.memo)) lines.push(`${indent}  > ${escapeInline(line)}`)
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
    lines.push('', '## 画像（自由に配置したもの）', '')
    for (let i = 0; i < imageNodes.length; i++) lines.push(`- ${IMAGE_LABEL}`)
  }

  return lines.join('\n') + '\n'
}
