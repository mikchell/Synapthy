import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { AlignJustify, Bold, GripVertical } from 'lucide-react'
import { useRef, useState } from 'react'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { LINE_COLORS, safeLineColor } from '../utils/edgeColor'
import { displayTextColor, TEXT_COLORS } from '../utils/labelStyle'
import { useMindmapStore } from '../store/mindmapStore'
import { NODE_SIZE_STEPS } from '../utils/nodeSize'
import type { MindmapNodeData } from '../../../types/mindmap'

export function NodePanel() {
  const isMobile = useIsMobile()
  const selectedNodeId = useMindmapStore((s) => s.selectedNodeId)
  const selectedNode = useMindmapStore((s) => {
    if (!s.selectedNodeId) return null
    const node = s.nodes.find((n) => n.id === s.selectedNodeId)
    return node?.type === 'mindmapNode' ? (node as { data: MindmapNodeData }) : null
  })
  const selectedNodeMemo = selectedNode?.data.memo ?? ''
  const selectedNodeBorderWidth = selectedNode?.data.borderWidth ?? null
  const selectedNodeShowBorder = selectedNode?.data.showBorder ?? false
  const updateNodeMemo = useMindmapStore((s) => s.updateNodeMemo)
  const updateNodeTextStyle = useMindmapStore((s) => s.updateNodeTextStyle)
  const currentSheetId = useMindmapStore((s) => s.currentSheetId)
  const setSheetLineColor = useMindmapStore((s) => s.setSheetLineColor)
  const sheetLineColor = useMindmapStore((s) => safeLineColor(s.sheets.find((sh) => sh.id === s.currentSheetId)?.lineColor))
  const selectedNodeBold = selectedNode?.data.bold ?? false
  const selectedNodeTextColor = selectedNode?.data.textColor
  const updateNodeBorderWidth = useMindmapStore((s) => s.updateNodeBorderWidth)
  const updateNodeShowBorder = useMindmapStore((s) => s.updateNodeShowBorder)
  const updateNodeSizeScale = useMindmapStore((s) => s.updateNodeSizeScale)
  const selectedNodeSizeScale = selectedNode?.data.sizeScale ?? 1
  const isFree = useMindmapStore((s) => s.sheets.find((sh) => sh.id === s.currentSheetId)?.mapType === 'free')
  // 文字だけのノード（ロジックツリーの中心テーマ以外）は枠線の太さではなく表示ON/OFFを選ぶ
  const textOnly = !isFree && !selectedNode?.data.isRoot
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [styleExpanded, setStyleExpanded] = useState(true)

  // デスクトップ用 framer-motion ドラッグ
  const dragControls = useDragControls()

  // モバイル用タッチドラッグ（framer-motion の drag を使わず、ノードドラッグと干渉しない）
  const panelRef = useRef<HTMLDivElement>(null)
  const [mobilePos, setMobilePos] = useState<{ x: number; y: number } | null>(null)
  const touchOrigin = useRef<{ touchX: number; touchY: number; panelX: number; panelY: number } | null>(null)

  const onGripTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    touchOrigin.current = { touchX: touch.clientX, touchY: touch.clientY, panelX: rect.left, panelY: rect.top }
  }

  const onGripTouchMove = (e: React.TouchEvent) => {
    if (!touchOrigin.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    setMobilePos({
      x: touchOrigin.current.panelX + (touch.clientX - touchOrigin.current.touchX),
      y: touchOrigin.current.panelY + (touch.clientY - touchOrigin.current.touchY),
    })
  }

  const onGripTouchEnd = () => { touchOrigin.current = null }

  const mobileStyle = mobilePos
    ? { left: mobilePos.x, top: mobilePos.y, right: 'auto' }
    : { right: 24, top: 'calc(50vh - 80px)' }

  return (
    <AnimatePresence>
      {selectedNodeId && (
        <motion.div
          ref={panelRef}
          key="node-panel"
          // モバイルでは framer-motion の drag を無効化してノードドラッグと干渉させない
          drag={!isMobile}
          dragControls={isMobile ? undefined : dragControls}
          dragListener={false}
          dragMomentum={false}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            background: 'var(--c-glass)',
            border: '1px solid var(--c-border)',
            borderRadius: 18,
            padding: '20px 16px',
            width: 160,
            backdropFilter: 'blur(20px)',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            ...(isMobile ? mobileStyle : { right: 24, top: 'calc(50vh - 80px)' }),
          }}
        >
          {/* ヘッダー（展開時のみ表示） */}
          {styleExpanded && (
            <div
              onPointerDown={!isMobile ? (e) => dragControls.start(e) : undefined}
              onTouchStart={isMobile ? onGripTouchStart : undefined}
              onTouchMove={isMobile ? onGripTouchMove : undefined}
              onTouchEnd={isMobile ? onGripTouchEnd : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14,
                cursor: 'grab', touchAction: 'none',
              }}
            >
              <GripVertical size={13} color="var(--c-text-3)" />
              <p style={{ color: 'var(--c-text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, flex: 1 }}>
                スタイル
              </p>
              <button
                onClick={() => setStyleExpanded(false)}
                title="スタイルを隠す"
                style={{
                  background: 'var(--c-accent-soft)', border: 'none', borderRadius: 6,
                  cursor: 'pointer', padding: '4px 6px', display: 'flex',
                  color: 'var(--c-accent)', transition: 'all 0.15s ease',
                }}
              >
                <AlignJustify size={15} />
              </button>
            </div>
          )}

          {/* スタイル（折りたたみ可能） */}
          <AnimatePresence initial={false}>
            {styleExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                {/* サイズ（ロジックツリーのみ：小・中・大の段階で切り替え） */}
                {!isFree && (
                  <div>
                    <p style={{ color: 'var(--c-text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                      サイズ
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {NODE_SIZE_STEPS.map(({ label, scale }) => {
                        const active = selectedNodeSizeScale === scale
                        return (
                          <button
                            key={label}
                            onClick={() => selectedNodeId && updateNodeSizeScale(selectedNodeId, scale)}
                            style={{
                              flex: 1, height: 28, borderRadius: 8,
                              background: active ? 'var(--c-accent-soft)' : 'var(--c-hover)',
                              border: active ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid transparent',
                              color: active ? 'var(--c-accent)' : 'var(--c-text-2)',
                              fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 枠線（文字だけのノードはON/OFF、それ以外は太さを選択。上にサイズがあるときだけ区切り線を入れる） */}
                <div style={isFree ? undefined : { marginTop: 16, borderTop: '1px solid var(--c-border)', paddingTop: 14 }}>
                  <p style={{ color: 'var(--c-text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                    枠線
                  </p>
                  {textOnly && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[{ label: 'なし', value: false }, { label: 'あり', value: true }].map(({ label, value }) => {
                        const active = selectedNodeShowBorder === value
                        return (
                          <button
                            key={label}
                            onClick={() => selectedNodeId && updateNodeShowBorder(selectedNodeId, value)}
                            style={{
                              flex: 1, height: 28, borderRadius: 8,
                              background: active ? 'var(--c-accent-soft)' : 'var(--c-hover)',
                              border: active ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid transparent',
                              color: active ? 'var(--c-accent)' : 'var(--c-text-2)',
                              fontSize: 12, fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {/* 太さ（文字だけのノードは、枠線を「あり」にしたときだけ選べる） */}
                  {(!textOnly || selectedNodeShowBorder) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: textOnly ? 8 : 0 }}>
                      {[1, 3, 5, 8].map((w) => (
                        <button
                          key={w}
                          onClick={() => selectedNodeId && updateNodeBorderWidth(selectedNodeId, w)}
                          title={`${w}px`}
                          style={{
                            flex: 1, height: 28, borderRadius: 8,
                            background: selectedNodeBorderWidth === w ? 'var(--c-accent-soft)' : 'var(--c-hover)',
                            border: selectedNodeBorderWidth === w ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid transparent',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{
                            width: '70%', height: Math.min(w, 8),
                            background: selectedNodeBorderWidth === w ? '#7c3aed' : 'var(--c-text-3)',
                            borderRadius: w,
                          }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 文字（ノード全体の太字・色。文字の一部分だけの装飾は、ノードの文字を編集中に付ける） */}
                <div style={{ marginTop: 16, borderTop: '1px solid var(--c-border)', paddingTop: 14 }}>
                  <p style={{ color: 'var(--c-text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                    文字
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => selectedNodeId && updateNodeTextStyle(selectedNodeId, { bold: !selectedNodeBold, textColor: selectedNodeTextColor }, { bold: true })}
                      title="太字"
                      style={{
                        width: 28, height: 28, borderRadius: 8, padding: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: selectedNodeBold ? 'var(--c-accent-soft)' : 'var(--c-hover)',
                        border: selectedNodeBold ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid transparent',
                        color: selectedNodeBold ? 'var(--c-accent)' : 'var(--c-text-2)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Bold size={14} />
                    </button>
                    {[{ label: '標準', value: undefined }, ...TEXT_COLORS].map((c) => {
                      const active = selectedNodeTextColor === c.value
                      return (
                        <button
                          key={c.label}
                          onClick={() => selectedNodeId && updateNodeTextStyle(selectedNodeId, { bold: selectedNodeBold, textColor: c.value }, { color: true })}
                          title={c.label}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', padding: 0, cursor: 'pointer',
                            background: c.value ? displayTextColor(c.value) : 'transparent',
                            border: c.value ? '2px solid var(--c-surface)' : '1.5px dashed var(--c-text-3)',
                            boxShadow: active ? '0 0 0 2px var(--c-accent)' : c.value ? '0 0 0 1px var(--c-border)' : 'none',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* 線の色（このシートの線すべてに適用） */}
                <div style={{ marginTop: 16, borderTop: '1px solid var(--c-border)', paddingTop: 14 }}>
                  <p style={{ color: 'var(--c-text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                    線の色
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {[{ label: '標準', value: undefined }, ...LINE_COLORS].map((c) => {
                      const active = sheetLineColor === c.value
                      return (
                        <button
                          key={c.label}
                          onClick={() => setSheetLineColor(currentSheetId, c.value ?? null)}
                          title={`${c.label}（このシートの線すべて）`}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', padding: 0, cursor: 'pointer',
                            background: c.value ? displayTextColor(c.value) : 'transparent',
                            border: c.value ? '2px solid var(--c-surface)' : '1.5px dashed var(--c-text-3)',
                            boxShadow: active ? '0 0 0 2px var(--c-accent)' : c.value ? '0 0 0 1px var(--c-border)' : 'none',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* メモ（常に表示） */}
          <div style={{ marginTop: styleExpanded ? 16 : 0, borderTop: styleExpanded ? '1px solid var(--c-border)' : 'none', paddingTop: styleExpanded ? 14 : 0 }}>
            <div
              onPointerDown={!styleExpanded && !isMobile ? (e) => dragControls.start(e) : undefined}
              onTouchStart={!styleExpanded && isMobile ? onGripTouchStart : undefined}
              onTouchMove={!styleExpanded && isMobile ? onGripTouchMove : undefined}
              onTouchEnd={!styleExpanded && isMobile ? onGripTouchEnd : undefined}
              style={{
                display: 'flex', alignItems: 'center', marginBottom: 8,
                ...(!styleExpanded ? { cursor: 'grab', touchAction: 'none' } : {}),
              }}
            >
              {!styleExpanded && <GripVertical size={13} color="var(--c-text-3)" style={{ marginRight: 2 }} />}
              <p style={{ color: 'var(--c-text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, flex: 1 }}>
                メモ
              </p>
              {!styleExpanded && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setStyleExpanded(true)}
                  title="スタイルを表示"
                  style={{
                    background: 'var(--c-hover)', border: 'none', borderRadius: 6,
                    cursor: 'pointer', padding: '4px 6px', display: 'flex',
                    color: 'var(--c-text-3)', transition: 'all 0.15s ease',
                  }}
                >
                  <AlignJustify size={15} />
                </button>
              )}
            </div>
            <textarea
              value={selectedNodeMemo}
              onChange={(e) => {
                const memo = e.target.value
                if (!selectedNodeId) return
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => updateNodeMemo(selectedNodeId, memo), 300)
                updateNodeMemo(selectedNodeId, memo)
              }}
              placeholder="メモを入力..."
              rows={4}
              style={{
                width: '100%', resize: 'vertical', borderRadius: 10,
                border: '1.5px solid var(--c-border)', padding: '8px 10px',
                fontSize: 12, color: 'var(--c-text)', background: 'var(--c-bg-subtle)',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--c-border)' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
