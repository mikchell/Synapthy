import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SynapthyIcon } from '../../../components/SynapthyIcon'
import { useMindmapStore } from '../store/mindmapStore'
import { useSheetLoadStatus } from '../hooks/useCurrentSheetLoader'

const textButton: CSSProperties = {
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid var(--c-border)',
  background: 'var(--c-surface)',
  color: 'var(--c-text)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

// 編集画面で開いたシートの中身を取得している間（と、取得に失敗したとき）に表示する画面
// ロゴの「S」が跳ねて、読み込み中であることを伝える（ウェルカム画面のロゴと同じ雰囲気）
export function SheetLoadScreen() {
  const reduceMotion = useReducedMotion()
  const currentSheetId = useMindmapStore((s) => s.currentSheetId)
  // いま開いているシートの失敗だけを表示する（別のシートの、前の失敗は出さない）
  const error = useSheetLoadStatus((s) => (s.error?.sheetId === currentSheetId ? s.error.message : null))
  const retry = useSheetLoadStatus((s) => s.retry)
  const setCurrentView = useMindmapStore((s) => s.setCurrentView)

  const still = reduceMotion || !!error

  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'var(--c-bg)',
        color: 'var(--c-text-2)',
        fontSize: 14,
      }}
    >
      <motion.div
        animate={
          still
            ? { y: 0, rotate: 0, scaleY: 1 }
            : { y: [0, -22, 0, 0], rotate: [0, -10, 10, 0], scaleY: [1, 1, 0.88, 1] }
        }
        transition={{ duration: 1.2, times: [0, 0.4, 0.75, 1], repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '50% 100%', filter: 'drop-shadow(0 10px 18px rgba(124,58,237,0.35))' }}
      >
        <SynapthyIcon size={72} />
      </motion.div>

      {error ? (
        <>
          <div style={{ fontWeight: 600, color: 'var(--c-text)' }}>{error}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={retry} style={textButton}>再読み込み</button>
            <button onClick={() => setCurrentView('home')} style={textButton}>ホームへ戻る</button>
          </div>
        </>
      ) : (
        <>
          <div>読み込み中…</div>
          {/* 読み込みが終わらないときの逃げ道（データの取得そのものに失敗した場合など） */}
          <button
            onClick={() => setCurrentView('home')}
            style={{ ...textButton, border: 'none', background: 'none', color: 'var(--c-text-3)', fontWeight: 400, fontSize: 13 }}
          >
            ホームへ戻る
          </button>
        </>
      )}
    </div>
  )
}
