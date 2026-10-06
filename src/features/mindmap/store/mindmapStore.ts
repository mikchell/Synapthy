import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clampName, LIMITS } from '../../../lib/limits'
import { isSheetLoaded } from '../../../lib/sheetLoad'
import { randomTemplatePath } from '../../../lib/thumbnailTemplates'
import { safeLineColor } from '../edgeColor'
import { remapSpans, safeTextColor, setBold, setColor, type LabelSpan } from '../labelStyle'

export type NodeColor = 'purple' | 'blue' | 'cyan' | 'green' | 'pink' | 'orange'
export type MapType = 'linear' | 'free'
export type FreeDirection = 'right' | 'left' | 'bottom' | 'top' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'

export interface MindmapNodeData extends Record<string, unknown> {
  label: string
  color: NodeColor
  isRoot?: boolean
  depth?: number
  memo?: string
  borderWidth?: number
  sizeScale?: number
  borderRadius?: number
  isCircle?: boolean
  // 文字だけのノード（ロジックツリーの中心テーマ以外）に枠線を表示するか。未指定＝表示しない
  showBorder?: boolean
  // ノードに付けた画像（文字の上に表示する）。path はストレージ上の保存先、width/height は表示サイズ
  image?: NodeImage
  // 文字の太字・色。bold / textColor はノード全体、labelStyles は文字の一部分だけの装飾（こちらが優先）
  bold?: boolean
  textColor?: string
  labelStyles?: LabelSpan[]
}

export interface NodeImage {
  path: string
  width: number
  height: number
}

// クリップボードから貼り付けた画像ノード（マインドマップのツリー構造には属さない自由配置要素）
// 表示サイズはnode.style.width/heightで管理する（NodeResizeControlがそのまま更新できるようにするため）
export interface ImageNodeData extends Record<string, unknown> {
  path: string
  rotation?: number
}

export type AnyNodeData = MindmapNodeData | ImageNodeData

export interface Sheet {
  id: string
  name: string
  mapType?: MapType
  nodes: Node<AnyNodeData>[]
  edges: Edge[]
  // ノードの中身（nodes / edges）を読み込んでいるか。false のシートは中身が空で、DB に書き込んではいけない
  // （初回ロードでは、軽い項目だけを取得し、中身はシートを開くときに取得する）。未設定は読み込み済みとして扱う
  loaded?: boolean
  // ホームのカードに表示する画像のストレージ上のパス。未設定ならシートごとのパステルカラー
  thumbnailPath?: string | null
  // このシートの線の色（edgeColor.ts のパレットのいずれか）。未設定ならテーマの色
  lineColor?: string | null
  isStarred: boolean
  deletedAt: string | null
  lastOpenedAt: string
  updatedAt: string
  folderId: string | null
}

export interface Folder {
  id: string
  name: string
}

interface MindmapStore {
  sheets: Sheet[]
  folders: Folder[]
  currentSheetId: string
  currentView: 'home' | 'editor'
  nodes: Node<AnyNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  editingNodeId: string | null
  isSaving: boolean
  // localStorage に残るキャッシュの持ち主（ログイン中のユーザーID）。誰のものでもなければ null
  ownerId: string | null

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addChildNode: (parentId: string) => void
  addChildNodeInDirection: (parentId: string, direction: FreeDirection) => void
  addSiblingNode: (nodeId: string) => void
  addImageNode: (path: string, width: number, height: number, position: { x: number; y: number }) => void
  insertNodeBetween: (sourceId: string, targetId: string, edgeId: string, sourceHandle: string, targetHandle: string) => void
  tidyLayout: () => void
  reparentDroppedNode: (nodeId: string) => void
  autoTidyLogicTree: () => void
  updateNodeLabel: (id: string, label: string) => void
  // 文字と、文字の一部分の装飾（labelStyles）をまとめて更新する（編集の確定用）
  commitNodeLabel: (id: string, label: string, labelStyles: LabelSpan[] | undefined) => void
  // ノード全体の太字・色。undefined を渡した項目は解除する
  // clear を指定すると、文字の一部分だけの装飾（labelStyles）の太字／色も解除して、全体の設定が見た目に効くようにする
  updateNodeTextStyle: (id: string, style: { bold?: boolean; textColor?: string }, clear?: { bold?: boolean; color?: boolean }) => void
  updateNodeColor: (id: string, color: NodeColor) => void
  updateNodeMemo: (id: string, memo: string) => void
  setNodeImage: (id: string, image: NodeImage | null) => void
  updateNodeBorderWidth: (id: string, borderWidth: number) => void
  updateNodeBorderRadius: (id: string, borderRadius: number) => void
  updateNodeIsCircle: (id: string, isCircle: boolean) => void
  updateNodeShowBorder: (id: string, showBorder: boolean) => void
  updateNodeSize: (id: string, width: number, height: number) => void
  updateNodeSizeScale: (id: string, sizeScale: number) => void
  updateNodeRotation: (id: string, rotation: number) => void
  deleteNode: (id: string) => void
  setSelectedNodeId: (id: string | null) => void
  setEditingNodeId: (id: string | null) => void
  setIsSaving: (v: boolean) => void
  resetMindmap: () => void
  // キャッシュの持ち主をログイン中のユーザーに合わせる。持ち主が変わるときは、前の持ち主のデータを捨てて初期状態に戻す（戻したら true）
  claimOwnership: (userId: string | null) => boolean

