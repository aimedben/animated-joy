import { useEffect, useState } from "react";
import { ArrowLeft, Check, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminDeleteUser } from "@/lib/admin.functions";

type Status = "en_attente" | "paye" | "gratuit";
type Row = { id: string; email: string | null; display_name: string | null; status: Status; created_at: string; last_seen_at: string | null };
const LABEL: Record<Status, string> = { en_attente: "En attente", paye: "Payé", gratuit: "Gratuit" };
const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [nu, setNu] = useState({ email: "", password: "", displayName: "", status: "gratuit" as Status });
  const createFn = useServerFn(adminCreateUser);
  const deleteFn = useServerFn(adminDeleteUser);

  const load = async () => {
    const { data, error } = await supabase.from("profiles").select("id, email, display_name, status, created_at, last_seen_at").order("created_at", { ascending: false });
    if (error) setErr(error.message); else setRows(data as Row[]);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) setErr(error.message); else load();
  };
  const del = async (r: Row) => {
    if (!confirm(`Supprimer ${r.email} ?`)) return;
    try { await deleteFn({ data: { id: r.id } }); load(); } catch (e) { setErr((e as Error).message); }
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try { await createFn({ data: nu }); setShowAdd(false); setNu({ email: "", password: "", displayName: "", status: "gratuit" }); load(); }
    catch (e) { setErr((e as Error).message); }
  };

  const week = Date.now() - 7 * 864e5;
  const stats = [
    ["Total", rows.length],
    ["Gratuits", rows.filter((r) => r.status === "gratuit").length],
    ["Payés", rows.filter((r) => r.status === "paye").length],
    ["En attente", rows.filter((r) => r.status === "en_attente").length],
    ["Actifs 7 j", rows.filter((r) => r.last_seen_at && new Date(r.last_seen_at).getTime() > week).length],
    ["Nouveaux 7 j", rows.filter((r) => new Date(r.created_at).getTime() > week).length],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 pb-10 pt-6 sm:px-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold">Utilisateurs</h2>
        <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><UserPlus className="h-4 w-4" /> Ajouter</button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-3 text-center">
            <div className="text-2xl font-extrabold">{v}</div><div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      {err && <p className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}

      {showAdd && (
        <form onSubmit={add} className="mb-5 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <input className={inputCls} required type="email" placeholder="E-mail" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          <input className={inputCls} required minLength={6} placeholder="Mot de passe" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          <input className={inputCls} placeholder="Nom" value={nu.displayName} onChange={(e) => setNu({ ...nu, displayName: e.target.value })} />
          <select className={inputCls} value={nu.status} onChange={(e) => setNu({ ...nu, status: e.target.value as Status })}>
            {(Object.keys(LABEL) as Status[]).map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
          <button className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground sm:col-span-2">Créer l'utilisateur</button>
        </form>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {editId === r.id ? (
                  <div className="flex gap-1">
                    <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <button aria-label="Valider" onClick={() => { update(r.id, { display_name: editName }); setEditId(null); }} className="px-2 text-primary"><Check className="h-5 w-5" /></button>
                    <button aria-label="Annuler" onClick={() => setEditId(null)} className="px-2 text-muted-foreground"><X className="h-5 w-5" /></button>
                  </div>
                ) : (
                  <>
                    <p className="truncate font-semibold">{r.display_name || "—"}</p>
                    <p className="truncate text-sm text-muted-foreground">{r.email}</p>
                  </>
                )}
              </div>
              {editId !== r.id && (
                <div className="flex items-center gap-1">
                  <button aria-label="Modifier" onClick={() => { setEditId(r.id); setEditName(r.display_name ?? ""); }} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Supprimer" onClick={() => del(r)} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(Object.keys(LABEL) as Status[]).map((s) => (
                <button key={s} onClick={() => update(r.id, { status: s })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${r.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{LABEL[s]}</button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">Vu : {r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("fr-FR") : "jamais"}</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
