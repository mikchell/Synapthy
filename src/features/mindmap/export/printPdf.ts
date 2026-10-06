import { getNodesBounds, getViewportForBounds, type ReactFlowInstance } from '@xyflow/react'
import { toast } from 'sonner'
import { useMindmapStore } from '../store/mindmapStore'

// マインドマップを、ブラウザの印刷機能で PDF にする
// 画像ではなく、文字も線もベクターのまま印刷されるので、拡大しても粗くならず、文字の選択・コピーもできる
// 流れ：全体が1ページに収まる表示にして、画面の部品を隠し、印刷ダイアログを開く（「PDFに保存」を選んでもらう）
// 印刷用の見た目は index.css の `body.print-map` にまとめている

const MM_TO_PX = 96 / 25.4
const PAGE_MM = { long: 297, short: 210 } // A4
const MARGIN_MM = 8
const FIT_PADDING = '24px'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let printing = false

export async function printMapAsPdf(rf: ReactFlowInstance, sheetName: string): Promise<void> {
  if (printing) return
  const nodes = rf.getNodes()
  if (nodes.length === 0) {
    toast.info('書き出すノードがありません')
    return
  }

  printing = true
  const body = document.body
  const html = document.documentElement

  // マップの縦横比に合わせて、用紙の向きを決める
  const bounds = getNodesBounds(nodes)
  const landscape = bounds.width >= bounds.height
  const pageW = landscape ? PAGE_MM.long : PAGE_MM.short
  const pageH = landscape ? PAGE_MM.short : PAGE_MM.long
  // 余白の分を引いた、印刷できる範囲（はみ出して2ページ目ができないよう、少し小さくする）
  const printW = Math.floor((pageW - MARGIN_MM * 2) * MM_TO_PX) - 2
  const printH = Math.floor((pageH - MARGIN_MM * 2) * MM_TO_PX) - 2

  // 元に戻すために、いまの状態を控えておく
  const prevViewport = rf.getViewport()
  const prevTheme = html.dataset.theme
  const prevTitle = document.title
  const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))

  const pageStyle = document.createElement('style')
  pageStyle.textContent = `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: ${MARGIN_MM}mm; }`
  document.head.appendChild(pageStyle)

  let restored = false
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined
  const restore = () => {
    if (restored) return
    restored = true
    window.removeEventListener('afterprint', restore)
    window.removeEventListener('pointerdown', restore)
    clearTimeout(fallbackTimer)
    body.classList.remove('print-map')
    body.style.removeProperty('--print-w')
    body.style.removeProperty('--print-h')
    pageStyle.remove()
    document.title = prevTitle
    if (prevTheme) html.dataset.theme = prevTheme
    else delete html.dataset.theme
    rf.setViewport(prevViewport, { duration: 0 })
    if (selectedIds.size > 0) {
      useMindmapStore.setState((st) => ({ nodes: st.nodes.map((n) => (selectedIds.has(n.id) ? { ...n, selected: true } : n)) }))
    }
    printing = false
  }

  try {
    // 選択の枠や操作ボタンが印刷に写らないよう、選択を外す
    if (selectedIds.size > 0) {
      useMindmapStore.setState((st) => ({ nodes: st.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)) }))
    }
    // 紙に刷るので、背景が白いライトテーマの色にする（ダークテーマのまま刷ると、暗い背景でインクを使う）
    html.dataset.theme = 'light'
    // 保存するときの、ファイル名の候補になる
    document.title = sheetName.trim() || 'マインドマップ'
    body.style.setProperty('--print-w', `${printW}px`)
    body.style.setProperty('--print-h', `${printH}px`)
    body.classList.add('print-map')

    // 全体が、印刷できる範囲にちょうど収まる表示にする
    await rf.setViewport(getViewportForBounds(bounds, printW, printH, 0.05, 2, FIT_PADDING), { duration: 0 })
    // 表示が整うのを待つ（テーマの切り替え・ノードの再配置・画像の描画）
    await nextFrame()
    await nextFrame()
    await wait(150)

    window.addEventListener('afterprint', restore)
    window.print()
    // 印刷ダイアログを閉じても afterprint が届かない環境のために、保険をかける
    // （画面の部品が隠れたままにならないよう、画面を触ったとき、または5分たったときに、元に戻す。
    //  ダイアログが開いている間は、ページに操作が届かないので、このリスナーが先に働くことはない）
    if (!restored) {
      window.addEventListener('pointerdown', restore)
      fallbackTimer = setTimeout(restore, 5 * 60_000)
    }
  } catch (err) {
    restore()
    toast.error(err instanceof Error ? err.message : 'PDFの書き出しに失敗しました')
  }
}
