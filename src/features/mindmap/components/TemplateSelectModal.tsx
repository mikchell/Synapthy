import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useMindmapStore, type MapType } from '../store/mindmapStore'

const NODE_STROKE = '#a78bfa'
const ROOT_FILL = '#ede9fe'
const ROOT_STROKE = '#7c3aed'

// ロジックツリー：親の右中央から子の左中央へ曲線でつなぐ（実際の描画と同じ形）
const logicTreePreview = (
  <svg width="100%" viewBox="0 0 120 72" fill="none" style={{ display: 'block', maxWidth: 150, margin: '0 auto' }}>
    <g stroke={NODE_STROKE} strokeWidth="1.2">
      <path d="M34 36 C44 36 44 14 54 14" />
      <path d="M34 36 H54" />
      <path d="M34 36 C44 36 44 58 54 58" />
      <path d="M80 14 C87 14 87 7 94 7" />
      <path d="M80 14 C87 14 87 21 94 21" />
    </g>
    <rect x="4" y="28" width="30" height="16" rx="4" fill={ROOT_FILL} stroke={ROOT_STROKE} strokeWidth="1.5" />
    <g fill="#fff" stroke={NODE_STROKE} strokeWidth="1.2">
      <rect x="54" y="8" width="26" height="12" rx="3" />
      <rect x="54" y="30" width="26" height="12" rx="3" />
      <rect x="54" y="52" width="26" height="12" rx="3" />
      <rect x="94" y="2" width="22" height="10" rx="3" />
      <rect x="94" y="16" width="22" height="10" rx="3" />
    </g>
  </svg>
)

// マインドマップ：中心から全方向へ直線でつなぐ（フリー展開のノードは楕円）
const MINDMAP_CHILDREN = [
  [14, 36], [106, 36], [30, 10], [90, 10], [30, 62], [90, 62],
] as const
const mindmapPreview = (
  <svg width="100%" viewBox="0 0 120 72" fill="none" style={{ display: 'block', maxWidth: 150, margin: '0 auto' }}>
    <g stroke={NODE_STROKE} strokeWidth="1.2">
      {MINDMAP_CHILDREN.map(([x, y]) => <line key={`${x}-${y}`} x1="60" y1="36" x2={x} y2={y} />)}
    </g>
    <ellipse cx="60" cy="36" rx="18" ry="10" fill={ROOT_FILL} stroke={ROOT_STROKE} strokeWidth="1.5" />
    <g fill="#fff" stroke={NODE_STROKE} strokeWidth="1.2">
      {MINDMAP_CHILDREN.map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="11" ry="7" />)}
    </g>
  </svg>
)

export const TEMPLATES: { type: MapType; label: string; desc: string; uses: string[]; preview: React.ReactNode }[] = [
  {
    type: 'linear',
    label: 'ロジックツリー',
    desc: 'テーマを分解して筋道立てて整理',
    uses: ['課題の原因分析', '手順・タスクの洗い出し', '企画や文章の構成づくり'],
    preview: logicTreePreview,
  },
  {
    type: 'free',
    label: 'マインドマップ',
    desc: '中心から連想を自由に広げる',
    uses: ['ブレインストーミング', 'アイデア出し', '会議メモ・学習ノート'],
    preview: mindmapPreview,
  },
]

// テンプレートの説明と用途（モーダルとホーム画面で共通）
export function TemplateDescription({ desc, uses }: { desc: string; uses: string[] }) {
  return (
    <div style={{ textAlign: 'left', width: '100%' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{desc}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {uses.map((u) => (
          <li key={u} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
            {u}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TemplateSelectModal() {
  const { templateModalOpen, templateModalMode, addSheet, setCurrentSheetMapType, closeTemplateModal } =
    useMindmapStore(
      useShallow((s) => ({
        templateModalOpen: s.templateModalOpen,
        templateModalMode: s.templateModalMode,
        addSheet: s.addSheet,
        setCurrentSheetMapType: s.setCurrentSheetMapType,
        closeTemplateModal: s.closeTemplateModal,
      }))
    )

  const handleSelect = (mapType: MapType) => {
    if (templateModalMode === 'init') {
      setCurrentSheetMapType(mapType)
    } else {
      addSheet(mapType)
    }
  }

  return (
    <AnimatePresence>
      {templateModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={templateModalMode === 'new' ? closeTemplateModal : undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.98)',
              borderRadius: 24,
              padding: '32px 28px',
              width: 'min(480px, calc(100vw - 32px))',
              boxSizing: 'border-box',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1e1b4b', textAlign: 'center' }}>
              テンプレートを選択
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {TEMPLATES.map(({ type, label, desc, uses, preview }) => (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  style={{
                    flex: '1 1 180px', minWidth: 0, border: '1.5px solid rgba(0,0,0,0.08)',
                    borderRadius: 16, padding: 16, textAlign: 'left',
                    background: '#fafafa', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'
                    e.currentTarget.style.background = '#f5f3ff'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
                    e.currentTarget.style.background = '#fafafa'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ background: '#f5f3ff', borderRadius: 10, padding: 8 }}>
                    {preview}
                  </div>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>{label}</p>
                    <TemplateDescription desc={desc} uses={uses} />
                  </div>
                </button>
              ))}
            </div>

            {templateModalMode === 'new' && (
              <button
                onClick={closeTemplateModal}
                style={{
                  marginTop: 16, width: '100%', padding: '8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#94a3b8',
                }}
              >
                キャンセル
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
