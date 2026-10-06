import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMindmapStore } from '../../mindmap/store/mindmapStore'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { Sidebar, type HomeSection } from './Sidebar'
import { TopBar, type TopBarVariant } from './TopBar'
import { MapGrid } from './MapGrid'
import { TrashView } from './TrashView'
import {
  getActiveSheets,
  getRecentSheets,
  getStarredSheets,
  getTrashedSheets,
} from '../utils/sheetSelectors'

type StaticSection = Exclude<HomeSection, 'folder'>

const SECTION_TITLE: Record<StaticSection, string> = {
  recent: '最近使用した項目',
  all: 'すべてのマップ',
  starred: 'スター付き',
  trash: 'ゴミ箱',
}

const SECTION_EMPTY_MESSAGE: Record<StaticSection, string> = {
  recent: 'まだマップがありません',
  all: 'まだマップがありません',
  starred: 'スターしたマップはまだありません',
  trash: 'ゴミ箱は空です',
}

const SECTION_TOPBAR_VARIANT: Record<StaticSection, TopBarVariant> = {
  recent: 'recent',
  all: 'library',
  starred: 'library',
  trash: 'trash',
}

export function HomeScreen() {
  const sheets = useMindmapStore(useShallow((s) => s.sheets))
  const folders = useMindmapStore(useShallow((s) => s.folders))
  const isMobile = useIsMobile()
  const [section, setSection] = useState<HomeSection>('recent')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'updatedAt' | 'name'>('updatedAt')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSectionChange = (next: HomeSection) => {
    setSection(next)
    setSelectedFolderId(null)
    if (isMobile) setSidebarOpen(false)
  }

  const handleSelectFolder = (folderId: string) => {
    setSection('folder')
    setSelectedFolderId(folderId)
    if (isMobile) setSidebarOpen(false)
  }

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null

  const filteredSheets = useMemo(() => {
    const base =
      section === 'recent' ? getRecentSheets(sheets)
      : section === 'all' ? getActiveSheets(sheets)
      : section === 'starred' ? getStarredSheets(sheets)
      : section === 'trash' ? getTrashedSheets(sheets)
      : section === 'folder' ? getActiveSheets(sheets).filter((s) => s.folderId === selectedFolderId)
      : []

    const query = searchQuery.trim().toLowerCase()
    const filtered = query ? base.filter((s) => s.name.toLowerCase().includes(query)) : base

    // 最近使用した項目は常にlastOpenedAt降順のまま（ソートUIなし）
    if (section === 'recent') return filtered

    return [...filtered].sort((a, b) =>
      sortKey === 'name'
        ? a.name.localeCompare(b.name, 'ja')
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [sheets, section, selectedFolderId, searchQuery, sortKey])

  const title = section === 'folder' ? selectedFolder?.name ?? 'フォルダ' : SECTION_TITLE[section]
  const emptyMessage = section === 'folder' ? 'このフォルダにマップはありません' : SECTION_EMPTY_MESSAGE[section]
  const topBarVariant: TopBarVariant = section === 'folder' ? 'library' : SECTION_TOPBAR_VARIANT[section]

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--c-bg)' }}>
      {isMobile ? (
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}
              />
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 301 }}
              >
                <Sidebar
                  section={section}
                  onSectionChange={handleSectionChange}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={handleSelectFolder}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <Sidebar
          section={section}
          onSectionChange={handleSectionChange}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
        />
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          padding: isMobile ? '16px' : '28px 40px',
        }}
      >
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--c-border)',
              background: 'var(--c-surface)',
              color: 'var(--c-text-2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Menu size={15} />
            メニュー
          </button>
        )}
        <TopBar
          variant={topBarVariant}
          title={title}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {section === 'trash' ? (
          <TrashView sheets={filteredSheets} viewMode={viewMode} />
        ) : (
          <MapGrid
            sheets={filteredSheets}
            viewMode={viewMode}
            variant="normal"
            emptyMessage={emptyMessage}
          />
        )}
      </div>
    </div>
  )
}
