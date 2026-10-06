import type { Sheet } from '../../mindmap/store/mindmapStore'
import { MapCard } from './MapCard'

interface Props {
  sheets: Sheet[]
  viewMode: 'grid' | 'list'
  variant: 'normal' | 'trash'
  emptyMessage: string
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

  return (
    <div
      style={
        viewMode === 'grid'
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }
          : { display: 'flex', flexDirection: 'column', gap: 8 }
      }
    >
      {sheets.map((sheet) => (
        <MapCard key={sheet.id} sheet={sheet} viewMode={viewMode} variant={variant} />
      ))}
    </div>
  )
}
