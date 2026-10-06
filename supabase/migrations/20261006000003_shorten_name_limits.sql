-- 名前の長さの上限を引き下げる（シート名: 100文字 → 30文字、フォルダ名: 100文字 → 10文字）
-- （docs/SECURITY.md 参照）
-- 上限の値は src/lib/limits.ts と必ず同じにすること。
--
-- 適用の順番: 先に画面側（src/lib/limits.ts）をデプロイしてから、このマイグレーションを適用する。
-- 逆にすると、古い画面は100文字まで入力できるので、31文字以上のシート名・11文字以上のフォルダ名が保存できない

-- 0. すでにある名前のうち、新しい上限を超えるものを、先頭から切り詰める
--    （制約を追加するときは、すでにある行も検査される。超える行が残っていると、制約を追加できないうえ、
--      その行は、スターやごみ箱など名前以外の更新も、制約に違反して保存できなくなってしまう）
--    left() は、文字（コードポイント）の数で切る。切り詰めた行は、更新日時も新しくなる
update public.sheets set name = left(name, 30) where char_length(name) > 30;
update public.folders set name = left(name, 10) where char_length(name) > 10;

-- 1. 名前の長さの制約を、新しい上限に作り直す
alter table public.sheets drop constraint if exists sheets_name_length_check;
alter table public.sheets
  add constraint sheets_name_length_check
  check (char_length(name) <= 30);

alter table public.folders drop constraint if exists folders_name_length_check;
alter table public.folders
  add constraint folders_name_length_check
  check (char_length(name) <= 10);
