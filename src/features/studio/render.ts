export type Product = { name: string; quantity: number; unitPrice: number | null };

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  backgroundImage: string | null; // data URL, null = default photo
  photoWidth: number;
  photoHeight: number;
  ticketSize: "S" | "M" | "L" | "C";
  ticketWidth: number;
  ticketHeight: number;
  ticketPosition: { x: number; y: number }; // centre, fraction of photo
  zoom: number;
  ticketNumber: string;
  storeName?: string;
  date: string;
  time: string;
  products: Product[];
  thumbnail?: string;
};

export const lineTotal = (p: Product) => p.quantity * (p.unitPrice ?? 0);
export const grandTotal = (ps: Product[]) => ps.reduce((s, p) => s + lineTotal(p), 0);
const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f|\u00a0/g, " ");

/** Auto ticket size from preset + product count, bounded inside photo. */
export function presetTicket(size: "S" | "M" | "L", pw: number, ph: number, n: number) {
  const f = size === "S" ? 0.32 : size === "M" ? 0.46 : 0.56;
  let w = Math.round(Math.min(pw * f, ph * 0.94));
  let h = Math.round(w * (1.08 + Math.max(n - 3, 0) * 0.035));
  const maxH = ph * 0.94;
  if (h > maxH) { w = Math.round(w * (maxH / h)); h = Math.round(maxH); }
  return { w, h };
}

/** Clamp ticket dims/position so the ticket is always fully visible. */
export function clampTicket(p: Project) {
  const w = Math.min(p.ticketWidth, p.photoWidth * 0.98);
  const h = Math.min(p.ticketHeight, p.photoHeight * 0.98);
  const minX = w / 2 / p.photoWidth, minY = h / 2 / p.photoHeight;
  const x = Math.min(1 - minX, Math.max(minX, p.ticketPosition.x));
  const y = Math.min(1 - minY, Math.max(minY, p.ticketPosition.y));
  return { w, h, cx: x * p.photoWidth, cy: y * p.photoHeight, x, y };
}

function ellipsize(ctx: CanvasRenderingContext2D, t: string, max: number) {
  if (ctx.measureText(t).width <= max) return t;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

export function drawProject(canvas: HTMLCanvasElement, p: Project, bg: HTMLImageElement | null, scale = 1) {
  const W = p.photoWidth, H = p.photoHeight;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // Background (cover + zoom)
  ctx.fillStyle = "#8a6a4a";
  ctx.fillRect(0, 0, W, H);
  if (bg && bg.naturalWidth) {
    const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * p.zoom;
    const iw = bg.naturalWidth * s, ih = bg.naturalHeight * s;
    ctx.drawImage(bg, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }

  const { w, h, cx, cy } = clampTicket(p);
  const x0 = cx - w / 2, y0 = cy - h / 2;

  // Paper
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = w * 0.06;
  ctx.shadowOffsetY = w * 0.02;
  ctx.fillStyle = "#fbfaf6";
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();

  // Layout recomputed from available space (not a plain scale)
  const n = p.products.length;
  const pad = w * 0.06;
  const rows = n + 8; // headers, products, total and footer
  const lh = Math.min(h / rows, w / 10);
  const fs = lh * 0.78;
  const inner = w - pad * 2;
  ctx.fillStyle = "#222";
  ctx.textBaseline = "middle";
  let y = y0 + lh;
  const line = (t: string, align: CanvasTextAlign, bold = false, size = fs) => {
    ctx.font = `${bold ? "700 " : ""}${size}px "JetBrains Mono", monospace`;
    ctx.textAlign = align;
    const xx = align === "center" ? x0 + w / 2 : align === "left" ? x0 + pad : x0 + w - pad;
    ctx.fillText(ellipsize(ctx, t, inner), xx, y);
  };
  const dash = () => {
    ctx.save(); ctx.strokeStyle = "#888"; ctx.setLineDash([lh * 0.2, lh * 0.15]); ctx.lineWidth = Math.max(1, lh * 0.04);
    ctx.beginPath(); ctx.moveTo(x0 + pad, y); ctx.lineTo(x0 + w - pad, y); ctx.stroke(); ctx.restore();
  };

  line(p.storeName?.trim() || "TICKET DÉMO", "center", true, fs * 1.25); y += lh * 1.2;
  line(`N° ${p.ticketNumber}`, "left"); y += lh;
  line(`${p.date}  ${p.time}`, "left"); y += lh * 0.7;
  dash(); y += lh * 0.6;

  const cQty = x0 + pad + inner * 0.68;
  const cTot = x0 + w - pad;
  const nameMax = inner * 0.59;
  ctx.font = `700 ${fs * 0.85}px "JetBrains Mono", monospace`;
  ctx.textAlign = "left"; ctx.fillText("ARTICLE", x0 + pad, y);
  ctx.textAlign = "right"; ctx.fillText("QTÉ", cQty, y); ctx.fillText("TOTAL", cTot, y);
  y += lh;
  const pf = fs * 0.9;
  for (const pr of p.products) {
    ctx.font = `${pf}px "JetBrains Mono", monospace`;
    ctx.textAlign = "left"; ctx.fillText(ellipsize(ctx, pr.name, nameMax), x0 + pad, y);
    ctx.textAlign = "right";
    ctx.fillText(`×${pr.quantity}`, cQty, y);
    ctx.fillText(fmt(lineTotal(pr)), cTot, y, inner * 0.29);
    y += lh;
  }

  // Total & footer anchored at bottom
  y = y0 + h - lh * 3.2;
  dash(); y += lh * 0.8;
  ctx.font = `700 ${fs * 1.2}px "JetBrains Mono", monospace`;
  ctx.textAlign = "left"; ctx.fillText("TOTAL", x0 + pad, y);
  ctx.textAlign = "right"; ctx.fillText(`${fmt(grandTotal(p.products))} DA`, cTot, y, inner * 0.75);
  y += lh * 1.3;
  line("Maquette fictive", "center", false, fs * 0.8);
}
