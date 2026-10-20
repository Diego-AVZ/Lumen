export const CARD_W = 1080;
export const CARD_H = 1520;

export type Fade = 'suave' | 'diagonal' | 'centro';
export type Motif = 'flores' | 'ositos' | 'globos' | 'estrellas' | 'corazones' | 'mix' | 'none';

export type Paper = {
  id: string;
  name: string;
  from: string;
  to: string;
  ink: string;
  accent: string;
  soft: string;
  spots: string[];
};

export const PAPERS: Paper[] = [
  { id: 'lino', name: 'Lino', from: '#f7f1e7', to: '#e4cbb0', ink: '#1b1612', accent: '#8a6232', soft: '#fffaf4', spots: ['#d98989', '#e8b86d', '#c47b8a', '#7fa08a'] },
  { id: 'rosa', name: 'Rosa', from: '#fff6f7', to: '#f0c2c8', ink: '#3a2226', accent: '#b85c68', soft: '#fffafb', spots: ['#e07a86', '#f2b6a0', '#c46b7a', '#e8b86d'] },
  { id: 'noche', name: 'Noche', from: '#1a1512', to: '#3c2b22', ink: '#f6efe6', accent: '#e8b86d', soft: '#2a211c', spots: ['#e8b86d', '#f0c9c2', '#f6efe6', '#d9899a'] },
  { id: 'salvia', name: 'Salvia', from: '#f4f8f3', to: '#c5dcc8', ink: '#1c2a20', accent: '#4f7d5a', soft: '#fbfcfb', spots: ['#6e9a78', '#e7b3b8', '#e8b86d', '#8fb89a'] },
  { id: 'cielo', name: 'Cielo', from: '#f5f8fd', to: '#c9d7f2', ink: '#1a2433', accent: '#5d77aa', soft: '#fbfdff', spots: ['#7f97c4', '#f0b7c0', '#e8b86d', '#9bb0d4'] },
  { id: 'durazno', name: 'Durazno', from: '#fff7f0', to: '#f3c39a', ink: '#3a2418', accent: '#c56a3a', soft: '#fffaf6', spots: ['#e08a62', '#e7a0a8', '#e8b86d', '#d4a574'] },
];

export const FADES: { id: Fade; label: string }[] = [
  { id: 'suave', label: 'Suave' },
  { id: 'diagonal', label: 'Diagonal' },
  { id: 'centro', label: 'Centro' },
];

export const MOTIFS: { id: Motif; label: string }[] = [
  { id: 'none', label: 'Sin motivos' },
  { id: 'mix', label: 'Un poco de todo' },
  { id: 'flores', label: 'Flores' },
  { id: 'ositos', label: 'Ositos' },
  { id: 'globos', label: 'Globos' },
  { id: 'estrellas', label: 'Estrellas' },
  { id: 'corazones', label: 'Corazones' },
];

export type Box = { x: number; y: number; w: number; h: number };

export type InvitePaint = {
  paper: Paper;
  fade: Fade;
  motif: Motif;
  seed: number;
  eyebrow: string;
  title: string;
  line: string;
  button: string;
  from: string;
  url: string;
  qr: HTMLCanvasElement | null;
};

type Rand = () => number;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexAlpha(hex: string, alpha: number) {
  const n = hex.replace('#', '');
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, heart: string) {
  ctx.save();
  ctx.translate(x, y);
  for (const layer of [1, 0.68]) {
    const petals = layer === 1 ? 6 : 5;
    for (let i = 0; i < petals; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / petals + (layer === 1 ? 0 : 0.4));
      ctx.beginPath();
      ctx.ellipse(0, s * 0.46 * layer, s * 0.26 * layer, s * 0.46 * layer, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = layer === 1 ? 0.92 : 1;
      ctx.fill();
      ctx.restore();
    }
  }
  circle(ctx, 0, 0, s * 0.2, heart);
  ctx.restore();
}

