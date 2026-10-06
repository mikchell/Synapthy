import { Clock, Folder as FolderIcon, HelpCircle, LayoutGrid, LogOut, Pencil, Plus, RotateCcw, Star, Trash2, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useMindmapStore, type Folder } from '../../mindmap/store/mindmapStore'
import { LIMITS, notifyLimit } from '../../../lib/limits'
import { NameInput } from '../../../components/NameInput'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { ConfirmDialog } from '../../mindmap/components/ConfirmDialog'
import { SynapthyIcon, WORDMARK_COLOR } from '../../../components/SynapthyIcon'
import { resetTutorial, useTutorialStore } from '../../tutorial/tutorialStore'
import { toast } from 'sonner'

export type HomeSection = 'recent' | 'all' | 'starred' | 'trash' | 'folder'

interface Props {
  section: HomeSection
  onSectionChange: (section: HomeSection) => void
  selectedFolderId: string | null
  onSelectFolder: (id: string) => void
}

const NAV_ITEMS: { key: Exclude<HomeSection, 'folder'>; label: string; icon: LucideIcon }[] = [
  { key: 'recent', label: '最近使用した項目', icon: Clock },
  { key: 'all', label: 'すべてのマップ', icon: LayoutGrid },
  { key: 'starred', label: 'スター付き', icon: Star },
  { key: 'trash', label: 'ゴミ箱', icon: Trash2 },
]

const NAV_BTN = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 12px',
  borderRadius: 10,
  border: 'none',
  background: isActive ? 'var(--c-accent-soft)' : 'transparent',
  color: isActive ? 'var(--c-accent)' : 'var(--c-text-2)',
  fontSize: 13,
  fontWeight: isActive ? 600 : 500,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s ease',
  width: '100%',
})

function FolderRow({
  folder,
  isActive,
  onSelect,
}: {
  folder: Folder
  isActive: boolean
  onSelect: () => void
}) {
  const renameFolder = useMindmapStore((s) => s.renameFolder)
  const deleteFolder = useMindmapStore((s) => s.deleteFolder)
  const moveSheetToFolder = useMindmapStore((s) => s.moveSheetToFolder)
  const isMobile = useIsMobile()
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(folder.name)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) renameFolder(folder.id, trimmed)
    else setDraft(folder.name)
    setEditing(false)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const sheetId = e.dataTransfer.getData('text/plain')
        if (sheetId) moveSheetToFolder(sheetId, folder.id)
      }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        borderRadius: 10,
        outline: dragOver ? '2px solid var(--c-accent)' : 'none',
        outlineOffset: -2,
        background: dragOver ? 'var(--c-accent-soft)' : 'transparent',
      }}
    >
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', width: '100%' }}>
          <FolderIcon size={16} color="var(--c-text-3)" />
          <NameInput
            ref={inputRef}
            value={draft}
            max={LIMITS.folderNameLength}
            label="フォルダ名"
            wrapperStyle={{ flex: 1, minWidth: 0 }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setDraft(folder.name); setEditing(false) }
            }}
            style={{
              width: '100%',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 6,
              padding: '2px 6px',
              outline: 'none',
            }}
          />
        </div>
      ) : (
        <button onClick={onSelect} style={NAV_BTN(isActive)}>
          <FolderIcon size={16} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder.name}
          </span>
        </button>
      )}

      {!editing && (hovered || isMobile) && (
        <div style={{ position: 'absolute', right: 6, display: 'flex', gap: 2 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            title="フォルダ名を変更"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 6, border: 'none',
              background: 'var(--c-bg-subtle)', color: 'var(--c-text-3)', cursor: 'pointer', padding: 0,
            }}
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
            title="フォルダを削除"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 6, border: 'none',
              background: 'var(--c-bg-subtle)', color: 'var(--c-text-3)', cursor: 'pointer', padding: 0,
            }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="フォルダを削除しますか？"
        description={`「${folder.name}」を削除します。中のマップは未分類に戻ります。`}
        confirmLabel="削除"
        onConfirm={() => { setConfirmOpen(false); deleteFolder(folder.id) }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export function Sidebar({ section, onSectionChange, selectedFolderId, onSelectFolder }: Props) {
  const { user, signOut } = useAuth()
  const folders = useMindmapStore((s) => s.folders)
  const createFolder = useMindmapStore((s) => s.createFolder)
  const startTutorial = useTutorialStore((s) => s.start)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addingFolder) newFolderInputRef.current?.focus()
  }, [addingFolder])

  const commitNewFolder = () => {
    const trimmed = newFolderName.trim()
    if (trimmed && !createFolder(trimmed)) notifyLimit('folders')
    setNewFolderName('')
    setAddingFolder(false)
  }

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--c-border)',
        background: 'var(--c-bg-subtle)',
        padding: '20px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 20px' }}>
        <SynapthyIcon size={36} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: WORDMARK_COLOR,
          }}
        >
          Synapthy
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => onSectionChange(key)} style={NAV_BTN(section === key)}>
            <Icon size={16} />
            {label}
          </button>
        ))}

        <div
          data-tour="home-folders"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 12px 4px',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', letterSpacing: 0.4 }}>
            フォルダ
          </span>
          <button
            onClick={() => setAddingFolder(true)}
            title="新規フォルダ"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: 5, border: 'none',
              background: 'transparent', color: 'var(--c-text-3)', cursor: 'pointer', padding: 0,
            }}
          >
            <Plus size={13} />
          </button>
        </div>

        {folders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            isActive={section === 'folder' && selectedFolderId === folder.id}
            onSelect={() => onSelectFolder(folder.id)}
          />
        ))}

        {addingFolder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
            <FolderIcon size={16} color="var(--c-text-3)" />
            <NameInput
              ref={newFolderInputRef}
              value={newFolderName}
              max={LIMITS.folderNameLength}
              label="フォルダ名"
              wrapperStyle={{ flex: 1, minWidth: 0 }}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={commitNewFolder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNewFolder()
                if (e.key === 'Escape') { setNewFolderName(''); setAddingFolder(false) }
              }}
              placeholder="フォルダ名"
              style={{
                width: '100%',
                fontSize: 13,
                border: '1px solid rgba(124,58,237,0.4)',
                borderRadius: 6,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
        )}
      </nav>

      <button onClick={startTutorial} data-tour="tutorial-help" style={{ ...NAV_BTN(false), marginBottom: 8 }}>
        <HelpCircle size={16} />
        使い方
      </button>

      {/* 開発環境だけ：チュートリアルの完了状態をリセットして、最初から表示し直す */}
      {import.meta.env.DEV && (
        <button
          onClick={() => resetTutorial().catch(() => toast.error('チュートリアルのリセットに失敗しました'))}
          title="開発用：チュートリアルの完了状態を消して、最初から表示します"
          style={{ ...NAV_BTN(false), marginBottom: 8, border: '1px dashed var(--c-border)' }}
        >
          <RotateCcw size={16} />
          チュートリアルをリセット（開発用）
        </button>
      )}

      {user && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 8px 0',
            borderTop: '1px solid var(--c-border)',
          }}
        >
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.user_metadata?.full_name ?? user.email ?? 'ユーザー'}
          </span>
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            title="ログアウト"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--c-text-3)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="ログアウト"
        description="ログアウトしますか？ローカルの変更は保存済みです。"
        confirmLabel="ログアウト"
        onConfirm={() => { setLogoutConfirmOpen(false); signOut() }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  )
}
