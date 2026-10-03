import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Dices, Download, FolderOpen, ImagePlus, Move, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import defaultBg from "@/features/ticketgen/assets/images/table_wood_desk_1791047001699.jpg";
import { type Product, type Project, clampTicket, drawProject, presetTicket } from "./render";

type Screen = "home" | "studio" | "s1" | "s2" | "s3" | "result" | "adjust";
const KEY = "ticketgen-studio-projects";

const pad2 = (n: number) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const now = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const randNumber = () => Array.from({ length: 10 }, () => rnd(0, 9)).join("");
const randDate = () => { const d = new Date(Date.now() - rnd(0, 120) * 864e5); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const randTime = () => `${pad2(rnd(8, 21))}:${pad2(rnd(0, 59))}`;

const FORMATS: Record<string, [number, number]> = { "16:9": [1600, 900], "4:3": [1600, 1200], "1:1": [1400, 1400], "9:16": [900, 1600] };

function newProject(): Project {
  return {
    id: crypto.randomUUID(), name: "", createdAt: Date.now(), backgroundImage: null,
    photoWidth: 1600, photoHeight: 900, ticketSize: "M", ticketWidth: 0, ticketHeight: 0,
    ticketPosition: { x: 0.5, y: 0.5 }, zoom: 1, ticketNumber: randNumber(), date: today(), time: now(), products: [],
  };
}
const loadAll = (): Project[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

function useImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new Image(); i.onload = () => setImg(i); i.src = src; }, [src]);
  return img;
}

function readImage(file: File): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => {
      const i = new Image();
      i.onload = () => {
        const s = Math.min(1, 1800 / Math.max(i.width, i.height));
        const c = document.createElement("canvas");
        c.width = i.width * s; c.height = i.height * s;
        c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.85));
      };
      i.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}

