-- セキュリティ強化（docs/SECURITY.md 参照）

-- 1. node-images バケットにサーバー側のサイズ・形式の制限を追加する
--    クライアント側のチェックだけでは、APIを直接叩かれると素通りになってしまうため
--    （バケット作成時は on conflict do nothing なので、既存のバケットは update で直す）
--    ※ MIME タイプはアップロード時の申告で判定される（中身までは検査しない）
update storage.buckets
set
  file_size_limit = 5242880, -- 5MB（クライアントも圧縮後にこの上限で確認する）
  allowed_mime_types = array['image/webp', 'image/png', 'image/jpeg', 'image/gif']
where id = 'node-images';

-- 2. sheets.data（nodes/edges のJSONB）にサイズの上限を設ける
--    not valid: すでにある行は検査せず、これからの INSERT / UPDATE から検査する
alter table sheets drop constraint if exists sheets_data_size_check;
alter table sheets
  add constraint sheets_data_size_check
  check (octet_length(data::text) <= 5242880) not valid; -- 5MB

-- 3. 関数の search_path を固定する
--    security definer の関数は、呼び出し側の search_path に左右されないようにしておく
alter function public.update_updated_at() set search_path = '';
alter function public.set_sheet_user_id() set search_path = '';
alter function public.set_folder_user_id() set search_path = '';

-- 4. sheets.folder_id に、他のユーザーのフォルダを指定できないようにする
--    （外部キーの検証はRLSを通らないため、指定したIDのフォルダが存在するかどうかが他人にわかってしまう）
drop policy if exists "自分のシートを作成できる" on sheets;
create policy "自分のシートを作成できる" on sheets
  for insert
  with check (
    auth.uid() = user_id
    and (
      folder_id is null
      or exists (
        select 1 from folders
        where folders.id = sheets.folder_id and folders.user_id = auth.uid()
      )
    )
  );

drop policy if exists "自分のシートを更新できる" on sheets;
create policy "自分のシートを更新できる" on sheets
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      folder_id is null
      or exists (
        select 1 from folders
        where folders.id = sheets.folder_id and folders.user_id = auth.uid()
      )
    )
  );
