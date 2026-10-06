import { toast } from 'sonner'
import { deleteNodeImage, processAndUploadImage } from '../../../lib/imageApi'
import { useMindmapStore } from '../store/mindmapStore'
import type { MindmapNodeData } from '../../../types/mindmap'

// ノードに付ける画像の操作（ファイル選択と貼り付けの両方から使う）

// ノードの中に表示するときの最大辺（px）
const NODE_IMAGE_MAX_DIM = 220

const findNodeImage = (nodeId: string) => {
  const node = useMindmapStore.getState().nodes.find((n) => n.id === nodeId && n.type === 'mindmapNode')
  return node ? { exists: true, image: (node.data as MindmapNodeData).image } : { exists: false, image: undefined }
}

// 中心テーマには画像を付けられない
export const isRootNode = (n: { id: string; data: unknown }) =>
  n.id === 'root' || !!(n.data as { isRoot?: boolean }).isRoot

// 画像をアップロードしてノードに付ける。すでに画像があれば置き換え、古いファイルは削除する
// 画像を付けたノードは画像だけを見せたいので、入っていた文字は消す
export async function attachImageToNode(nodeId: string, file: File): Promise<void> {
  const target = useMindmapStore.getState().nodes.find((n) => n.id === nodeId)
  if (target && isRootNode(target)) {
    toast.info('中心テーマには画像を追加できません')
    return
  }
  try {
    const { path, width, height } = await processAndUploadImage(file)
    const { exists, image: previous } = findNodeImage(nodeId)
    if (!exists) {
      // アップロード中にノードが消されていたら、上げたファイルを片付ける
      deleteNodeImage(path).catch(() => {})
      return
    }
    const scale = Math.min(1, NODE_IMAGE_MAX_DIM / Math.max(width, height))
    const store = useMindmapStore.getState()
    store.setNodeImage(nodeId, {
      path,
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    })
    store.updateNodeLabel(nodeId, '')
    if (previous) deleteNodeImage(previous.path).catch(() => {})
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '画像の追加に失敗しました')
  }
}

// ノードから画像を外し、ストレージ上のファイルも削除する
export function removeImageFromNode(nodeId: string): void {
  const { image } = findNodeImage(nodeId)
  if (!image) return
  useMindmapStore.getState().setNodeImage(nodeId, null)
  deleteNodeImage(image.path).catch(() => {})
}