function bear(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fur: string, blush: string, snout: string, ink: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.95, s * 0.72, s * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-s * 0.62, s * 0.82, s * 0.26, s * 0.2, -0.4, 0, Math.PI * 2);
  ctx.ellipse(s * 0.62, s * 0.82, s * 0.26, s * 0.2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, -s * 0.46, -s * 0.48, s * 0.24, fur);
  circle(ctx, s * 0.46, -s * 0.48, s * 0.24, fur);
  circle(ctx, -s * 0.46, -s * 0.48, s * 0.12, blush);
  circle(ctx, s * 0.46, -s * 0.48, s * 0.12, blush);
  circle(ctx, 0, 0, s * 0.7, fur);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.2, s * 0.3, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = snout;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, s * 0.12, s * 0.08, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  circle(ctx, -s * 0.2, -s * 0.04, s * 0.05, ink);
  circle(ctx, s * 0.2, -s * 0.04, s * 0.05, ink);
  ctx.globalAlpha = 0.4;
  circle(ctx, -s * 0.32, s * 0.16, s * 0.09, blush);
  circle(ctx, s * 0.32, s * 0.16, s * 0.09, blush);
  ctx.restore();
}

function balloon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, string: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.42, s * 0.54, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-s * 0.12, -s * 0.16, s * 0.1, s * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.07, s * 0.5);
  ctx.lineTo(0, s * 0.64);
  ctx.lineTo(s * 0.07, s * 0.5);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, s * 0.64);
  ctx.bezierCurveTo(s * 0.18, s * 0.86, -s * 0.28, s * 1.02, s * 0.02, s * 1.28);
  ctx.strokeStyle = string;
  ctx.lineWidth = Math.max(1.5, s * 0.035);
  ctx.stroke();
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.32);
  ctx.bezierCurveTo(-s * 0.04, s * 0.02, -s * 0.62, -s * 0.02, -s * 0.62, -s * 0.32);
  ctx.bezierCurveTo(-s * 0.62, -s * 0.62, -s * 0.16, -s * 0.66, 0, -s * 0.36);
  ctx.bezierCurveTo(s * 0.16, -s * 0.66, s * 0.62, -s * 0.62, s * 0.62, -s * 0.32);
  ctx.bezierCurveTo(s * 0.62, -s * 0.02, s * 0.04, s * 0.02, 0, s * 0.32);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function spark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(0, 0, s * 0.38, 0);
  ctx.quadraticCurveTo(0, 0, 0, s);
  ctx.quadraticCurveTo(0, 0, -s * 0.38, 0);
  ctx.quadraticCurveTo(0, 0, 0, -s);
  ctx.fill();
  ctx.restore();
}

function drawMotif(ctx: CanvasRenderingContext2D, kind: Exclude<Motif, 'mix'>, x: number, y: number, s: number, paper: Paper, rand: Rand) {
  const spot = paper.spots[Math.floor(rand() * paper.spots.length)] ?? paper.accent;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rand() - 0.5) * 0.5);
  ctx.translate(-x, -y);
  if (kind === 'flores') flower(ctx, x, y, s, spot, paper.accent);
  else if (kind === 'ositos') bear(ctx, x, y - s * 0.2, s * 0.72, spot, paper.accent, paper.soft, paper.ink);
  else if (kind === 'globos') {
    balloon(ctx, x - s * 0.45, y + s * 0.15, s * 0.7, paper.spots[0] ?? spot, hexAlpha(paper.ink, 0.35));
    balloon(ctx, x + s * 0.42, y + s * 0.2, s * 0.62, paper.spots[1] ?? spot, hexAlpha(paper.ink, 0.35));
    balloon(ctx, x, y - s * 0.15, s * 0.78, spot, hexAlpha(paper.ink, 0.35));
  } else if (kind === 'corazones') heart(ctx, x, y, s, spot);
  else spark(ctx, x, y, s * 0.7, spot);
  ctx.restore();
}

