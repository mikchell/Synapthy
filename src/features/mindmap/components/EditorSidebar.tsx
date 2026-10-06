import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Folder as FolderIcon, Home, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMindmapStore, type Sheet } from '../store/mindmapStore'
import { getActiveSheets } from '../../home/utils/sheetSelectors'
import { MapThumbnail } from '../../home/components/MapThumbnail'

export const SIDEBAR_WIDTH = 240
export const SIDEBAR_RAIL_WIDTH = 48

const STORAGE_KEY = 'synaptique:editor-sidebar-open'

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

// 編集画面のサイドバーの開閉。PC では状態を保存して次回も維持し、モバイルでは常に閉じた状態から始める
export function useEditorSidebar(isMobile: boolean) {
  const [open, setOpenState] = useState(() => (isMobile ? false : readStoredOpen()))

  const setOpen = (next: boolean) => {
    setOpenState(next)
    if (isMobile) return
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // 保存できなくても開閉はできる
    }
  }

  // キャンバスや浮かぶボタンが避ける幅。モバイルでは重ねて表示するので 0
  const occupiedWidth = isMobile ? 0 : open ? SIDEBAR_WIDTH : SIDEBAR_RAIL_WIDTH

  return { open, setOpen, occupiedWidth }
}

const ITEM_BTN = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  background: isActive ? 'var(--c-accent-soft)' : 'transparent',
  color: isActive ? 'var(--c-accent)' : 'var(--c-text-2)',
  fontSize: 13,
  fontWeight: isActive ? 600 : 500,
  cursor: 'pointer',
  textAlign: 'left',
})

const ICON_BTN: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  color: 'var(--c-text-2)',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
}

