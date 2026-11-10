-- הקמת המסד של דשבורד הלידים. מריצים פעם אחת ב־Supabase: SQL Editor → מדביקים → Run.
-- בטוח להריץ שוב (לא מוחק נתונים).
-- הטבלאות סגורות לגישה ישירה מהדפדפן. הדפדפן קורא רק לפונקציות dr_list / dr_save / dr_delete,
-- וכל אחת בודקת את קוד הגישה שבקישור (?k=...).

create extension if not exists pgcrypto with schema extensions;

create table if not exists dr_settings (
  id int primary key default 1 check (id = 1),
  access_code text not null
);

-- כל ליד הוא אובייקט JSON אחד (data), כך שאפשר להוסיף שדות בלי לשנות את המסד.
-- השדות היום: first_name, last_name, phone, date (YYYY-MM-DD), domain, status, notes.
create table if not exists dr_leads (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dr_settings enable row level security;
alter table dr_leads enable row level security;
revoke all on dr_settings, dr_leads from anon, authenticated;

-- קוד גישה אקראי. רואים אותו עם:  select access_code from dr_settings;
insert into dr_settings (id, access_code)
values (1, encode(extensions.gen_random_bytes(12), 'hex'))
on conflict (id) do nothing;

create or replace function dr_check(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or not exists (select 1 from dr_settings where access_code = p_code) then
    raise exception 'קוד גישה לא תקין' using errcode = '28000';
  end if;
end $$;

create or replace function dr_list(p_code text) returns setof dr_leads
language plpgsql security definer set search_path = public as $$
begin
  perform dr_check(p_code);
  return query select * from dr_leads order by data->>'date' desc nulls last, created_at desc;
end $$;

create or replace function dr_save(p_code text, p_id uuid, p_data jsonb) returns dr_leads
language plpgsql security definer set search_path = public as $$
declare r dr_leads;
begin
  perform dr_check(p_code);
  if p_id is null then
    insert into dr_leads (data) values (coalesce(p_data, '{}'::jsonb)) returning * into r;
  else
    insert into dr_leads (id, data) values (p_id, coalesce(p_data, '{}'::jsonb))
    on conflict (id) do update set data = excluded.data, updated_at = now()
    returning * into r;
  end if;
  return r;
end $$;

create or replace function dr_delete(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform dr_check(p_code);
  delete from dr_leads where id = p_id;
end $$;

revoke all on function dr_check(text) from public, anon, authenticated;
revoke all on function dr_list(text), dr_save(text, uuid, jsonb), dr_delete(text, uuid) from public;
grant execute on function dr_list(text), dr_save(text, uuid, jsonb), dr_delete(text, uuid) to anon, authenticated;

-- הצגת הקוד בסוף ההרצה
select access_code from dr_settings;
