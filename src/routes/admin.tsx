import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoginForm, useAccess } from "@/features/studio/AuthGate";
import { adminCreateUser, adminDeleteUser, adminSetSubAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — TicketGen DZ Studio" },
      { name: "description", content: "Gestion des utilisateurs de TicketGen DZ Studio." },
      { property: "og:title", content: "Admin — TicketGen DZ Studio" },
      { property: "og:description", content: "Gestion des utilisateurs de TicketGen DZ Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Status = "en_attente" | "paye" | "gratuit";
type Row = { id: string; email: string | null; display_name: string | null; status: Status; phone: string | null; sub?: boolean; tickets_count: number; last_seen_at: string | null; created_at: string };
const LABEL: Record<Status, string> = { en_attente: "En attente", paye: "Payé", gratuit: "Gratuit" };
const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-base";

function AdminPage() {
  const { session, access } = useAccess();
  if (session === undefined || (session && !access)) return null;
  if (!session) return <LoginForm />;
  if (!access!.canAdmin) return <main className="p-10 text-center">Accès réservé à l'administrateur. <Link to="/" className="text-primary">Retour</Link></main>;
  return <Admin />;
}

function Admin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", password: "", display_name: "", status: "gratuit" as Status });
  const create = useServerFn(adminCreateUser);
  const del = useServerFn(adminDeleteUser);
  const setSub = useServerFn(adminSetSubAdmin);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("id,email,display_name,status,phone,tickets_count,last_seen_at,created_at").order("created_at", { ascending: false });
    const { data: rl } = await supabase.from("user_roles").select("user_id,role");
    const subs = new Set((rl ?? []).filter((x) => (x.role as string) === "sub_admin").map((x) => x.user_id));
    if (error) setErr(error.message); else setRows((data as Row[]).map((x) => ({ ...x, sub: subs.has(x.id) })));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const update = async (id: string, patch: Partial<Row>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) setErr(error.message);
  };
  const week = Date.now() - 7 * 864e5;
  const stats = [
    ["Utilisateurs", rows.length],
    ["Gratuits", rows.filter((r) => r.status === "gratuit").length],
    ["Payés", rows.filter((r) => r.status === "paye").length],
    ["En attente", rows.filter((r) => r.status === "en_attente").length],
    ["Actifs 7 j", rows.filter((r) => r.last_seen_at && +new Date(r.last_seen_at) > week).length],
    ["Maquettes", rows.reduce((s, r) => s + r.tickets_count, 0)],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 pb-10 pt-6">
      <Link to="/" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour à l'app</Link>
      <h1 className="mb-5 text-2xl font-extrabold">Gestion des utilisateurs</h1>
      {err && <p className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </div>

      <form className="mb-6 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        try { await create({ data: form }); setForm({ email: "", password: "", display_name: "", status: "gratuit" }); await load(); }
        catch (x) { setErr((x as Error).message); }
      }}>
        <input className={input} placeholder="Nom" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        <input className={input} type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={input} type="text" required minLength={6} placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
          {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 font-bold text-primary-foreground"><UserPlus className="h-4 w-4" /> Ajouter</button>
      </form>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid items-center gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto_auto]">
            <input className={input} defaultValue={r.display_name ?? ""} onBlur={(e) => e.target.value !== (r.display_name ?? "") && update(r.id, { display_name: e.target.value })} />
            <span className="truncate text-sm text-muted-foreground">{r.email}</span>
            <input className={input} placeholder="Téléphone" defaultValue={r.phone ?? ""} onBlur={(e) => e.target.value !== (r.phone ?? "") && update(r.id, { phone: e.target.value || null })} />
            <select className={input} value={r.status} onChange={(e) => update(r.id, { status: e.target.value as Status })}>
              {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={!!r.sub} onChange={async (e) => {
              const on = e.target.checked;
              try { await setSub({ data: { id: r.id, on } }); setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, sub: on } : x))); } catch (x) { setErr((x as Error).message); }
            }} /> Sous-admin</label>
            <span className="text-xs text-muted-foreground">{r.tickets_count} maquette(s)<br />{r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("fr-FR") : "jamais"}</span>
            <button aria-label="Supprimer" className="justify-self-end p-2 text-destructive" onClick={async () => {
              if (!confirm(`Supprimer ${r.email} ?`)) return;
              try { await del({ data: { id: r.id } }); await load(); } catch (x) { setErr((x as Error).message); }
            }}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </main>
  );
}