  setCurrentView: (view: 'home' | 'editor') => void
  // 上限（ごみ箱のシートも数える）に達していて作れなかったときだけ false を返す
  addSheet: () => boolean
  moveSheetToTrash: (id: string) => void
  restoreSheetFromTrash: (id: string) => void
  permanentlyDeleteSheet: (id: string) => void
  toggleSheetStar: (id: string) => void
  touchSheetUpdatedAt: (id: string) => void
  renameSheet: (id: string, name: string) => void
  setSheetThumbnail: (id: string, path: string | null) => void
  setSheetLineColor: (id: string, color: string | null) => void
  switchSheet: (id: string) => void
  loadSheets: (sheets: Sheet[]) => void
  // 読み込んでいなかったシートに、取得したノードの中身を入れる。すでに読み込み済みのシートには何もしない
  markSheetLoaded: (id: string, nodes: Node<AnyNodeData>[], edges: Edge[]) => void
  moveSheetToFolder: (sheetId: string, folderId: string | null) => void
  // 上限に達していて作れなかったときだけ false を返す（名前が空のときは何もせず true）
  createFolder: (name: string) => boolean
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  loadFolders: (folders: Folder[]) => void
}

const makeInitialNodes = (): Node<MindmapNodeData>[] => [
  {
    id: 'root',
    type: 'mindmapNode',
    position: { x: 0, y: 0 },
    data: { label: '中心テーマ', color: 'purple', isRoot: true, depth: 0 },
  },
]

let nodeIdCounter = 1
const generateId = () => `node-${Date.now()}-${nodeIdCounter++}`
const generateSheetId = () => crypto.randomUUID()

const COLORS: NodeColor[] = ['purple', 'blue', 'cyan', 'green', 'pink', 'orange']

// ロジックツリーのノードサイズ（小・中・大）。data.sizeScale に倍率として保存する
export const NODE_SIZE_STEPS = [
  { label: '小', scale: 0.8 },
  { label: '中', scale: 1 },
  { label: '大', scale: 1.3 },
] as const

const NODE_W = 240
const NODE_H = 80
const PADDING = 16

function overlaps(
  pos: { x: number; y: number },
  node: Node<AnyNodeData>
): boolean {
  return (
    Math.abs(pos.x - node.position.x) < NODE_W + PADDING &&
    Math.abs(pos.y - node.position.y) < NODE_H + PADDING
  )
}

// 新しいノードは希望位置にそのまま置き、そこに既存ノードが被っていたら
// 既存ノード（とその子孫全体）を奥へ押し出して道を空ける（新ノードが遠くへ飛んでいかないようにする）
function resolveCollisions(
  proposed: { x: number; y: number },
  nodes: Node<AnyNodeData>[],
  edges: Edge[],
  shift: 'y' | 'x',
  shiftSign: 1 | -1 = 1
): Map<string, { x: number; y: number }> {
  const shifted = new Map<string, { x: number; y: number }>()

  const getDescendants = (nodeId: string): string[] => {
    const children = edges.filter((e) => e.source === nodeId).map((e) => e.target)
    return children.flatMap((c) => [c, ...getDescendants(c)])
  }

  let checkPos = proposed
  for (let i = 0; i < 50; i++) {
    const hit = nodes.find((n) => !shifted.has(n.id) && overlaps(checkPos, n))
    if (!hit) break
    const newPos =
      shift === 'y'
        ? { x: hit.position.x, y: shiftSign > 0 ? checkPos.y + NODE_H + PADDING : checkPos.y - NODE_H - PADDING }
        : { x: shiftSign > 0 ? checkPos.x + NODE_W + PADDING : checkPos.x - NODE_W - PADDING, y: hit.position.y }
    const dx = newPos.x - hit.position.x
    const dy = newPos.y - hit.position.y
    shifted.set(hit.id, newPos)

    // 押し出したノードにぶら下がる子孫も同じ分だけ一緒に動かす
    for (const descId of getDescendants(hit.id)) {
      if (shifted.has(descId)) continue
      const desc = nodes.find((n) => n.id === descId)
      if (!desc) continue
      shifted.set(descId, { x: desc.position.x + dx, y: desc.position.y + dy })
    }

    checkPos = newPos
  }
  return shifted
}

function applyShifted(
  nodes: Node<AnyNodeData>[],
  shifted: Map<string, { x: number; y: number }>
): Node<AnyNodeData>[] {
  if (shifted.size === 0) return nodes
  return nodes.map((n) => (shifted.has(n.id) ? { ...n, position: shifted.get(n.id)! } : n))
}

// フリーモードは全方向とも中心ハンドルを使用（エッジがノード中心から動的に接続点を計算）
const DIRECTION_CONFIG: Record<FreeDirection, {
  dx: number; dy: number; shift: 'x' | 'y'; shiftSign: 1 | -1
}> = {
  'right':        { dx: +1, dy:  0, shift: 'y', shiftSign:  1 },
  'left':         { dx: -1, dy:  0, shift: 'y', shiftSign:  1 },
  'bottom':       { dx:  0, dy: +1, shift: 'x', shiftSign:  1 },
  'top':          { dx:  0, dy: -1, shift: 'x', shiftSign:  1 },
  'top-right':    { dx: +1, dy: -1, shift: 'y', shiftSign: -1 },
  'bottom-right': { dx: +1, dy: +1, shift: 'y', shiftSign:  1 },
  'bottom-left':  { dx: -1, dy: +1, shift: 'y', shiftSign:  1 },
  'top-left':     { dx: -1, dy: -1, shift: 'y', shiftSign: -1 },
}

