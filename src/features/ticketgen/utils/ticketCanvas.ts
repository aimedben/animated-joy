import { AppSettings, TicketModel } from '../types';

/**
 * Draws the zigzag perforated tear edges of the receipt paper
 */
function drawReceiptPaperPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  toothCount: number = 28,
  toothDepth: number = 7
) {
  ctx.beginPath();
  // Top edge: zig-zags
  const toothWidth = w / toothCount;
  ctx.moveTo(x, y + toothDepth);

  for (let i = 0; i < toothCount; i++) {
    const toothX = x + i * toothWidth;
    ctx.lineTo(toothX + toothWidth * 0.5, y);
    ctx.lineTo(toothX + toothWidth, y + toothDepth);
  }

  // Right edge straight down
  ctx.lineTo(x + w, y + h - toothDepth);

  // Bottom edge: zig-zags
  for (let i = toothCount - 1; i >= 0; i--) {
    const toothX = x + i * toothWidth;
    ctx.lineTo(toothX + toothWidth * 0.5, y + h);
    ctx.lineTo(toothX, y + h - toothDepth);
  }

  // Left edge straight up
  ctx.lineTo(x, y + toothDepth);
  ctx.closePath();
}

/**
 * Renders the realistic ticket paper to an offscreen canvas
 */
