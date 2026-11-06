begin;

-- Provider refresh credentials are accessible only to the authenticated edge
-- function through service_role. They never enter notebook JSON or browser DB.
create table public.personal_storage_connections (
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('google-drive','dropbox','box')),
 provider_account_id text not null,
 refresh_ciphertext text not null,
 scopes text[] not null default '{}',
 connected_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,provider)
);

create table public.storage_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 attachment_provider text check (attachment_provider is null or attachment_provider in ('google-drive','dropbox','box')),
 backup_provider text check (backup_provider is null or backup_provider in ('google-drive','dropbox','box')),
 updated_at timestamptz not null default now()
);

-- Attachment references are lightweight and owner-scoped. No file contents or
-- provider tokens are stored here. `capture_id` makes retries idempotent.
create table public.attachments (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 note_id text not null,
 capture_id text,
 provider text not null check (provider in ('google-drive','dropbox','box')),
 provider_file_id text not null,
 name text not null check (length(name) <= 255),
 mime_type text not null check (length(mime_type) <= 255),
 byte_size bigint not null check (byte_size >= 0),
 content_hash text,
 width numeric,
 left_position numeric,
 duration_ms integer,
 created_at timestamptz not null default now(),
 unique(user_id, provider, provider_file_id),
 unique(user_id, capture_id)
);

alter table public.personal_storage_connections enable row level security;
alter table public.storage_preferences enable row level security;
alter table public.attachments enable row level security;

revoke all on public.personal_storage_connections,public.storage_preferences,public.attachments from anon,authenticated;
grant select,insert,update,delete on public.storage_preferences,public.attachments to authenticated;
grant select,insert,update,delete on public.personal_storage_connections to service_role;

create policy own_storage_preferences on public.storage_preferences
 for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy own_attachments on public.attachments
 for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- A default may only point at a connection belonging to the same user.
create function public.valid_storage_preferences() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.attachment_provider is not null and not exists(
  select 1 from public.personal_storage_connections c
  where c.user_id=new.user_id and c.provider=new.attachment_provider
 ) then raise exception 'storage_provider_not_connected'; end if;
 if new.backup_provider is not null and not exists(
  select 1 from public.personal_storage_connections c
  where c.user_id=new.user_id and c.provider=new.backup_provider
 ) then raise exception 'backup_provider_not_connected'; end if;
 return new;
end; $$;
revoke all on function public.valid_storage_preferences() from public,anon,authenticated;
create trigger storage_preferences_require_connection before insert or update on public.storage_preferences
 for each row execute function public.valid_storage_preferences();

commit;
