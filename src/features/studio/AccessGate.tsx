import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, LogOut, Pencil, Shield, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { adminAddUser, adminDeleteUser } from "@/lib/admin.functions";
import StudioApp from "./StudioApp";

type Status = "en_attente" | "paye" | "gratuit";
type Profile = { id: string; email: string | null; display_name: string | null; status: Status; created_at: string; last_seen_at: string | null };
const LABEL: Record<Status, string> = { en_attente: "En attente", paye: "Payé", gratuit: "Gratuit" };
const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring";
const btn = "flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold";

export default function AccessGate() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<"app" | "admin">("app");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); setIsAdmin(false); return; }
    supabase.rpc("touch_last_seen");
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data as Profile | null));
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  if (user === undefined) return null;
  if (!user) return <Login />;
  const allowed = isAdmin || profile?.status === "gratuit" || profile?.status === "paye";
  if (!profile && !isAdmin) return null;
  if (!allowed) return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-extrabold">Compte en attente</h1>
        <p className="mt-2 text-muted-foreground">Votre accès ({user.email}) doit être activé par l'administrateur après paiement.</p>
        <button onClick={() => supabase.auth.signOut()} className={`${btn} mx-auto mt-6 bg-secondary`}><LogOut className="h-4 w-4" /> Se déconnecter</button>
      </div>
    </main>
  );
  if (view === "admin" && isAdmin) return <Admin me={user.id} onBack={() => setView("app")} />;
  return (
    <>
      <div className="fixed right-3 top-3 z-40 flex gap-2">
        {isAdmin && <button onClick={() => setView("admin")} className={`${btn} bg-card px-3 py-2 text-sm shadow`}><Shield className="h-4 w-4" /> Utilisateurs</button>}
        <button aria-label="Se déconnecter" onClick={() => supabase.auth.signOut()} className={`${btn} bg-card px-3 py-2 text-sm shadow`}><LogOut className="h-4 w-4" /></button>
      </div>
      <StudioApp />
    </>
  );
}

function Login() {
  const [err, setErr] = useState("");
  const go = async () => {
    setErr("");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setErr("Connexion impossible, réessayez.");
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">TG</div>
        <h1 className="text-3xl font-extrabold">TicketGen DZ</h1>
        <p className="mb-8 mt-2 text-muted-foreground">Connectez-vous pour continuer</p>
        <button onClick={go} className={`${btn} w-full bg-primary py-4 text-primary-foreground`}>Continuer avec Google</button>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      </div>
    </main>
  );
}

function Admin({ me, onBack }: { me: string; onBack: () => void }) {
  const [list, setList] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", status: "gratuit" as Status });
  const [msg, setMsg] = useState("");
  const load = useCallback(() => { supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data as Profile[]) ?? [])); }, []);
  useEffect(load, [load]);

  const stats = { total: list.length, gratuit: list.filter((x) => x.status === "gratuit").length, paye: list.filter((x) => x.status === "paye").length, attente: list.filter((x) => x.status === "en_attente").length };

  const setStatus = async (p: Profile, status: Status) => { await supabase.from("profiles").update({ status }).eq("id", p.id); load(); };
  const saveEdit = async () => { if (!editing) return; await supabase.from("profiles").update({ display_name: editing.display_name, status: editing.status }).eq("id", editing.id); setEditing(null); load(); };
  const del = async (p: Profile) => { if (!confirm(`Supprimer ${p.email} ?`)) return; try { await adminDeleteUser({ data: { id: p.id } }); load(); } catch (e) { setMsg((e as Error).message); } };
  const add = async () => { setMsg(""); try { await adminAddUser({ data: form }); setAdding(false); setForm({ email: "", name: "", status: "gratuit" }); load(); } catch (e) { setMsg((e as Error).message); } };

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <h2 className="mb-4 text-2xl font-extrabold">Utilisateurs</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Total", stats.total], ["Gratuits", stats.gratuit], ["Payés", stats.paye], ["En attente", stats.attente]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p><p className="text-3xl font-extrabold">{v}</p></div>
        ))}
      </div>
      <button onClick={() => setAdding((v) => !v)} className={`${btn} mb-4 w-full bg-primary text-primary-foreground`}><UserPlus className="h-5 w-5" /> Ajouter un utilisateur</button>
      {adding && (
        <div className="mb-4 space-y-2 rounded-2xl border border-border bg-card p-4">
          <input className={inputCls} placeholder="Email Google" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inputCls} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
            {Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button onClick={add} className={`${btn} w-full bg-primary text-primary-foreground`}>Enregistrer</button>
        </div>
      )}
      {msg && <p className="mb-3 text-sm text-destructive">{msg}</p>}
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-3">
            {editing?.id === p.id ? (
              <div className="space-y-2">
                <input className={inputCls} value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
                <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Status })}>
                  {Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <div className="flex gap-2"><button onClick={saveEdit} className={`${btn} flex-1 bg-primary text-primary-foreground`}>Enregistrer</button><button onClick={() => setEditing(null)} className={`${btn} flex-1 bg-secondary`}>Annuler</button></div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.display_name || "—"}{p.id === me && " (vous)"}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.email}</p>
                </div>
                <button onClick={() => setStatus(p, p.status === "gratuit" ? "en_attente" : "gratuit")}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${p.status === "gratuit" ? "bg-primary text-primary-foreground" : p.status === "paye" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{LABEL[p.status]}</button>
                <button aria-label="Modifier" onClick={() => setEditing(p)} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                {p.id !== me && <button aria-label="Supprimer" onClick={() => del(p)} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
