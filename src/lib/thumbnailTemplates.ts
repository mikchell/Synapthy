// ホームのカードのサムネイルに使える、あらかじめ用意した画像（public/thumbnails/ に同梱）
// sheets.data.thumbnailPath には `template:<id>` の形で保存する（Storage にはアップロードしない）

export interface ThumbnailTemplate {
  id: string
  label: string
  src: string
}

const PREFIX = 'template:'

const t = (id: string, label: string): ThumbnailTemplate => ({ id, label, src: `/thumbnails/${id}.jpg` })

export const THUMBNAIL_TEMPLATES: ThumbnailTemplate[] = [
  t('starry-night', '星空'),
  t('forest', '森'),
  t('dusk-sea', '夕暮れの海'),
  t('lake-tree', '湖畔の木'),
  t('wheat-field', '麦畑の夕日'),
  t('turquoise-lake', 'ターコイズの湖'),
  t('cloud-mountain', '雲海の山'),
  t('beach', 'ビーチ'),
  t('wave', '波'),
  t('gradient-blue', '青のグラデーション'),
  t('gradient-rainbow', '虹色のグラデーション'),
  t('white-lines', '白い曲線'),
]

export const toTemplatePath = (id: string) => `${PREFIX}${id}`

// thumbnailPath がテンプレートを指しているか（Storage 上のファイルではないので、削除や署名付きURLの取得は不要）
export const isTemplatePath = (path: string | null | undefined): path is string =>
  typeof path === 'string' && path.startsWith(PREFIX)

// thumbnailPath から対応するテンプレートを探す。見つからなければ undefined（デフォルト表示に戻す）
export const findTemplate = (path: string | null | undefined): ThumbnailTemplate | undefined =>
  isTemplatePath(path) ? THUMBNAIL_TEMPLATES.find((tpl) => tpl.id === path.slice(PREFIX.length)) : undefined
