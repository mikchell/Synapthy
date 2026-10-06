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

## テンプレートを追加するには

1. 画像を長辺 640px 程度の JPEG にして `public/thumbnails/<id>.jpg` に置く
2. `src/lib/thumbnailTemplates.ts` の `THUMBNAIL_TEMPLATES` に `t('<id>', '表示名')` を追加する
3. この表に出典を追記する
