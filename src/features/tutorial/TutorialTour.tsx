import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useIsMobile } from '../../hooks/useIsMobile'
import { notifyLimit } from '../../lib/limits'
import { useMindmapStore } from '../mindmap/store/mindmapStore'
import { markTutorialCompleted, useTutorialStore } from './tutorialStore'
import { TUTORIAL_STEPS, type TutorialStep } from './steps'
import { WELCOME_INTRO_MS, WelcomeIntro } from './WelcomeIntro'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const CARD_WIDTH = 380
const MARGIN = 16
const SPOT_PADDING = 6

// 対象の要素の位置を追い続ける（サイドバーの開閉や、ノードの表示のアニメーションにも付いていく）
// 画面に無いときは、少しの間は直前の位置を保ち（表示の遅れで、カードが中央に飛ばないように）、
// それでも見つからなければ null を返して、ステップは中央に出る
const MISSING_GRACE_MS = 800

function useTargetRect(selector: string | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }
    let frame = 0
    const startedAt = performance.now()
    const tick = () => {
      const el = document.querySelector(selector)
      const r = el?.getBoundingClientRect()
      const found = r && r.width > 0 && r.height > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null
      setRect((prev) => {
        // 見つからない間は、猶予のあいだだけ直前の位置のままにする
        if (!found) return performance.now() - startedAt < MISSING_GRACE_MS ? prev : null
        return prev && prev.x === found.x && prev.y === found.y && prev.w === found.w && prev.h === found.h ? prev : found
      })
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [selector])

  return rect
}

// 説明のカードを置く位置。対象の右、下、上、左の順に、画面に収まる場所を選ぶ
function placeCard(rect: Rect, cardH: number): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampX = (x: number) => Math.min(Math.max(MARGIN, x), vw - CARD_WIDTH - MARGIN)
  const clampY = (y: number) => Math.min(Math.max(MARGIN, y), vh - cardH - MARGIN)

  if (rect.x + rect.w + MARGIN + CARD_WIDTH <= vw - MARGIN) {
    return { left: rect.x + rect.w + MARGIN, top: clampY(rect.y + rect.h / 2 - cardH / 2) }
  }
  if (rect.y + rect.h + MARGIN + cardH <= vh - MARGIN) {
    return { left: clampX(rect.x + rect.w / 2 - CARD_WIDTH / 2), top: rect.y + rect.h + MARGIN }
  }
  if (rect.y - MARGIN - cardH >= MARGIN) {
    return { left: clampX(rect.x + rect.w / 2 - CARD_WIDTH / 2), top: rect.y - MARGIN - cardH }
  }
  return { left: clampX(rect.x - MARGIN - CARD_WIDTH), top: clampY(rect.y + rect.h / 2 - cardH / 2) }
}

// 編集画面を開く前に、開けるシートを用意する（ゴミ箱に入っているシートや、シートが無い状態を避ける）
function ensureOpenableSheet() {
  const s = useMindmapStore.getState()
  const current = s.sheets.find((sh) => sh.id === s.currentSheetId)
  if (current && !current.deletedAt) return
  const first = s.sheets.find((sh) => !sh.deletedAt)
  if (first) s.switchSheet(first.id)
  else if (!s.addSheet()) notifyLimit('sheets')
}

// 説明文を読みやすくする：文ごとに段落を分け、「ボタン名」などの「」の中は太字で目立たせる
function TutorialBody({ text }: { text: string }) {
  const sentences = text.split(/(?<=。)/).filter((t) => t.trim())
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sentences.map((sentence, i) => (
        <p key={i} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.75, color: 'var(--c-text)' }}>
          {sentence.split(/(「[^」]*」)/).map((part, j) =>
            part.startsWith('「') ? (
              <strong key={j} style={{ fontWeight: 700, color: 'var(--c-accent)' }}>{part}</strong>
            ) : (
              part
            )
          )}
        </p>
      ))}
    </div>
  )
}

const BTN_BASE = {
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  padding: '9px 18px',
} as const

