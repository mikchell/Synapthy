# セキュリティ

## 認証

- **Google OAuth（Supabase Auth）** — `src/features/auth/useAuth.ts` の `signInWithGoogle()` で `supabase.auth.signInWithOAuth({ provider: 'google' })` を呼び出す。他の認証方法は提供していない。
- セッションは Supabase クライアント（`src/lib/supabase.ts`）が管理し、`onAuthStateChange` で状態変化をフックする。
- ログアウト時（`signOut()`）は Supabase 側のセッション破棄に加え、ローカルの Zustand 永続化ストレージ（`useMindmapStore.persist.clearStorage()`）も明示的に消去する。共有端末でログアウト後も前のユーザーのマインドマップが残らないようにするための対応。

## データアクセス制御（RLS）

`sheets` / `folders` テーブルはどちらも Row Level Security を有効化し、以下のポリシーで自分の行のみ操作可能にしている（`supabase/migrations/`）。

- SELECT / INSERT / UPDATE / DELETE いずれも `auth.uid() = user_id` を要求
- UPDATE は `WITH CHECK` も設定し、更新後も `user_id` が自分のままであることを検証（他ユーザーへの付け替えを防止）
- `user_id` はクライアントから送信させず、`before insert` トリガー（`set_sheet_user_id` / `set_folder_user_id`）で `auth.uid()` を自動セットする。これにより、クライアント側のバグや悪意あるリクエストで他人になりすましたレコードを作成できない

詳細なテーブル定義は [DATABASE.md](./DATABASE.md) を参照。

## ストレージ（`node-images`）

- バケットは **非公開**（`public: false`）。画像の表示には毎回 `createSignedUrl`（7日間有効）で署名付きURLを発行する（`src/lib/imageApi.ts`）
- パスは `{auth.uid()}/{ファイル名}` 形式に固定し、ストレージポリシーで `(storage.foldername(name))[1] = auth.uid()::text` を要求 — 自分のユーザーIDディレクトリ配下のみ参照・アップロード・削除できる
- アップロード前にクライアント側で以下を検証・加工する
  - 元ファイルサイズが20MBを超える場合は拒否
  - 最大辺1600pxへの縮小とWebP再圧縮（ストレージ圧迫・不要な大容量ファイルの保存を防止）
- シートの完全削除・リセット時は、参照されなくなった画像パスを `deleteNodeImages` でまとめて削除し、孤立ファイルを残さない

## 環境変数

- Supabase の接続情報（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`）は `.env` に保持し、リポジトリにコミットしない（`.gitignore` 対象）
- `VITE_` プレフィックスの環境変数はビルド後のクライアントバンドルに埋め込まれるため、ここに置いてよいのは anon key のようなクライアント公開を前提とした値のみ。Service role key など秘匿すべき値は絶対に `VITE_` プレフィックスで扱わない

## クライアント側の方針

- Supabase への問い合わせは `src/lib/sheetsApi.ts` / `src/lib/imageApi.ts` に集約し、コンポーネントやストアから直接クライアントを呼び出さない（アクセス経路を監査しやすくするため）
- RLS はあくまで最終防衛線。クライアント側のバリデーション漏れがあっても、他ユーザーのデータに到達できないことをDB側で保証する設計にしている

## 既知の制限・今後の検討事項

- `sheets.data`（nodes/edges のJSONB）はサイズ上限を設けていない。巨大なマインドマップによるペイロード肥大化は未対策
- 画像アップロードのレート制限はクライアント側のサイズチェックのみで、サーバー側のレート制限は未導入
