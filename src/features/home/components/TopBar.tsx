import { Grid2x2, List as ListIcon, Plus, Search } from 'lucide-react'
import { useMindmapStore } from '../../mindmap/store/mindmapStore'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { ThemeToggle } from '../../../components/ThemeToggle'

export type TopBarVariant = 'recent' | 'library' | 'trash'

interface Props {
  variant: TopBarVariant
  title: string
  searchQuery: string
  onSearchChange: (v: string) => void
  sortKey: 'updatedAt' | 'name'
  onSortChange: (v: 'updatedAt' | 'name') => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (v: 'grid' | 'list') => void
}

export function TopBar({
  variant,
  title,
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  viewMode,
  onViewModeChange,
}: Props) {
  const addSheet = useMindmapStore((s) => s.addSheet)
  const isMobile = useIsMobile()

  const showSort = variant === 'library'
  const showNewButton = variant === 'recent' || variant === 'library'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--c-text)' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ThemeToggle />
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            color="var(--c-text-3)"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ファイルを検索"
            style={{
              width: isMobile ? 150 : 220,
              padding: '8px 12px 8px 32px',
              borderRadius: 10,
              border: '1px solid var(--c-border)',
              fontSize: 13,
              outline: 'none',
              background: 'var(--c-bg-subtle)',
              color: 'var(--c-text)',
            }}
          />
        </div>

        {showSort && (
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as 'updatedAt' | 'name')}
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: '1px solid var(--c-border)',
              fontSize: 12,
              color: 'var(--c-text-2)',
              background: 'var(--c-surface)',
              cursor: 'pointer',
            }}
          >
            <option value="updatedAt">更新日時順</option>
            <option value="name">名前順</option>
          </select>
        )}

        <button
          onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
          title="表示切替"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 10,
            border: '1px solid var(--c-border)',
            background: 'var(--c-surface)',
            color: 'var(--c-text-2)',
            cursor: 'pointer',
          }}
        >
          {viewMode === 'grid' ? <ListIcon size={15} /> : <Grid2x2 size={15} />}
        </button>

        {showNewButton && (
          <button
            onClick={() => addSheet()}
            data-tour="new-sheet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            }}
          >
            <Plus size={14} />
            新規作成
          </button>
        )}
      </div>
    </div>
  )
}