function SheetItem({
  sheet,
  isActive,
  showDelete,
  onSelect,
  onDelete,
}: {
  sheet: Sheet
  isActive: boolean
  showDelete: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', sheet.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
    >
      <button onClick={onSelect} title={sheet.name} style={ITEM_BTN(isActive)}>
        {/* アイコン程度の大きさのサムネイル（MapThumbnail は枠いっぱいに広がるので、枠の大きさはここで決める） */}
        <span
          style={{
            position: 'relative',
            width: 24,
            height: 24,
            borderRadius: 6,
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid var(--c-border)',
          }}
        >
          <MapThumbnail sheetId={sheet.id} thumbnailPath={sheet.thumbnailPath} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sheet.name}
        </span>
      </button>
      {(hovered || showDelete) && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="ゴミ箱に入れる"
          style={{
            position: 'absolute',
            right: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'var(--c-bg-subtle)',
            color: 'var(--c-text-3)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

// シートをドロップしてフォルダに移すための枠（ラベルと中のシートをひとまとめにして、全体を受け皿にする）
function DropGroup({ folderId, children }: { folderId: string | null; children: React.ReactNode }) {
  const moveSheetToFolder = useMindmapStore((s) => s.moveSheetToFolder)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => {
        // 枠の中の子要素に移っただけのときは、ハイライトを消さない
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const sheetId = e.dataTransfer.getData('text/plain')
        if (sheetId) moveSheetToFolder(sheetId, folderId)
      }}
      style={{
        borderRadius: 10,
        outline: dragOver ? '2px solid var(--c-accent)' : 'none',
        outlineOffset: -2,
        background: dragOver ? 'var(--c-accent-soft)' : 'transparent',
        minHeight: 28,
      }}
    >
      {children}
    </div>
  )
}

function GroupLabel({ name, showIcon }: { name: string; showIcon: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 12px 4px', color: 'var(--c-text-3)' }}>
      {showIcon && <FolderIcon size={12} />}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}

export function EditorSidebar({ open, onOpenChange, isMobile }: Props) {
  const sheets = useMindmapStore(useShallow((s) => s.sheets))
  const folders = useMindmapStore(useShallow((s) => s.folders))
  const currentSheetId = useMindmapStore((s) => s.currentSheetId)
  const switchSheet = useMindmapStore((s) => s.switchSheet)
  const addSheet = useMindmapStore((s) => s.addSheet)
  const moveSheetToTrash = useMindmapStore((s) => s.moveSheetToTrash)
  const setCurrentView = useMindmapStore((s) => s.setCurrentView)

  const active = getActiveSheets(sheets)
  const uncategorized = active.filter((s) => !s.folderId || !folders.some((f) => f.id === s.folderId))

  const handleSelect = (id: string) => {
    switchSheet(id)
    if (isMobile) onOpenChange(false)
  }

  // 編集中のシートを消すときは、先に別のシートへ移ってから、ゴミ箱に入れる（最後の1枚のときだけホームに戻る）
  const handleDelete = (id: string) => {
    if (id === currentSheetId) {
      const next = active.find((s) => s.id !== id)
      if (next) switchSheet(next.id)
    }
    moveSheetToTrash(id)
  }

  const handleAdd = () => {
    addSheet()
    if (isMobile) onOpenChange(false)
  }

  // PC で閉じているときは、アイコンだけの細い帯にする
  if (!isMobile && !open) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 56,
          left: 0,
          bottom: 0,
          width: SIDEBAR_RAIL_WIDTH,
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '12px 0',
          borderRight: '1px solid var(--c-border)',
          background: 'var(--c-bg-subtle)',
        }}
      >
        <button onClick={() => onOpenChange(true)} title="サイドバーを開く" style={ICON_BTN}>
          <PanelLeftOpen size={16} />
        </button>
        <button onClick={() => setCurrentView('home')} title="ホーム" style={ICON_BTN}>
          <Home size={16} />
        </button>
        <button onClick={handleAdd} title="新しいシート" style={ICON_BTN}>
          <Plus size={16} />
        </button>
      </div>
    )
  }

  const panel = (
    <div
      style={{
        position: 'fixed',
        top: isMobile ? 0 : 56,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        zIndex: isMobile ? 301 : 150,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--c-border)',
        background: 'var(--c-bg-subtle)',
        padding: '12px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', letterSpacing: 0.4, paddingLeft: 12 }}>
          メニュー
        </span>
        <button onClick={() => onOpenChange(false)} title="サイドバーを閉じる" style={ICON_BTN}>
          <PanelLeftClose size={16} />
        </button>
      </div>

      <button onClick={() => setCurrentView('home')} style={ITEM_BTN(false)}>
        <Home size={16} />
        ホーム
      </button>
      <button onClick={handleAdd} style={ITEM_BTN(false)}>
        <Plus size={16} />
        新しいシート
      </button>

      <nav style={{ flex: 1, overflowY: 'auto', marginTop: 4, borderTop: '1px solid var(--c-border)' }}>
        <DropGroup folderId={null}>
          <GroupLabel name="未分類" showIcon={false} />
          {uncategorized.map((s) => (
            <SheetItem key={s.id} sheet={s} isActive={s.id === currentSheetId} showDelete={isMobile} onSelect={() => handleSelect(s.id)} onDelete={() => handleDelete(s.id)} />
          ))}
        </DropGroup>
        {/* 空のフォルダにもドロップできるように、シートが入っていないフォルダも表示する */}
        {folders.map((folder) => (
          <DropGroup key={folder.id} folderId={folder.id}>
            <GroupLabel name={folder.name} showIcon />
            {active.filter((s) => s.folderId === folder.id).map((s) => (
              <SheetItem key={s.id} sheet={s} isActive={s.id === currentSheetId} showDelete={isMobile} onSelect={() => handleSelect(s.id)} onDelete={() => handleDelete(s.id)} />
            ))}
          </DropGroup>
        ))}
      </nav>
    </div>
  )

  if (!isMobile) {
    return (
      <motion.div initial={{ x: -SIDEBAR_WIDTH }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }}>
        {panel}
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}
          />
          <motion.div
            initial={{ x: -SIDEBAR_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_WIDTH }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
          >
            {panel}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// モバイルで閉じているときに出す、サイドバーを開くボタン
export function EditorSidebarOpenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="サイドバーを開く"
      style={{
        ...ICON_BTN,
        position: 'fixed',
        top: 68,
        left: 12,
        zIndex: 150,
        background: 'var(--c-glass)',
        border: '1px solid var(--c-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <PanelLeftOpen size={16} />
    </button>
  )
}
