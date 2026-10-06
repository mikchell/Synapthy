import type { Sheet } from '../../../types/sheet'
import { MapCard } from './MapCard'

interface Props {
  sheets: Sheet[]
  viewMode: 'grid' | 'list'
  variant: 'normal' | 'trash'
  emptyMessage: string
}

const GAP = 16
const MIN_CARD_WIDTH = 200 // 枚数が多いときのカードの最小幅
const MAX_CARD_WIDTH = 480 // 枚数が少ないときも、これ以上は大きくしない

// グリッド表示の列の定義。表示するシートが少ないほどカードを大きくし、多いほど小さくする
// （通常の一覧とゴミ箱の一覧のどちらでも、いま表示しているカードの数で決める）
// - 列の数は枚数の平方根に近い数（1枚=1列、2〜4枚=2列、5〜9枚=3列、10〜16枚=4列…）
// - 画面の幅に入りきらないときは、最小幅を守って列を減らす
// - サムネイルの高さは、カードの幅に比例して変わる（MapCard 側で縦横比を固定している）
function gridColumnsFor(count: number): string {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)))
  const target = `calc((100% - ${GAP * (cols - 1)}px) / ${cols})`
  return `repeat(auto-fill, minmax(min(100%, ${MAX_CARD_WIDTH}px, max(${MIN_CARD_WIDTH}px, ${target})), ${MAX_CARD_WIDTH}px))`
}

export function MapGrid({ sheets, viewMode, variant, emptyMessage }: Props) {
  if (sheets.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          color: 'var(--c-text-3)',
          fontSize: 13,
        }}
      >
        {emptyMessage}
      </div>
    )
  }

  const gridTemplateColumns = gridColumnsFor(sheets.length)

  return (
    <div
      style={
        viewMode === 'grid'
          ? { display: 'grid', gridTemplateColumns, gap: GAP }
          : { display: 'flex', flexDirection: 'column', gap: 8 }
      }
    >
      {sheets.map((sheet) => (
        <MapCard key={sheet.id} sheet={sheet} viewMode={viewMode} variant={variant} />
      ))}
    </div>
  )
}
