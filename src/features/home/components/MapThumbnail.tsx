import { useEffect, useState } from 'react'
import { getNodeImageSignedUrl } from '../../../lib/imageApi'
import { findTemplate, isTemplatePath } from '../../../lib/thumbnailTemplates'

interface Props {
  sheetId: string
  thumbnailPath?: string | null
}

// シートIDから、毎回同じになる淡い（パステル）色を決める
// （保存しなくても、同じシートはいつも同じ色になる。IDは書式が決まっているので、ハッシュで色相に散らす）
function pastelColor(sheetId: string): string {
  let hash = 2166136261
  for (let i = 0; i < sheetId.length; i++) {
    hash ^= sheetId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const hue = (hash >>> 0) % 360
  return `hsl(${hue} 70% 85%)`
}

// ホームのカードのサムネイル。画像が設定されていればそれを、なければシートごとのパステルカラーを表示する
export function MapThumbnail({ sheetId, thumbnailPath }: Props) {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null)
  const [failedPath, setFailedPath] = useState<string | null>(null)

  // テンプレート画像は同梱の静的ファイルなので、署名付きURLは要らない
  const templateSrc = findTemplate(thumbnailPath)?.src

  useEffect(() => {
    if (!thumbnailPath || isTemplatePath(thumbnailPath)) return
    let cancelled = false
    getNodeImageSignedUrl(thumbnailPath)
      .then((url) => { if (!cancelled) setLoaded({ path: thumbnailPath, url }) })
      .catch(() => { if (!cancelled) setFailedPath(thumbnailPath) })
    return () => { cancelled = true }
  }, [thumbnailPath])

  // 取得中・取得に失敗したときは、パステルカラーのままにしておく
  const url = templateSrc ?? (thumbnailPath && !isTemplatePath(thumbnailPath) && loaded?.path === thumbnailPath && failedPath !== thumbnailPath ? loaded.url : null)

  return (
    <div style={{ width: '100%', height: '100%', background: pastelColor(sheetId) }}>
      {url && (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => setFailedPath(thumbnailPath ?? null)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </div>
  )
}
