import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Access = { status: string; isAdmin: boolean; canAdmin: boolean } | null;
export const OWNER_PHONE = "0783033616";
const normPhone = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "").replace(/^213/, "0");

const input = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring";
const btn = "w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50";

export function useAccess() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access>(null);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setAccess(null); return; }
    const uid = session.user.id;
    void supabase.rpc("touch_last_seen");
    Promise.all([
      supabase.from("profiles").select("status,phone").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]).then(([p, r]) => {
      const roles = (r.data ?? []).map((x) => x.role as string);
      const owner = roles.includes("admin") && normPhone(p.data?.phone) === OWNER_PHONE;
      const sub = roles.includes("sub_admin");
      setAccess({ status: p.data?.status ?? "en_attente", isAdmin: roles.includes("admin") || sub, canAdmin: owner || sub });
    });
  }, [session]);
  return { session, access };
}

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (mode === "up" && !r.data.session) setMsg("Vérifiez votre email pour confirmer votre compte.");
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 text-center">
        <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">TG</div>
        <h1 className="text-2xl font-extrabold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
        <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className={btn} disabled={busy}>{mode === "in" ? "Se connecter" : "S'inscrire"}</button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button type="button" className="text-sm font-medium text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </form>
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, access } = useAccess();
  if (session === undefined || (session && !access)) return null;
  if (!session) return <LoginForm />;
  const allowed = access!.isAdmin || access!.status === "gratuit" || access!.status === "paye";
  return (
    <>
      <div className="flex items-center justify-end gap-3 px-4 pt-3 text-sm">
        {access!.canAdmin && <Link to="/admin" className="flex items-center gap-1 font-semibold text-primary"><Shield className="h-4 w-4" /> Admin</Link>}
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 text-muted-foreground"><LogOut className="h-4 w-4" /> Déconnexion</button>
      </div>
      {allowed ? children : (
        <main className="mx-auto max-w-sm px-5 py-20 text-center">
          <h1 className="text-2xl font-extrabold">Compte en attente</h1>
          <p className="mt-2 text-muted-foreground">Votre compte ({session.user.email}) doit être activé par l'administrateur avant d'utiliser l'application.</p>
        </main>
      )}
    </>
  );
}