function spotsFor(motif: Exclude<Motif, 'none'>, rand: Rand) {
  const count = motif === 'ositos' ? 7 : motif === 'globos' ? 6 : motif === 'estrellas' ? 16 : motif === 'mix' ? 12 : 11;
  const points: { x: number; y: number; s: number; kind: Exclude<Motif, 'mix' | 'none'> }[] = [];
  const kinds: Exclude<Motif, 'mix' | 'none'>[] = ['flores', 'ositos', 'globos', 'corazones', 'estrellas'];
  for (let i = 0; i < count; i += 1) {
    const edge = i % 4;
    const along = (i + 0.5) / count;
    let x = CARD_W / 2;
    let y = CARD_H / 2;
    if (edge === 0) {
      x = 130 + along * (CARD_W - 260);
      y = 96 + rand() * 24;
    } else if (edge === 1) {
      x = CARD_W - 108;
      y = 200 + along * (CARD_H - 520);
    } else if (edge === 2) {
      x = i % 2 === 0 ? 108 : CARD_W - 108;
      y = CARD_H - 150;
    } else {
      x = 108;
      y = 200 + along * (CARD_H - 520);
    }
    if (x > 200 && x < CARD_W - 200 && y > 300 && y < CARD_H - 200) {
      x = x < CARD_W / 2 ? 120 : CARD_W - 120;
    }
    const kind = motif === 'mix' ? kinds[i % kinds.length] : motif;
    const scale = kind === 'estrellas' ? 28 + rand() * 26 : 54 + rand() * 36;
    points.push({ x, y, s: scale, kind });
  }
  return points;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawInvite(ctx: CanvasRenderingContext2D, paint: InvitePaint): { button: Box; code: Box } {
  const { paper } = paint;
  const rand = mulberry32(paint.seed || 1);
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  if (paint.fade === 'centro') {
    const g = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.4, 40, CARD_W / 2, CARD_H * 0.46, CARD_H * 0.72);
    g.addColorStop(0, paper.from);
    g.addColorStop(1, paper.to);
    ctx.fillStyle = g;
  } else {
    const g = paint.fade === 'diagonal' ? ctx.createLinearGradient(0, 0, CARD_W, CARD_H) : ctx.createLinearGradient(0, 0, 0, CARD_H);
    g.addColorStop(0, paper.from);
    g.addColorStop(1, paper.to);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow = ctx.createRadialGradient(CARD_W * 0.5, CARD_H * 0.18, 20, CARD_W * 0.5, CARD_H * 0.16, CARD_W * 0.7);
  glow.addColorStop(0, hexAlpha('#ffffff', paper.id === 'noche' ? 0.07 : 0.38));
  glow.addColorStop(1, hexAlpha('#ffffff', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  for (let i = 0; i < 1600; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.045)' : hexAlpha(paper.ink, 0.035);
    ctx.fillRect(rand() * CARD_W, rand() * CARD_H, 1.6, 1.6);
  }

  if (paint.motif !== 'none') {
    for (const spot of spotsFor(paint.motif, rand)) {
      ctx.save();
      ctx.globalAlpha = paper.id === 'noche' ? 0.9 : 0.82;
      drawMotif(ctx, spot.kind, spot.x, spot.y, spot.s, paper, rand);
      ctx.restore();
    }
  }

  const veil = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.5, 80, CARD_W / 2, CARD_H * 0.52, 560);
  veil.addColorStop(0, hexAlpha(paper.from, paper.id === 'noche' ? 0.55 : 0.78));
  veil.addColorStop(1, hexAlpha(paper.from, 0));
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  round(ctx, 48, 48, CARD_W - 96, CARD_H - 96, 36);
  ctx.strokeStyle = hexAlpha(paper.accent, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  round(ctx, 64, 64, CARD_W - 128, CARD_H - 128, 28);
  ctx.strokeStyle = hexAlpha(paper.accent, 0.22);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = paper.ink;
  ctx.letterSpacing = '6px';
  ctx.font = '600 26px Outfit, sans-serif';
  ctx.fillText(paint.eyebrow.toUpperCase(), CARD_W / 2, 430);
  ctx.letterSpacing = '0px';

  ctx.strokeStyle = hexAlpha(paper.accent, 0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2 - 150, 468);
  ctx.lineTo(CARD_W / 2 - 18, 468);
  ctx.moveTo(CARD_W / 2 + 18, 468);
  ctx.lineTo(CARD_W / 2 + 150, 468);
  ctx.stroke();
  spark(ctx, CARD_W / 2, 468, 10, paper.accent);

  const title = paint.title.trim() || 'Para ti';
  let titleSize = 118;
  ctx.font = `italic 600 ${titleSize}px Fraunces, Georgia, serif`;
  while (titleSize > 64 && ctx.measureText(title).width > 860) {
    titleSize -= 4;
    ctx.font = `italic 600 ${titleSize}px Fraunces, Georgia, serif`;
  }
  ctx.fillStyle = paper.ink;
  ctx.fillText(title, CARD_W / 2, 470 + titleSize);

  ctx.font = '400 34px Outfit, sans-serif';
  const phrase = wrap(ctx, paint.line.trim() || 'Hay algo que quiero que abras.', 760).slice(0, 3);
  let y = 500 + titleSize + 20;
  ctx.fillStyle = hexAlpha(paper.ink, 0.78);
  for (const row of phrase) {
    y += 48;
    ctx.fillText(row, CARD_W / 2, y);
  }

  const label = paint.button.trim() || 'Ábrelo';
  ctx.font = '600 34px Outfit, sans-serif';
  const buttonW = Math.max(460, ctx.measureText(label).width + 140);
  const buttonH = 104;
  const buttonX = (CARD_W - buttonW) / 2;
  const buttonY = y + 48;
  ctx.save();
  ctx.shadowColor = hexAlpha(paper.ink, 0.16);
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  round(ctx, buttonX, buttonY, buttonW, buttonH, 52);
  ctx.fillStyle = paper.ink;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = paper.from;
  ctx.font = '600 34px Outfit, sans-serif';
  ctx.fillText(label, CARD_W / 2, buttonY + 66);

  ctx.font = '400 32px Outfit, sans-serif';
  ctx.fillStyle = hexAlpha(paper.ink, 0.62);
  const pretty = paint.url.replace(/^https?:\/\//, '');
  const urlLines = wrap(ctx, pretty, 760).slice(0, 2);
  let urlY = buttonY + buttonH + 52;
  for (const row of urlLines) {
    ctx.fillText(row, CARD_W / 2, urlY);
    urlY += 40;
  }

  const codeSize = 248;
  const cardPad = 28;
  const cardW = codeSize + cardPad * 2;
  const cardH = codeSize + cardPad * 2;
  const cardX = (CARD_W - cardW) / 2;
  const cardY = urlY + 28;
  ctx.save();
  ctx.shadowColor = hexAlpha(paper.ink, 0.14);
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  round(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  if (paint.qr) ctx.drawImage(paint.qr, cardX + cardPad, cardY + cardPad, codeSize, codeSize);

  ctx.font = '400 22px Outfit, sans-serif';
  ctx.fillStyle = hexAlpha(paper.ink, 0.5);
  ctx.letterSpacing = '3px';
  ctx.fillText('O ACERCA LA CÁMARA', CARD_W / 2, cardY + cardH + 40);
  ctx.letterSpacing = '0px';

  if (paint.from.trim()) {
    ctx.font = 'italic 600 36px Fraunces, Georgia, serif';
    ctx.fillStyle = paper.ink;
    ctx.fillText(`de ${paint.from.trim()}`, CARD_W / 2, CARD_H - 118);
  }
  ctx.font = '600 18px Outfit, sans-serif';
  ctx.fillStyle = hexAlpha(paper.accent, 0.85);
  ctx.letterSpacing = '8px';
  ctx.fillText('LUMEN', CARD_W / 2, CARD_H - 72);
  ctx.letterSpacing = '0px';

  return {
    button: { x: buttonX, y: buttonY, w: buttonW, h: buttonH },
    code: { x: cardX, y: cardY, w: cardW, h: cardH },
  };
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function jpegToPdf(jpeg: Uint8Array, imgW: number, imgH: number, links: { box: Box; url: string }[]) {
  const enc = new TextEncoder();
  const pageW = 420;
  const pageH = 420 * (imgH / imgW);
  const content = `q ${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm /Im0 Do Q`;
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    size += bytes.length;
  };
  const obj = (body: string) => {
    offsets.push(size);
    push(`${offsets.length} 0 obj\n${body}\nendobj\n`);
  };

  push('%PDF-1.4\n');
  obj('<< /Type /Catalog /Pages 2 0 R >>');
  obj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  const annots = links.map((_, index) => `${6 + index} 0 R`).join(' ');
  obj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> /Annots [${annots}] >>`,
  );
  obj(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
  offsets.push(size);
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  push('\nendstream\nendobj\n');

  const sx = pageW / imgW;
  const sy = pageH / imgH;
  for (const link of links) {
    const x1 = link.box.x * sx;
    const y1 = pageH - (link.box.y + link.box.h) * sy;
    const x2 = (link.box.x + link.box.w) * sx;
    const y2 = pageH - link.box.y * sy;
    obj(
      `<< /Type /Annot /Subtype /Link /Rect [${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${pdfEscape(link.url)}) >> >>`,
    );
  }

  const xrefAt = size;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer << /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);
  return concat(chunks);
}

export async function loadInviteFonts() {
  await document.fonts.load('italic 600 118px Fraunces');
  await document.fonts.load('600 34px Outfit');
  await document.fonts.load('400 34px Outfit');
}
