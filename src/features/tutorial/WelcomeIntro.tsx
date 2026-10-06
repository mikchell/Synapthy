import { motion, useReducedMotion } from 'framer-motion'
import { SynapthyIcon } from '../../components/SynapthyIcon'

// 導入画面を自動で次へ進めるまでの時間
export const WELCOME_INTRO_MS = 6500

const TITLE = 'Welcome to Synapthy!'

// 画面のあちこちを漂う、小さなロゴ。毎回同じ配置になるよう、決まった式で散らす
const FLOATERS = Array.from({ length: 18 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return {
    left: 3 + r(1) * 90,
    top: 4 + r(2) * 88,
    size: 16 + Math.round(r(3) * 40),
    dx: (r(4) - 0.5) * 40,
    dy: (r(5) - 0.5) * 36,
    duration: 5 + r(6) * 6,
    delay: r(7) * 1.5,
    opacity: 0.25 + r(8) * 0.35,
  }
})

// 中央のロゴの周りを回る、2つの輪（半径は画面の短い辺に対する割合、向きと速さが違う）
const RINGS = [
  { count: 6, radius: 27, size: 34, seconds: 11, direction: 1 },
  { count: 9, radius: 42, size: 24, seconds: 17, direction: -1 },
] as const

// 中央で踊るロゴの動き：かがむ → ジャンプしながら一回転 → 着地してつぶれる → 小さく跳ねる → 揺れる
const DANCE_TIMES = [0, 0.15, 0.4, 0.55, 0.7, 0.85, 1]
const DANCE_BEAT_S = 2.4

// 最初の「ようこそ」で、画面全体を使って出す、S のロゴが踊るアニメーション
// クリックで次へ進む（何もしなくても、一定の時間で自動で進む）
export function WelcomeIntro({ onNext }: { onNext: () => void }) {
  // 動きを減らす設定の人には、止まった状態で見せる
  const reduceMotion = useReducedMotion()
  const loop = reduceMotion ? 0 : Infinity

  return (
    <motion.div
      role="button"
      aria-label="Welcome to Synapthy! クリックで次へ進みます"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onNext}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1002,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'radial-gradient(circle at 50% 45%, rgba(124,58,237,0.6), rgba(8,8,28,0.92) 70%)',
      }}
    >
      {/* 背景：画面じゅうを漂う小さなロゴ */}
      {FLOATERS.map((f, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -45 }}
          animate={
            reduceMotion
              ? { scale: 1, rotate: 0 }
              : {
                  scale: 1,
                  rotate: [-45, 25, -20, 30, -45],
                  x: ['0vw', `${f.dx}vw`, `${-f.dx / 2}vw`, `${f.dx / 3}vw`, '0vw'],
                  y: ['0vh', `${-f.dy}vh`, `${f.dy / 2}vh`, `${f.dy}vh`, '0vh'],
                }
          }
          transition={{
            scale: { type: 'spring', stiffness: 200, damping: 14, delay: f.delay * 0.4 },
            default: { duration: f.duration, delay: f.delay, ease: 'easeInOut', repeat: loop },
          }}
          style={{ position: 'absolute', left: `${f.left}%`, top: `${f.top}%`, opacity: f.opacity }}
        >
          <SynapthyIcon size={f.size} />
        </motion.div>
      ))}

      {/* 中央のロゴの周りを回る輪 */}
      {RINGS.map((ring, ri) => (
        <motion.div
          key={ri}
          animate={reduceMotion ? undefined : { rotate: ring.direction * 360 }}
          transition={{ duration: ring.seconds, ease: 'linear', repeat: loop }}
          style={{ position: 'absolute', left: '50%', top: '42%', width: 0, height: 0 }}
        >
          {Array.from({ length: ring.count }, (_, i) => {
            const angle = (360 / ring.count) * i
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  transform: `rotate(${angle}deg) translateY(calc(${-ring.radius} * min(1vw, 1vh)))`,
                  marginLeft: -ring.size / 2,
                  marginTop: -ring.size / 2,
                }}
              >
                {/* 輪の上で、順番に拍に合わせて大きくなったり回ったりする */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.6, 1], rotate: [0, 180, 360] }}
                  transition={{
                    scale: reduceMotion ? { duration: 0.4 } : { duration: 1.2, delay: 0.6 + i * 0.18, repeat: loop, repeatDelay: 0.8 },
                    rotate: { duration: 1.2, delay: 0.6 + i * 0.18, repeat: loop, repeatDelay: 0.8 },
                  }}
                >
                  <SynapthyIcon size={ring.size} />
                </motion.div>
              </div>
            )
          })}
        </motion.div>
      ))}

      {/* 主役：中央で、ジャンプ・回転・つぶれを繰り返して踊るロゴ */}
      <div style={{ position: 'absolute', left: '50%', top: '42%', width: 0, height: 0 }}>
        {/* 地面の影：ジャンプで高く上がるほど、小さく薄くなる */}
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  scaleX: [1, 1.15, 0.45, 1.2, 0.8, 1.05, 1],
                  opacity: [0.45, 0.5, 0.12, 0.5, 0.28, 0.45, 0.45],
                }
          }
          transition={{ duration: DANCE_BEAT_S, times: DANCE_TIMES, ease: 'easeInOut', repeat: loop }}
          style={{
            position: 'absolute',
            left: -70,
            top: 92,
            width: 140,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            filter: 'blur(6px)',
          }}
        />
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={
            reduceMotion
              ? { scale: 1, rotate: 0 }
              : {
                  scale: 1,
                  y: [0, 0, -120, 0, -48, 0, 0],
                  scaleX: [1, 1.25, 0.85, 1.3, 0.95, 1.15, 1],
                  scaleY: [1, 0.75, 1.2, 0.7, 1.1, 0.85, 1],
                  rotate: [0, -10, 180, 350, 368, 354, 360],
                }
          }
          transition={{
            scale: { type: 'spring', stiffness: 160, damping: 12 },
            default: { duration: DANCE_BEAT_S, times: DANCE_TIMES, ease: 'easeInOut', repeat: loop, delay: 0.5 },
          }}
          style={{
            position: 'absolute',
            left: -70,
            top: -70,
            transformOrigin: '50% 100%',
            filter: 'drop-shadow(0 12px 24px rgba(124,58,237,0.7))',
          }}
        >
          <SynapthyIcon size={140} />
        </motion.div>
      </div>

      {/* タイトル：文字が順に跳ねて、波のように動く */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '72%',
          textAlign: 'center',
          color: '#fff',
          fontSize: 'clamp(24px, 5vw, 44px)',
          fontWeight: 800,
          letterSpacing: 1,
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {Array.from(TITLE).map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.05, type: 'spring', stiffness: 220, damping: 14 }}
            style={{ display: 'inline-block' }}
          >
            <motion.span
              animate={reduceMotion ? undefined : { y: [0, -14, 0] }}
              transition={{ duration: 1.1, delay: 1.8 + i * 0.07, repeat: loop, repeatDelay: 1.2, ease: 'easeInOut' }}
              style={{ display: 'inline-block' }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.45, 0.8] }}
        transition={{ delay: 2, duration: 2, repeat: loop }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 28,
          textAlign: 'center',
          color: '#fff',
          fontSize: 12,
        }}
      >
        クリックで次へ ・ Esc でスキップ
      </motion.div>
    </motion.div>
  )
}
