import { useReactFlow } from '@xyflow/react'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getNodeImageSignedUrl, refreshSignedUrl } from '../../../lib/imageApi'
import type { NodeImage } from '../store/mindmapStore'

const MIN_WIDTH = 40
const MAX_WIDTH = 1600

interface Props {
  image: NodeImage
  // 下に文字が続くときだけ、画像との間にすき間をあける
  hasText: boolean
  // 画像を外すボタンと、大きさを変えるハンドルを出すか
  showControls: boolean
  onRemove: () => void
  onResize: (width: number, height: number) => void
}

// ノードに付けた画像の表示（文字の上に置く）
// 画像は非公開のストレージにあるので、表示用の署名付きURLを取得してから表示する
export function NodeImageView({ image, hasText, showControls, onRemove, onResize }: Props) {
  const { getZoom } = useReactFlow()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  // ドラッグ中の大きさ（離したときにだけ保存する）
  const [dragSize, setDragSize] = useState<{ width: number; height: number } | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number; zoom: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    getNodeImageSignedUrl(image.path)
      .then((signedUrl) => { if (!cancelled) { setUrl(signedUrl); setFailed(false) } })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [image.path])

  // 画像を表示できなかったとき（URLの期限切れなど）は、URLを作り直して、1回だけ再試行する
  const retriedPathRef = useRef<string | null>(null)
  const handleImageError = () => {
    if (retriedPathRef.current === image.path) {
      setFailed(true)
      return
    }
    retriedPathRef.current = image.path
    refreshSignedUrl(image.path)
      .then((signedUrl) => setUrl(signedUrl))
      .catch(() => setFailed(true))
  }

  const aspect = image.height / image.width

  // 右下のハンドルをドラッグして、縦横比を保ったまま大きさを変える
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    // 画面上の移動量をキャンバスのズーム倍率で割って、ノード内の大きさに直す
    dragRef.current = { startX: e.clientX, startWidth: image.width, zoom: getZoom() }
  }

  const sizeFromPointer = (clientX: number) => {
    const drag = dragRef.current
    if (!drag) return null
    const width = Math.round(
      Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, drag.startWidth + (clientX - drag.startX) / drag.zoom))
    )
    return { width, height: Math.round(width * aspect) }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const size = sizeFromPointer(e.clientX)
    if (size) setDragSize(size)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const size = sizeFromPointer(e.clientX)
    dragRef.current = null
    setDragSize(null)
    if (size && size.width !== image.width) onResize(size.width, size.height)
  }

  const width = dragSize?.width ?? image.width
  const height = dragSize?.height ?? image.height

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        marginBottom: hasText ? 8 : 0,
        borderRadius: 8,
        background: 'var(--c-bg-subtle)',
        flexShrink: 0,
      }}
    >
      {url && !failed && (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={handleImageError}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 8, pointerEvents: 'none' }}
        />
      )}
      {failed && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--c-text-3)' }}>
          画像を読み込めません
        </div>
      )}
      {showControls && (
        <button
          className="nodrag"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          title="画像を外す"
          style={{
            position: 'absolute', top: 4, right: 4, width: 20, height: 20, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.55)', color: '#ffffff',
          }}
        >
          <X size={12} />
        </button>
      )}
      {(showControls || dragSize) && (
        <div
          className="nodrag nopan"
          title="ドラッグで大きさを変更"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', right: -6, bottom: -6, width: 14, height: 14,
            borderRadius: '50%', background: '#ffffff', border: '2px solid var(--c-select)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            cursor: 'nwse-resize', touchAction: 'none',
          }}
        />
      )}
    </div>
  )
}
