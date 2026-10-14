import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Status = "en_attente" | "paye" | "gratuit";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("Accès refusé");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; display_name: string; status: Status }) => {
    if (!d.email?.includes("@") || (d.password ?? "").length < 6) throw new Error("Email ou mot de passe invalide (6 caractères min.)");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim(), password: data.password, email_confirm: true,
      user_metadata: { full_name: data.display_name },
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ status: data.status, display_name: data.display_name || null }).eq("id", u.user.id);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetSubAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; on: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from("user_roles");
    const { error } = data.on
      ? await q.upsert({ user_id: data.id, role: "sub_admin" }, { onConflict: "user_id,role" })
      : await q.delete().eq("user_id", data.id).eq("role", "sub_admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
