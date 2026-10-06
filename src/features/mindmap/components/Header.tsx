import { motion } from 'framer-motion'
import { Loader2, Save } from 'lucide-react'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { useMindmapStore } from '../store/mindmapStore'
import { SynapthyIcon, WORDMARK_COLOR } from '../../../components/SynapthyIcon'
import { ExportMenu } from './ExportMenu'

export function Header() {
  const isMobile = useIsMobile()
  const isSaving = useMindmapStore((s) => s.isSaving)
  const setCurrentView = useMindmapStore((s) => s.setCurrentView)

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 24px',
          background: 'var(--c-glass)',
          borderBottom: '1px solid var(--c-border)',
          backdropFilter: 'blur(20px)',
          zIndex: 200,
        }}
      >
        {/* ロゴ（クリックでホームに戻る） */}
        <button
          onClick={() => setCurrentView('home')}
          title="ホームに戻る"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <SynapthyIcon size={isMobile ? 30 : 36} />
          <span
            style={{
              fontSize: isMobile ? 14 : 18,
              fontWeight: 700,
              color: WORDMARK_COLOR,
            }}
          >
            Synapthy
          </span>
        </button>

        {/* 右側：書き出しと保存状態（ログアウト・使い方・テーマの切替は、サイドバーの下部） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <ExportMenu />
          {/* 保存状態 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isSaving ? (
              <>
                <Loader2 size={13} color="var(--c-text-3)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--c-text-3)', fontSize: isMobile ? 11 : 12, fontWeight: 500 }}>保存中...</span>
              </>
            ) : (
              <>
                <Save size={13} color="#22c55e" />
                <span style={{ color: '#22c55e', fontSize: isMobile ? 11 : 12, fontWeight: 500 }}>自動保存済み</span>
              </>
            )}
          </div>

        </div>
      </motion.header>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
