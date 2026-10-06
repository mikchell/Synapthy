import { motion } from 'framer-motion'
import { Loader2, LogOut, Save } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { useMindmapStore } from '../store/mindmapStore'
import { ConfirmDialog } from './ConfirmDialog'
import { SynaptiqueIcon, WORDMARK_COLOR } from '../../../components/SynaptiqueIcon'
import { ThemeToggle } from '../../../components/ThemeToggle'

export function Header() {
  const { user, signOut } = useAuth()
  const isMobile = useIsMobile()
  const isSaving = useMindmapStore((s) => s.isSaving)
  const setCurrentView = useMindmapStore((s) => s.setCurrentView)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

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
          <SynaptiqueIcon size={isMobile ? 30 : 36} />
          <span
            style={{
              fontSize: isMobile ? 14 : 18,
              fontWeight: 700,
              color: WORDMARK_COLOR,
            }}
          >
            Synaptique
          </span>
        </button>

        {/* 右側 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <ThemeToggle />
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

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <button
                onClick={() => setLogoutConfirmOpen(true)}
                title="ログアウト"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: '1px solid var(--c-border)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  color: 'var(--c-text-2)',
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 500,
                }}
              >
                <LogOut size={13} />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </motion.header>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="ログアウト"
        description="ログアウトしますか？ローカルの変更は保存済みです。"
        confirmLabel="ログアウト"
        onConfirm={() => { setLogoutConfirmOpen(false); signOut() }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
