# コードスタイル

## 言語・コメント

- コードはTypeScript、コメントは日本語で記述する（本リポジトリの一貫した方針）
- コメントは「何をしているか」ではなく「なぜそうしているか」を書く（非自明な制約・回避策・仕様上の理由）。自明な処理には書かない

  ```ts
  // 良い例（history.ts より）: なぜそうするかが書かれている
  // ドラッグの途中は積まず、離してからまとめて1回分にする
  if (nodes.some((n) => n.dragging)) { ... }
  ```

## TypeScript設定（`tsconfig.app.json`）

- `noUnusedLocals` / `noUnusedParameters` — 未使用の変数・引数はエラー
- `noFallthroughCasesInSwitch` — switchのフォールスルーを禁止
- `verbatimModuleSyntax` — 型のみのインポートは `import type` を使う
- `strict` 系は明示していないが、上記に加えビルドは `tsc -b` で型エラーを必ず通す（`npm run build`）

## Lint（oxlint）

`.oxlintrc.json` で `react` / `typescript` / `oxc` プラグインを有効化。主なルール：

- `react/rules-of-hooks`: error — フックのルール違反は必ず修正する
- `react/only-export-components`: warn — コンポーネント以外のexportが混在するファイルは警告（定数・関数は別ファイルに分離するのが望ましいが、既存コードには例外もある）

`npm run lint` で実行。warningはブロッカーにしないが、新規コードでは極力出さない。

## ディレクトリ構成（feature-based）

```
src/features/<feature>/
├── components/   # そのfeature専用のReactコンポーネント
├── hooks/        # そのfeature専用のカスタムフック
├── store/        # Zustandストア
└── utils/        # 純粋関数（UIを持たないロジック）
```

- 複数featureをまたいで使う薄いラッパー（Supabaseクライアント、APIアクセス関数、テーマ）は `src/lib/` に置く
- 複数featureをまたいで使うReactコンポーネント・フックは `src/components/` / `src/hooks/` に置く
- 現在は `auth` / `home` / `mindmap` / `tutorial` の4 feature。新しいfeatureを追加する場合もこの構成に従う（`tutorial` は規模が小さいため、ストアを `store/` に分けず、feature の直下に置いている）
- ガイドツアーの対象にする要素には `data-tour="..."` を付け、`src/features/tutorial/steps.ts` のセレクタから参照する。対象の要素を動かす・消すときは、`steps.ts` も一緒に見直す

## 命名規則

- カスタムフックは `use` prefix（`useSheetsSync`, `useIsMobile`, `useAuth`）
- Zustandストアのフックは `use<Domain>Store` / `use<Domain>`（`useMindmapStore`, `useTutorialStore`, `useTheme`）
- 型・インターフェースはPascalCase、ユニオン型の値はcamelCase文字列リテラル（`NodeColor = 'purple' | 'blue' | ...`）
- イベントハンドラ・ストアアクションは動詞始まり（`addChildNode`, `moveSheetToTrash`, `toggleSheetStar`）

## 状態管理（Zustand）の方針

- ドメインごとに別ストアを作る（マインドマップ本体: `mindmapStore`、ガイドツアーの進行: `tutorialStore`、テーマ: `theme.ts`）。Undo/Redo は、ストアではなく `history.ts` のモジュール変数で持つ。1つの巨大ストアに全部入れない
- 永続化が必要なストアのみ `persist` ミドルウェアを使う。`persist` を使う場合は `partialize` で保存対象を明示し、不要な一時状態（選択中ノードIDなど）を保存しない
- サーバー同期が必要なストアは、ストア自体にAPI呼び出しを書かず、専用のフック（`useSheetsSync` など）側でストアの変化を監視して同期する。ストアはあくまでクライアント側の状態管理に専念させる

## コンポーネントの方針

- スタイリングは基本的に `style={{ ... }}` によるインラインスタイル。Tailwind CSSは依存関係・ビルド設定に入っているが、現状ユーティリティクラスは使われていない（`@import "tailwindcss"` によるリセットのみ）。新規UIパーツも既存コンポーネントに合わせてインラインスタイルで書く
- 色・間隔などデザイン上の値は直接のカラーコードではなく `var(--c-xxx)` のCSS変数を使う（[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 参照）。ライト/ダーク両対応のため
- `react/only-export-components` に抵触する場合（定数・純粋関数とコンポーネントが同一ファイルにある場合）は、可能であれば分離を検討する

## コミット・PR

- Conventional Commits形式、メッセージは日本語（`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` など）
- ブランチ運用・PRフローは `CLAUDE.md` と `AGENTS.md` を参照
