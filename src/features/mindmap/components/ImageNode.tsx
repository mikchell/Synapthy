import { NodeResizeControl, type Node, type NodeProps } from '@xyflow/react'
import { Loader2, RotateCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { deleteNodeImage, getNodeImageSignedUrl, refreshSignedUrl } from '../../../lib/imageApi'
import { useMindmapStore } from '../store/mindmapStore'
import type { ImageNodeData } from '../../../types/mindmap'

const MIN_SIZE = 60

export function ImageNode({ id, data, selected, width, height }: NodeProps<Node<ImageNodeData>>) {
  const { deleteNode, updateNodeSize, updateNodeRotation } = useMindmapStore(
    useShallow((s) => ({
      deleteNode: s.deleteNode,
      updateNodeSize: s.updateNodeSize,
      updateNodeRotation: s.updateNodeRotation,
    }))
  )
  const isMobile = useIsMobile()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef<{ dist: number; angle: number; w: number; h: number; rotation: number } | null>(null)
  const rotateDragRef = useRef<{ centerX: number; centerY: number; startAngle: number; startRotation: number } | null>(null)
  const rotation = data.rotation ?? 0

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setFailed(false)
    getNodeImageSignedUrl(data.path)
      .then((signedUrl) => { if (!cancelled) setUrl(signedUrl) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [data.path])

  // 画像を表示できなかったとき（URLの期限切れなど）は、URLを作り直して、1回だけ再試行する
  const retriedPathRef = useRef<string | null>(null)
  const handleImageError = () => {
    if (retriedPathRef.current === data.path) {
      setFailed(true)
      return
    }
    retriedPathRef.current = data.path
    refreshSignedUrl(data.path)
      .then((signedUrl) => setUrl(signedUrl))
      .catch(() => setFailed(true))
  }

  const handleDelete = () => {
    deleteNode(id)
    deleteNodeImage(data.path).catch(() => {})
  }

  // モバイル：選択中の画像を2本指でピンチ＝拡大縮小、ひねり＝回転
  const handlePinchStart = (e: React.TouchEvent) => {
    if (!isMobile || !selected || e.touches.length !== 2) return
    e.stopPropagation()
    const [t0, t1] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    const angle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * (180 / Math.PI)
    pinchRef.current = { dist, angle, w: width ?? 160, h: height ?? 160, rotation }
  }

  const handlePinchMove = (e: React.TouchEvent) => {
    if (!isMobile || !selected || e.touches.length !== 2 || !pinchRef.current) return
    e.stopPropagation()
    const [t0, t1] = [e.touches[0], e.touches[1]]
    const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    const newAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * (180 / Math.PI)
    const scale = newDist / pinchRef.current.dist
    const newW = Math.max(MIN_SIZE, Math.round(pinchRef.current.w * scale))
    const newH = Math.max(MIN_SIZE, Math.round(pinchRef.current.h * scale))
    updateNodeSize(id, newW, newH)
    updateNodeRotation(id, Math.round(pinchRef.current.rotation + (newAngle - pinchRef.current.angle)))
  }

  const handlePinchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
  }

  // デスクトップ：ハンドルをドラッグして回転
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
    rotateDragRef.current = { centerX, centerY, startAngle, startRotation: rotation }

    const handleMove = (ev: MouseEvent) => {
      const drag = rotateDragRef.current
      if (!drag) return
      const angle = Math.atan2(ev.clientY - drag.centerY, ev.clientX - drag.centerX) * (180 / Math.PI)
      updateNodeRotation(id, Math.round(drag.startRotation + (angle - drag.startAngle)))
    }
    const handleUp = () => {
      rotateDragRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onTouchStart={isMobile && selected ? handlePinchStart : undefined}
      onTouchMove={isMobile && selected ? handlePinchMove : undefined}
      onTouchEnd={isMobile && selected ? handlePinchEnd : undefined}
    >
      {/* 見た目だけを回転させるレイヤー（リサイズハンドル等は回転させない） */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--c-bg-subtle)',
          border: selected ? '2px solid var(--c-accent)' : '1px solid var(--c-border)',
          boxShadow: selected ? '0 0 24px rgba(124,58,237,0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
        }}
      >
        {url && (
          <img
            src={url}
            alt="貼り付けた画像"
            draggable={false}
            onError={handleImageError}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}

        {!url && !failed && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={20} color="var(--c-text-3)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {failed && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--c-text-3)' }}>
            画像を読み込めませんでした
          </div>
        )}
      </div>

      {selected && (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
        <NodeResizeControl
          key={pos}
          position={pos}
          keepAspectRatio
          minWidth={MIN_SIZE}
          minHeight={MIN_SIZE}
          style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: 'var(--c-surface)',
            border: '2px solid var(--c-accent)',
            boxShadow: '0 1px 4px rgba(124,58,237,0.3)',
          }}
        />
      ))}

      {selected && !isMobile && (
        <button
          className="nodrag"
          onMouseDown={handleRotateStart}
          onClick={(e) => e.stopPropagation()}
          title="ドラッグして回転"
          style={{
            position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%',
            border: '1.5px solid rgba(124,58,237,0.5)', background: 'var(--c-surface)',
            color: 'var(--c-accent)', cursor: 'grab',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          <RotateCw size={11} />
        </button>
      )}

      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete() }}
          title="削除"
          style={{
            position: 'absolute', top: 6, right: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%',
            border: 'none', background: 'var(--c-glass)',
            color: '#ef4444', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}
