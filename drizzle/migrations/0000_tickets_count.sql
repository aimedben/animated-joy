alter table public.profiles add column if not exists tickets_count integer not null default 0;
create or replace function public.track_ticket()
returns void language sql security definer set search_path = public
as $$ update public.profiles set tickets_count = tickets_count + 1, last_seen_at = now() where id = auth.uid() $$;
revoke execute on function public.track_ticket() from public, anon;
grant execute on function public.track_ticket() to authenticated;