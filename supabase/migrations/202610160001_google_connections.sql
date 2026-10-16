-- Only the authenticated Edge Function's service role can read encrypted grants.
create table public.google_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 google_sub text not null,
 refresh_ciphertext text not null,
 updated_at timestamptz not null default now()
);
alter table public.google_connections enable row level security;
revoke all on public.google_connections from public,anon,authenticated;
grant select,insert,update,delete on public.google_connections to service_role;
