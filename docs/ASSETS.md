# 同梱している画像素材

## サムネイルのテンプレート画像（`public/thumbnails/`）

ホームのカードのサムネイルに選べる画像です。[Unsplash](https://unsplash.com/) の画像を、長辺 640px・JPEG に縮小して同梱しています。

- ライセンス: [Unsplash License](https://unsplash.com/license)（商用利用可・帰属表示は不要。ただし画像そのものを主たる価値とする再配布・販売は不可）
- 取得元: `https://images.unsplash.com/photo-<元画像ID>`（撮影者名はファイルの取得時に記録していないため、出典は元画像IDのみ）
- 画像の読み込みは同梱ファイルのみ。外部サイトの URL は参照しない

| ファイル | 内容 | 元画像ID |
|---|---|---|
| `starry-night.jpg` | 星空 | 1419242902214-272b3f66ee7a |
| `forest.jpg` | 森 | 1441974231531-c6227db76b6e |
| `dusk-sea.jpg` | 夕暮れの海 | 1475924156734-496f6cac6ec1 |
| `lake-tree.jpg` | 湖畔の木 | 1494500764479-0c8f2919a3d8 |
| `wheat-field.jpg` | 麦畑の夕日 | 1500382017468-9049fed747ef |
| `turquoise-lake.jpg` | ターコイズの湖 | 1501785888041-af3ef285b470 |
| `cloud-mountain.jpg` | 雲海の山 | 1506905925346-21bda4d32df4 |
| `beach.jpg` | ビーチ | 1507525428034-b723cf961d3e |
| `wave.jpg` | 波 | 1518837695005-2083093ee35b |
| `gradient-blue.jpg` | 青のグラデーション | 1557683316-973673baf926 |
| `gradient-rainbow.jpg` | 虹色のグラデーション | 1579546929518-9e396f3cc809 |
| `white-lines.jpg` | 白い曲線 | 1558591710-4b4a1ae0f04d |

### 名画（パブリックドメイン）

[Wikimedia Commons](https://commons.wikimedia.org/) で「Public domain」と表示されている作品（作者の没後70年以上、または制作から十分な年数が経った絵画・浮世絵）を、長辺 560px・JPEG に縮小して同梱しています。ライセンス表示は取得時に Commons の API で確認しました。

| ファイル | 作品 | 作者 | 出典 |
|---|---|---|---|
| `great-wave.jpg` | 神奈川沖浪裏 | 葛飾北斎 | [Commons](https://commons.wikimedia.org/wiki/File:Tsunami_by_hokusai_19th_century.jpg) |
| `red-fuji.jpg` | 凱風快晴 | 葛飾北斎 | [Commons](https://commons.wikimedia.org/wiki/File:Red_Fuji_southern_wind_clear_morning.jpg) |
| `sudden-shower.jpg` | 大はしあたけの夕立 | 歌川広重 | [Commons](https://commons.wikimedia.org/wiki/File:Hiroshige,_Sudden_shower_over_Shin-%C5%8Chashi_bridge_and_Atake,_1857.jpg) |
| `starry-night-vangogh.jpg` | 星月夜 | ゴッホ | [Commons](https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg) |
| `sunflowers.jpg` | ひまわり | ゴッホ | [Commons](https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Sunflowers_-_VGM_F458.jpg) |
| `water-lilies.jpg` | 睡蓮 | モネ | [Commons](https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1906,_Ryerson.jpg) |
| `impression-sunrise.jpg` | 印象・日の出 | モネ | [Commons](https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg) |
| `the-kiss.jpg` | 接吻 | クリムト | [Commons](https://commons.wikimedia.org/wiki/File:The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg) |
| `pearl-earring.jpg` | 真珠の耳飾りの少女 | フェルメール | [Commons](https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg) |
| `birth-of-venus.jpg` | ヴィーナスの誕生 | ボッティチェリ | [Commons](https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg) |
| `grande-jatte.jpg` | グランド・ジャット島の日曜日の午後 | スーラ | [Commons](https://commons.wikimedia.org/wiki/File:Georges_Seurat_-_A_Sunday_on_La_Grande_Jatte_--_1884_-_Google_Art_Project.jpg) |
| `fighting-temeraire.jpg` | 戦艦テメレール号 | ターナー | [Commons](https://commons.wikimedia.org/wiki/File:The_Fighting_Temeraire,_JMW_Turner,_National_Gallery.jpg) |

## テンプレートを追加するには

1. 画像を長辺 640px 程度の JPEG にして `public/thumbnails/<id>.jpg` に置く
2. `src/lib/thumbnailTemplates.ts` の `THUMBNAIL_TEMPLATES` に `t('<id>', '表示名')`（名画は第3引数に `'art'`、切り抜きの位置を変えたいときは第4引数に `'center 20%'` など）を追加する
3. この表に出典を追記する
