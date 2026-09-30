import { EdgeLabelRenderer, Position, type EdgeProps, getBezierPath, getStraightPath, useInternalNode } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { memo, useRef, useState } from 'react'
import { useMindmapStore, type MindmapNodeData } from '../store/mindmapStore'

function ellipseBorderPoint(
  cx: number, cy: number,
  rx: number, ry: number,
  toX: number, toY: number
): { x: number; y: number } {
  const dx = toX - cx
  const dy = toY - cy
  if (dx === 0 && dy === 0) return { x: cx + rx, y: cy }
  const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry))
  return { x: cx + dx * t, y: cy + dy * t }
}

function InteractiveEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  targetHandleId,
  style,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insertNodeBetween = useMindmapStore((s) => s.insertNodeBetween)
  const isFree = useMindmapStore((s) =>
    s.sheets.find((sh) => sh.id === s.currentSheetId)?.mapType === 'free'
  )
  // エッジ描画アニメーションの遅延：接続元ノードのdepthに基づく
  const sourceDepth = useMindmapStore(
    (s) => (s.nodes.find((n) => n.id === source)?.data as MindmapNodeData | undefined)?.depth ?? 0
  )
  const edgeDelay = sourceDepth * 0.15 + 0.18

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY

  if (isFree && sourceNode && targetNode) {
    const srcW = sourceNode.measured?.width ?? 200
    const srcH = sourceNode.measured?.height ?? 60
    const srcCX = sourceNode.internals.positionAbsolute.x + srcW / 2
    const srcCY = sourceNode.internals.positionAbsolute.y + srcH / 2

    const tgtW = targetNode.measured?.width ?? 200
    const tgtH = targetNode.measured?.height ?? 60
    const tgtCX = targetNode.internals.positionAbsolute.x + tgtW / 2
    const tgtCY = targetNode.internals.positionAbsolute.y + tgtH / 2

    const srcPt = ellipseBorderPoint(srcCX, srcCY, srcW / 2, srcH / 2, tgtCX, tgtCY)
    const tgtPt = ellipseBorderPoint(tgtCX, tgtCY, tgtW / 2, tgtH / 2, srcCX, srcCY)

    sx = srcPt.x; sy = srcPt.y
    tx = tgtPt.x; ty = tgtPt.y
  }

  // ロジックツリー：エッジに保存されたハンドルIDには関係なく、
  // 常に「親の右側の中央 → 子の左側の中央」で接続する
  // ※ ハンドル位置（handleBounds）はノードの出現アニメーション（scale 0→1）中に測られて
  //   中央に潰れた値のまま残ることがあるため使わず、ノードの位置とサイズから直接計算する
  if (!isFree && sourceNode && targetNode) {
    sx = sourceNode.internals.positionAbsolute.x + (sourceNode.measured?.width ?? 200)
    sy = sourceNode.internals.positionAbsolute.y + (sourceNode.measured?.height ?? 60) / 2
    tx = targetNode.internals.positionAbsolute.x
    ty = targetNode.internals.positionAbsolute.y + (targetNode.measured?.height ?? 60) / 2
  }

  const [edgePath, labelX, labelY] = isFree
    ? getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty })
    : getBezierPath({
        sourceX: sx, sourceY: sy, sourcePosition: Position.Right,
        targetX: tx, targetY: ty, targetPosition: Position.Left,
      })

  const { opacity: styleOpacity, ...restStyle } = (style ?? {}) as React.CSSProperties

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 100)
  }

  const handleInsert = () => {
    setHovered(false)
    insertNodeBetween(
      source,
      target,
      id,
      sourceHandleId ?? 'right',
      targetHandleId ?? 'left',
    )
  }

  return (
    <>
      {/* エッジ本体：マウント時にpathLength 0→1で線が伸びるアニメーション */}
      <motion.path
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        style={{ ...restStyle, pointerEvents: 'none' }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: Number(styleOpacity ?? 0.6) }}
        transition={{
          pathLength: { duration: 0.4, delay: edgeDelay, ease: 'easeOut' },
          opacity: { duration: 0.05, delay: edgeDelay },
        }}
      />
      {/* ホバー判定用の透明な太いパス */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{ cursor: 'pointer' }}
      />
      <EdgeLabelRenderer>
        {hovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
              padding: 8,
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <button
              onClick={handleInsert}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#ffffff',
                border: '1.5px solid rgba(124, 58, 237, 0.5)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                padding: 0,
                opacity: 0.7,
              }}
            >
              <Plus size={12} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}

export const InteractiveEdge = memo(InteractiveEdgeComponent)
