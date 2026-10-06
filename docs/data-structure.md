# データ構造

## フロントエンド（Zustand ストア）

アプリの状態は `src/features/mindmap/store/mindmapStore.ts` で管理します。

```ts
// ノードのカラー種別
type NodeColor = 'purple' | 'blue' | 'cyan' | 'green' | 'pink' | 'orange'

// シートの描画方式
// linear = ロジックツリー（自動整列あり・左右展開）
// free   = 自由配置（手動レイアウト、自動整列なし）
type MapType = 'linear' | 'free'

// 自由配置シートで子ノードを追加する方向
type FreeDirection = 'right' | 'left' | 'bottom' | 'top' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'

// マインドマップノードが持つデータ
interface MindmapNodeData {
  label: string          // ノードのテキスト
  color: NodeColor       // 表示色
  isRoot?: boolean        // ルートノードフラグ（中心テーマ。削除不可）
  depth?: number          // 階層の深さ（0 = ルート）
  memo?: string            // ノードに付けたメモ
  borderWidth?: number    // 枠線の太さ
  sizeScale?: number      // ノードサイズの段階（整列時の大きさ調整に使用）
  borderRadius?: number   // 角丸の半径
  isCircle?: boolean      // 円形ノードにするか
  showBorder?: boolean    // 文字だけのノード（中心テーマ以外）に枠線を表示するか。未指定＝非表示
  image?: NodeImage        // ノードに付けた画像（文字の上に表示）
}

// ノードに貼り付けた画像の保存情報
interface NodeImage {
  path: string    // Supabase Storage 上のパス
  width: number
  height: number
}

// クリップボードから貼り付けた画像ノード（ツリー構造に属さない自由配置要素）
// 表示サイズは node.style.width/height で管理する
interface ImageNodeData {
  path: string
  rotation?: number
}

type AnyNodeData = MindmapNodeData | ImageNodeData

// 1枚のシート（マインドマップ1枚分）
interface Sheet {
  id: string                      // UUID
  name: string                    // タブ・カードに表示するシート名
  mapType?: MapType                // 'linear' | 'free'（省略時は 'linear' とみなす）
  nodes: Node<AnyNodeData>[]       // @xyflow/react の Node 型
  edges: Edge[]                    // @xyflow/react の Edge 型
  isStarred: boolean               // スター（お気に入り）
  deletedAt: string | null         // ゴミ箱に入れた日時。null なら未削除
  lastOpenedAt: string             // 最後に開いた日時（「最近使用した項目」の並び替えに使用）
  updatedAt: string                // 最終更新日時
  folderId: string | null          // 所属フォルダ。null は未分類
}

// フォルダ（フラット構造・1シート1フォルダ）
interface Folder {
  id: string
  name: string
}

// ストア全体
interface MindmapStore {
  sheets: Sheet[]                  // 全シート一覧
  folders: Folder[]                // 全フォルダ一覧
  currentSheetId: string           // 現在開いているシートの ID
  currentView: 'home' | 'editor'   // ホーム画面 / エディタのどちらを表示中か
  nodes: Node<AnyNodeData>[]       // 現在のシートのノード（表示用コピー）
  edges: Edge[]                    // 現在のシートのエッジ（表示用コピー）
  selectedNodeId: string | null    // 選択中のノード ID
  editingNodeId: string | null     // ダブルクリックで編集中のノード ID
  isSaving: boolean                // Supabase への保存中フラグ（ヘッダーの保存インジケータ用）
  // ...以下、各操作に対応するアクション群（addChildNode, moveSheetToTrash, createFolder など）
}
```

`nodes` / `edges` はストアの「表示用コピー」です。シートを切り替えると `sheets` 配列の該当エントリから読み込まれます。

### Node の構造例（@xyflow/react）

```json
{
  "id": "node-1234567890-1",
  "type": "mindmapNode",
  "position": { "x": 320, "y": 0 },
  "data": {
    "label": "アイデア",
    "color": "blue",
    "depth": 1
  }
}
```

画像ノード（クリップボード貼り付け）の場合は `type: "imageNode"` で、`data` に `{ path, rotation }` を持ちます。

### Edge の構造例

```json
{
  "id": "edge-root-node-1234567890-1",
  "source": "root",
  "target": "node-1234567890-1",
  "sourceHandle": "right",
  "targetHandle": "left",
  "type": "interactive"
}
```

### Undo / Redo（`history.ts`）

Zustand ストアの `nodes` / `edges` の変化を監視し、編集が止まってから1件のスナップショットとして履歴（`past` / `future`、最大100件）に積みます。シートを切り替えると履歴は破棄されます。ストアには状態を持たず、`src/features/mindmap/history.ts` 内のモジュールスコープ変数で管理しています。

### テーマ（`theme.ts`）

