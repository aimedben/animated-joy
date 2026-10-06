create type public.app_role as enum ('admin', 'user');
create type public.access_status as enum ('en_attente', 'paye', 'gratuit');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles or admin" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key,
  email text,
  display_name text,
  status access_status not null default 'en_attente',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "read own or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admin update" on public.profiles for update to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.user_roles where role = 'admin') into first_user;
  insert into public.profiles (id, email, display_name, status)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          case when first_user then 'gratuit'::access_status else 'en_attente'::access_status end)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  if first_user then insert into public.user_roles (user_id, role) values (new.id, 'admin'); end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public
as $$ update public.profiles set last_seen_at = now() where id = auth.uid() $$;
grant execute on function public.touch_last_seen() to authenticated;