-- Box refresh grants are encrypted and readable only by the authenticated
-- box-connection Edge Function using its service-role client.
create table public.box_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 refresh_ciphertext text not null,
 updated_at timestamptz not null default now()
);
alter table public.box_connections enable row level security;
revoke all on public.box_connections from public,anon,authenticated;
grant select,insert,update,delete on public.box_connections to service_role;