ライト／ダークは `useTheme`（Zustand）で管理し、`localStorage`（キー: `synaptique-theme`）に保存します。未選択時は OS の `prefers-color-scheme` に追従し、実際の色は `index.css` の CSS変数が `<html data-theme="...">` に応じて切り替わります。

---

## localStorage（オフライン永続化）

キー名 `synaptique-storage` に、zustand の `persist` ミドルウェアが以下を JSON で保存します。ログインしていない場合もこのデータだけでアプリが動作します。

```json
{
  "state": {
    "sheets": [ /* Sheet[]（現在開いているシートは nodes/edges を最新化して保存） */ ],
    "currentSheetId": "uuid",
    "currentView": "home",
    "folders": [ /* Folder[] */ ]
  },
  "version": 0
}
```

`nodes` / `edges` はトップレベルには保存されず、`sheets` 配列内の該当シートに含めて保存されます（リロード時は `onRehydrateStorage` で現在のシートから `nodes` / `edges` を復元）。

テーマの選択（`synaptique-theme`）は別キーで保存されます。

---

## Supabase DB

### `sheets` テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | `uuid` | PK（`gen_random_uuid()`） |
| `user_id` | `uuid` | `auth.users.id` の外部キー。INSERTトリガーで自動セット |
| `name` | `text` | シート名 |
| `data` | `jsonb` | `{ mapType, nodes: Node[], edges: Edge[] }` |
| `is_starred` | `boolean` | スター（お気に入り）フラグ |
| `deleted_at` | `timestamptz` \| `null` | ゴミ箱に入れた日時。null なら未削除 |
| `last_opened_at` | `timestamptz` | 最後に開いた日時 |
| `folder_id` | `uuid` \| `null` | 所属フォルダ（`folders.id`）。フォルダ削除時は `null` に戻る |
| `created_at` | `timestamptz` | 作成日時 |
| `updated_at` | `timestamptz` | 更新日時（トリガーで自動更新） |

RLS により、ユーザーは自分の行のみ参照・作成・更新・削除できます（詳細は [SECURITY.md](./SECURITY.md)）。

`nodes` / `edges` / `mapType` は `data` カラムに JSONB としてまとめて格納しています。シートを開く際は1行まるごと取得、保存時も1行まるごと上書き（upsert）するため、クエリがシンプルに保てます。

### `folders` テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | `auth.users.id` の外部キー。INSERTトリガーで自動セット |
| `name` | `text` | フォルダ名 |
| `created_at` | `timestamptz` | 作成日時 |

フラット構造（フォルダの中にフォルダは作れない）で、1シートは最大1フォルダに属します。

### Storage: `node-images` バケット

ノードに貼り付けた画像の保存先（非公開バケット、署名付きURLで配信）。パスは `{auth.uid()}/{ファイル名}` 形式で、RLS相当のストレージポリシーにより自分のフォルダ配下のみ操作可能です。詳細は [SECURITY.md](./SECURITY.md) を参照してください。

### インデックス

```sql
idx_sheets_user_id              -- user_id による絞り込みを高速化
idx_sheets_user_id_created_at   -- user_id + created_at ORDER BY を高速化
idx_sheets_user_id_deleted_at   -- ゴミ箱一覧・アクティブ一覧の絞り込みを高速化
idx_sheets_user_id_folder_id    -- フォルダ別の絞り込みを高速化
```

マイグレーション一覧は `supabase/migrations/` を参照してください。

---

## データフロー

```
ユーザー操作
  │
  ▼
Zustand ストア（nodes / edges / sheets / folders をインメモリで更新）
  │
  ├─► localStorage（zustand persist が即時反映）
  │
  └─► useSheetsSync
        │
        ├─► ノード・エッジの変更        → debounce 1秒  ─┐
        ├─► 名前・スター・フォルダ等の変更 → debounce 2秒  ─┤
        ├─► ゴミ箱への移動／復元（deletedAt） → 即時保存    ─┤
        └─► フォルダの作成・リネーム      → debounce 1秒  ─┘
                                                           │
                                                           ▼
                                                    Supabase DB（upsert）
```

ゴミ箱の出し入れは、デバウンス待ち中にリロードされると未反映のまま古い状態で上書きされてしまうため、他のメタ情報の変更とは別経路で即時保存しています（`useSheetsSync.ts`）。

配列から完全に消えたシート・フォルダ（ゴミ箱を空にした場合など）は `deleteSheetFromDb` / `deleteFolderFromDb` でDBからも削除されます。

ログイン時は Supabase からシート・フォルダを取得し、`loadSheets()` / `loadFolders()` でストアに流し込みます（この時点の履歴を Undo の起点としてリセット）。DBが空の場合は、その時点の localStorage の内容をDBへ初期保存します。
