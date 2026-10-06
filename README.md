# Synapthy

> 知識を貯めるだけでなく、つなげることで初めて価値が生まれる。

アイデアをつなげるマインドマップアプリ。ノードを右方向に展開し、思考の流れを視覚化します。

**https://synapthy.vercel.app/**

---

## 名前の由来

**Synapthy（シナプシー）** は、Synapse（シナプス）と *-pathy*（感じること）を組み合わせた造語です。

シナプスは、ギリシャ語の *synapsis*（結びつけること）に由来します。ニューロン同士をつなぐ接合部で、単体では意味を持たない情報がつながることで、記憶・思考・理解が生まれます。

*-pathy* は、ギリシャ語の *pathos*（感じること）に由来し、sympathy（共感）や empathy（感情移入）に使われる語尾です。

知識やメモは、貯めるだけでは「わかった」という実感に届きません。つなげて初めて、腑に落ちる。Synapthy は、この **「つながって、感じ取る」状態** を指す言葉です。音が sympathy に近いことにも、思考に寄り添う道具でありたいという願いを込めました。

---

## 画面例

<img width="1716" height="967" alt="image" src="https://github.com/user-attachments/assets/7d9eb2a8-4e86-4aae-a33d-79fe4612c1ef" />

---

## 主な機能

### ノード編集

- **右＋ボタン** — 子ノードを追加（次の世代、右へ展開）
- **下＋ボタン** — 兄弟ノードを追加（同じ世代、同じ深さ）
- **ダブルクリック** — ラベルをインライン編集（Enter で確定、Esc で取り消し）
- **文字の装飾** — 太字・文字色（ノード全体、または編集中に選んだ一部分）
- **ノードの見た目** — 色（6色）、サイズ（小・中・大）、枠線（太さ・あり/なし）、角丸・円形
- **線の色** — シートごとに、すべての線の色をまとめて変更
- **メモ** — ノードごとにメモを追加
- **画像** — ノード左上のボタンやクリップボードからの貼り付けで添付。ノードを選ばずに貼り付けると、自由に配置できる画像として置かれる（リサイズ・回転可）。中心テーマには画像を付けられない
- **削除** — ノード左上の削除ボタン（中心テーマは削除できない）

ノード追加時は既存ノードと重ならないよう、ツリー全体を自動で整列します。

### Undo / Redo

編集操作を自動で履歴に記録し、元に戻す／やり直すができます（シート単位）。⌘Z / Ctrl+Z、⇧⌘Z / Ctrl+Y にも対応。

### ホーム画面

ログイン後、まずホーム画面が表示されます。

- **マップ一覧** — カード形式のサムネイル付き一覧。表示するシートの数に応じて、カードとサムネイルの大きさが連続的に変わる（少ないほど大きく、多いほど小さく）。グリッドとリストの切り替え、検索、並び替え（更新日時・名前）に対応
- **サムネイル** — 同梱のテンプレート画像（風景・名画・水彩画・日本美術・宇宙の56点）から選ぶか、自分の画像をアップロード。新規作成したシートには、テンプレートからランダムに設定される。未設定のシートはシートごとのパステルカラー
- **スター** — お気に入りシートの固定表示
- **フォルダ** — シートをフォルダ分けして整理（フラット構造）。カードをサイドバーのフォルダへドラッグ&ドロップで移動でき、ドラッグ中はカードが縮小表示されるので、ドロップ先を狙いやすい
- **ゴミ箱** — 削除したシートを一時保管。復元・完全削除が可能
- **最近使用した項目** — 最終オープン日時で並び替え

### 編集画面のサイドバー

編集画面の左に、折りたためるサイドバーがあります（開閉の状態は保存され、次回も維持）。