export function TutorialTour() {
  const active = useTutorialStore((s) => s.active)
  const stepIndex = useTutorialStore((s) => s.stepIndex)
  const setStepIndex = useTutorialStore((s) => s.setStepIndex)
  const close = useTutorialStore((s) => s.close)
  const isMobile = useIsMobile()

  const steps = useMemo(() => TUTORIAL_STEPS.filter((s) => !(isMobile && s.desktopOnly)), [isMobile])
  const step: TutorialStep | undefined = steps[Math.min(stepIndex, steps.length - 1)]
  const isLast = stepIndex >= steps.length - 1

  const cardRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const [cardH, setCardH] = useState(200)
  const rect = useTargetRect(active ? (isMobile && step?.mobileTarget ? step.mobileTarget : step?.target) : undefined)

  // ステップに合わせて、画面（ホーム／編集）を切り替える
  useEffect(() => {
    if (!active || !step) return
    const s = useMindmapStore.getState()
    if (step.view === 'home') {
      if (s.currentView !== 'home') s.setCurrentView('home')
      return
    }
    ensureOpenableSheet()
    if (useMindmapStore.getState().currentView !== 'editor') s.setCurrentView('editor')
  }, [active, step])

  // 「＋」を見せるステップの間だけ、中心テーマを選択状態にする
  const selectRoot = active && !!step?.selectRoot
  useEffect(() => {
    if (!selectRoot) return
    const setRootSelected = (selected: boolean) =>
      useMindmapStore.setState((st) => ({
        nodes: st.nodes.map((n) => {
          const isRoot = n.id === 'root' || !!(n.data as { isRoot?: boolean }).isRoot
          return n.selected === (selected && isRoot) ? n : { ...n, selected: selected && isRoot }
        }),
      }))
    // 編集画面に切り替わって、ノードが出てから選択する
    const timer = setTimeout(() => setRootSelected(true), 300)
    return () => {
      clearTimeout(timer)
      setRootSelected(false)
    }
  }, [selectRoot])

  const finish = useCallback(() => {
    markTutorialCompleted()
    close()
  }, [close])

  const goNext = useCallback(() => {
    if (isLast) finish()
    else setStepIndex(stepIndex + 1)
  }, [isLast, finish, setStepIndex, stepIndex])

  const goPrev = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }, [setStepIndex, stepIndex])

  // 導入のアニメーションは、一定の時間が過ぎたら自動で次へ進む
  const isIntro = active && !!step?.intro
  useEffect(() => {
    if (!isIntro) return
    const timer = setTimeout(goNext, WELCOME_INTRO_MS)
    return () => clearTimeout(timer)
  }, [isIntro, goNext])

  // キーボード：Esc でスキップ、←→ で前後に移る（導入では Enter / スペースでも進む）
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (isIntro && (e.key === 'Enter' || e.key === ' ')) goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, isIntro, finish, goNext, goPrev])

  // ステップが変わるたびに、「次へ」にフォーカスを移す
  useEffect(() => {
    if (active) primaryRef.current?.focus({ preventScroll: true })
  }, [active, stepIndex])

  // カードの高さを測る（置く位置の計算に使う）
  useEffect(() => {
    if (!active) return
    const h = cardRef.current?.offsetHeight
    if (h) setCardH(h)
  }, [active, stepIndex, isMobile])

  if (!active || !step) return null

  // 導入は番号に数えない（最初のカードが「1」になる）
  const introCount = steps.filter((s) => s.intro).length
  const body = isMobile && step.mobileBody ? step.mobileBody : step.body

  // カードの位置：対象があればその近く、無ければ画面の中央。モバイルは画面の下（対象が下半分なら上）に固定
  const cardPosition: React.CSSProperties = isMobile
    ? rect && rect.y + rect.h / 2 > window.innerHeight / 2
      ? { top: MARGIN, left: MARGIN, right: MARGIN }
      : { bottom: MARGIN, left: MARGIN, right: MARGIN }
    : rect
      ? placeCard(rect, cardH)
      : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <>
      {/* 導入のステップは、説明のカードを出さず、画面全体のアニメーションだけを見せる（次へ進むときは、ふわっと消える） */}
      <AnimatePresence>{step.intro && <WelcomeIntro key="welcome" onNext={goNext} />}</AnimatePresence>

      {/* 後ろの画面を操作できないようにする */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />

      {/* 対象を明るく残して、まわりを暗くする */}
      {step.intro ? null : rect ? (
        <div
          style={{
            position: 'fixed',
            left: rect.x - SPOT_PADDING,
            top: rect.y - SPOT_PADDING,
            width: rect.w + SPOT_PADDING * 2,
            height: rect.h + SPOT_PADDING * 2,
            borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            outline: '2px solid var(--c-accent)',
            pointerEvents: 'none',
            zIndex: 1001,
            transition: 'left 0.25s ease, top 0.25s ease, width 0.25s ease, height 0.25s ease',
          }}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: 1001 }} />
      )}

      {!step.intro && (
      <motion.div
        key={step.id}
        ref={cardRef}
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          zIndex: 1002,
          width: isMobile ? undefined : CARD_WIDTH,
          padding: '20px 22px 18px',
          borderRadius: 16,
          background: 'var(--c-surface)',
          color: 'var(--c-text)',
          border: '2px solid var(--c-accent)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          ...cardPosition,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-accent)', letterSpacing: 0.4 }}>
            {stepIndex + 1 - introCount} / {steps.length - introCount}
          </span>
          {!isLast && (
            <button
              onClick={finish}
              style={{ border: 'none', background: 'none', color: 'var(--c-text-2)', fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              スキップ
            </button>
          )}
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 800, color: 'var(--c-text)' }}>{step.title}</h2>
        <TutorialBody text={body} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          {stepIndex > introCount && (
            <button
              onClick={goPrev}
              style={{ ...BTN_BASE, border: '1px solid var(--c-border)', background: 'var(--c-bg-subtle)', color: 'var(--c-text-2)' }}
            >
              戻る
            </button>
          )}
          <button
            ref={primaryRef}
            onClick={goNext}
            style={{
              ...BTN_BASE,
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            }}
          >
            {isLast ? '完了' : '次へ'}
          </button>
        </div>
      </motion.div>
      )}
    </>
  )
}