// フリー展開：ノード同士の最小のすき間
const FREE_GAP = 28
// フリー展開の新規ノードのおおよその大きさ（描画前でまだ計測できないため。楕円のノードは縦にも大きい）
const FREE_NEW_NODE_SIZE = { w: 170, h: 140 }

// ノードの実際の大きさ（計測前は種類ごとのおおよその値）
function freeNodeSize(n: Node<AnyNodeData>) {
  const isRoot = n.type === 'mindmapNode' && (n.data as MindmapNodeData).isRoot
  return {
    w: n.measured?.width ?? n.width ?? (isRoot ? 220 : FREE_NEW_NODE_SIZE.w),
    h: n.measured?.height ?? n.height ?? (isRoot ? 180 : FREE_NEW_NODE_SIZE.h),
  }
}

// 中心 (cx, cy)・大きさ size のノードが、既存のどれかのノードとすき間込みで重なるか
function overlapsAnyNode(cx: number, cy: number, size: { w: number; h: number }, nodes: Node<AnyNodeData>[]) {
  return nodes.some((n) => {
    const s = freeNodeSize(n)
    const ncx = n.position.x + s.w / 2
    const ncy = n.position.y + s.h / 2
    return (
      Math.abs(cx - ncx) < (size.w + s.w) / 2 + FREE_GAP &&
      Math.abs(cy - ncy) < (size.h + s.h) / 2 + FREE_GAP
    )
  })
}


const createInitialSheet = (): Sheet => ({
  id: crypto.randomUUID(),
  name: 'シート1',
  mapType: 'linear',
  nodes: makeInitialNodes(),
  edges: [],
  isStarred: false,
  deletedAt: null,
  lastOpenedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  folderId: null,
})

const initialSheet = createInitialSheet()

// localStorageに残った旧バージョンのシート（is_starred等の新フィールド追加前）を補完する。
// 未補完のままだと updatedAt などが undefined になり、ホーム画面表示時にクラッシュする。
function normalizeSheet(s: Sheet): Sheet {
  const now = new Date().toISOString()
  return {
    ...s,
    mapType: s.mapType ?? 'linear',
    isStarred: s.isStarred ?? false,
    deletedAt: s.deletedAt ?? null,
    lastOpenedAt: s.lastOpenedAt ?? now,
    updatedAt: s.updatedAt ?? now,
    folderId: s.folderId ?? null,
  }
}