- 一番上の「ホーム」で、ホーム画面に戻る
- 「新しいシート」で、シートを追加
- フォルダ別（未分類を先頭）のシート一覧。サムネイル付きで、クリックで編集中のシートを切り替え
- シートにカーソルを合わせて出るボタンから、ゴミ箱へ移動
- シートをフォルダ（空のフォルダ・未分類を含む）へドラッグ&ドロップで移動
- 下部に、「使い方」、ダークモード／ライトモードの切替、ログイン中のユーザー（ログアウト）を置く。閉じたときは、アイコンの帯の下部にアイコンだけが並ぶ
- モバイルでは、ボタンで開く重ね表示

### ガイドツアー（初回のチュートリアル）

初めて登録した人向けに、画面上のガイドツアーが自動で始まります。

- **導入** — S のロゴが画面全体で踊る「Welcome to Synapthy!」。約6.5秒で自動で進み、クリックでも進める
- **説明** — ホームと編集画面の各部分（新規作成、サムネイルの変更、フォルダ、ダークモード、ノードの追加、画像の追加と削除、ツールバー、サイドバー）を、明るくハイライトして説明する。ステップに合わせて画面も自動で切り替わる
- **操作** — 戻る・次へ・スキップ（Esc でもスキップ、←→ で前後に移動）。動きを減らす設定の人には、アニメーションを止める
- **見直し** — ホームと編集画面のサイドバー下部の「使い方」ボタンから、いつでも最初から見られる
- **初回の判定** — 完了またはスキップすると、Supabase のユーザー情報（`user_metadata.tutorialCompleted`）に保存する。フラグが無く、登録から7日以内の人にだけ自動で始める
- **開発環境のみ** — ホームのサイドバーに「チュートリアルをリセット（開発用）」ボタンが出る。自動で始める条件の「登録から7日以内」も無視される

### 書き出し（PDF・Markdown）

編集画面のヘッダーの「書き出し」から、編集中のシートを書き出せます。

- **PDF** — ブラウザの印刷機能を使い、マップ全体を用紙1枚（A4。マップの縦横比に合わせて横向きか縦向き）に収める。印刷の画面で、送信先を「PDFに保存」にする。画像ではなく、文字も線もベクターのままなので、拡大しても粗くならず、文字は選択・コピーできる。紙に刷る前提で、常にライトテーマの色になる
- **Markdown** — 階層をインデントした箇条書きにする（`<シート名>.md`）。同じ階層の順番は画面の上から下。メモは引用（`> `）、ノード全体または一部の太字は `**` で入る。画像だけのノードは「（画像）」になる

### 複数シート

複数のマインドマップを1つのワークスペースで管理。シートの追加・ゴミ箱への移動・復元・完全削除・リネーム・スター・フォルダ移動に対応。

### 範囲選択・複数移動

空白エリアを左ドラッグすると選択ボックスが表示され、範囲内のノードを一括選択できます。選択後そのままドラッグで複数ノードをまとめて移動可能です。

### キャンバス操作

- ズームイン / ズームアウト
- 全体表示（fitView）
- 中クリック・右クリックドラッグでパン、マウスホイール・トラックパッドでズーム
- ミニマップで現在位置を確認
- モバイルでは、2本指ドラッグでパン

### その他

- **Googleログイン** — Supabase Auth による認証
- **データ永続化** — Zustand + localStorage（オフライン）／ Supabase（ログイン時に同期）
- **ダークモード** — OSの設定に自動追従、手動切替も可能（選んだ設定はブラウザに保存）
- **リセット確認** — 誤操作防止のカスタム確認ダイアログ
- **モバイル対応** — ホーム画面・編集画面・画像貼り付けなどモバイル表示に対応

---

## 技術スタック

| カテゴリ | ライブラリ |
|----------|-----------|
| フレームワーク | React 19 + TypeScript |
| ビルド | Vite |
| マインドマップ | @xyflow/react |
| 状態管理 | Zustand（永続化あり） |
| スタイリング | CSS変数（`index.css`）+ インラインスタイル（Tailwind CSSは導入済みだが現状は未使用） |
| アニメーション | Framer Motion |
| 認証・DB・ストレージ | Supabase |
| 通知（トースト） | Sonner |
| アイコン | Lucide React |
| Lint | oxlint |
| ホスティング | Vercel |

---

