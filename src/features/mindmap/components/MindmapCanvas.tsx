import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type OnBeforeDelete,
} from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { useMindmapStore } from '../store/mindmapStore'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { processAndUploadImage } from '../../../lib/imageApi'
import { attachImageToNode } from '../nodeImage'
import { redo, undo } from '../history'
import { Header } from './Header'
import { MindmapNode } from './MindmapNode'
import { ImageNode } from './ImageNode'
import { InteractiveEdge } from './InteractiveEdge'
import { safeLineColor } from '../edgeColor'
import { NodePanel } from './NodePanel'
import { Toolbar } from './Toolbar'
import { HelpHint } from './HelpHint'

const nodeTypes = { mindmapNode: MindmapNode, imageNode: ImageNode }
const edgeTypes = { interactive: InteractiveEdge, default: InteractiveEdge }

const MINIMAP_COLOR_MAP: Record<string, string> = {
  purple: '#7c3aed',
  blue: '#2563eb',
  cyan: '#0891b2',
  green: '#16a34a',
  pink: '#db2777',
  orange: '#ea580c',
}
const getMinimapNodeColor = (node: { data: unknown }) =>
  MINIMAP_COLOR_MAP[(node.data as { color: string }).color] ?? '#7c3aed'

function MindmapFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNodeId, editingNodeId, addImageNode, reparentDroppedNode } =
    useMindmapStore(
      useShallow((s) => ({
        nodes: s.nodes,
        edges: s.edges,
        onNodesChange: s.onNodesChange,
        onEdgesChange: s.onEdgesChange,
        onConnect: s.onConnect,
        setSelectedNodeId: s.setSelectedNodeId,
        editingNodeId: s.editingNodeId,
        addImageNode: s.addImageNode,
        reparentDroppedNode: s.reparentDroppedNode,
      }))
    )
  const { setCenter, getZoom, setViewport, getViewport, screenToFlowPosition } = useReactFlow()
  // シートで設定した線の色。CSS変数として渡し、線（InteractiveEdge）はその変数を参照する
  // （framer-motion の SVG はスタイルの stroke をマウント時の値で固定してしまい、あとから色を変えても反映されないため）
  const lineColor = useMindmapStore((s) => safeLineColor(s.sheets.find((sh) => sh.id === s.currentSheetId)?.lineColor))
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const twoFingerRef = useRef<{ midX: number; midY: number; vx: number; vy: number } | null>(null)

  // ボードにクリップボードの画像を貼り付け（横展開・フリー展開どちらでも可）
  // ※ スマホなどキーボード操作の無い環境向けには Toolbar の「画像を追加」ボタンから同じ処理を呼べる
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile()
      if (!file) return
      e.preventDefault()

      // ノードを選択中なら、そのノードに画像を付ける
      const { selectedNodeId, nodes: currentNodes } = useMindmapStore.getState()
      const selected = currentNodes.find((n) => n.id === selectedNodeId)
      if (selected?.type === 'mindmapNode') {
        attachImageToNode(selected.id, file)
        return
      }

      // 何も選択していなければ、ボードの中央に画像として置く
      const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      processAndUploadImage(file)
        .then(({ path, width, height }) => addImageNode(path, width, height, position))
        .catch((err) => toast.error(err instanceof Error ? err.message : '画像の貼り付けに失敗しました'))
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [addImageNode, screenToFlowPosition])

  // Command/Ctrl+Z で元に戻す、Shift+Command/Ctrl+Z（または Ctrl+Y）でやり直す
  // 文字の入力中は、入力欄そのものの「元に戻す」を優先する
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      e.preventDefault()
      if (key === 'y' || e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Delete キーでの削除から中心テーマを外す（中心テーマは削除できない）
  // 中心テーマにつながる線も、他に消すノードとつながっていなければ残す
  const handleBeforeDelete = useCallback<OnBeforeDelete>(async ({ nodes: targets, edges: targetEdges }) => {
    const isRoot = (n: { id: string; data: unknown }) => n.id === 'root' || !!(n.data as { isRoot?: boolean }).isRoot
    if (!targets.some(isRoot)) return true
    toast.info('中心テーマは削除できません')
    const deletable = targets.filter((n) => !isRoot(n))
    const ids = new Set(deletable.map((n) => n.id))
    return {
      nodes: deletable,
      edges: targetEdges.filter((e) => e.selected || ids.has(e.source) || ids.has(e.target)),
    }
  }, [])

  const handlePaneClick = useCallback(() => setSelectedNodeId(null), [setSelectedNodeId])

  // ロジックツリー：別のノードに重ねて離したらその子に付け替え、それ以外は元の位置に戻す
  const handleNodeDragStop = useCallback(
    (_event: unknown, node: { id: string }) => reparentDroppedNode(node.id),
    [reparentDroppedNode]
  )

  useEffect(() => {
    if (!editingNodeId) return
    const node = nodes.find((n) => n.id === editingNodeId)
    if (!node) return
    setCenter(node.position.x, node.position.y, { zoom: getZoom(), duration: 300 })
  }, [editingNodeId, nodes, setCenter, getZoom])

  // モバイル：2本指ドラッグでパン
  useEffect(() => {
    if (!isMobile) return
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) { twoFingerRef.current = null; return }
      // 選択中ノード上でのタッチはリサイズ操作なのでパン不可
      const target = e.target as Element
      if (target.closest('.react-flow__node.selected')) { twoFingerRef.current = null; return }
      const { x, y } = getViewport()
      twoFingerRef.current = {
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        vx: x, vy: y,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !twoFingerRef.current) return
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dx = midX - twoFingerRef.current.midX
      const dy = midY - twoFingerRef.current.midY
      setViewport({ x: twoFingerRef.current.vx + dx, y: twoFingerRef.current.vy + dy, zoom: getViewport().zoom })
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) twoFingerRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile, getViewport, setViewport])

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', paddingTop: 56, ...(lineColor ? ({ '--c-sheet-line': lineColor } as React.CSSProperties) : {}) }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onBeforeDelete={handleBeforeDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeDragStop={handleNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        selectionOnDrag={!isMobile}
        selectionMode={SelectionMode.Partial}
        panOnDrag={isMobile ? true : [1, 2]}
        panOnScroll={!isMobile}
        panOnScrollSpeed={0.5}
        defaultEdgeOptions={{
          type: 'interactive',
          style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.6 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--c-dot)"
        />
        {!isMobile && (
          <MiniMap
            nodeColor={getMinimapNodeColor}
            maskColor="var(--c-accent-soft)"
            style={{ bottom: 32, right: 32 }}
          />
        )}
      </ReactFlow>
      <Header />
      <Toolbar />
      <NodePanel />
      <HelpHint />
    </div>
  )
}

export function MindmapCanvas() {
  return (
    <ReactFlowProvider>
      <MindmapFlow />
    </ReactFlowProvider>
  )
}
