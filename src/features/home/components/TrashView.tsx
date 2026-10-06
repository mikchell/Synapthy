import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useMindmapStore, type Sheet } from '../../mindmap/store/mindmapStore'
import { ConfirmDialog } from '../../mindmap/components/ConfirmDialog'
import { deleteNodeImages, getSheetImagePaths } from '../../../lib/imageApi'
import { MapGrid } from './MapGrid'

interface Props {
  sheets: Sheet[]
  viewMode: 'grid' | 'list'
}

export function TrashView({ sheets, viewMode }: Props) {
  const permanentlyDeleteSheet = useMindmapStore((s) => s.permanentlyDeleteSheet)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sheets.length > 0 && (
        <button
          onClick={() => setConfirmOpen(true)}
          style={{
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'none',
            color: '#ef4444',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={13} />
          ゴミ箱を空にする
        </button>
      )}

      <MapGrid sheets={sheets} viewMode={viewMode} variant="trash" emptyMessage="ゴミ箱は空です" />

      <ConfirmDialog
        open={confirmOpen}
        title="ゴミ箱を空にしますか？"
        description={`ゴミ箱内の${sheets.length}件のマップを完全に削除します。この操作は取り消せません。`}
        confirmLabel="空にする"
        onConfirm={() => {
          setConfirmOpen(false)
          sheets.forEach((s) => permanentlyDeleteSheet(s.id))
          const imagePaths = sheets.flatMap((s) => getSheetImagePaths(s))
          if (imagePaths.length > 0) deleteNodeImages(imagePaths).catch(() => {})
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