## セットアップ

```bash
npm install
```

Supabase の接続情報を `.env.local` に設定します（`.env` でも可）：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

データベースとストレージは、`supabase/migrations/` のマイグレーションを時系列で適用して作成します。詳細は [docs/DATABASE.md](docs/DATABASE.md) を参照してください。

## 開発サーバー起動

```bash
npm run dev
```

## ビルド・Lint

```bash
npm run build     # 型チェック（tsc -b）+ 本番ビルド
npm run preview   # ビルドしたものをローカルで確認
npm run lint      # oxlint
npm run check:csp # vercel.json の CSP の検査（Supabase の許可先が、プロジェクトの URL だけか）
```

PR と `main` への push では、GitHub Actions（`.github/workflows/ci.yml`）が、lint・CSP の検査・ビルドと、本番の依存関係の脆弱性の検査（`npm audit`）を実行します。依存パッケージの更新は、Dependabot が毎週 PR にします。詳細は [SECURITY.md](docs/SECURITY.md#依存パッケージと-ci) を参照してください。

---

## プロジェクト構成

```
src/
├── App.tsx
├── main.tsx
├── components/
│   ├── SynapthyIcon.tsx       # ロゴアイコン
│   └── ThemeToggle.tsx        # ライト/ダーク切替ボタン
├── hooks/
│   └── useIsMobile.ts         # モバイル判定フック
├── features/
│   ├── auth/
│   │   ├── LoginScreen.tsx    # Google ログイン画面
│   │   └── useAuth.ts         # 認証状態フック
│   ├── tutorial/
│   │   ├── TutorialTour.tsx        # ガイドツアー（ハイライトと説明カード）
│   │   ├── WelcomeIntro.tsx        # 導入の、S のロゴが踊るアニメーション
│   │   ├── steps.ts                # ステップの内容と、ハイライトする対象
│   │   ├── tutorialStore.ts        # 進行状態と、完了フラグの保存
│   │   └── useTutorialAutoStart.ts # 初めて登録した人に自動で始める
│   ├── home/
│   │   ├── components/
│   │   │   ├── HomeScreen.tsx     # ホーム画面ルート
│   │   │   ├── TopBar.tsx         # 検索・並び替え・新規作成バー
│   │   │   ├── Sidebar.tsx        # 最近・すべて・スター・フォルダ・ゴミ箱ナビ
│   │   │   ├── MapGrid.tsx        # マップ一覧グリッド（枚数に応じてカードの大きさを変える）
│   │   │   ├── MapCard.tsx        # マップカード（操作ボタン・ドラッグ）
│   │   │   ├── MapThumbnail.tsx   # サムネイル（テンプレート・自分の画像・パステルカラー）
│   │   │   ├── ThumbnailPicker.tsx # サムネイルを選ぶダイアログ
│   │   │   └── TrashView.tsx      # ゴミ箱一覧（復元・完全削除）
│   │   └── utils/
│   │       ├── sheetSelectors.ts     # アクティブ/スター/ゴミ箱の絞り込み
│   │       └── formatRelativeTime.ts # 相対時刻表示
│   └── mindmap/
│       ├── components/
│       │   ├── MindmapCanvas.tsx   # ReactFlow のルートコンポーネント
│       │   ├── MindmapNode.tsx     # カスタムノード
│       │   ├── ImageNode.tsx       # 自由配置の画像ノード
│       │   ├── NodeImageView.tsx   # ノードに添付した画像の表示
│       │   ├── InteractiveEdge.tsx # カスタムエッジ（中間ノード挿入ボタン付き）
│       │   ├── NodePanel.tsx       # ノードの色・サイズ・枠線・文字・線の色・メモの編集パネル
│       │   ├── EditorSidebar.tsx   # 編集画面の折りたためるサイドバー（シート切替・フォルダ移動・使い方・テーマ・ログアウト）
│       │   ├── ExportMenu.tsx      # ヘッダーの「書き出し」メニュー（PDF・Markdown）
│       │   ├── Toolbar.tsx         # ズーム・全体表示・Undo/Redo・画像追加・リセット
│       │   ├── Header.tsx          # 上部ヘッダー（ホームへ戻る・書き出し・保存状態）
│       │   ├── HelpHint.tsx        # 操作ヒント
│       │   ├── ConfirmDialog.tsx   # 確認ダイアログ
│       │   └── logicTree.ts        # ロジックツリー描画用の定数
│       ├── hooks/
│       │   └── useSheetsSync.ts    # Supabase との同期（変更を検知して保存）
│       ├── store/
│       │   └── mindmapStore.ts     # Zustand ストア（全ロジック・整列アルゴリズム）
│       ├── export/
│       │   ├── printPdf.ts       # PDF の書き出し（印刷用の表示にして、印刷ダイアログを開く）
│       │   ├── outline.ts        # Markdown の書き出し（階層を箇条書きにする）
│       │   └── download.ts       # ファイル名の整形とダウンロード
│       ├── history.ts        # Undo / Redo
│       ├── nodeImage.ts      # ノード画像の添付・削除（中心テーマには付けられない）
│       ├── labelStyle.ts     # 文字の太字・色（一部分の装飾を含む）
│       └── edgeColor.ts      # 線の色のパレット
└── lib/
    ├── supabase.ts     # Supabase クライアント初期化
    ├── sheetsApi.ts    # sheets / folders テーブルの CRUD 関数
    ├── imageApi.ts     # node-images ストレージの CRUD 関数
    ├── thumbnailTemplates.ts # サムネイルのテンプレート画像の一覧
    └── theme.ts        # ライト/ダークテーマの状態管理

public/thumbnails/      # サムネイルのテンプレート画像
supabase/migrations/    # データベース・ストレージのマイグレーション
scripts/                # 開発・検査用のスクリプト（check-csp.mjs など）
docs/                   # 設計・運用のドキュメント
```

---

## 画像クレジット

ホームのサムネイルに選べるテンプレート画像（`public/thumbnails/` の56点）は、次のものを同梱しています。作品ごとの出典・ライセンスは [docs/ASSETS.md](docs/ASSETS.md) にまとめています。

| 種類 | 点数 | ライセンス・出典 |
|---|---|---|
| 風景・抽象 | 12 | [Unsplash](https://unsplash.com/) の写真（[Unsplash License](https://unsplash.com/license)） |
| 名画・水彩画・日本美術 | 34 | パブリックドメイン / CC0（[Wikimedia Commons](https://commons.wikimedia.org/) で表示を確認） |
| 宇宙 | 10 | NASA の画像（NASA, ESA, CSA, STScI などのクレジット。原則としてパブリックドメイン） |

画像のライセンス表示は、2026年10月6日に Wikimedia Commons の API で再確認しました（名画・水彩画・日本美術・宇宙の44点は、すべて Public domain または CC0）。

---

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | プロダクトの要件・非ゴール |
| [docs/data-structure.md](docs/data-structure.md) | データ構造（ストア・Undo/Redo・同期） |
| [docs/DATABASE.md](docs/DATABASE.md) | テーブル・ストレージ・RLS・マイグレーション |
| [docs/SECURITY.md](docs/SECURITY.md) | 認証・アクセス制御・環境変数 |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | カラートークン・テーマ・レイアウト |
| [docs/CODE_STYLE.md](docs/CODE_STYLE.md) | コードスタイル・ディレクトリ構成・コミット/PR |
| [docs/TESTING.md](docs/TESTING.md) | テスト方針・手動確認フロー |
| [docs/ASSETS.md](docs/ASSETS.md) | 同梱画像の出典・ライセンス・追加手順 |

---

## 開発の進め方

- `main` へ直接コミットせず、`type/short-description` 形式のブランチ（例: `feat/user-login`、`fix/login-error`）を切って作業し、Pull Request を作成します
- コミットメッセージは Conventional Commit 形式で、日本語で書きます
- 詳細は [docs/CODE_STYLE.md](docs/CODE_STYLE.md) を参照してください
