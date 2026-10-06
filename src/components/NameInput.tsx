import { useEffect, useRef, type ClipboardEvent, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent, type ChangeEvent, type Ref } from 'react'
import { toast } from 'sonner'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'maxLength' | 'style' | 'value'> {
  value: string
  // 上限の文字数
  max: number
  // 「シート名」「フォルダ名」など。切り詰めを知らせるときの文言に使う
  label: string
  // 入力欄の見た目
  style?: CSSProperties
  // 入力欄と文字数をまとめた、外側の配置（幅など）
  wrapperStyle?: CSSProperties
  ref?: Ref<HTMLInputElement>
}

// 文字（コードポイント）の数。絵文字を 1 文字として数える（DB の char_length と同じ数え方）
const count = (s: string) => Array.from(s).length

const OVER_COLOR = '#dc2626'

// 名前の入力欄。上限の文字数と、いま入力している文字数を、欄の右に「12/30」の形で表示する
//
// 日本語入力（IME）の変換中の文字には、ブラウザが maxLength を適用しない。そのため、変換中は上限を超えて入力でき、
// 確定したときに切り詰められる。入力そのものは止められないので、文字数を見せて（超えたら赤）、
// 切り詰められたときは、編集が終わるところで知らせる
export function NameInput({ value, max, label, style, wrapperStyle, ref, onChange, onKeyDown, onPaste, ...rest }: Props) {
  const n = count(value)
  const over = n > max

  // この編集の間に見た最大の文字数と、取り消し（Escape）されたか
  const peakRef = useRef(0)
  const cancelledRef = useRef(false)
  // 編集が終わるとき（入力欄が消えるとき）に、最後の値を読むための控え
  const latestRef = useRef({ value, max, label })
  useEffect(() => {
    latestRef.current = { value, max, label }
  })

  useEffect(() => {
    const latest = latestRef
    return () => {
      const { value: finalValue, max: limit, label: name } = latest.current
      // 途中で上限を超えた入力があったのに、いまは収まっている（＝確定で切り詰められた）ときだけ知らせる。
      // 取り消したとき（元の名前に戻るだけ）は、知らせない
      if (!cancelledRef.current && peakRef.current > limit && count(finalValue) <= limit) {
        toast.info(`${name}は${limit}文字までです。超えた分は切り詰めました`, { id: 'name-truncated' })
      }
    }
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    peakRef.current = Math.max(peakRef.current, count(e.target.value))
    onChange?.(e)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') cancelledRef.current = true
    onKeyDown?.(e)
  }

  // 上限を超える文字を貼り付けたときは、ブラウザが黙って切り詰める。そのため、貼り付けの時点で、超える分を数えておく
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const selected = el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0)
    const after = count(el.value) - count(selected) + count(e.clipboardData.getData('text'))
    peakRef.current = Math.max(peakRef.current, after)
    onPaste?.(e)
  }

  return (
    <div style={{ position: 'relative', ...wrapperStyle }}>
      <input
        {...rest}
        ref={ref}
        value={value}
        maxLength={max}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        style={{
          ...style,
          // 文字数の表示と重ならないよう、右を空ける。上限を超えているときは、赤い枠を重ねる
          paddingRight: 38,
          boxShadow: over ? `0 0 0 1px ${OVER_COLOR}` : style?.boxShadow,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 10,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: over ? 700 : 400,
          color: over ? OVER_COLOR : 'var(--c-text-3)',
          pointerEvents: 'none',
        }}
      >
        {n}/{max}
      </span>
    </div>
  )
}
