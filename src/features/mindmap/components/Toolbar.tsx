import { motion } from 'framer-motion'
import { ImagePlus, Maximize2, Redo2, RotateCcw, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useMindmapStore } from '../store/mindmapStore'
import { deleteNodeImages, getImagePaths, processAndUploadImage } from '../../../lib/imageApi'
import { ConfirmDialog } from './ConfirmDialog'
import { redo, undo, useHistory } from '../history'

export function Toolbar() {
  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow()
  const resetMindmap = useMindmapStore((s) => s.resetMindmap)
  const addImageNode = useMindmapStore((s) => s.addImageNode)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canUndo = useHistory((h) => h.canUndo)
  const canRedo = useHistory((h) => h.canRedo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // スマホなどペースト操作が無い環境向けの画像追加（クリップボード貼り付けと同じ処理を使う）
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    processAndUploadImage(file)
      .then(({ path, width, height }) => addImageNode(path, width, height, position))
      .catch((err) => toast.error(err instanceof Error ? err.message : '画像の追加に失敗しました'))
  }

  const handleReset = () => {
    const imagePaths = getImagePaths(useMindmapStore.getState().nodes)
    resetMindmap()
    setConfirmOpen(false)
    if (imagePaths.length > 0) {
      deleteNodeImages(imagePaths).catch(() => {})
    }
  }

  const buttonStyle = {
    background: 'var(--c-glass)',
    border: '1px solid var(--c-border)',
    borderRadius: 10,
    color: 'var(--c-text-2)',
    cursor: 'pointer',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  }

  return (
    <>
    <motion.div
      data-tour="toolbar"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        position: 'fixed',
        bottom: 32,
        left: 'calc(var(--editor-sidebar-w, 0px) + 32px)',
        transition: 'left 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 100,
      }}
    >
      {/* ズームコントロール */}
      <div
        style={{
          background: 'var(--c-glass)',
          border: '1px solid var(--c-border)',
          borderRadius: 14,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          backdropFilter: 'blur(16px)',
        }}
      >
        <button
          style={buttonStyle}
          onClick={() => zoomIn()}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(124, 58, 237, 0.2)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'rgba(124, 58, 237, 0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'var(--c-glass)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-2)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'var(--c-border)'
          }}
          title="ズームイン"
        >
          <ZoomIn size={16} />
        </button>
        <button
          style={buttonStyle}
          onClick={() => zoomOut()}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(124, 58, 237, 0.2)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'rgba(124, 58, 237, 0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'var(--c-glass)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-2)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'var(--c-border)'
          }}
          title="ズームアウト"
        >
          <ZoomOut size={16} />
        </button>
        <button
          style={buttonStyle}
          onClick={() => fitView({ padding: 0.2, duration: 500 })}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(124, 58, 237, 0.2)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'rgba(124, 58, 237, 0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'var(--c-glass)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-2)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'var(--c-border)'
          }}
          title="全体表示"
        >
          <Maximize2 size={16} />
        </button>
        {/* 元に戻す／やり直す */}
        <button
          style={{ ...buttonStyle, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'default' }}
          onClick={undo}
          disabled={!canUndo}
          title="元に戻す (⌘Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          style={{ ...buttonStyle, opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'default' }}
          onClick={redo}
          disabled={!canRedo}
          title="やり直す (⇧⌘Z)"
        >
          <Redo2 size={16} />
        </button>

        {/* 画像を追加（クリップボード貼り付けが使えない環境向け） */}
        <button
          style={buttonStyle}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.2)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124, 58, 237, 0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--c-glass)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-2)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border)'
          }}
          title="画像を追加"
        >
          <ImagePlus size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      </div>

      {/* リセット */}
      <div
        style={{
          background: 'var(--c-glass)',
          border: '1px solid var(--c-border)',
          borderRadius: 14,
          padding: 8,
          backdropFilter: 'blur(16px)',
        }}
      >
        <button
          style={buttonStyle}
          onClick={() => setConfirmOpen(true)}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'rgba(239, 68, 68, 0.15)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'rgba(239, 68, 68, 0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'var(--c-glass)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text-2)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'var(--c-border)'
          }}
          title="リセット"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </motion.div>

    <ConfirmDialog
      open={confirmOpen}
      title="マインドマップをリセット"
      description="すべてのノードが削除され、最初の状態に戻ります。この操作は取り消せません。"
      confirmLabel="リセット"
      onConfirm={handleReset}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  )
}
