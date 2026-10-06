# セキュリティ

## 認証

- **Google OAuth（Supabase Auth）** — `src/features/auth/useAuth.ts` の `signInWithGoogle()` で `supabase.auth.signInWithOAuth({ provider: 'google' })` を呼び出す。他の認証方法は提供していない。
- OAuth のフローは **PKCE**（`src/lib/supabase.ts` の `auth: { flowType: 'pkce' }`）。ログイン後のリダイレクトでアクセストークンをURLに載せず、認可コードだけを受け取ってブラウザ内で交換する。
- セッションは Supabase クライアント（`src/lib/supabase.ts`）が管理し、`onAuthStateChange` で状態変化をフックする。
- ガイドツアーの完了フラグは、Supabase のユーザー情報（`user_metadata.tutorialCompleted`）に `supabase.auth.updateUser` で保存する（`src/features/tutorial/tutorialStore.ts`）。`user_metadata` はユーザー自身が書き換えられるため、権限や課金などの判断には使わない（表示を出し分けるだけの値に限る）

### 端末に残るキャッシュの持ち主

マインドマップは Zustand の永続化（`localStorage` の `synaptique-storage`）にもキャッシュされる。共有端末で、前の人のマインドマップが次の人のアカウントに保存されないよう、キャッシュには **持ち主（`ownerId` ＝ログイン中のユーザーID）** を記録している。

- `useAuth` は、ログイン状態が変わるたびに画面へユーザーを渡す**前**に `claimOwnership()` を呼ぶ。持ち主が変わる（別の人のログイン・ログアウト・セッション切れ）場合は、キャッシュを初期状態に戻し、元に戻す履歴も捨てる
- 持ち主が記録されていない、この仕組みの導入前のキャッシュも同じ扱いで捨てる。ログイン中であれば、続けてサーバーからシートを読み込み直す
- `useSheetsSync` は、読み込みが終わっていて `ownerId` とログイン中のユーザーが一致しているときだけDBへ保存・削除する。キャッシュの初期化がDBの更新を誘発しないための歯止め
- 明示的なログアウト（`signOut()`）は、Supabase のセッション破棄に成功したときだけキャッシュを消す。失敗したときは、ログインしたままキャッシュだけが消えて保存されなくなるのを避けるため、何もせずエラーを表示する

## データアクセス制御（RLS）

`sheets` / `folders` テーブルはどちらも Row Level Security を有効化し、以下のポリシーで自分の行のみ操作可能にしている（`supabase/migrations/`）。

