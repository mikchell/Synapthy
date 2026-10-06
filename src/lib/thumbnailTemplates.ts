// ホームのカードのサムネイルに使える、あらかじめ用意した画像（public/thumbnails/ に同梱）
// sheets.data.thumbnailPath には `template:<id>` の形で保存する（Storage にはアップロードしない）

export type ThumbnailCategory = 'scenery' | 'art' | 'watercolor' | 'japan' | 'space'

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
  { id: 'watercolor', label: '水彩画' },
  { id: 'japan', label: '日本美術' },
  { id: 'space', label: '宇宙' },
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
    t('starry-night-vangogh', '星月夜（ゴッホ）', 'art'),
  t('sunflowers', 'ひまわり（ゴッホ）', 'art'),
  t('water-lilies', '睡蓮（モネ）', 'art'),
  t('impression-sunrise', '印象・日の出（モネ）', 'art'),
  t('the-kiss', '接吻（クリムト）', 'art', 'center 18%'),
  t('pearl-earring', '真珠の耳飾りの少女（フェルメール）', 'art', 'center 30%'),
  t('birth-of-venus', 'ヴィーナスの誕生（ボッティチェリ）', 'art'),
  t('grande-jatte', 'グランド・ジャット島の日曜日の午後（スーラ）', 'art'),
  t('fighting-temeraire', '戦艦テメレール号（ターナー）', 'art'),
  // 水彩画（すべてパブリックドメインまたはCC0）
  t('turner-venice-salute', 'ヴェネツィア、サルーテ聖堂の夕暮れ（ターナー）', 'watercolor'),
  t('turner-lucerne', '湖上から見たルツェルン（ターナー）', 'watercolor'),
  t('turner-dark-rigi', '朝のリギ山とルツェルン湖（ターナー）', 'watercolor'),
  t('homer-watching-ships', '船を見つめる（ウィンスロー・ホーマー）', 'watercolor'),
  t('homer-on-the-sands', '砂浜にて（ウィンスロー・ホーマー）', 'watercolor'),
  t('sargent-rio-mendicanti', 'ヴェネツィア、ディ・メンディカンティ運河（サージェント）', 'watercolor'),
  t('sargent-campo-frari', 'ヴェネツィア、フラーリ広場（サージェント）', 'watercolor'),
  t('cezanne-sainte-victoire', 'サント＝ヴィクトワール山と高架橋（セザンヌ）', 'watercolor'),
  t('durer-turf', '大きな芝草（デューラー）', 'watercolor'),
  t('constable-borrowdale', 'ボローデール、晴れた日の夕べ（コンスタブル）', 'watercolor'),
  t('girtin-findlater', 'フィンドレイター城（ガーティン）', 'watercolor'),
  t('klee-strict-landscape', '青の厳格な風景（クレー）', 'watercolor'),
  // 日本美術（すべてパブリックドメインまたはCC0）
  t('great-wave', '神奈川沖浪裏（葛飾北斎）', 'japan'),
  t('red-fuji', '凱風快晴（葛飾北斎）', 'japan'),
  t('kajikazawa', '甲州石班沢（葛飾北斎）', 'japan'),
  t('ejiri', '駿州江尻（葛飾北斎）', 'japan'),
  t('goten-yama', '東海道品川御殿山の不二（葛飾北斎）', 'japan'),
  t('poppies', 'ケシ（葛飾北斎）', 'japan'),
  t('sudden-shower', '大はしあたけの夕立（歌川広重）', 'japan', 'center 30%'),
  t('kameido-plum', '亀戸梅屋舗（歌川広重）', 'japan', 'center 40%'),
  t('ryogoku-fireworks', '両国花火（歌川広重）', 'japan', 'center 8%'),
  t('kanbara-snow', '蒲原 夜之雪（歌川広重）', 'japan'),
  t('irises-korin', '燕子花図（尾形光琳）', 'japan'),
  t('plum-korin', '紅白梅図屏風（尾形光琳）', 'japan'),
  t('wind-thunder-gods', '風神雷神図屏風（俵屋宗達）', 'japan'),
  // 宇宙（NASAの画像。すべてパブリックドメイン）
  t('earthrise', '地球の出（アポロ8号）', 'space'),
  t('blue-marble', 'ブルー・マーブル（アポロ17号）', 'space'),
  t('pillars-of-creation', '創造の柱（ハッブル）', 'space'),
  t('orion-nebula', 'オリオン大星雲（ハッブル）', 'space'),
  t('crab-nebula', 'かに星雲（ハッブル）', 'space'),
  t('sombrero-galaxy', 'ソンブレロ銀河（ハッブル）', 'space'),
  t('whirlpool-galaxy', '子持ち銀河（ハッブル）', 'space'),
  t('cosmic-cliffs', 'カリーナ星雲の宇宙の崖（ウェッブ）', 'space'),
  t('saturn', '土星（カッシーニ）', 'space'),
  t('jupiter', '木星（ボイジャー1号）', 'space'),
]

export const toTemplatePath = (id: string) => `${PREFIX}${id}`

// 用意したテンプレートからランダムに1つ選び、thumbnailPath に保存する形で返す（新規作成したシートの初期サムネイル用）
export const randomTemplatePath = (): string =>
  toTemplatePath(THUMBNAIL_TEMPLATES[Math.floor(Math.random() * THUMBNAIL_TEMPLATES.length)].id)

// thumbnailPath がテンプレートを指しているか（Storage 上のファイルではないので、削除や署名付きURLの取得は不要）
export const isTemplatePath = (path: string | null | undefined): path is string =>
  typeof path === 'string' && path.startsWith(PREFIX)

// thumbnailPath から対応するテンプレートを探す。見つからなければ undefined（デフォルト表示に戻す）
export const findTemplate = (path: string | null | undefined): ThumbnailTemplate | undefined =>
  isTemplatePath(path) ? THUMBNAIL_TEMPLATES.find((tpl) => tpl.id === path.slice(PREFIX.length)) : undefined
