import type { Node } from '@xyflow/react'
import { supabase } from './supabase'
import type { AnyNodeData, ImageNodeData, MindmapNodeData } from '../features/mindmap/store/mindmapStore'

const BUCKET = 'node-images'
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 7 // 7日
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024 // 20MB（これを超える貼り付けは処理前に弾く）
const MAX_UPLOAD_DIM = 1600 // アップロードする画像の最大辺（px）
const UPLOAD_QUALITY = 0.85
const DISPLAY_MAX_DIM = 320 // ボード上に置いたときの初期表示サイズの最大辺（px）

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// 貼り付けた画像を最大1600pxに縮小・WebP再圧縮してからアップロードする
// （ノート: 巨大なスクリーンショットをそのまま保存するとストレージ容量を圧迫するため）
async function compressForUpload(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_UPLOAD_DIM / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', UPLOAD_QUALITY)
    )
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// クリップボードの画像を圧縮した上でSupabase Storageにアップロードし、保存用のパスを返す
export async function uploadNodeImage(file: File): Promise<string> {
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('画像サイズが大きすぎます（20MBまで）')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError ?? new Error('未ログインです')

  const uploadFile = await compressForUpload(file)
  const ext = uploadFile.type.split('/')[1] ?? 'png'
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, uploadFile)
  if (error) throw error
  return path
}

// 画像ファイルをアップロードし、ボードに置くための情報（保存パス・初期表示サイズ）を返す
// クリップボード貼り付け・ファイル選択どちらの入力経路からも共通で使う
export async function processAndUploadImage(
  file: File
): Promise<{ path: string; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, DISPLAY_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
    const path = await uploadNodeImage(file)
    return {
      path,
      width: Math.round(img.naturalWidth * scale),
      height: Math.round(img.naturalHeight * scale),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// 表示用の署名付きURLを取得（非公開バケットのため毎回発行する）
export async function getNodeImageSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)
  if (error) throw error
  return data.signedUrl
}

export async function deleteNodeImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

// 複数の画像をまとめて削除（シートの完全削除・リセット時の孤立ファイル掃除用）
export async function deleteNodeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}

// ノード配列が参照しているストレージパスを抽出する
// （ボードに置いた画像ノードと、ノードに付けた画像の両方）
export function getImagePaths(nodes: Node<AnyNodeData>[]): string[] {
  return nodes.flatMap((n) => {
    if (n.type === 'imageNode') return [(n.data as ImageNodeData).path]
    const image = (n.data as MindmapNodeData).image
    return image ? [image.path] : []
  })
}
