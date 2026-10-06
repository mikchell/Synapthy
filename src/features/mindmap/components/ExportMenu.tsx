import { useEffect, useRef, useState } from 'react'
import { FileDown, FileText, Printer } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { toast } from 'sonner'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { useMindmapStore } from '../store/mindmapStore'
import { buildMarkdownOutline } from '../export/outline'
import { downloadTextFile, safeFileName } from '../export/download'
import { printMapAsPdf } from '../export/printPdf'

const ITEM: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  color: 'var(--c-text)',
  textAlign: 'left',
  cursor: 'pointer',
}

// 編集中のシートを、PDF または Markdown として書き出すメニュー（ヘッダーに置く）
export function ExportMenu() {
  const rf = useReactFlow()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // メニューの外をクリックする、Esc を押すと閉じる
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const currentSheetName = () => {
    const s = useMindmapStore.getState()
    return s.sheets.find((sh) => sh.id === s.currentSheetId)?.name ?? ''
  }

  const exportMarkdown = () => {
    setOpen(false)
    const { nodes, edges } = useMindmapStore.getState()
    if (nodes.length === 0) {
      toast.info('書き出すノードがありません')
      return
    }
    const name = currentSheetName()
    downloadTextFile(`${safeFileName(name)}.md`, buildMarkdownOutline(name, nodes, edges), 'text/markdown')
  }

  const exportPdf = () => {
    setOpen(false)
    // メニューが閉じて、画面に反映されてから、印刷用の表示に切り替える
    setTimeout(() => printMapAsPdf(rf, currentSheetName()), 50)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="書き出し"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: isMobile ? '0 8px' : '0 12px',
          borderRadius: 8,
          border: '1px solid var(--c-border)',
          background: open ? 'var(--c-accent-soft)' : 'none',
          color: open ? 'var(--c-accent)' : 'var(--c-text-2)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <FileDown size={14} />
        {!isMobile && '書き出し'}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 280,
            padding: 6,
            borderRadius: 14,
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            zIndex: 210,
          }}
        >
          <button role="menuitem" onClick={exportPdf} style={ITEM}>
            <Printer size={16} style={{ marginTop: 2, flexShrink: 0, color: 'var(--c-accent)' }} />
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>PDF</span>
              <span style={{ display: 'block', fontSize: 11, lineHeight: 1.6, color: 'var(--c-text-2)' }}>
                印刷の画面が開きます。送信先を「PDFに保存」にしてください。文字は選択・コピーできます
              </span>
            </span>
          </button>
          <button role="menuitem" onClick={exportMarkdown} style={ITEM}>
            <FileText size={16} style={{ marginTop: 2, flexShrink: 0, color: 'var(--c-accent)' }} />
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Markdown（.md）</span>
              <span style={{ display: 'block', fontSize: 11, lineHeight: 1.6, color: 'var(--c-text-2)' }}>
                階層をインデントした箇条書きにします。メモは引用として入ります
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
