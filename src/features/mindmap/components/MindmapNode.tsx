import { Handle, Position, type Node, type NodeProps, NodeResizeControl } from '@xyflow/react'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { Plus, Trash2, StickyNote } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { type MindmapNodeData, type NodeColor, type FreeDirection, useMindmapStore } from '../store/mindmapStore'

export const COLOR_MAP: Record<NodeColor, { bg: string; border: string; glow: string; text: string }> = {
  purple: { bg: '#f3e8ff', border: 'rgba(139, 92, 246, 0.4)', glow: 'rgba(139, 92, 246, 0.12)', text: '#5b21b6' },
  blue:   { bg: '#dbeafe', border: 'rgba(59, 130, 246, 0.4)',  glow: 'rgba(59, 130, 246, 0.12)',  text: '#1e40af' },
  cyan:   { bg: '#cffafe', border: 'rgba(6, 182, 212, 0.4)',   glow: 'rgba(6, 182, 212, 0.12)',   text: '#0e7490' },
  green:  { bg: '#dcfce7', border: 'rgba(34, 197, 94, 0.4)',   glow: 'rgba(34, 197, 94, 0.12)',   text: '#15803d' },
  pink:   { bg: '#fce7f3', border: 'rgba(236, 72, 153, 0.4)',  glow: 'rgba(236, 72, 153, 0.12)',  text: '#be185d' },
  orange: { bg: '#ffedd5', border: 'rgba(249, 115, 22, 0.4)',  glow: 'rgba(249, 115, 22, 0.12)',  text: '#c2410c' },
}

// depth 0 = root（最大）、depth が深くなるほど小さく
// 新規ノード（ラベル未入力）に薄く表示する仮の文字
const PLACEHOLDER_LABEL = 'アイデア'

const SIZE_MAP = [
  { minWidth: 200, maxWidth: 280, fontSize: 18, fontWeight: 700, paddingV: 20, paddingH: 28, borderRadius: 24, borderWidth: 2 },
  { minWidth: 150, maxWidth: 210, fontSize: 15, fontWeight: 600, paddingV: 14, paddingH: 20, borderRadius: 18, borderWidth: 1.5 },
  { minWidth: 120, maxWidth: 170, fontSize: 13, fontWeight: 500, paddingV: 10, paddingH: 14, borderRadius: 13, borderWidth: 1.5 },
  { minWidth: 100, maxWidth: 150, fontSize: 12, fontWeight: 500, paddingV: 8,  paddingH: 12, borderRadius: 10, borderWidth: 1 },
]

const ADD_BTN: React.CSSProperties = {
  position: 'absolute',
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
  zIndex: 20,
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  padding: 0,
}

// マウス角度（度）を8方向にスナップ
function angleToDirection(deg: number): FreeDirection {
  if (deg >= 337.5 || deg < 22.5)   return 'right'
  if (deg < 67.5)                    return 'bottom-right'
  if (deg < 112.5)                   return 'bottom'
  if (deg < 157.5)                   return 'bottom-left'
  if (deg < 202.5)                   return 'left'
  if (deg < 247.5)                   return 'top-left'
  if (deg < 292.5)                   return 'top'
  return 'top-right'
}

// 方向 → 固定角度（度）：ボタンは8方向の固定位置に置く（カーソルに完全追従させない）
const DIRECTION_ANGLE: Record<FreeDirection, number> = {
  right:        0,
  'bottom-right': 45,
  bottom:       90,
  'bottom-left': 135,
  left:         180,
  'top-left':   225,
  top:          270,
  'top-right':  315,
}