export function renderTicketToCanvas(
  model: TicketModel,
  settings: AppSettings
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 560;
  const height = 980;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background is transparent
  ctx.clearRect(0, 0, width, height);

  // Padding
  const padX = 20;
  const padY = 20;
  const paperW = width - padX * 2;
  const paperH = height - padY * 2;

  // Draw paper path
  drawReceiptPaperPath(ctx, padX, padY, paperW, paperH, 32, 6);

  // Paper fill gradient (slight off-white / thermal paper shading)
  const grad = ctx.createLinearGradient(padX, padY, padX + paperW, padY + paperH);
  grad.addColorStop(0, '#fdfdfd');
  grad.addColorStop(0.5, '#f8f8f9');
  grad.addColorStop(1, '#f1f2f4');
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle paper border outline
  ctx.strokeStyle = '#e2e4e8';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Clip to paper for inner content
  ctx.save();
  ctx.clip();

  // Subtle paper grain / micro lines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
  for (let i = 0; i < paperH; i += 4) {
    ctx.fillRect(padX, padY + i, paperW, 1);
  }

  // Text setup
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';

  // 1. Business Header
  ctx.font = 'bold 26px "Inter", sans-serif';
  ctx.fillText(model.businessName, width / 2, 85);

  ctx.font = '500 16px "Inter", sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(model.location, width / 2, 114);

  ctx.font = '500 16px "Inter", sans-serif';
  ctx.fillText(model.phone, width / 2, 140);

  // Ticket number & date/time
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.textAlign = 'left';
  const leftX = padX + 28;
  const rightX = padX + paperW - 28;

  ctx.fillText(`Ticket n° : ${settings.demoNumber}`, leftX, 180);

  ctx.font = '14px "Inter", monospace';
  ctx.fillStyle = '#475569';
  const formattedDate = settings.date ? settings.date.split('-').reverse().join('/') : '';
  ctx.textAlign = 'right';
  ctx.fillText(`${formattedDate}  ${settings.time}`, rightX, 180);

  // Divider
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, 200);
  ctx.lineTo(rightX, 200);
  ctx.stroke();

  // Table header
  ctx.font = 'bold 15px "Inter", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.fillText('Produit', leftX, 224);

  ctx.textAlign = 'center';
  ctx.fillText('Qté', leftX + 260, 224);
  ctx.fillText('P.U', leftX + 340, 224);

  ctx.textAlign = 'right';
  ctx.fillText('Total', rightX, 224);

  // Divider under table header
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, 236);
  ctx.lineTo(rightX, 236);
  ctx.stroke();

  // Items (Render dynamic product lines)
  const linesToRender =
    settings.productLines && settings.productLines.length > 0
      ? settings.productLines
      : model.items.map((it, idx) => ({
          id: `def-${idx}`,
          name: it.name,
          qty: it.qty,
          price: it.price,
          y: idx * 34,
          x: 0,
          textAlign: 'left' as const,
        }));

  const baseY = 270;
  let maxItemBottom = baseY;
  let totalArticles = 0;
  let grandTotal = 0;

  ctx.font = '14px "Inter", sans-serif';
  ctx.fillStyle = '#1e293b';

  linesToRender.forEach((item) => {
    const qty = ('quantity' in item && typeof item.quantity === 'number') ? item.quantity : (item.qty || 1);
    const price = ('unitPrice' in item && typeof item.unitPrice === 'number') ? item.unitPrice : (item.price || 0);
    const lineTotal = qty * price;
    totalArticles += qty;
    grandTotal += lineTotal;

    const lineY = baseY + (Number.isFinite(item.y) ? item.y : 0);
    const lineX = leftX + (Number.isFinite(item.x) ? item.x! : 0);
    maxItemBottom = Math.max(maxItemBottom, lineY);

    const nameStyle = ('nameStyle' in item && item.nameStyle) ? item.nameStyle : {};
    const qtyStyle = ('qtyStyle' in item && item.qtyStyle) ? item.qtyStyle : {};
    const priceStyle = ('priceStyle' in item && item.priceStyle) ? item.priceStyle : {};
    const totalStyle = ('totalStyle' in item && item.totalStyle) ? item.totalStyle : {};

    const itemFontSize = ('fontSize' in item && typeof item.fontSize === 'number') ? item.fontSize : 12;
    const nameSize = Math.round((nameStyle.fontSize || itemFontSize) * 1.15);
    const nameBold = nameStyle.isBold ? 'bold' : '500';
    ctx.font = `${nameBold} ${nameSize}px "Inter", sans-serif`;

    const nameX = lineX + (nameStyle.x || 0);
    const nameY = lineY + (nameStyle.y || 0);

    if (item.textAlign === 'center' || nameStyle.textAlign === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(item.name, leftX + 110 + (nameStyle.x || 0), nameY);
    } else if (item.textAlign === 'right' || nameStyle.textAlign === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(item.name, leftX + 220 + (nameStyle.x || 0), nameY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(item.name, nameX, nameY);
    }

    const qtySize = Math.round((qtyStyle.fontSize || 11) * 1.15);
    const qtyBold = qtyStyle.isBold ? 'bold' : 'normal';
    ctx.font = `${qtyBold} ${qtySize}px "Inter", monospace`;
    ctx.textAlign = qtyStyle.textAlign || 'center';
    ctx.fillText(`${qty}`, leftX + 260 + (qtyStyle.x || 0), lineY + (qtyStyle.y || 0));

    const priceSize = Math.round((priceStyle.fontSize || 11) * 1.15);
    const priceBold = priceStyle.isBold ? 'bold' : 'normal';
    ctx.font = `${priceBold} ${priceSize}px "Inter", monospace`;
    ctx.textAlign = priceStyle.textAlign || 'right';
    ctx.fillText(`${price}`, leftX + 340 + (priceStyle.x || 0), lineY + (priceStyle.y || 0));

    const totalSize = Math.round((totalStyle.fontSize || 11) * 1.15);
    const totalBold = totalStyle.isBold ? 'bold' : 'bold';
    ctx.font = `${totalBold} ${totalSize}px "Inter", monospace`;
    ctx.textAlign = totalStyle.textAlign || 'right';
    ctx.fillText(`${lineTotal}`, rightX + (totalStyle.x || 0), lineY + (totalStyle.y || 0));
  });

  // Blank area spacing to look like real receipt
  let currentY = Math.max(maxItemBottom + 50, 720);

  // Divider before totals
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(leftX, currentY);
  ctx.lineTo(rightX, currentY);
  ctx.stroke();

  currentY += 30;

  // Article(s) and Total
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.fillText(`Article(s) : ${totalArticles}`, leftX, currentY);

  ctx.textAlign = 'right';
  ctx.fillText(`Total : ${grandTotal} DZD`, rightX, currentY);

  currentY += 16;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, currentY);
  ctx.lineTo(rightX, currentY);
  ctx.stroke();

  // Footer message
  currentY += 32;
  ctx.font = '500 14px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(model.footer || '*** Merci de votre visite ***', width / 2, currentY);

  // Clear clip
  ctx.restore();

  return canvas;
}

