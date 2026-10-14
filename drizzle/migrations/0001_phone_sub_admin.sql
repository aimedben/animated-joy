ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sub_admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select exists (select 1 from public.user_roles where user_id = _user_id and role::text in ('admin','sub_admin')) $$;
CREATE POLICY "staff read" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));