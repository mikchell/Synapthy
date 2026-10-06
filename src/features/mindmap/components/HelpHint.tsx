import { motion } from 'framer-motion'
import { useIsMobile } from '../../../hooks/useIsMobile'

export function HelpHint() {
  const isMobile = useIsMobile()
  if (isMobile) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--c-glass)',
        border: '1px solid var(--c-border)',
        borderRadius: 100,
        padding: '6px 16px',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      {[
        { key: 'ダブルクリック', desc: '編集' },
        { key: '選択 → 追加', desc: '子ノード' },
        { key: 'スクロール', desc: 'ズーム' },
      ].map((hint) => (
        <div
          key={hint.key}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <kbd
            style={{
              background: 'var(--c-hover)',
              border: '1px solid var(--c-border)',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              color: 'var(--c-text-2)',
              fontFamily: 'inherit',
            }}
          >
            {hint.key}
          </kbd>
          <span style={{ color: 'var(--c-text-2)', fontSize: 11 }}>{hint.desc}</span>
        </div>
      ))}
    </motion.div>
  )
}
