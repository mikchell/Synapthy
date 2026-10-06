import { motion } from 'framer-motion'
import { ImagePlus, Pencil, RotateCcw, Star, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { useMindmapStore, type Sheet } from '../../mindmap/store/mindmapStore'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { ConfirmDialog } from '../../mindmap/components/ConfirmDialog'
import { deleteNodeImage, deleteNodeImages, getSheetImagePaths, uploadThumbnailImage } from '../../../lib/imageApi'
import { toTemplatePath } from '../../../lib/thumbnailTemplates'
import { MapThumbnail } from './MapThumbnail'
import { ThumbnailPicker } from './ThumbnailPicker'
import { formatRelativeTime } from '../utils/formatRelativeTime'

interface Props {
  sheet: Sheet
  viewMode: 'grid' | 'list'
  variant: 'normal' | 'trash'
}

const ACTION_BTN: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: 8,
  border: 'none',
  background: 'var(--c-glass)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  cursor: 'pointer',
  padding: 0,
}

// ドラッグ中に表示する画像を、カードを縮めたものにする
// （大きなカードのままだと、ドロップ先のフォルダを隠してしまい、狙いにくいため）
const DRAG_IMAGE_WIDTH = 160

function setSmallDragImage(e: React.DragEvent<HTMLElement>) {
  const clone = e.currentTarget.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    width: `${DRAG_IMAGE_WIDTH}px`,
    pointerEvents: 'none',
    transform: 'none',
    opacity: '0.9',
  })
  // 操作ボタン（ホバー時に出る）は、ドラッグ中の画像には要らない
  clone.querySelectorAll('button, select').forEach((el) => el.remove())
  document.body.appendChild(clone)
  e.dataTransfer.setDragImage(clone, 16, 16)
  // 画像として取り込まれたあとは不要なので、次のタイミングで外す
  setTimeout(() => clone.remove(), 0)
}