function MindmapNodeComponent({ id, data, selected, width, height }: NodeProps<Node<MindmapNodeData>>) {
  const { addChildNode, addChildNodeInDirection, updateNodeLabel, deleteNode, setSelectedNodeId, editingNodeId, setEditingNodeId, currentMapType } = useMindmapStore(
    useShallow((s) => ({
      addChildNode: s.addChildNode,
      addChildNodeInDirection: s.addChildNodeInDirection,
      updateNodeLabel: s.updateNodeLabel,
      deleteNode: s.deleteNode,
      setSelectedNodeId: s.setSelectedNodeId,
      editingNodeId: s.editingNodeId,
      setEditingNodeId: s.setEditingNodeId,
      currentMapType: s.sheets.find((sh) => sh.id === s.currentSheetId)?.mapType,
    }))
  )
  const isFree = currentMapType === 'free'
  const isMobile = useIsMobile()
  const updateNodeSize = useMindmapStore((s) => s.updateNodeSize)
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [draft, setDraft] = useState(data.label)
  // フリーモード：インジケーターの表示状態と方向
  const [showIndicator, setShowIndicator] = useState(false)
  const [indicatorDir, setIndicatorDir] = useState<FreeDirection | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // モバイル：2本指ピンチでノードリサイズ
  const pinchRef = useRef<{ dist: number; w: number; h: number } | null>(null)
  // +ボタンの位置（useMotionValue でリレンダリングなしに更新）
  // ばねで追従させると、方向が変わるたびにボタンが滑るように移動して「逃げる」ので、決まった位置にすぐ置く
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const colors = COLOR_MAP[data.color]
  const showActions = (selected || hovered) && !editing
  const baseSz = SIZE_MAP[data.isRoot ? 0 : 1]
  // ロジックツリーはサイズ段階（小・中・大 = data.sizeScale）で文字・余白ごと拡大縮小する
  const stepScale = isFree ? 1 : (data.sizeScale ?? 1)
  const sz = useMemo(() => stepScale === 1 ? baseSz : {
    ...baseSz,
    minWidth: Math.round(baseSz.minWidth * stepScale),
    fontSize: Math.round(baseSz.fontSize * stepScale),
    paddingV: Math.round(baseSz.paddingV * stepScale),
    paddingH: Math.round(baseSz.paddingH * stepScale),
    borderRadius: Math.round(baseSz.borderRadius * stepScale),
  }, [baseSz, stepScale])
  // フリーモードは縦パディングを2.5倍にしてアスペクト比を約1.1:1に（楕円が丸く見える）
  const paddingV = isFree ? Math.round(sz.paddingH * 2.5) : sz.paddingV
  const defaultRadius = isFree ? '50%' : sz.borderRadius
  const nodeBorderRadius = data.isCircle ? 9999 : (data.borderRadius !== undefined ? data.borderRadius : defaultRadius)
  // width・height両方使って面積ベースでスケール（より追従感が出る）
  const defaultH = paddingV * 2 + sz.fontSize * 2.2
  // 自由リサイズに合わせた文字の拡大はフリー展開のみ（ロジックツリーはサイズ段階で決まる）
  const scaleW = isFree && width ? width / sz.minWidth : 1
  const scaleH = isFree && height ? height / defaultH : 1
  const fontSize = Math.round(sz.fontSize * Math.sqrt(scaleW * scaleH))

  useEffect(() => { setDraft(data.label) }, [data.label])

  useEffect(() => {
    if (editingNodeId === id) {
      setEditing(true)
      setEditingNodeId(null)
    }
  }, [editingNodeId, id, setEditingNodeId])

  // 編集開始時に入力欄へフォーカスする
  // 追加直後のノードは React Flow がサイズ計測まで visibility:hidden にしており、その間の focus() は無視される。
  // フォーカスが入らないと onBlur（確定）が起きず編集中のまま固まり、+ボタンも出なくなるため、
  // 実際にフォーカスが入るまで毎フレーム再試行する
  useEffect(() => {
    if (!editing) return
    let frame = 0
    let tries = 0
    const tryFocus = () => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      if (document.activeElement === input) {
        input.select()
        return
      }
      if (++tries < 30) frame = requestAnimationFrame(tryFocus)
    }
    tryFocus()
    return () => cancelAnimationFrame(frame)
  }, [editing])

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed) updateNodeLabel(id, trimmed)
    else setDraft(data.label)
    setEditing(false)
  }, [draft, id, data.label, updateNodeLabel])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit()
      if (e.key === 'Escape') { setDraft(data.label); setEditing(false) }
    },
    [commitEdit, data.label]
  )

  // モバイル：選択中ノード上での2本指ピンチでリサイズ
  const handlePinchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !selected || e.touches.length !== 2) return
    e.stopPropagation()
    const dist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    )
    pinchRef.current = { dist, w: width ?? sz.minWidth, h: height ?? (paddingV * 2 + sz.fontSize * 2) }
  }, [isMobile, selected, width, height, sz])

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !selected || e.touches.length !== 2 || !pinchRef.current) return
    e.stopPropagation()
    const newDist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    )
    const scale = newDist / pinchRef.current.dist
    const minH = paddingV * 2 + sz.fontSize * 2
    const newW = Math.max(sz.minWidth, Math.round(pinchRef.current.w * scale))
    const newH = data.isCircle ? newW : Math.max(minH, Math.round(pinchRef.current.h * scale))
    updateNodeSize(id, newW, newH)
  }, [isMobile, selected, id, sz, data.isCircle, updateNodeSize])

  const handlePinchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
  }, [])

  // フリーモード：カーソル方向を8方向にスナップして + ボタンの位置を更新
  // ボタンは方向ごとの固定位置に置く（カーソル完全追従だとボタンが逃げるため）
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFree || editing) return
    // 画面上の大きさ（ズーム倍率がかかった値）はカーソル位置の判定にだけ使う
    const rect = e.currentTarget.getBoundingClientRect()
    // 楕円の縦横比を正規化してから角度を出す（横長の楕円でも8方向が均等になる）
    const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    // ボタンへ向かってカーソルを動かす途中で方向が変わり、ボタンが逃げていかないよう、
    // 方向を変えるのはカーソルがノードの中心寄りにあるときだけ（縁の近くでは今の方向を保つ）
    if (indicatorDir && Math.hypot(nx, ny) > 0.55) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      return
    }
    const angle = Math.atan2(ny, nx)
    const deg = ((angle * 180 / Math.PI) + 360) % 360
    const dir = angleToDirection(deg)
    // 固定スナップ角度でボタン位置を計算（カーソル方向ではなく方向名の中心角）
    const snappedRad = DIRECTION_ANGLE[dir] * Math.PI / 180
    // ボタンはノードの内側の座標で配置し、ズームはノードごと掛かるので、ノード本来の大きさを使う
    // （画面上の大きさを使うとズーム倍率が二重に掛かり、ズームするほどボタンが遠くへ飛んでいく）
    const rx = e.currentTarget.offsetWidth / 2
    const ry = e.currentTarget.offsetHeight / 2
    // ボタンはノードの縁（楕円の輪郭）の上に置く。カーソルがノードの内側にいるまま届くので、
    // 縁の近くでは方向を変えない上の処理と合わせて、ボタンへ向かう途中で動かない
    rawX.set(rx + rx * Math.cos(snappedRad) - 11)
    rawY.set(ry + ry * Math.sin(snappedRad) - 11)
    setIndicatorDir(dir)
    if (!showIndicator) setShowIndicator(true)
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [isFree, editing, rawX, rawY, showIndicator, indicatorDir])

  const scheduleIndicatorHide = useCallback(() => {
    setHovered(false)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setShowIndicator(false)
      setIndicatorDir(null)
      hideTimerRef.current = null
    }, 500)
  }, [])

  const cancelIndicatorHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.25, times: [0, 0.6, 1], ease: 'easeOut', delay: (data.depth ?? 0) * 0.15 }}
      className="mindmap-node"
      style={{
        width: '100%',
        height: '100%',
        minWidth: sz.minWidth,
        minHeight: data.isCircle ? sz.minWidth : paddingV * 2 + sz.fontSize * 2,
        boxSizing: 'border-box',
        borderRadius: nodeBorderRadius,
        background: colors.bg,
        border: `${data.borderWidth ?? sz.borderWidth}px solid ${data.borderWidth && data.borderWidth > 2 ? colors.border.replace('0.4)', '0.85)') : colors.border}`,
        boxShadow: selected
          ? `0 0 0 2px #7c3aed, 0 4px 16px ${colors.glow}`
          : `0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px ${colors.border}`,
        padding: `${paddingV}px ${sz.paddingH}px`,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        overflow: 'visible',
        transition: 'box-shadow 0.2s ease',
        fontSize,
        fontWeight: sz.fontWeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onDoubleClick={() => setEditing(true)}
      onClick={() => setSelectedNodeId(id)}
      onMouseEnter={() => { cancelIndicatorHide(); setHovered(true) }}
      onMouseLeave={scheduleIndicatorHide}
      onMouseMove={handleMouseMove}
      // ピンチでの自由リサイズはフリー展開のみ（ロジックツリーはサイズ段階で変更する）
      onTouchStart={isFree && isMobile && selected ? handlePinchStart : undefined}
      onTouchMove={isFree && isMobile && selected ? handlePinchMove : undefined}
      onTouchEnd={isFree && isMobile && selected ? handlePinchEnd : undefined}
    >
      {/* マウント時のみ：ネットワーク拡散リング */}
      <motion.div
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.6, delay: (data.depth ?? 0) * 0.15 + 0.1, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          borderRadius: nodeBorderRadius,
          border: `2px solid ${colors.border.replace('0.4)', '0.9)')}`,
          pointerEvents: 'none',
        }}
      />
      {/* 四隅の自由リサイズはフリー展開のみ */}
      {isFree && selected && (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
        <NodeResizeControl
          key={pos}
          position={pos}
          keepAspectRatio={data.isCircle || undefined}
          minWidth={sz.minWidth}
          minHeight={data.isCircle ? sz.minWidth : paddingV * 2 + sz.fontSize * 2}
          style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: 'white',
            border: '2px solid #7c3aed',
            boxShadow: '0 1px 4px rgba(124,58,237,0.3)',
          }}
        />
      ))}

      {/* 右展開モード用ハンドル */}
      <Handle id="left"          type="target" position={Position.Left}   style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="right"         type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="top"           type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="bottom"        type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      {/* フリーモード用：中心ハンドル（sourceX/Y = ノード中心になりエッジが動的追従する） */}
      <Handle id="free-src" type="source" position={Position.Top} style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' }} />
      <Handle id="free-tgt" type="target" position={Position.Top} style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' }} />

      {editing ? (
        // 入力欄の幅を入力中の文字に合わせる（input 既定の幅でノードが広がり、確定時と大きさが変わるのを防ぐ）
        // 見えないspanで文字幅を測り、同じグリッドセルに input を重ねる
        <span style={{ display: 'inline-grid', maxWidth: '100%' }}>
          <span
            aria-hidden
            style={{
              gridArea: '1 / 1',
              // 未入力のときだけ薄い「アイデア」を仮表示し、入力があれば幅合わせ専用として隠す
              visibility: draft ? 'hidden' : 'visible',
              color: colors.text,
              opacity: 0.35,
              pointerEvents: 'none',
              whiteSpace: 'pre',
              fontSize,
              fontWeight: sz.fontWeight,
              lineHeight: 1.4,
            }}
          >
            {draft || PLACEHOLDER_LABEL}
          </span>
          <input
            ref={inputRef}
            // size=1 で input 自身の既定幅（約20文字分）をなくし、幅は上の span に任せる
            size={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{
              gridArea: '1 / 1',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              font: 'inherit',
              color: colors.text,
              fontSize,
              fontWeight: sz.fontWeight,
              lineHeight: 1.4,
              width: '100%',
              minWidth: 0,
              textAlign: 'center',
            }}
          />
        </span>
      ) : (
        <p
          style={{
            color: colors.text,
            fontSize,
            fontWeight: sz.fontWeight,
            margin: 0,
            textAlign: 'center',
            wordBreak: 'break-word',
            lineHeight: 1.4,
            opacity: data.label ? 1 : 0.35,
          }}
        >
          {data.label || PLACEHOLDER_LABEL}
        </p>
      )}

      {/* メモインジケーター（メモあり・非選択時） */}
      {data.memo && !selected && (
        <div style={{
          position: 'absolute',
          bottom: 4,
          right: 6,
          color: colors.border.replace('0.4)', '0.7)'),
          lineHeight: 1,
          pointerEvents: 'none',
        }}>
          <StickyNote size={10} />
        </div>
      )}

      {/* メモバブル（選択時） */}
      <AnimatePresence>
        {selected && data.memo && (
          <motion.div
            key="memo-bubble"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.97)',
              border: `1.5px solid ${colors.border}`,
              borderRadius: 12,
              padding: '10px 14px',
              minWidth: 160,
              maxWidth: 260,
              boxShadow: `0 4px 16px rgba(0,0,0,0.10), 0 0 0 1px ${colors.border}`,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            {/* 吹き出しの三角（上向き） */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: `6px solid ${colors.border.replace('0.4)', '0.6)')}`,
            }} />
            <div style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '5px solid rgba(255,255,255,0.97)',
            }} />
            <p style={{
              margin: 0,
              fontSize: 12,
              color: '#334155',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {data.memo}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 削除ボタン（ルートは複数シートある場合のみ表示） */}
      <AnimatePresence>
        {showActions && (
          <div style={{ position: 'absolute', top: -10, left: -10 }}>
            <motion.button
              key="delete"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => { e.stopPropagation(); deleteNode(id) }}
              style={{ ...ADD_BTN, border: '1.5px solid rgba(239, 68, 68, 0.6)', color: '#ef4444' }}
            >
              <Trash2 size={11} />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ロジックツリーモード：右の + ボタン */}
      <AnimatePresence>
        {!isFree && showActions && (
          <motion.button
            key="add-right"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => { e.stopPropagation(); addChildNode(id) }}
            style={{ ...ADD_BTN, right: -11, top: '50%', marginTop: -11 }}
            title="右に追加"
          >
            <Plus size={13} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* フリー展開モード：カーソルの方向に合わせてノードの縁に出す + ボタン */}
      <AnimatePresence>
        {isFree && !editing && showIndicator && (
          <motion.button
            key="free-indicator"
            className="nodrag"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ opacity: { duration: 0.14 }, scale: { type: 'spring', stiffness: 450, damping: 26 } }}
            onMouseEnter={cancelIndicatorHide}
            onMouseLeave={scheduleIndicatorHide}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); if (indicatorDir) addChildNodeInDirection(id, indicatorDir) }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              x: rawX,
              y: rawY,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#7c3aed',
              border: '2px solid white',
              boxShadow: '0 0 0 2px rgba(124,58,237,0.4), 0 2px 10px rgba(124,58,237,0.35)',
              cursor: 'pointer',
              zIndex: 9999,
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Plus size={11} color="white" />
          </motion.button>
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export const MindmapNode = memo(MindmapNodeComponent)
