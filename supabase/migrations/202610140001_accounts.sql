begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'user' check(role in ('admin','user')),
 created_at timestamptz not null default now()
);
create table public.notebooks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 revision bigint not null default 1 check(revision>0),
 last_request uuid not null,
 updated_at timestamptz not null default now()
);
create table public.notebook_imports (
 user_id uuid references auth.users(id) on delete cascade,
 fingerprint text not null,
 imported_at timestamptz not null default now(),
 primary key(user_id,fingerprint)
);
alter table public.profiles enable row level security;
alter table public.notebooks enable row level security;
alter table public.notebook_imports enable row level security;
revoke all on public.profiles,public.notebooks,public.notebook_imports from anon,authenticated;
grant select on public.profiles,public.notebooks to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_notebook on public.notebooks for select to authenticated using(user_id=(select auth.uid()));
create function public.new_account() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id) values(new.id);return new;end;$$;
revoke all on function public.new_account() from public,anon,authenticated;
create trigger unbound_new_account after insert on auth.users for each row execute function public.new_account();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create function public.valid_notebook(d jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(d)='object' and d->>'version'='1'
 and jsonb_typeof(d->'events')='array' and jsonb_typeof(d->'tasks')='array'
 and jsonb_typeof(d->'notes')='array' and jsonb_typeof(d->'habits')='array'
 and jsonb_typeof(d->'entries')='object' and jsonb_typeof(d->'ink')='object'
 and jsonb_typeof(d->'settings')='object' and jsonb_typeof(d->'trash')='array'
 and jsonb_typeof(d->'bookmarks')='array' and octet_length(d::text)<=10485760,false);
$$;
create function public.save_notebook(p_data jsonb,p_expected_revision bigint,p_request_id uuid,p_import_hash text default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); n public.notebooks%rowtype;
begin
 if uid is null then raise exception 'authentication_required';end if;
 if not public.valid_notebook(p_data) or p_request_id is null or p_expected_revision is null then raise exception 'invalid_notebook';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into n from public.notebooks where user_id=uid for update;
 if n.last_request=p_request_id then return jsonb_build_object('revision',n.revision);end if;
 if p_import_hash is not null then
  if p_import_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_import_hash';end if;
  if exists(select 1 from public.notebook_imports where user_id=uid and fingerprint=p_import_hash) then raise exception 'already_imported';end if;
  if n.user_id is not null then raise exception 'import_requires_empty_account';end if;
 end if;
 if coalesce(n.revision,0)<>p_expected_revision then raise exception 'revision_conflict';end if;
 insert into public.notebooks(user_id,data,revision,last_request) values(uid,p_data,1,p_request_id)
 on conflict(user_id) do update set data=excluded.data,revision=public.notebooks.revision+1,last_request=excluded.last_request,updated_at=now()
 returning * into n;
 if p_import_hash is not null then insert into public.notebook_imports(user_id,fingerprint) values(uid,p_import_hash);end if;
 return jsonb_build_object('revision',n.revision);
end;$$;
revoke all on function public.save_notebook(jsonb,bigint,uuid,text) from public,anon;
grant execute on function public.save_notebook(jsonb,bigint,uuid,text) to authenticated;
create function public.has_unrestricted_access() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.has_unrestricted_access() from public,anon;
grant execute on function public.has_unrestricted_access() to authenticated;
commit;
-- Owner bootstrap is deliberately NOT automatic. After verifying the authenticated
-- owner UUID, run privileged SQL: update public.profiles set role='admin' where id='<verified UUID>';
