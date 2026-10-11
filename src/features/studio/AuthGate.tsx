import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import StudioApp from "./StudioApp";
import AdminPanel from "./AdminPanel";

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("Compte créé. Vérifiez votre e-mail si une confirmation est demandée, puis connectez-vous.");
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 text-center">
        <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">TG</div>
        <h1 className="text-2xl font-extrabold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
        {mode === "up" && <input className={inputCls} placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />}
        <input className={inputCls} type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="w-full rounded-2xl bg-primary px-5 py-4 font-semibold text-primary-foreground disabled:opacity-50">{mode === "in" ? "Se connecter" : "Créer le compte"}</button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-sm font-medium text-primary">
          {mode === "in" ? "Pas de compte ? Inscrivez-vous" : "Déjà un compte ? Connectez-vous"}
        </button>
      </form>
    </main>
  );
}

type Profile = { status: "en_attente" | "paye" | "gratuit"; display_name: string | null };

export default function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<"app" | "admin">("app");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) { setProfile(null); setIsAdmin(false); return; }
    supabase.from("profiles").select("status, display_name").eq("id", uid).maybeSingle().then(({ data }) => setProfile((data as Profile) ?? { status: "en_attente", display_name: null }));
    supabase.rpc("has_role", { _user_id: uid, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
    supabase.rpc("touch_last_seen");
  }, [uid]);

  const signOut = () => supabase.auth.signOut();
  if (session === undefined || (session && !profile)) return <div className="min-h-screen bg-background" />;
  if (!session) return <AuthScreen />;
  if (view === "admin" && isAdmin) return <AdminPanel onBack={() => setView("app")} />;
  if (profile!.status === "en_attente" && !isAdmin) return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-extrabold">Compte en attente</h1>
        <p className="text-muted-foreground">Votre accès doit être activé par l'administrateur.</p>
        <button onClick={signOut} className="text-sm font-medium text-primary">Se déconnecter</button>
      </div>
    </main>
  );
  return <StudioApp isAdmin={isAdmin} onOpenAdmin={() => setView("admin")} onSignOut={signOut} />;
}
