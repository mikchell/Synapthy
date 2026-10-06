# デザインシステム

色・フォントなどの定義は `src/index.css` のCSS変数に集約されている。コンポーネントからは直接のカラーコードではなく `var(--c-xxx)` を参照し、ライト/ダーク両対応を1箇所で管理する。

## テーマ切替

- `<html data-theme="light">` / `<html data-theme="dark">` で切替。制御は `src/lib/theme.ts`（Zustand）
- 未選択時はOSの `prefers-color-scheme` に自動追従し、OS側の変更にもリアルタイムで追従する
- 一度手動で切り替えると、その選択を `localStorage`（キー: `synaptique-theme`）に保存して以後優先する
- 切替ボタンは `src/components/ThemeToggle.tsx`

## カラートークン

### 役割別トークン（ライト / ダーク）

| トークン | ライト | ダーク | 用途 |
|---|---|---|---|
| `--c-bg` | `#ffffff` | `#3b4046` | ページ・キャンバスの背景 |
| `--c-bg-subtle` | `#f8fafc` | `#33383d` | サイドバー・入力欄など一段沈めた背景 |
| `--c-surface` | `#ffffff` | `#484d54` | カード・パネル・ボタンの面 |
| `--c-glass` | `rgba(255,255,255,.92)` | `rgba(59,64,70,.92)` | 半透明パネル（ヘッダー・ツールバー等、`backdrop-filter: blur` と併用） |
| `--c-text` | `#1e293b` | `#ffffff` | 本文 |
| `--c-text-2` | `#64748b` | `#cdd1d8` | 補足の文字・アイコン |
| `--c-text-3` | `#94a3b8` | `#b3b8c1` | さらに控えめな文字・アイコン |
| `--c-border` | `rgba(0,0,0,.09)` | `rgba(255,255,255,.18)` | 境界線 |
| `--c-hover` | `rgba(0,0,0,.04)` | `rgba(255,255,255,.09)` | ホバー背景 |
| `--c-accent` | `#7c3aed` | `#c3b7f7` | 強調の文字・アイコン・枠 |
| `--c-accent-soft` | `rgba(124,58,237,.1)` | `rgba(146,121,230,.22)` | 選択中などの薄い背景 |
| `--c-accent-tint` | `#f5f3ff` | `rgba(146,121,230,.14)` | ホバー時・プレビューの淡い背景 |
| `--c-line` | `#7c3aed` | `#a995f0` | ノードをつなぐ線・分岐点 |
| `--c-select` | `#7c3aed` | `#7dbaf8` | 選択中ノードの枠 |
| `--c-dot` | `rgba(148,163,184,.6)` | `rgba(255,255,255,.07)` | キャンバスの背景ドット |
| `--c-logo-bg` / `--c-logo-fg` | `#18181b` / `#fafaf9` | `#f5f5f5` / `#18181b` | ロゴの背景/前景（ライトとダークで反転） |

アクセントカラーの基準色は紫 `#7c3aed`（purple）。ダークモードでは彩度を抑えた `#c3b7f7` 系に置き換え、白背景に対する過度なコントラストを避けている。

### ノードカラー（6色・ライト / ダーク）

| 色 | ライト背景 / 文字 | ダーク背景 / 文字 |
|---|---|---|
| purple | `#f3e8ff` / `#5b21b6` | `#514e6f` / `#d9cffb` |
| blue | `#dbeafe` / `#1e40af` | `#445670` / `#c7defe` |
| cyan | `#cffafe` / `#0e7490` | `#375a65` / `#b5f0fa` |
| green | `#dcfce7` / `#15803d` | `#3e5c50` / `#bdf2cf` |
| pink | `#fce7f3` / `#be185d` | `#624a5c` / `#fbcbe3` |
| orange | `#ffedd5` / `#c2410c` | `#635044` / `#fdd3ad` |

ライトモードは背景が淡色・文字が濃色の組み合わせ。ダークモードは背景を不透明な中間トーンにしている（半透明だと下を通る接続線が透けて見えるため、意図的に不透明化）。

## タイポグラフィ

- `--font-sans: 'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif`
- Google Fontsから読み込み（`index.html`）。読み込み前・失敗時はOS標準フォントにフォールバック

## レイアウト・形状

- ノードの角丸・枠線太さ・サイズ段階（`sizeScale`）はノードごとに `MindmapNodeData` で保持し、ノードパネル（`NodePanel.tsx`）から調整する
- 円形ノード（`isCircle`）にも対応
- ロジックツリー（`mapType: 'linear'`）の接続線・分岐点の寸法は `src/features/mindmap/components/logicTree.ts` に定数として集約（`JUNCTION_OFFSET`, `JUNCTION_RADIUS`, `LINE_WIDTH` など）。見た目を変える際はここを起点に調整する

## アイコン

[Lucide React](https://lucide.dev/) を使用。ロゴ単体は `src/components/SynaptiqueIcon.tsx`。

## 実装上のルール

- 新しい色・背景・枠線を追加する際は、直接のカラーコードを書かず `src/index.css` にトークンを追加し、`var(--c-xxx)` で参照する（ライト/ダーク両方に定義すること）
- 半透明パネルは `--c-glass` + `backdrop-filter: blur(...)` の組み合わせを踏襲する