- SELECT / INSERT / UPDATE / DELETE いずれも `auth.uid() = user_id` を要求
- UPDATE は `WITH CHECK` も設定し、更新後も `user_id` が自分のままであることを検証（他ユーザーへの付け替えを防止）
- `sheets` の INSERT / UPDATE は、`folder_id` に**自分のフォルダ**しか指定できない（`null` は可）。外部キーの検証はRLSを通らないため、他人のフォルダIDを指定すると、そのフォルダの存在が推測できてしまうのを防ぐ
- `user_id` はクライアントから送信させず、`before insert` トリガー（`set_sheet_user_id` / `set_folder_user_id`）で `auth.uid()` を自動セットする。これにより、クライアント側のバグや悪意あるリクエストで他人になりすましたレコードを作成できない
- トリガー関数は `search_path` を空に固定している（`security definer` の関数が、呼び出し側の `search_path` に左右されないようにするため）
- `sheets.data`（nodes/edges のJSONB）は、CHECK 制約（`sheets_data_size_check`）で **2MB** までに制限している。すでにある行は検査せず（`not valid`）、これからの INSERT / UPDATE から検査する。上限を超えている既存の行は、サイズを縮めるまで更新できない
- 悪用対策として、1人あたりのシート数（100枚）・フォルダ数（50個）・名前の長さ（100文字）にも上限を設けている（トリガーと CHECK 制約）。画面側は、上限に達したときに、作成前に理由を表示する。仕組みと注意点は [DATABASE.md](./DATABASE.md#利用上限悪用対策) を参照

詳細なテーブル定義は [DATABASE.md](./DATABASE.md) を参照。

## ストレージ（`node-images`）

- バケットは **非公開**（`public: false`）。画像の表示には毎回 `createSignedUrl`（7日間有効）で署名付きURLを発行する（`src/lib/imageApi.ts`）
- パスは `{auth.uid()}/{ファイル名}` 形式に固定し、ストレージポリシーで `(storage.foldername(name))[1] = auth.uid()::text` を要求 — 自分のユーザーIDディレクトリ配下のみ参照・アップロード・削除できる
- バケット自体にサーバー側の制限を設けている。APIを直接叩かれてもクライアントのチェックをすり抜けられない
  - `file_size_limit`: 2MB
  - `allowed_mime_types`: `image/webp` / `image/png` / `image/jpeg` / `image/gif`
- 1人あたりの枚数は **200枚** まで。アップロードのポリシーで、自分のフォルダ配下のファイル数を数えて検査する。同時に大量にアップロードされると、一度だけ少し超えることがある（超えたあとは、すべて拒否される）
- アップロード前にクライアント側で以下を検証・加工する（バケットの制限と合わせてある）
  - 元ファイルサイズが20MBを超える場合は拒否（圧縮の処理前に弾く）
  - 最大辺1600pxへの縮小とWebP再圧縮（ストレージ圧迫・不要な大容量ファイルの保存を防止）
  - 圧縮後のファイルが、許可する形式（PNG・JPEG・WebP・GIF）かつ2MB以内であることを確認する。圧縮できずに元のファイルのまま来た場合も同じ。拡張子は MIME タイプから決める
- シートの完全削除・リセット時は、参照されなくなった画像パスを `deleteNodeImages` でまとめて削除し、孤立ファイルを残さない

## 配信時のセキュリティヘッダー（`vercel.json`）

全てのレスポンスに以下のヘッダーを付ける。

| ヘッダー | 内容 |
|---|---|
| `Content-Security-Policy` | スクリプトは自分のオリジンのみ（`script-src 'self'`）。通信・画像は自分のオリジンと Supabase（`*.supabase.co`）、アバター画像は `*.googleusercontent.com` のみ許可。フォントは Google Fonts のみ。`frame-ancestors 'none'`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY`（クリックジャッキング対策。`frame-ancestors` の古いブラウザ向けの補完） |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | カメラ・マイク・位置情報を無効化 |

- テーマの初期化スクリプトは `public/theme-init.js` に分けてある。`index.html` にインラインスクリプトを書くと、CSP の `script-src 'self'` に拒否されるため
- 外部のドメインを使う機能を足すときは、`vercel.json` の `Content-Security-Policy` に許可するドメインを足す（足さないと、本番だけ通信や画像が拒否される。開発サーバーにはこのヘッダーは付かない）
- `style-src` は `'unsafe-inline'` を許可している。トースト（sonner）が実行時に `<style>` を差し込むため

## 環境変数

- Supabase の接続情報（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`）は `.env.local` などの `.env*` ファイルに保持し、リポジトリにコミットしない（`.gitignore` 対象）
- `VITE_` プレフィックスの環境変数はビルド後のクライアントバンドルに埋め込まれるため、ここに置いてよいのは anon key のようなクライアント公開を前提とした値のみ。Service role key など秘匿すべき値は絶対に `VITE_` プレフィックスで扱わない

## クライアント側の方針

- データ（`sheets` / `folders` / ストレージ）への問い合わせは `src/lib/sheetsApi.ts` / `src/lib/imageApi.ts` に集約し、コンポーネントやストアから直接クライアントを呼び出さない（アクセス経路を監査しやすくするため）
- 認証まわり（`supabase.auth`）の呼び出しは、`useAuth.ts` と、ガイドツアーの完了フラグを保存する `tutorialStore.ts` の2か所だけにある。後者は、データへの問い合わせではなく、ユーザー自身のメタデータの更新だが、上の方針からは外れている。増やすときは、`src/lib/` に移すことを検討する
- RLS はあくまで最終防衛線。クライアント側のバリデーション漏れがあっても、他ユーザーのデータに到達できないことをDB側で保証する設計にしている
- `dangerouslySetInnerHTML`・`innerHTML`・`eval` は使わない。ユーザーが入力した文字は React のテキストとして描画する

## 既知の制限・今後の検討事項

- 画像の MIME タイプの検査は、アップロード時の申告で判定している（ファイルの中身までは検査しない）
- 単位時間あたりの書き込み回数に対する、サーバー側のレート制限は未導入。数とサイズの上限で、1アカウントが使える容量の最大値は抑えている（DB は最大およそ 100枚 × 2MB、Storage は 200枚 × 2MB）が、アカウントを複数作られると、その分だけ増える。Supabase の無料プランの容量（DB 500MB・Storage 1GB）を埋められる可能性は残るため、ダッシュボードで使用量を定期的に確認する
- 初回ロード（`fetchSheets`）は、全シートの中身をまとめて取得する。シートが多いアカウントで繰り返し読み込まれると、帯域（無料プランは月5GB）を消費する。メタ情報だけを先に取得する形（`fetchSheetsMeta` / `fetchSheetData`）への変更を検討する
- Supabase ダッシュボード側の設定（Authentication の Redirect URLs の許可リスト、Google OAuth クライアントの設定、バケットの実際の設定）は、リポジトリからは確認できない。マイグレーションを本番へ適用したあとで、ダッシュボードでも確認する
- CI がなく、依存パッケージの脆弱性チェック（`npm audit`）や更新（Dependabot など）は自動化していない
