# データベース（Supabase）

Synapthy は Supabase（PostgreSQL + Auth + Storage）をバックエンドに使用しています。マイグレーションは `supabase/migrations/` に時系列で格納されています。

## テーブル

### `sheets`

マインドマップ1枚（シート）につき1行。

| カラム | 型 | デフォルト / 制約 | 説明 |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | シートID |
| `user_id` | `uuid` | FK → `auth.users.id`, `on delete cascade` | 所有者。INSERTトリガーで `auth.uid()` を自動セット |
| `name` | `text` | `not null default 'シート1'`, `check (char_length(name) <= 100)` | シート名。100文字まで |
| `data` | `jsonb` | `not null default '{"nodes":[],"edges":[]}'`, `check (octet_length(data::text) <= 2097152)` | `{ mapType, nodes, edges }` をまとめて格納。2MBまで |
| `is_starred` | `boolean` | `not null default false` | スター（お気に入り） |
| `deleted_at` | `timestamptz` | `null` 可 | ゴミ箱に入れた日時。`null` = 未削除 |
| `last_opened_at` | `timestamptz` | `not null default now()` | 最後に開いた日時 |
| `folder_id` | `uuid` | FK → `folders.id`, `on delete set null` | 所属フォルダ。`null` = 未分類。RLSで自分のフォルダのみ指定可 |
| `created_at` | `timestamptz` | `not null default now()` | 作成日時 |
| `updated_at` | `timestamptz` | `not null default now()` | トリガーで自動更新 |

### `folders`

フラット構造（入れ子なし）のフォルダ。1シートは最大1フォルダに属する。

| カラム | 型 | デフォルト / 制約 | 説明 |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | フォルダID |
| `user_id` | `uuid` | FK → `auth.users.id`, `on delete cascade` | 所有者。INSERTトリガーで自動セット |
| `name` | `text` | `not null`, `check (char_length(name) <= 100)` | フォルダ名。100文字まで |
| `created_at` | `timestamptz` | `not null default now()` | 作成日時 |

## Storage

### `node-images` バケット（非公開）

ノードに貼り付ける画像の保存先。公開バケットではなく、表示時に毎回署名付きURL（7日間有効）を発行する。パスは `{auth.uid()}/{ファイル名}` 形式。

| 設定 | 値 |
|---|---|
| `file_size_limit` | 2MB |
| `allowed_mime_types` | `image/webp` / `image/png` / `image/jpeg` / `image/gif` |
| 1人あたりの枚数 | 200枚まで（アップロードのポリシーで検査） |

## トリガー

| トリガー | テーブル | タイミング | 処理 |
|---|---|---|---|
| `sheets_updated_at` | `sheets` | `before update` | `updated_at` を `now()` に更新 |
| `sheets_set_user_id` | `sheets` | `before insert` | `user_id` を `auth.uid()` に自動セット |
| `folders_set_user_id` | `folders` | `before insert` | `user_id` を `auth.uid()` に自動セット |
| `sheets_check_limit` | `sheets` | `before insert` | シート数が上限（100枚）に達していたら拒否（すでにあるIDは通す） |
| `folders_check_limit` | `folders` | `before insert` | フォルダ数が上限（50個）に達していたら拒否（すでにあるIDは通す） |

`user_id` をクライアントから直接指定できないようにし、必ず認証済みユーザー自身の行として作成されるようにしている（なりすまし防止）。トリガー関数（`update_updated_at` / `set_sheet_user_id` / `set_folder_user_id`）は `search_path` を空に固定している。

## 利用上限（悪用対策）

悪意のあるユーザー（または不具合のあるクライアント）が、データベースの容量や帯域を使い切って、全員が使えなくなる状態を作れないよう、1人あたりの上限をDB側で検査します。画面側（`src/lib/limits.ts`）にも同じ値を持ち、上限に達したときは、作成前に理由を表示します。**値を変えるときは、この2か所とマイグレーションをそろえてください。**

| 対象 | 上限 | 検査する場所 |
|---|---|---|
| シート数 | 100枚（ごみ箱のシートも数える） | `sheets_check_limit` トリガー |
| フォルダ数 | 50個 | `folders_check_limit` トリガー |
| シート名・フォルダ名の長さ | 100文字 | CHECK 制約（`sheets_name_length_check` / `folders_name_length_check`） |
| 1シートのサイズ | 2MB | CHECK 制約（`sheets_data_size_check`） |
| 画像の枚数（サムネイルも含む） | 200枚 | `node-images` のアップロードのポリシー |
| 画像1枚のサイズ | 2MB | バケットの `file_size_limit` |

