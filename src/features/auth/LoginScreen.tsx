import { motion } from 'framer-motion'
import { useAuth } from './useAuth'
import { SynaptiqueIcon, WORDMARK_COLOR } from '../../components/SynaptiqueIcon'

export function LoginScreen() {
  const { signInWithGoogle } = useAuth()

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--c-bg)',
        backgroundImage: `radial-gradient(circle, var(--c-dot) 1.5px, transparent 1.5px)`,
        backgroundSize: '24px 24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          background: 'var(--c-glass)',
          border: '1px solid var(--c-border)',
          borderRadius: 24,
          padding: '48px 40px',
          width: 360,
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* ロゴ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SynaptiqueIcon size={80} />
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: WORDMARK_COLOR,
              }}
            >
              Synaptique
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--c-text-3)', fontSize: 13 }}>
              アイデアをつなげよう
            </p>
          </div>
        </div>

        {/* Googleログインボタン */}
        <button
          onClick={() => signInWithGoogle()}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: 12,
            border: '1px solid var(--c-border)',
            background: 'var(--c-surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--c-text)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
            e.currentTarget.style.borderColor = 'var(--c-border)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
            e.currentTarget.style.borderColor = 'var(--c-border)'
          }}
        >
          <GoogleIcon />
          Googleでログイン
        </button>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
