import type { Sheet } from '../../mindmap/store/mindmapStore'
import { MapCard } from './MapCard'

interface Props {
  sheets: Sheet[]
  viewMode: 'grid' | 'list'
  variant: 'normal' | 'trash'
  emptyMessage: string
}

// グリッド表示のカードの大きさ。表示するシートが少ないときほど大きくして、余白を活かす
// （通常の一覧とゴミ箱の一覧のどちらでも、いま表示しているカードの数で決める）
function gridSizeFor(count: number): { minCardWidth: number; thumbnailHeight: number } {
  if (count <= 2) return { minCardWidth: 360, thumbnailHeight: 220 }
  if (count <= 5) return { minCardWidth: 280, thumbnailHeight: 170 }
  return { minCardWidth: 200, thumbnailHeight: 130 }
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

  const { minCardWidth, thumbnailHeight } = gridSizeFor(sheets.length)

  return (
    <div
      style={
        viewMode === 'grid'
          ? { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(${minCardWidth}px, 100%), 1fr))`, gap: 16 }
          : { display: 'flex', flexDirection: 'column', gap: 8 }
      }
    >
      {sheets.map((sheet) => (
        <MapCard key={sheet.id} sheet={sheet} viewMode={viewMode} variant={variant} thumbnailHeight={thumbnailHeight} />
      ))}
    </div>
  )
}