/**
 * Renders the realistic ticket paper to an offscreen canvas and returns its data URL
 */
export function generateTicketDataUrl(
  model: TicketModel,
  settings: AppSettings
): string {
  const canvas = renderTicketToCanvas(model, settings);
  return canvas.toDataURL('image/png');
}

/**
 * Creates the final 16:9 composition on a canvas and exports it
 */
export async function renderFinalComposition(
  tableUrl: string,
  model: TicketModel,
  settings: AppSettings,
  exportWidth: number = 1920,
  exportHeight: number = 1080
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Draw table background with user position & zoom
  const tableImg = await loadImage(tableUrl);
  const bgX = settings.backgroundSettings?.x || 0;
  const bgY = settings.backgroundSettings?.y || 0;
  const bgZoom = settings.backgroundSettings?.zoom || 1.0;

  ctx.save();
  ctx.translate(
    exportWidth / 2 + (bgX / 100) * exportWidth,
    exportHeight / 2 + (bgY / 100) * exportHeight
  );
  ctx.scale(bgZoom, bgZoom);
  ctx.drawImage(
    tableImg,
    -exportWidth / 2,
    -exportHeight / 2,
    exportWidth,
    exportHeight
  );
  ctx.restore();

  // 2. Prepare ticket drawable (either direct canvas or custom image)
  let ticketDrawable: CanvasImageSource;
  let ticketWidth = 560;
  let ticketHeight = 980;

  if (settings.customTicketUrl) {
    const customImg = await loadImage(settings.customTicketUrl);
    ticketDrawable = customImg;
    ticketWidth = customImg.naturalWidth || customImg.width || 560;
    ticketHeight = customImg.naturalHeight || customImg.height || 980;
  } else {
    const ticketCanvas = renderTicketToCanvas(model, settings);
    ticketDrawable = ticketCanvas;
    ticketWidth = ticketCanvas.width;
    ticketHeight = ticketCanvas.height;
  }

  // Exact dimension control in scene pixels (1920x1080)
  const targetWidth =
    Number.isFinite(settings.ticketWidth) && settings.ticketWidth > 0
      ? settings.ticketWidth
      : 360;
  const targetHeight =
    Number.isFinite(settings.ticketHeight) && settings.ticketHeight > 0
      ? settings.ticketHeight
      : 620;

  // Center + user offset (safeguard against NaN)
  const posX = Number.isFinite(settings.position.x) ? settings.position.x : 0;
  const posY = Number.isFinite(settings.position.y) ? settings.position.y : 0;
  const rot = Number.isFinite(settings.rotation) ? settings.rotation : 0;

  const centerX = exportWidth / 2 + (posX / 100) * exportWidth;
  const centerY = exportHeight / 2 + (posY / 100) * exportHeight;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rot * Math.PI) / 180);

  // Draw natural subtle realistic drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 12;

  // Draw ticket image centered around translated point
  ctx.drawImage(
    ticketDrawable,
    -targetWidth / 2,
    -targetHeight / 2,
    targetWidth,
    targetHeight
  );

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Do NOT set crossOrigin on data: or blob: URIs, it breaks in many browsers!
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = async () => {
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch {
        // ignore decode errors if already loaded
      }
      resolve(img);
    };
    img.onerror = (e) => {
      console.error('Failed to load image:', src.slice(0, 50), e);
      reject(e);
    };
    img.src = src;
  });
}