/* ---------- UI atoms ---------- */
const Big = ({ children, onClick, variant = "primary", disabled }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "soft"; disabled?: boolean }) => (
  <button disabled={disabled} onClick={onClick}
    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold transition active:scale-[0.98] disabled:opacity-40 ${variant === "primary" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "border border-border bg-card text-foreground"}`}>
    {children}
  </button>
);
const Chip = ({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{children}</button>
);
const Card = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    {title && <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>}
    {children}
  </section>
);
const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

function StepHeader({ step, title, sub, onBack }: { step: number; title: string; sub?: string; onBack: () => void }) {
  return (
    <div className="mb-5">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <div className="mb-2 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        {[1, 2, 3].map((s) => (
          <span key={s} className={`flex items-center gap-1 ${s === step ? "text-primary" : ""}`}>{s === step ? "●" : "○"} Étape {s}</span>
        ))}
      </div>
      <p className="text-xs font-bold text-primary">ÉTAPE {step} / 3</p>
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {sub && <p className="text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Preview({ project, onDrag }: { project: Project; onDrag?: (x: number, y: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const img = useImage(project.backgroundImage || defaultBg);
  useEffect(() => { if (ref.current) drawProject(ref.current, project, img, 0.6); }, [project, img]);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const toFrac = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  return (
    <canvas ref={ref}
      className={`block h-auto max-h-[65vh] w-full rounded-xl object-contain shadow-md ${onDrag ? "touch-none cursor-grab" : ""}`}
      onPointerDown={(e) => {
        if (!onDrag) return;
        const f = toFrac(e); const c = clampTicket(project);
        drag.current = { dx: c.x - f.x, dy: c.y - f.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => { if (drag.current && onDrag) { const f = toFrac(e); onDrag(f.x + drag.current.dx, f.y + drag.current.dy); } }}
      onPointerUp={() => (drag.current = null)}
    />
  );
}

/* ---------- App ---------- */
export default function StudioApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [projects, setProjects] = useState<Project[]>(loadAll);
  const [p, setP] = useState<Project>(newProject);
  const [productsText, setProductsText] = useState("");
  const [qtyMode, setQtyMode] = useState<"none" | "paste">("none");
  const [qtyText, setQtyText] = useState("");
  const [priceText, setPriceText] = useState("");
  const bgImg = useImage(p.backgroundImage || defaultBg);
  const up = (patch: Partial<Project>) => setP((o) => ({ ...o, ...patch }));

  // Products follow the pasted lines, preserving existing qty/price by index
  const syncProducts = (text: string) => {
    setProductsText(text);
    const names = text.split("\n").map((s) => s.trim()).filter(Boolean);
    setP((o) => ({ ...o, products: names.map((name, i) => ({ name, quantity: o.products[i]?.quantity ?? 0, unitPrice: o.products[i]?.unitPrice ?? null })) }));
  };
  const setProd = (i: number, patch: Partial<Product>) => setP((o) => ({ ...o, products: o.products.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const nums = (t: string) => t.split("\n").map((s) => s.trim()).map((s) => (s === "" ? null : Number(s.replace(",", ".")))).map((n) => (n === null || isNaN(n) ? null : n));

  const missingPrices = p.products.some((x) => x.unitPrice === null);
  const hasQty = p.products.length > 0 && p.products.every((x) => x.quantity > 0);

  const applyTicketPreset = (size: "S" | "M" | "L", pw = p.photoWidth, ph = p.photoHeight) => {
    const t = presetTicket(size, pw, ph, p.products.length);
    up({ ticketSize: size, ticketWidth: t.w, ticketHeight: t.h, photoWidth: pw, photoHeight: ph });
  };
  const formatKey = Object.entries(FORMATS).find(([, [w, h]]) => w === p.photoWidth && h === p.photoHeight)?.[0] ?? "custom";
  const [customFormat, setCustomFormat] = useState(false);

  const persist = (proj: Project) => {
    const c = document.createElement("canvas");
    drawProject(c, proj, bgImg, 260 / proj.photoWidth);
    const saved = { ...proj, name: proj.name || `Projet ${String(projects.length + 1).padStart(2, "0")}`, thumbnail: c.toDataURL("image/jpeg", 0.7) };
    const list = [saved, ...projects.filter((x) => x.id !== proj.id)];
    setProjects(list); setP(saved);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full */ }
  };

  const openProject = (proj: Project) => {
    setP(proj);
    setProductsText(proj.products.map((x) => x.name).join("\n"));
    setPriceText(proj.products.map((x) => x.unitPrice ?? "").join("\n"));
    setQtyMode("none");
    setScreen("result");
  };
  const startNew = () => { setP(newProject()); setProductsText(""); setPriceText(""); setQtyText(""); setQtyMode("none"); setCustomFormat(false); setScreen("s1"); };

  const exportImg = () => {
    const c = document.createElement("canvas");
    drawProject(c, p, bgImg, 1);
    const a = document.createElement("a");
    a.download = `maquette-${p.ticketNumber}.png`; a.href = c.toDataURL("image/png"); a.click();
  };

  const container = "mx-auto w-full max-w-[1000px] px-4 pb-10 pt-6 sm:px-6";

  /* HOME */
  if (screen === "home") return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-lg shadow-primary/30">TG</div>
        <h1 className="text-3xl font-extrabold">TicketGen DZ</h1>
        <p className="mb-10 mt-2 text-muted-foreground">Que voulez-vous faire ?</p>
        <div className="space-y-4">
          <Big variant="soft" onClick={() => setScreen("studio")}><FolderOpen className="h-5 w-5" /> STUDIO</Big>
          <Big onClick={startNew}><Plus className="h-5 w-5" /> NOUVEAU PROJET</Big>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">Toutes les maquettes portent la mention « SPÉCIMEN — NON VALABLE ».</p>
      </div>
    </main>
  );

  /* STUDIO */
  if (screen === "studio") return (
    <main className={container}>
      <button onClick={() => setScreen("home")} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <h2 className="mb-5 text-2xl font-extrabold">Studio</h2>
      {projects.length === 0 ? (
        <Card><p className="mb-4 text-muted-foreground">Aucun projet enregistré pour l'instant.</p><Big onClick={startNew}><Plus className="h-5 w-5" /> Nouveau projet</Big></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {projects.map((x) => (
            <div key={x.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <button onClick={() => openProject(x)} className="block w-full">
                <img src={x.thumbnail} alt={x.name} className="aspect-video w-full bg-muted object-cover" />
              </button>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="truncate text-sm font-semibold">{x.name}</span>
                <button aria-label="Supprimer" onClick={() => { const l = projects.filter((y) => y.id !== x.id); setProjects(l); localStorage.setItem(KEY, JSON.stringify(l)); }} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );

  /* STEP 1 */
  if (screen === "s1") return (
    <main className={container}>
      <StepHeader step={1} title="Produits" sub="Ajoutez votre liste de produits" onBack={() => setScreen("home")} />
      <div className="space-y-4">
        <Card title="Liste (un produit par ligne)">
          <textarea value={productsText} onChange={(e) => syncProducts(e.target.value)} rows={7} className={inputCls}
            placeholder={"Canbebe\nMirinda\nPepsi\nPalmary"} />
          <p className="mt-2 text-sm text-muted-foreground">{p.products.length} produit(s)</p>
        </Card>

        {p.products.length > 0 && (
          <Card title="Quantités">
            <div className="grid grid-cols-2 gap-2">
              <Chip onClick={() => { setQtyMode("none"); setP((o) => ({ ...o, products: o.products.map((x) => ({ ...x, quantity: rnd(1, 4) })) })); }}>Générer automatiquement</Chip>
              <Chip active={qtyMode === "paste"} onClick={() => setQtyMode("paste")}>Coller les quantités</Chip>
            </div>
            {qtyMode === "paste" && (
              <textarea rows={4} value={qtyText} className={`${inputCls} mt-3`} placeholder={"1\n2\n1"}
                onChange={(e) => { setQtyText(e.target.value); const q = nums(e.target.value); setP((o) => ({ ...o, products: o.products.map((x, i) => ({ ...x, quantity: Math.max(0, Math.round(q[i] ?? 0)) })) })); }} />
            )}
          </Card>
        )}

        {p.products.length > 0 && (
          <Card title="Prix unitaires">
            <textarea rows={4} value={priceText} className={inputCls} placeholder="Collez ici les prix, un prix par ligne"
              onChange={(e) => { setPriceText(e.target.value); const pr = nums(e.target.value); setP((o) => ({ ...o, products: o.products.map((x, i) => ({ ...x, unitPrice: pr[i] ?? null })) })); }} />
            {missingPrices && (
              <div className="mt-3"><Chip onClick={() => {
                const filled = p.products.map((x) => ({ ...x, unitPrice: x.unitPrice ?? rnd(5, 40) * 10 }));
                setP((o) => ({ ...o, products: filled })); setPriceText(filled.map((x) => x.unitPrice).join("\n"));
              }}>Compléter automatiquement</Chip></div>
            )}
          </Card>
        )}

        {p.products.length > 0 && (
          <Card title="Aperçu">
            <ul className="divide-y divide-border">
              {p.products.map((x, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2">
                  <span className="truncate font-medium">{x.name}</span>
                  <label className="flex items-center gap-1 text-sm text-muted-foreground">×
                    <input type="number" inputMode="numeric" min={0} value={x.quantity || ""} onChange={(e) => setProd(i, { quantity: Math.max(0, Number(e.target.value)) })} className="w-14 rounded-lg border border-input bg-background px-2 py-2 text-center text-base text-foreground" />
                  </label>
                  <input type="number" inputMode="decimal" placeholder="prix" value={x.unitPrice ?? ""} onChange={(e) => setProd(i, { unitPrice: e.target.value === "" ? null : Number(e.target.value) })} className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-right text-base" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Big disabled={!hasQty || missingPrices} onClick={() => { if (!p.ticketWidth) applyTicketPreset("M"); setScreen("s2"); }}>CONTINUER →</Big>
        {p.products.length > 0 && (!hasQty || missingPrices) && <p className="text-center text-sm text-muted-foreground">Indiquez les quantités et les prix pour continuer.</p>}
      </div>
    </main>
  );

  /* STEP 2 */
  if (screen === "s2") return (
    <main className={container}>
      <StepHeader step={2} title="Dimensions" sub="Format de la photo et taille du ticket" onBack={() => setScreen("s1")} />
      <div className="space-y-4">
        <Card title="Photo de fond">
          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 font-semibold text-primary">
            <ImagePlus className="h-5 w-5" /> {p.backgroundImage ? "Changer la photo" : "Charger une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) up({ backgroundImage: await readImage(f) }); }} />
          </label>
          {!p.backgroundImage && <p className="mt-2 text-xs text-muted-foreground">Sans photo, une table en bois est utilisée.</p>}
        </Card>
        <Card title="Format de la photo">
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(FORMATS).map(([k, [w, h]]) => (
              <Chip key={k} active={!customFormat && formatKey === k} onClick={() => { setCustomFormat(false); if (p.ticketSize === "C") up({ photoWidth: w, photoHeight: h }); else applyTicketPreset(p.ticketSize, w, h); }}>{k}</Chip>
            ))}
            <Chip active={customFormat || formatKey === "custom"} onClick={() => setCustomFormat(true)}>Perso.</Chip>
          </div>
          {(customFormat || formatKey === "custom") && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-sm">Largeur<input type="number" inputMode="numeric" className={inputCls} value={p.photoWidth} onChange={(e) => up({ photoWidth: Math.max(200, Math.min(4000, Number(e.target.value) || 200)) })} /></label>
              <label className="text-sm">Hauteur<input type="number" inputMode="numeric" className={inputCls} value={p.photoHeight} onChange={(e) => up({ photoHeight: Math.max(200, Math.min(4000, Number(e.target.value) || 200)) })} /></label>
            </div>
          )}
        </Card>
        <Card title="Taille du ticket">
          <div className="grid grid-cols-4 gap-2">
            {(["S", "M", "L"] as const).map((s) => (
              <Chip key={s} active={p.ticketSize === s} onClick={() => applyTicketPreset(s)}>{s === "S" ? "Petit" : s === "M" ? "Moyen" : "Grand"}</Chip>
            ))}
            <Chip active={p.ticketSize === "C"} onClick={() => up({ ticketSize: "C" })}>Perso.</Chip>
          </div>
          {p.ticketSize === "C" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-sm">Largeur du ticket<input type="number" inputMode="numeric" className={inputCls} value={p.ticketWidth} onChange={(e) => up({ ticketWidth: Math.max(80, Number(e.target.value) || 80) })} /></label>
              <label className="text-sm">Hauteur du ticket<input type="number" inputMode="numeric" className={inputCls} value={p.ticketHeight} onChange={(e) => up({ ticketHeight: Math.max(80, Number(e.target.value) || 80) })} /></label>
            </div>
          )}
        </Card>
        <Preview project={p} />
        <Big onClick={() => setScreen("s3")}>CONTINUER →</Big>
      </div>
    </main>
  );

  /* STEP 3 */
  if (screen === "s3") {
    const Row = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
      <Card title={label}>
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="mt-2 flex gap-2">{children}</div>
      </Card>
    );
    return (
      <main className={container}>
        <StepHeader step={3} title="Informations" onBack={() => setScreen("s2")} />
        <div className="space-y-4">
          <Row label="Numéro de maquette" value={p.ticketNumber} onChange={(v) => up({ ticketNumber: v })}>
            <Chip onClick={() => up({ ticketNumber: randNumber() })}><span className="flex items-center gap-1"><Dices className="h-4 w-4" /> Générer</span></Chip>
          </Row>
          <Row label="Date" value={p.date} onChange={(v) => up({ date: v })}>
            <Chip onClick={() => up({ date: today() })}>Aujourd'hui</Chip>
            <Chip onClick={() => up({ date: randDate() })}><span className="flex items-center gap-1"><Dices className="h-4 w-4" /> Générer</span></Chip>
          </Row>
          <Row label="Heure" value={p.time} onChange={(v) => up({ time: v })}>
            <Chip onClick={() => up({ time: now() })}>Maintenant</Chip>
            <Chip onClick={() => up({ time: randTime() })}><span className="flex items-center gap-1"><Dices className="h-4 w-4" /> Générer</span></Chip>
          </Row>
          <Big onClick={() => { persist(p); setScreen("result"); }}><Sparkles className="h-5 w-5" /> GÉNÉRER LA MAQUETTE</Big>
        </div>
      </main>
    );
  }

  /* ADJUST */
  if (screen === "adjust") {
    const Slider = ({ label, min, max, step = 1, value, onChange }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) => (
      <label className="block text-sm font-medium">
        <span className="flex justify-between"><span>{label}</span><span className="text-muted-foreground">{Math.round(value * 100) / 100}</span></span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--primary)]" />
      </label>
    );
    const c = clampTicket(p);
    return (
      <main className={container}>
        <button onClick={() => setScreen("result")} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
        <h2 className="mb-1 text-2xl font-extrabold">Ajuster</h2>
        <p className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"><Move className="h-4 w-4" /> Glissez le ticket avec le doigt</p>
        <Preview project={p} onDrag={(x, y) => up({ ticketPosition: { x, y } })} />
        <Card>
          <div className="space-y-4">
            <Slider label="Largeur du ticket" min={80} max={Math.round(p.photoWidth * 0.98)} value={c.w} onChange={(v) => up({ ticketWidth: v, ticketSize: "C" })} />
            <Slider label="Hauteur du ticket" min={80} max={Math.round(p.photoHeight * 0.98)} value={c.h} onChange={(v) => up({ ticketHeight: v, ticketSize: "C" })} />
            <Slider label="Position X" min={0} max={1} step={0.01} value={c.x} onChange={(v) => up({ ticketPosition: { ...p.ticketPosition, x: v } })} />
            <Slider label="Position Y" min={0} max={1} step={0.01} value={c.y} onChange={(v) => up({ ticketPosition: { ...p.ticketPosition, y: v } })} />
            <Slider label="Zoom de la photo" min={1} max={3} step={0.05} value={p.zoom} onChange={(v) => up({ zoom: v })} />
          </div>
        </Card>
        <div className="mt-4"><Big onClick={() => { persist({ ...p, ticketPosition: { x: c.x, y: c.y } }); setScreen("result"); }}>Valider</Big></div>
      </main>
    );
  }

  /* RESULT */
  return (
    <main className={container}>
      <h2 className="mb-4 text-2xl font-extrabold">Votre maquette</h2>
      <Preview project={p} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Big onClick={exportImg}><Download className="h-5 w-5" /> Exporter la maquette</Big>
        <Big variant="soft" onClick={() => setScreen("adjust")}><Move className="h-5 w-5" /> Ajuster</Big>
        <Big variant="soft" onClick={() => setScreen("s1")}><Pencil className="h-5 w-5" /> Modifier</Big>
        <Big variant="soft" onClick={startNew}><Plus className="h-5 w-5" /> Nouveau projet</Big>
        <Big variant="soft" onClick={() => setScreen("studio")}><ArrowLeft className="h-5 w-5" /> Retour aux projets</Big>
      </div>
    </main>
  );
}