export function MapCard({ sheet, viewMode, variant }: Props) {
  const folders = useMindmapStore((s) => s.folders)
  const switchSheet = useMindmapStore((s) => s.switchSheet)
  const setCurrentView = useMindmapStore((s) => s.setCurrentView)
  const toggleSheetStar = useMindmapStore((s) => s.toggleSheetStar)
  const moveSheetToTrash = useMindmapStore((s) => s.moveSheetToTrash)
  const restoreSheetFromTrash = useMindmapStore((s) => s.restoreSheetFromTrash)
  const permanentlyDeleteSheet = useMindmapStore((s) => s.permanentlyDeleteSheet)
  const renameSheet = useMindmapStore((s) => s.renameSheet)
  const setSheetThumbnail = useMindmapStore((s) => s.setSheetThumbnail)
  const moveSheetToFolder = useMindmapStore((s) => s.moveSheetToFolder)
  const isMobile = useIsMobile()
  const [hovered, setHovered] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState(sheet.name)
  const inputRef = useRef<HTMLInputElement>(null)
  // サムネイル画像を選ぶためのファイル選択（画面には出さない）
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const isList = viewMode === 'list'

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed) renameSheet(sheet.id, trimmed)
    else setDraft(sheet.name)
    setEditing(false)
  }

  // 選んだ画像をサムネイルにする。前のサムネイル画像はストレージから削除する
  const handleThumbnailSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const previous = sheet.thumbnailPath
      const path = await uploadThumbnailImage(file)
      setSheetThumbnail(sheet.id, path)
      if (previous) deleteNodeImage(previous).catch(() => {})
      setPickerOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'サムネイルの変更に失敗しました')
    }
  }

  // 用意したテンプレート画像をサムネイルにする。前のサムネイルが自分の画像ならストレージから削除する
  const handleTemplateSelected = (id: string) => {
    const previous = sheet.thumbnailPath
    setSheetThumbnail(sheet.id, toTemplatePath(id))
    if (previous) deleteNodeImage(previous).catch(() => {})
    setPickerOpen(false)
  }

  const handleOpen = () => {
    if (variant === 'trash' || editing) return
    switchSheet(sheet.id)
    setCurrentView('editor')
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div
        draggable={variant === 'normal'}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', sheet.id)
          e.dataTransfer.effectAllowed = 'move'
          setSmallDragImage(e)
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleOpen}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isList ? 'row' : 'column',
          alignItems: isList ? 'center' : 'stretch',
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 14,
          overflow: 'hidden',
          cursor: variant === 'trash' ? 'default' : 'pointer',
          boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
          transform: hovered && variant !== 'trash' ? 'translateY(-2px)' : 'none',
        }}
      >
        <div
          style={{
            width: isList ? 110 : '100%',
            // リスト表示は固定の高さ。グリッド表示はカードの幅に比例させる（シートが少なくカードが大きいときは、サムネイルも大きくなる）
            ...(isList ? { height: 72 } : { aspectRatio: '16 / 10' }),
            flexShrink: 0,
            // 中の画像の大きさに枠が引き伸ばされないようにする（MapThumbnail は絶対配置で枠いっぱいに広がる）
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--c-bg-subtle)',
            borderRight: isList ? '1px solid var(--c-border)' : 'none',
            borderBottom: isList ? 'none' : '1px solid var(--c-border)',
          }}
        >
          <MapThumbnail sheetId={sheet.id} thumbnailPath={sheet.thumbnailPath} />
        </div>

        <div style={{ padding: isList ? '0 16px' : '10px 12px 12px', flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') { setDraft(sheet.name); setEditing(false) }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--c-text)',
                border: '1px solid rgba(124,58,237,0.4)',
                borderRadius: 6,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--c-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {sheet.name}
            </p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--c-text-3)' }}>
            最終編集: {formatRelativeTime(sheet.updatedAt)}
          </p>
        </div>

        {(hovered || isMobile) && (
          <div
            style={
              isList
                ? { display: 'flex', gap: 6, paddingRight: 16 }
                : { position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }
            }
          >
            {variant === 'normal' ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                  title="名前を変更"
                  style={ACTION_BTN}
                >
                  <Pencil size={12} color="var(--c-text-2)" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
                  title="サムネイル画像を変更"
                  style={ACTION_BTN}
                >
                  <ImagePlus size={13} color="var(--c-text-2)" />
                </button>
                <select
                  value={sheet.folderId ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => moveSheetToFolder(sheet.id, e.target.value || null)}
                  title="フォルダに移動"
                  style={{
                    maxWidth: 80,
                    height: 26,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--c-glass)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    color: 'var(--c-text-2)',
                    fontSize: 10,
                    padding: '0 4px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">未分類</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSheetStar(sheet.id) }}
                  title={sheet.isStarred ? 'スターを外す' : 'スターする'}
                  style={ACTION_BTN}
                >
                  <Star
                    size={13}
                    color={sheet.isStarred ? '#f59e0b' : 'var(--c-text-3)'}
                    fill={sheet.isStarred ? '#f59e0b' : 'none'}
                  />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveSheetToTrash(sheet.id) }}
                  title="ゴミ箱に入れる"
                  style={ACTION_BTN}
                >
                  <Trash2 size={13} color="var(--c-text-2)" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); restoreSheetFromTrash(sheet.id) }}
                  title="元に戻す"
                  style={ACTION_BTN}
                >
                  <RotateCcw size={13} color="var(--c-text-2)" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
                  title="完全に削除"
                  style={ACTION_BTN}
                >
                  <X size={13} color="#ef4444" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      </motion.div>

      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        onChange={handleThumbnailSelected}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'none' }}
      />

      <ThumbnailPicker
        open={pickerOpen}
        thumbnailPath={sheet.thumbnailPath}
        onSelectTemplate={handleTemplateSelected}
        onUpload={() => thumbnailInputRef.current?.click()}
        onClose={() => setPickerOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="完全に削除しますか？"
        description={`「${sheet.name}」を完全に削除します。この操作は取り消せません。`}
        confirmLabel="完全に削除"
        onConfirm={() => {
          setConfirmOpen(false)
          permanentlyDeleteSheet(sheet.id)
          const imagePaths = getSheetImagePaths(sheet)
          if (imagePaths.length > 0) deleteNodeImages(imagePaths).catch(() => {})
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
