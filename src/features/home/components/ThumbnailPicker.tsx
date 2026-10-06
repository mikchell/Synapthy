import { AnimatePresence, motion } from 'framer-motion'
import { ImageOff, Upload } from 'lucide-react'
import { useEffect } from 'react'
import { THUMBNAIL_CATEGORIES, THUMBNAIL_TEMPLATES, findTemplate } from '../../../lib/thumbnailTemplates'

interface Props {
  open: boolean
  // 今のサムネイル（テンプレートの選択状態の表示と、「デフォルトに戻す」の出し分けに使う）
  thumbnailPath?: string | null
  onSelectTemplate: (id: string) => void
  onUpload: () => void
  onReset: () => void
  onClose: () => void
}

const FOOTER_BTN = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid var(--c-border)',
  background: 'var(--c-bg-subtle)',
  color: 'var(--c-text-2)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
} as const

// サムネイルを選ぶダイアログ。用意したテンプレート画像から選ぶか、自分の画像をアップロードする
export function ThumbnailPicker({ open, thumbnailPath, onSelectTemplate, onUpload, onReset, onClose }: Props) {
  const selectedId = findTemplate(thumbnailPath)?.id

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
          />
          <div
            key="dialog-wrapper"
            style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: 'min(520px, calc(100vw - 32px))' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--c-surface)',
                borderRadius: 20,
                padding: '24px 22px 18px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                maxHeight: 'calc(100vh - 48px)',
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>サムネイルを選ぶ</p>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {THUMBNAIL_CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--c-text-3)' }}>
                      {cat.label}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                      {THUMBNAIL_TEMPLATES.filter((tpl) => tpl.category === cat.id).map((tpl) => {
                        const active = tpl.id === selectedId
                        return (
                          <button
                            key={tpl.id}
                            onClick={() => onSelectTemplate(tpl.id)}
                            title={tpl.label}
                            style={{
                              padding: 0,
                              border: 'none',
                              borderRadius: 12,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              background: 'var(--c-bg-subtle)',
                              boxShadow: active ? '0 0 0 3px var(--c-accent)' : '0 0 0 1px var(--c-border)',
                              position: 'relative',
                              aspectRatio: '16 / 10',
                            }}
                          >
                            <img
                              src={tpl.src}
                              alt={tpl.label}
                              loading="lazy"
                              draggable={false}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: tpl.position, display: 'block' }}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {thumbnailPath && (
                  <button onClick={onReset} style={FOOTER_BTN}>
                    <ImageOff size={14} />
                    デフォルトに戻す
                  </button>
                )}
                <button onClick={onUpload} style={FOOTER_BTN}>
                  <Upload size={14} />
                  画像をアップロード
                </button>
                <button onClick={onClose} style={FOOTER_BTN}>閉じる</button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
