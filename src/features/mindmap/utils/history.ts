import type { Edge, Node } from '@xyflow/react'
import { create } from 'zustand'
import { useMindmapStore } from '../store/mindmapStore'
import type { AnyNodeData } from '../../../types/mindmap'

// ボードの編集の「元に戻す／やり直す」
//
// ストアのノードと線の変化を見張り、内容が変わるたびに直前の状態を履歴に積む。
// 個々の操作（追加・削除・文字の変更など）に手を入れずに済むよう、変化の検出だけで実現している。
// - ドラッグ中や、追加直後の自動整列のような連続した変化は、落ち着いてから1回分にまとめる
// - 選択やサイズの計測など、編集ではない変化は履歴に入れない
// - 履歴はシートごと。シートを切り替えたら捨てる

const MAX_HISTORY = 100
// 変化が止まってから履歴に積むまでの待ち時間（連続した変化を1回分にまとめる）
const SETTLE_MS = 350
// 元に戻した直後は、復元にともなう自動整列などの変化を新しい編集として数えない
const SUPPRESS_AFTER_RESTORE_MS = 800

interface Snapshot {
  nodes: Node<AnyNodeData>[]
  edges: Edge[]
}

interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

// ボタンの有効・無効の表示用
export const useHistory = create<HistoryState>(() => ({ canUndo: false, canRedo: false }))

let past: Snapshot[] = []
let future: Snapshot[] = []
let current: Snapshot | null = null
let currentSignature = ''
let sheetId: string | null = null
let suppressUntil = 0
let timer: ReturnType<typeof setTimeout> | null = null
// 直前の編集で追加された、まだ文字が空のノード
// （追加してすぐ文字を入れる操作を、追加と合わせて1回分にまとめるために覚えておく）
let pendingEmptyNodeId: string | null = null

// 編集内容だけを取り出した文字列（これが変わったら「編集された」とみなす）
function signature(nodes: Node<AnyNodeData>[], edges: Edge[]): string {
  return JSON.stringify([
    nodes.map((n) => [
      n.id, n.type, Math.round(n.position.x), Math.round(n.position.y), n.data,
      n.width ?? null, n.height ?? null, n.style?.width ?? null, n.style?.height ?? null,
    ]),
    edges.map((e) => [e.id, e.source, e.target, e.data ?? null]),
  ])
}

function takeSnapshot(nodes: Node<AnyNodeData>[], edges: Edge[]): Snapshot {
  return {
    // 選択やドラッグ中の印は履歴に残さない
    nodes: nodes.map((n) => (n.selected || n.dragging ? { ...n, selected: false, dragging: false } : n)),
    edges,
  }
}

function syncFlags() {
  useHistory.setState({ canUndo: past.length > 0, canRedo: future.length > 0 })
}

// 履歴を捨てて、今の状態を起点にする（サーバーからシートを読み込んだ直後などに呼ぶ）
export function resetHistory() {
  const { nodes, edges, currentSheetId } = useMindmapStore.getState()
  past = []
  future = []
  current = takeSnapshot(nodes, edges)
  currentSignature = signature(nodes, edges)
  pendingEmptyNodeId = null
  sheetId = currentSheetId
  syncFlags()
}

// 今の状態を確認し、編集されていれば直前の状態を履歴に積む
function commit() {
  timer = null
  const { nodes, edges } = useMindmapStore.getState()
  // ドラッグの途中は積まず、離してからまとめて1回分にする
  if (nodes.some((n) => n.dragging)) {
    schedule()
    return
  }
  const sig = signature(nodes, edges)
  if (sig === currentSignature) return
  const snapshot = takeSnapshot(nodes, edges)
  const label = (n: Node<AnyNodeData> | undefined) => (n?.data as { label?: string } | undefined)?.label

  // 追加したばかりの空のノードに文字が入っただけなら、追加と同じ1回分として扱う（履歴に積まない）
  const filledNewNode =
    pendingEmptyNodeId !== null &&
    current !== null &&
    nodes.length === current.nodes.length &&
    !!label(nodes.find((n) => n.id === pendingEmptyNodeId))

  if (Date.now() >= suppressUntil && current && !filledNewNode) {
    past.push(current)
    if (past.length > MAX_HISTORY) past.shift()
    future = []
  }

  // 今回の編集で、文字が空のノードがちょうど1つ増えたか
  const previousIds = new Set(current?.nodes.map((n) => n.id))
  const added = nodes.filter((n) => !previousIds.has(n.id))
  pendingEmptyNodeId =
    added.length === 1 && added[0].type === 'mindmapNode' && !label(added[0]) ? added[0].id : null

  current = snapshot
  currentSignature = sig
  syncFlags()
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(commit, SETTLE_MS)
}

function restore(snapshot: Snapshot) {
  current = snapshot
  currentSignature = signature(snapshot.nodes, snapshot.edges)
  suppressUntil = Date.now() + SUPPRESS_AFTER_RESTORE_MS
  pendingEmptyNodeId = null
  useMindmapStore.setState({
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    selectedNodeId: null,
    editingNodeId: null,
  })
  syncFlags()
}

export function undo() {
  // まだ履歴に積んでいない直前の編集があれば、先に積んでから戻す
  if (timer) {
    clearTimeout(timer)
    commit()
  }
  const previous = past.pop()
  if (!previous || !current) return
  future.push(current)
  restore(previous)
}

export function redo() {
  if (timer) {
    clearTimeout(timer)
    commit()
  }
  const next = future.pop()
  if (!next || !current) return
  past.push(current)
  restore(next)
}

resetHistory()
useMindmapStore.subscribe((state, prev) => {
  if (state.currentSheetId !== sheetId) {
    if (timer) clearTimeout(timer)
    timer = null
    resetHistory()
    return
  }
  if (state.nodes !== prev.nodes || state.edges !== prev.edges) schedule()
})
