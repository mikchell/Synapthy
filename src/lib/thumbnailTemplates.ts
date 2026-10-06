// ホームのカードのサムネイルに使える、あらかじめ用意した画像（public/thumbnails/ に同梱）
// sheets.data.thumbnailPath には `template:<id>` の形で保存する（Storage にはアップロードしない）

export type ThumbnailCategory = 'scenery' | 'art'

export interface ThumbnailTemplate {
  id: string
  label: string
  src: string
  category: ThumbnailCategory
  // カードに合わせて切り抜くときの表示位置（CSSの object-position）。縦長の絵で見せたい部分がずれるときに指定する
  position?: string
}

export const THUMBNAIL_CATEGORIES: { id: ThumbnailCategory; label: string }[] = [
  { id: 'scenery', label: '風景・抽象' },
  { id: 'art', label: '名画' },
]

const PREFIX = 'template:'

const t = (id: string, label: string, category: ThumbnailCategory = 'scenery', position?: string): ThumbnailTemplate => ({
  id, label, category, position, src: `/thumbnails/${id}.jpg`,
})

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
  // 名画（すべてパブリックドメイン。出典は docs/ASSETS.md）
  t('great-wave', '神奈川沖浪裏（葛飾北斎）', 'art'),
  t('red-fuji', '凱風快晴（葛飾北斎）', 'art'),
  t('sudden-shower', '大はしあたけの夕立（歌川広重）', 'art', 'center 30%'),
  t('starry-night-vangogh', '星月夜（ゴッホ）', 'art'),
  t('sunflowers', 'ひまわり（ゴッホ）', 'art'),
  t('water-lilies', '睡蓮（モネ）', 'art'),
  t('impression-sunrise', '印象・日の出（モネ）', 'art'),
  t('the-kiss', '接吻（クリムト）', 'art', 'center 18%'),
  t('pearl-earring', '真珠の耳飾りの少女（フェルメール）', 'art', 'center 30%'),
  t('birth-of-venus', 'ヴィーナスの誕生（ボッティチェリ）', 'art'),
  t('grande-jatte', 'グランド・ジャット島の日曜日の午後（スーラ）', 'art'),
  t('fighting-temeraire', '戦艦テメレール号（ターナー）', 'art'),
]

export const toTemplatePath = (id: string) => `${PREFIX}${id}`

// thumbnailPath がテンプレートを指しているか（Storage 上のファイルではないので、削除や署名付きURLの取得は不要）
export const isTemplatePath = (path: string | null | undefined): path is string =>
  typeof path === 'string' && path.startsWith(PREFIX)

// thumbnailPath から対応するテンプレートを探す。見つからなければ undefined（デフォルト表示に戻す）
export const findTemplate = (path: string | null | undefined): ThumbnailTemplate | undefined =>
  isTemplatePath(path) ? THUMBNAIL_TEMPLATES.find((tpl) => tpl.id === path.slice(PREFIX.length)) : undefined