export const useMindmapStore = create<MindmapStore>()(
  persist(
    (set, get) => ({
      sheets: [initialSheet],
      folders: [],
      currentSheetId: initialSheet.id,
      currentView: 'home',
      nodes: initialSheet.nodes,
      edges: initialSheet.edges,
      selectedNodeId: null,
      editingNodeId: null,
      isSaving: false,
      ownerId: null,

      onNodesChange: (changes) => {
        // 中心テーマ（ルート）は削除できない（ツリー全体と自動整列の起点のため）。削除の変更は取り除く
        const currentNodes = get().nodes
        const isRootNode = (id: string) => id === 'root' || !!currentNodes.find((n) => n.id === id)?.data.isRoot
        const allowed = changes.filter((c) => !(c.type === 'remove' && isRootNode(c.id)))
        set({ nodes: applyNodeChanges(allowed, currentNodes) as Node<MindmapNodeData>[] })

        // ロジックツリー：文字の確定やサイズ段階の変更でノードの実際の大きさが変わったら整列し直す
        // （初回の計測＝シートを開いた直後は、既存の配置を勝手に動かさないよう対象外）
        const sizeChanged = changes.some((c) => {
          if (c.type !== 'dimensions' || !c.dimensions) return false
          const prev = currentNodes.find((n) => n.id === c.id)
          if (prev?.type !== 'mindmapNode' || !prev.measured?.width || !prev.measured?.height) return false
          return (
            Math.abs(prev.measured.width - c.dimensions.width) > 0.5 ||
            Math.abs(prev.measured.height - c.dimensions.height) > 0.5
          )
        })
        if (sizeChanged) get().autoTidyLogicTree()
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) })
      },

      onConnect: (connection) => {
        const edge: Edge = {
          ...connection,
          id: `edge-${connection.source}-${connection.target}`,
          type: 'interactive',
          animated: false,
          style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
        }
        set({ edges: addEdge(edge, get().edges) })
      },

      addChildNode: (parentId) => {
        const { nodes, edges } = get()
        const parent = nodes.find((n) => n.id === parentId) as Node<MindmapNodeData> | undefined
        if (!parent) return

        const existingChildren = edges
          .filter((e) => e.source === parentId && e.sourceHandle === 'right')
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter((n): n is Node<MindmapNodeData> => !!n)
          .sort((a, b) => a.position.y - b.position.y)

        const baseY =
          existingChildren.length === 0
            ? parent.position.y
            : existingChildren[existingChildren.length - 1].position.y + NODE_H + PADDING

        const colorIndex = nodes.length % COLORS.length
        const nodeColor = COLORS[colorIndex]
        const newId = generateId()
        const parentDepth = parent.data.depth ?? 0

        // x は親の右側固定。被る既存ノードがあれば新ノードではなくそちらを奥へ押し出す
        const position = { x: parent.position.x + NODE_W + PADDING, y: baseY }
        const shifted = resolveCollisions(position, nodes, edges, 'y')

        const newNode: Node<MindmapNodeData> = {
          id: newId,
          type: 'mindmapNode',
          position,
          data: { label: '', color: nodeColor, depth: parentDepth + 1 },
        }

        const newEdge: Edge = {
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'interactive',
          style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
        }

        set({
          nodes: [...applyShifted(nodes, shifted), newNode],
          edges: [...edges, newEdge],
          selectedNodeId: newId,
          editingNodeId: newId,
        })
        get().autoTidyLogicTree()
      },

      addChildNodeInDirection: (parentId, direction) => {
        const { nodes, edges } = get()
        const parent = nodes.find((n) => n.id === parentId) as Node<MindmapNodeData> | undefined
        if (!parent) return

        const { dx, dy, shift, shiftSign } = DIRECTION_CONFIG[direction]

        // 方向はエッジの data.direction で管理（中心ハンドル共通のため）
        const siblings = edges
          .filter((e) => e.source === parentId && (e.data as { direction?: FreeDirection })?.direction === direction)
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter((n): n is Node<MindmapNodeData> => !!n)

        // 実際のノードの大きさを使って配置する（固定値だと縦に大きい楕円ノードが上下で重なる）
        const newSize = FREE_NEW_NODE_SIZE
        const center = (n: Node<AnyNodeData>) => {
          const sz = freeNodeSize(n)
          return { x: n.position.x + sz.w / 2, y: n.position.y + sz.h / 2, ...sz }
        }
        const p = center(parent)

        let cx: number
        let cy: number
        if (siblings.length === 0) {
          // 最初の子：親の縁から、すき間をあけて指定方向に置く
          cx = p.x + dx * (p.w / 2 + FREE_GAP * 2 + newSize.w / 2)
          cy = p.y + dy * (p.h / 2 + FREE_GAP * 2 + newSize.h / 2)
        } else {
          // 2つ目以降：同じ方向の兄弟の列の端に並べる
          const key = shift
          const edgeSibling = siblings.reduce((acc, n) =>
            shiftSign * (center(n)[key] - center(acc)[key]) > 0 ? n : acc
          )
          const e = center(edgeSibling)
          if (shift === 'y') {
            cx = e.x
            cy = e.y + shiftSign * (e.h / 2 + FREE_GAP + newSize.h / 2)
          } else {
            cx = e.x + shiftSign * (e.w / 2 + FREE_GAP + newSize.w / 2)
            cy = e.y
          }
        }

        // それでも既存のノードと重なるなら、空いている位置が見つかるまで兄弟を並べる向きにずらす
        const step = (shift === 'y' ? newSize.h : newSize.w) + FREE_GAP
        for (let i = 0; i < 60 && overlapsAnyNode(cx, cy, newSize, nodes); i++) {
          if (shift === 'y') cy += shiftSign * step / 4
          else cx += shiftSign * step / 4
        }

        const position = { x: cx - newSize.w / 2, y: cy - newSize.h / 2 }
        const colorIndex = nodes.length % COLORS.length
        const nodeColor = COLORS[colorIndex]
        const newId = generateId()

        const newNode: Node<MindmapNodeData> = {
          id: newId,
          type: 'mindmapNode',
          position,
          data: { label: '', color: nodeColor, depth: (parent.data.depth ?? 0) + 1 },
        }

        const newEdge: Edge = {
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          sourceHandle: 'free-src',
          targetHandle: 'free-tgt',
          type: 'interactive',
          data: { direction },
          style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
        }

        set({
          nodes: [...nodes, newNode],
          edges: [...edges, newEdge],
          selectedNodeId: newId,
          editingNodeId: newId,
        })
      },

      addSiblingNode: (nodeId) => {
        const { nodes, edges } = get()
        // ルートノードは兄弟を持てない
        const parentEdge = edges.find((e) => e.target === nodeId)
        if (!parentEdge) return

        const parentId = parentEdge.source
        const parent = nodes.find((n) => n.id === parentId) as Node<MindmapNodeData> | undefined
        const currentNode = nodes.find((n) => n.id === nodeId) as Node<MindmapNodeData> | undefined
        if (!parent || !currentNode) return

        const colorIndex = nodes.length % COLORS.length
        const nodeColor = COLORS[colorIndex]
        const newId = generateId()
        const parentDepth = parent.data.depth ?? 0

        // x は現在ノードと同じ（同世代）。被る既存ノードがあれば新ノードではなくそちらを奥へ押し出す
        const position = { x: currentNode.position.x, y: currentNode.position.y + NODE_H + PADDING }
        const shifted = resolveCollisions(position, nodes, edges, 'y')

        const newNode: Node<MindmapNodeData> = {
          id: newId,
          type: 'mindmapNode',
          position,
          data: { label: '', color: nodeColor, depth: parentDepth + 1 },
        }

        const newEdge: Edge = {
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'interactive',
          style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
        }

        // 整列時に現在ノードのすぐ下へ並ぶよう、現在ノードへのエッジの直後に挿入する
        const insertAt = edges.indexOf(parentEdge) + 1
        set({
          nodes: [...applyShifted(nodes, shifted), newNode],
          edges: [...edges.slice(0, insertAt), newEdge, ...edges.slice(insertAt)],
          selectedNodeId: newId,
          editingNodeId: newId,
        })
        get().autoTidyLogicTree()
      },

      // クリップボードから貼り付けた画像を、マインドマップのツリーとは無関係な自由配置ノードとして追加
      addImageNode: (path, width, height, position) => {
        const newNode: Node<ImageNodeData> = {
          id: generateId(),
          type: 'imageNode',
          position,
          style: { width, height },
          data: { path },
        }
        set({ nodes: [...get().nodes, newNode], selectedNodeId: newNode.id })
      },

      insertNodeBetween: (sourceId, targetId, edgeId, _sourceHandle, _targetHandle) => {
        const { nodes, edges } = get()
        const source = nodes.find((n) => n.id === sourceId) as Node<MindmapNodeData> | undefined
        const target = nodes.find((n) => n.id === targetId)
        if (!source || !target) return

        const newId = generateId()
        const colorIndex = nodes.length % COLORS.length
        const nodeColor = COLORS[colorIndex]

        // ターゲットとその子孫をH_STEP分右にシフトしてスペースを確保
        const getDescendants = (nodeId: string): string[] => {
          const children = edges.filter((e) => e.source === nodeId).map((e) => e.target)
          return [nodeId, ...children.flatMap(getDescendants)]
        }
        const toShift = new Set(getDescendants(targetId))

        const newNode: Node<MindmapNodeData> = {
          id: newId,
          type: 'mindmapNode',
          position: {
            x: target.position.x,
            y: target.position.y,
          },
          data: {
            label: '',
            color: nodeColor,
            depth: (source.data.depth ?? 0) + 1,
          },
        }

        const shiftedNodes = nodes.map((n) =>
          toShift.has(n.id)
            ? { ...n, position: { ...n.position, x: n.position.x + NODE_W + PADDING } }
            : n
        )

        const isFree = get().sheets.find((s) => s.id === get().currentSheetId)?.mapType === 'free'
        const edgeStyle = { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 }
        const [edgeToNew, edgeToTarget]: Edge[] = [
          {
            id: `edge-${sourceId}-${newId}`,
            source: sourceId,
            target: newId,
            sourceHandle: isFree ? 'free-src' : 'right',
            targetHandle: isFree ? 'free-tgt' : 'left',
            type: 'interactive',
            style: edgeStyle,
          },
          {
            id: `edge-${newId}-${targetId}`,
            source: newId,
            target: targetId,
            sourceHandle: isFree ? 'free-src' : 'right',
            targetHandle: isFree ? 'free-tgt' : 'left',
            type: 'interactive',
            style: edgeStyle,
          },
        ]

        // 元のエッジの位置に置き換えて、整列時の兄弟の並び順を保つ
        set({
          nodes: [...shiftedNodes, newNode],
          edges: [...edges.map((e) => (e.id === edgeId ? edgeToNew : e)), edgeToTarget],
          selectedNodeId: newId,
          editingNodeId: newId,
        })
        get().autoTidyLogicTree()
      },

      // ロジックツリー：ドラッグして離したノードが別のノードに重なっていればその子に付け替え、
      // どちらの場合もツリー全体を自動整列する（＝ノードを自由な位置には置けない）
      reparentDroppedNode: (nodeId) => {
        const { nodes, edges, sheets, currentSheetId } = get()
        if (sheets.find((s) => s.id === currentSheetId)?.mapType === 'free') return

        const dragged = nodes.find((n) => n.id === nodeId)
        if (!dragged || dragged.type !== 'mindmapNode') return

        const descendantsOf = (id: string): string[] =>
          edges.filter((e) => e.source === id).flatMap((e) => [e.target, ...descendantsOf(e.target)])
        const excluded = new Set([nodeId, ...descendantsOf(nodeId)])
        const oldParentId = edges.find((e) => e.target === nodeId)?.source

        // ドラッグしたノードの中心が重なっているノードを新しい親にする（自分と子孫は除く）
        const size = (n: Node<AnyNodeData>) => ({
          w: n.measured?.width ?? NODE_W,
          h: n.measured?.height ?? NODE_H,
        })
        const cx = dragged.position.x + size(dragged).w / 2
        const cy = dragged.position.y + size(dragged).h / 2
        const newParent = nodeId === 'root' ? undefined : nodes.find((n) => {
          if (n.type !== 'mindmapNode' || excluded.has(n.id)) return false
          const { w, h } = size(n)
          return cx >= n.position.x && cx <= n.position.x + w && cy >= n.position.y && cy <= n.position.y + h
        })

        if (newParent && newParent.id !== oldParentId) {
          const newEdge: Edge = {
            id: `edge-${newParent.id}-${nodeId}`,
            source: newParent.id,
            target: nodeId,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'interactive',
            style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
          }
          // 付け替えたノードとその子孫の depth を新しい親に合わせる
          const depthDelta =
            ((newParent.data as MindmapNodeData).depth ?? 0) + 1 - ((dragged.data as MindmapNodeData).depth ?? 0)
          set({
            edges: [...edges.filter((e) => e.target !== nodeId), newEdge],
            nodes: nodes.map((n) => {
              if (!excluded.has(n.id)) return n
              const data = n.data as MindmapNodeData
              return { ...n, data: { ...data, depth: (data.depth ?? 0) + depthDelta } }
            }),
          })
        }

        get().autoTidyLogicTree()
      },

      // ロジックツリーのときだけ自動整列する（ノードの追加・削除・付け替え・サイズ変更の後に呼ぶ）
      autoTidyLogicTree: () => {
        const { sheets, currentSheetId } = get()
        if (sheets.find((s) => s.id === currentSheetId)?.mapType === 'free') return
        get().tidyLayout()
      },

      tidyLayout: () => {
        const { nodes, edges } = get()
        const isMobile = window.innerWidth < 768

        // 計測前のノードのおおよその大きさ
        // （中心テーマは箱、それ以外は文字だけのノードなので小さい）
        const DEFAULT_ROOT = { w: isMobile ? 150 : 200, h: isMobile ? 60 : 80 }
        const DEFAULT_TEXT = { w: 90, h: 34 }
        const V_GAP = isMobile ? 14 : 18   // ノード間の縦の隙間
        const H_GAP = isMobile ? 64 : 120  // 親右端〜子左端の横の隙間（途中に分岐点の丸が入る）

        // 実際のサイズを取得（リサイズ済みならそのサイズ、未設定はデフォルト）
        const nodeSize = (id: string) => {
          const n = nodes.find((nd) => nd.id === id)
          const fallback = (n?.data as MindmapNodeData | undefined)?.isRoot ? DEFAULT_ROOT : DEFAULT_TEXT
          return {
            w: n?.width ?? n?.measured?.width ?? fallback.w,
            h: n?.height ?? n?.measured?.height ?? fallback.h,
          }
        }

        const childrenOf = (id: string) =>
          edges.filter((e) => e.source === id).map((e) => e.target as string)

        // サブツリーが占める縦幅（ノード自身 or 子の合計、大きい方）
        const subtreeHeight = (id: string): number => {
          const children = childrenOf(id)
          const { h } = nodeSize(id)
          if (children.length === 0) return h
          const childTotal = children.reduce((s, c) => s + subtreeHeight(c), 0) + (children.length - 1) * V_GAP
          return Math.max(h, childTotal)
        }

        const positions: Record<string, { x: number; y: number }> = {}

        // centerY: このサブツリーの中心Y、x: このノードの左端X
        const layout = (id: string, centerY: number, x: number) => {
          const { w, h } = nodeSize(id)
          positions[id] = { x, y: centerY - h / 2 }   // top-left基準
          const children = childrenOf(id)
          const totalH = children.reduce((s, c) => s + subtreeHeight(c), 0) + (children.length - 1) * V_GAP
          let curY = centerY - totalH / 2
          for (const c of children) {
            const ch = subtreeHeight(c)
            layout(c, curY + ch / 2, x + w + H_GAP)
            curY += ch + V_GAP
          }
        }

        layout('root', 0, 0)

        const repositioned = nodes.map((n) =>
          positions[n.id] ? { ...n, position: positions[n.id] } : n
        )
        repositioned.sort(
          (a, b) => ((a.data as MindmapNodeData).depth ?? 0) - ((b.data as MindmapNodeData).depth ?? 0)
        )

        const normalizedEdges = edges.map((e) =>
          e.sourceHandle === 'bottom'
            ? { ...e, sourceHandle: 'right', targetHandle: 'left' }
            : e
        )

        set({ nodes: repositioned, edges: normalizedEdges })
      },

      updateNodeLabel: (id, label) => {
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== id) return n
            const data = n.data as MindmapNodeData
            // 文字が変わったら、文字の一部分の装飾も新しい文字に合わせてずらす
            const labelStyles = remapSpans(data.label, label, data.labelStyles)
            const next: MindmapNodeData = { ...data, label }
            if (labelStyles) next.labelStyles = labelStyles
            else delete next.labelStyles
            return { ...n, data: next }
          }),
        })
      },

      commitNodeLabel: (id, label, labelStyles) => {
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== id) return n
            const next: MindmapNodeData = { ...(n.data as MindmapNodeData), label }
            if (labelStyles && labelStyles.length > 0) next.labelStyles = labelStyles
            else delete next.labelStyles
            return { ...n, data: next }
          }),
        })
      },

      updateNodeTextStyle: (id, style, clear) => {
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== id || n.type !== 'mindmapNode') return n
            const next: MindmapNodeData = { ...(n.data as MindmapNodeData) }
            if (style.bold) next.bold = true
            else delete next.bold
            const color = safeTextColor(style.textColor)
            if (color) next.textColor = color
            else delete next.textColor
            if (clear && next.labelStyles) {
              let spans: LabelSpan[] | undefined = next.labelStyles
              if (clear.bold) spans = setBold(next.label, spans, 0, next.label.length, false)
              if (clear.color) spans = setColor(next.label, spans, 0, next.label.length, undefined)
              if (spans) next.labelStyles = spans
              else delete next.labelStyles
            }
            return { ...n, data: next }
          }),
        })
      },

      updateNodeColor: (id, color) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, color } } : n
          ),
        })
      },

      // ノードに画像を付ける／外す（null で外す）。ストレージ上のファイルの削除は呼び出し側で行う
      setNodeImage: (id, image) => {
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== id || n.type !== 'mindmapNode') return n
            const data = { ...(n.data as MindmapNodeData) }
            if (image) data.image = image
            else delete data.image
            return { ...n, data }
          }),
        })
      },

      updateNodeMemo: (id, memo) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, memo } } : n
          ),
        })
      },

      updateNodeBorderWidth: (id, borderWidth) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, borderWidth } } : n
          ),
        })
      },

      updateNodeBorderRadius: (id, borderRadius) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, borderRadius } } : n
          ),
        })
      },

      updateNodeShowBorder: (id, showBorder) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, showBorder } } : n
          ),
        })
      },

      updateNodeIsCircle: (id, isCircle) => {
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== id) return n
            if (isCircle) {
              // ノードを正方形にする：現在の幅を基準に高さを揃える
              const size = n.style?.width ?? n.measured?.width ?? 120
              return {
                ...n,
                style: { ...n.style, width: size, height: size },
                data: { ...n.data, isCircle: true, borderRadius: 9999 },
              }
            } else {
              const style = { ...(n.style ?? {}) }
              delete style.height
              return {
                ...n,
                style,
                data: { ...n.data, isCircle: false },
              }
            }
          }),
        })
      },

      updateNodeSize: (id, width, height) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, style: { ...n.style, width, height } } : n
          ),
        })
      },

      updateNodeRotation: (id, rotation) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, rotation } } : n
          ),
        })
      },

      // ロジックツリーのサイズ段階（小・中・大）を変更する
      // 以前に四隅のリサイズで設定された固定サイズが残っていると段階が効かないので消す
      updateNodeSizeScale: (id, sizeScale) => {
        set({
          nodes: get().nodes.map((n) => {
            if (n.id !== id) return n
            const rest = { ...n.style }
            delete rest.width
            delete rest.height
            return { ...n, width: undefined, height: undefined, style: rest, data: { ...n.data, sizeScale } }
          }),
        })
      },

      deleteNode: (id) => {
        const { nodes, edges } = get()
        const targetNode = nodes.find((n) => n.id === id)
        // 中心テーマ（ルート）は削除できない（シートも消さない）
        if (id === 'root' || targetNode?.data.isRoot) return
        const parentEdge = edges.find((e) => e.target === id)
        const childEdges = edges.filter((e) => e.source === id)

        // 親と子の両方がある場合：再接続して子を左にシフト
        if (parentEdge && childEdges.length > 0) {
          const getDescendants = (nodeId: string): string[] => {
            const children = edges.filter((e) => e.source === nodeId).map((e) => e.target)
            return [nodeId, ...children.flatMap(getDescendants)]
          }
          const toShift = new Set(childEdges.flatMap((e) => getDescendants(e.target)))

          const reconnected = childEdges.map((childEdge) => ({
            ...childEdge,
            id: `edge-${parentEdge.source}-${childEdge.target}`,
            source: parentEdge.source,
            sourceHandle: parentEdge.sourceHandle ?? 'right',
          }))

          set({
            nodes: nodes
              .filter((n) => n.id !== id)
              .map((n) =>
                toShift.has(n.id)
                  ? { ...n, position: { ...n.position, x: n.position.x - (NODE_W + PADDING) } }
                  : n
              ),
            // 削除したノードへのエッジの位置に差し込み、整列時の兄弟の並び順を保つ
            edges: edges.flatMap((e) => {
              if (e.id === parentEdge.id) return reconnected
              return e.source === id || e.target === id ? [] : [e]
            }),
            selectedNodeId: null,
          })
          get().autoTidyLogicTree()
          return
        }

        set({
          nodes: nodes.filter((n) => n.id !== id),
          edges: edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: null,
        })
        get().autoTidyLogicTree()
      },

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      setEditingNodeId: (id) => set({ editingNodeId: id }),

      setIsSaving: (v) => set({ isSaving: v }),

      resetMindmap: () => {
        const fresh = makeInitialNodes()
        set({ nodes: fresh, edges: [], selectedNodeId: null })
      },

      claimOwnership: (userId) => {
        if (get().ownerId === userId) return false
        // 共有端末で、前の人のマインドマップが次の人のアカウントに保存されないよう、持ち主が変わるときは必ず捨てる
        // （持ち主が不明な、この仕組みの導入前のキャッシュも同じ扱い。ログイン中なら、続けてサーバーから読み込み直す）
        const fresh = createInitialSheet()
        set({
          ownerId: userId,
          sheets: [fresh],
          folders: [],
          currentSheetId: fresh.id,
          currentView: 'home',
          nodes: fresh.nodes,
          edges: fresh.edges,
          selectedNodeId: null,
          editingNodeId: null,
          isSaving: false,
        })
        return true
      },

      setCurrentView: (view) => set({ currentView: view }),

      addSheet: () => {
        const { sheets, currentSheetId, nodes, edges } = get()
        if (sheets.length >= LIMITS.sheets) return false
        const updatedSheets = sheets.map((s) =>
          s.id === currentSheetId ? { ...s, nodes, edges } : s
        )
        const initialNodes = makeInitialNodes()
        const now = new Date().toISOString()
        const activeCount = updatedSheets.filter((s) => !s.deletedAt).length
        const newSheet: Sheet = {
          id: generateSheetId(),
          name: `シート${activeCount + 1}`,
          mapType: 'linear',
          nodes: initialNodes,
          edges: [],
          // 新規作成したシートのサムネイルは、用意したテンプレートからランダムに設定する
          thumbnailPath: randomTemplatePath(),
          isStarred: false,
          deletedAt: null,
          lastOpenedAt: now,
          updatedAt: now,
          folderId: null,
        }
        set({
          sheets: [...updatedSheets, newSheet],
          currentSheetId: newSheet.id,
          currentView: 'editor',
          nodes: newSheet.nodes,
          edges: newSheet.edges,
          selectedNodeId: initialNodes[0]?.id ?? null,
        })
        return true
      },

      moveSheetToTrash: (id) => {
        const { sheets, currentSheetId, nodes, edges } = get()
        const now = new Date().toISOString()
        const updatedSheets = sheets
          .map((s) => (s.id === currentSheetId ? { ...s, nodes, edges } : s))
          .map((s) => (s.id === id ? { ...s, deletedAt: now } : s))

        if (id !== currentSheetId) {
          set({ sheets: updatedSheets })
          return
        }
        // 編集中のシートをゴミ箱に入れた場合：シートタブが無いのでホーム画面へ戻す
        set({ sheets: updatedSheets, currentView: 'home', selectedNodeId: null })
      },

      restoreSheetFromTrash: (id) => {
        set({
          sheets: get().sheets.map((s) => (s.id === id ? { ...s, deletedAt: null } : s)),
        })
      },

      permanentlyDeleteSheet: (id) => {
        set({ sheets: get().sheets.filter((s) => s.id !== id) })
      },

      toggleSheetStar: (id) => {
        set({
          sheets: get().sheets.map((s) => (s.id === id ? { ...s, isStarred: !s.isStarred } : s)),
        })
      },

      touchSheetUpdatedAt: (id) => {
        set({
          sheets: get().sheets.map((s) =>
            s.id === id ? { ...s, updatedAt: new Date().toISOString() } : s
          ),
        })
      },

      renameSheet: (id, name) => {
        set({
          sheets: get().sheets.map((s) => (s.id === id ? { ...s, name: clampName(name) } : s)),
        })
      },

      setSheetThumbnail: (id, path) => {
        set({
          sheets: get().sheets.map((s) => (s.id === id ? { ...s, thumbnailPath: path } : s)),
        })
      },

      setSheetLineColor: (id, color) => {
        const safe = safeLineColor(color) ?? null
        set({
          sheets: get().sheets.map((s) => (s.id === id ? { ...s, lineColor: safe } : s)),
        })
      },

      switchSheet: (id) => {
        const { sheets, currentSheetId, nodes, edges } = get()
        const now = new Date().toISOString()
        if (id === currentSheetId) {
          set({ sheets: sheets.map((s) => (s.id === id ? { ...s, lastOpenedAt: now } : s)) })
          return
        }
        const updatedSheets = sheets.map((s) =>
          s.id === currentSheetId ? { ...s, nodes, edges } : s.id === id ? { ...s, lastOpenedAt: now } : s
        )
        const target = updatedSheets.find((s) => s.id === id)
        if (!target) return
        set({
          sheets: updatedSheets,
          currentSheetId: id,
          nodes: target.nodes,
          edges: target.edges,
          selectedNodeId: null,
        })
      },

      loadSheets: (rawSheets) => {
        if (rawSheets.length === 0) return
        const sheets = rawSheets.map(normalizeSheet)
        // リロード時に最後に開いていたシートを復元（なければアクティブな先頭、それも無ければ先頭）
        const savedId = get().currentSheetId
        const current =
          sheets.find((s) => s.id === savedId && !s.deletedAt) ??
          sheets.find((s) => !s.deletedAt) ??
          sheets[0]
        set({
          sheets,
          currentSheetId: current.id,
          nodes: current.nodes,
          edges: current.edges,
          selectedNodeId: null,
        })
      },

      markSheetLoaded: (id, nodes, edges) => {
        const { sheets, currentSheetId } = get()
        const target = sheets.find((s) => s.id === id)
        // 取得中に削除されたシートや、すでに読み込み済みのシート（その後の編集を上書きしてしまう）には何もしない
        if (!target || isSheetLoaded(target)) return
        set({
          sheets: sheets.map((s) => (s.id === id ? { ...s, nodes, edges, loaded: true } : s)),
          ...(id === currentSheetId ? { nodes, edges, selectedNodeId: null } : {}),
        })
      },

      moveSheetToFolder: (sheetId, folderId) => {
        set({
          sheets: get().sheets.map((s) => (s.id === sheetId ? { ...s, folderId } : s)),
        })
      },

      createFolder: (name) => {
        const trimmed = clampName(name.trim())
        if (!trimmed) return true
        if (get().folders.length >= LIMITS.folders) return false
        set({ folders: [...get().folders, { id: crypto.randomUUID(), name: trimmed }] })
        return true
      },

      renameFolder: (id, name) => {
        const trimmed = clampName(name.trim())
        if (!trimmed) return
        set({ folders: get().folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) })
      },

      deleteFolder: (id) => {
        set({
          folders: get().folders.filter((f) => f.id !== id),
          sheets: get().sheets.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)),
        })
      },

      loadFolders: (folders) => set({ folders }),
    }),
    {
      name: 'synaptique-storage',
      partialize: (state) => ({
        sheets: state.sheets.map((s) =>
          s.id === state.currentSheetId
            ? { ...s, nodes: state.nodes, edges: state.edges }
            : s
        ),
        currentSheetId: state.currentSheetId,
        currentView: state.currentView,
        folders: state.folders,
        ownerId: state.ownerId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.sheets = state.sheets.map(normalizeSheet)
        if (!state.folders) state.folders = []
        const current = state.sheets.find((s) => s.id === state.currentSheetId)
        if (current) {
          state.nodes = current.nodes
          state.edges = current.edges
        }
      },
    }
  )
)
