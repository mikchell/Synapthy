-- 悪用対策: 1人あたりのシート数・フォルダ数・名前の長さ・シートのサイズ・画像の枚数とサイズに上限を設ける
-- （docs/SECURITY.md 参照）
-- 上限の値は src/lib/limits.ts と必ずそろえること。
-- 上限を超えたときは、画面で理由を表示できるよう、メッセージを "limit_exceeded:<種類>" の形にそろえる。

-- 0. すでにあるデータが、新しい上限を超えていないかを先に確かめる
--    （not valid の制約は、すでにある行の UPDATE にも効くため、超えている行があると、その行が保存できなくなる。
--      超えている行があれば、ここで止めて、何も変更しない）
do $$
declare
  big_sheets integer;
  long_names integer;
begin
  select count(*) into big_sheets
  from public.sheets
  where octet_length(data::text) > 2097152;
  if big_sheets > 0 then
    raise exception '2MBを超えるシートが % 件あります。上限を設ける前に、そのシートを確認してください', big_sheets;
  end if;

  select (select count(*) from public.sheets where char_length(name) > 100)
       + (select count(*) from public.folders where char_length(name) > 100)
  into long_names;
  if long_names > 0 then
    raise exception '100文字を超える名前のシート・フォルダが % 件あります。上限を設ける前に、その名前を短くしてください', long_names;
  end if;
end;
$$;

-- 1. 名前の長さ（100文字まで）
alter table public.sheets drop constraint if exists sheets_name_length_check;
alter table public.sheets
  add constraint sheets_name_length_check
  check (char_length(name) <= 100);

alter table public.folders drop constraint if exists folders_name_length_check;
alter table public.folders
  add constraint folders_name_length_check
  check (char_length(name) <= 100);

-- 2. シートのサイズ（2MBまで。5MBから引き下げ）
--    not valid: すでにある行は手順0で確かめ済みなので、全件の再検査は省く（これからの INSERT / UPDATE は検査される）
alter table public.sheets drop constraint if exists sheets_data_size_check;
alter table public.sheets
  add constraint sheets_data_size_check
  check (octet_length(data::text) <= 2097152) not valid; -- 2MB

-- 3. シート数の上限（100枚まで。ごみ箱に入れたシートも数える）
--    アプリは upsert で保存するため、すでにあるシートの更新でも、INSERT のトリガーが呼ばれる。
--    すでにあるIDは数えずに通し、上限に達した人も、既存のシートを編集して保存できるようにする。
--    自分の行だけを数えたいので、security invoker（RLS が効く）のままにする。
--    同時に大量のリクエストを送られても、全員が「まだ上限の手前」と数えて通過しないよう、
--    ユーザーごとのロックで直列化する（ロックはトランザクションの終わりで外れる）
create or replace function public.check_sheet_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sheets:' || auth.uid()::text, 0));

  if exists (select 1 from public.sheets where id = new.id) then
    return new;
  end if;

  if (select count(*) from public.sheets where user_id = auth.uid()) >= 100 then
    raise exception 'limit_exceeded:sheets';
  end if;

  return new;
end;
$$;

drop trigger if exists sheets_check_limit on public.sheets;
create trigger sheets_check_limit
  before insert on public.sheets
  for each row execute function public.check_sheet_limit();

-- 4. フォルダ数の上限（50個まで）。考え方はシートと同じ
create or replace function public.check_folder_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('folders:' || auth.uid()::text, 0));

  if exists (select 1 from public.folders where id = new.id) then
    return new;
  end if;

  if (select count(*) from public.folders where user_id = auth.uid()) >= 50 then
    raise exception 'limit_exceeded:folders';
  end if;

  return new;
end;
$$;

drop trigger if exists folders_check_limit on public.folders;
create trigger folders_check_limit
  before insert on public.folders
  for each row execute function public.check_folder_limit();

-- 5. 画像のサイズ（1枚2MBまで。5MBから引き下げ）と枚数（1人200枚まで）
--    ※ MIME タイプの制限（allowed_mime_types）は変えない
--    ※ 枚数の超過は、ポリシー違反（RLS）として拒否される（メッセージは変えられない）
--    ※ ポリシーの式の中ではロックを使えないため、同時に大量にアップロードされると、一度だけ上限を少し超えることがある
--      （超えたあとは、すべて拒否される）
update storage.buckets
set file_size_limit = 2097152 -- 2MB
where id = 'node-images';

drop policy if exists "自分の画像をアップロードできる" on storage.objects;
create policy "自分の画像をアップロードできる" on storage.objects
  for insert with check (
    bucket_id = 'node-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      -- name の前方一致で数える（bucket_id と name のインデックスが使える）
      select count(*) from storage.objects o
      where o.bucket_id = 'node-images'
        and o.name like auth.uid()::text || '/%'
    ) < 200
  );