- 上限を超えたシート・フォルダの作成は、`limit_exceeded:sheets` / `limit_exceeded:folders` というメッセージで拒否される。画面側は、このメッセージを見て、理由を表示する
- アプリは `upsert` で保存する。`upsert` は、すでにあるシートの更新でも INSERT のトリガーを呼ぶため、トリガーは**すでにあるIDを数えずに通す**。通さないと、上限に達した人が、既存のシートの編集を保存できなくなる
- 同時に大量のリクエストを送られても、全員が「まだ上限の手前」と数えて通過しないよう、トリガーはユーザーごとのアドバイザリロックで直列化している
- 画像の枚数は、ポリシーの式の中ではロックを使えないため、同時に大量にアップロードされると、一度だけ少し超えることがある（超えたあとは、すべて拒否される）。また、拒否はポリシー違反（RLS）として返るので、メッセージを変えられない
- すでにあるデータは検査し直さない。ただしマイグレーションの冒頭で、2MBを超えるシートや100文字を超える名前がないかを確かめ、あれば何も変更せずに止まる（上限を超える行は、更新できなくなってしまうため）
- 1アカウントが使える容量の最大値を抑えるための対策で、**アカウントを複数作られると、その分だけ増える**。単位時間あたりの書き込み回数の制限（レート制限）は入れていない

## インデックス

```sql
idx_sheets_user_id              -- user_id による絞り込み
idx_sheets_user_id_created_at   -- user_id + created_at ORDER BY（シート一覧の初回取得）
idx_sheets_user_id_deleted_at   -- user_id + deleted_at（ゴミ箱一覧・アクティブ一覧の絞り込み）
idx_sheets_user_id_folder_id    -- user_id + folder_id（フォルダ別一覧）
```

## RLS（Row Level Security）

`sheets` / `folders` ともに RLS を有効化し、`auth.uid() = user_id` の行のみ SELECT / INSERT / UPDATE / DELETE 可能。UPDATEポリシーは `WITH CHECK` も設定し、更新後も自分の `user_id` のままであることを検証する。`sheets` の INSERT / UPDATE は、`folder_id` に自分のフォルダ以外を指定できない。ストレージ側のポリシーも含め、詳細は [SECURITY.md](./SECURITY.md) を参照。

## マイグレーション一覧

| ファイル | 内容 |
|---|---|
| `20260908_create_sheets.sql` | `sheets` テーブル作成、RLS、`updated_at` トリガー |
| `20260908000001_add_indexes.sql` | `user_id` 系インデックス追加 |
| `20260908000002_security_fixes.sql` | UPDATEポリシーに `WITH CHECK` 追加、`user_id` 自動セットトリガー追加 |
| `20260912000001_add_home_screen_fields.sql` | `is_starred` / `deleted_at` / `last_opened_at` 追加（ホーム画面対応） |
| `20260912000002_add_folders.sql` | `folders` テーブル作成、`sheets.folder_id` 追加 |
| `20260912000003_add_node_images_storage.sql` | `node-images` ストレージバケットとポリシー追加 |
| `20261006000001_security_hardening.sql` | バケットのサイズ・形式の制限、`sheets.data` のサイズ制約、関数の `search_path` 固定、`folder_id` の所有者チェック |
| `20261006000002_add_abuse_limits.sql` | 悪用対策の上限（シート・フォルダの数、名前の長さ、シートと画像のサイズ、画像の枚数）。[利用上限](#利用上限悪用対策) を参照 |

## クライアント側のアクセス関数

`src/lib/sheetsApi.ts`（`sheets` / `folders` の CRUD）と `src/lib/imageApi.ts`（`node-images` の CRUD・画像圧縮）に集約されている。データ（テーブル・ストレージ）への問い合わせはこの2ファイル経由のみに統一し、コンポーネントやストアから直接 `supabase` クライアントを呼ばない方針。認証まわりの例外は [SECURITY.md](./SECURITY.md#クライアント側の方針) を参照。

フロントエンドとの同期方式（デバウンス保存・即時保存の区別）は [data-structure.md](./data-structure.md#データフロー) を参照。
