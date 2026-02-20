// netlify/functions/generate-pdf.js
// npm install pdfkit image-size

import PDFDocument from 'pdfkit';
import fs          from 'fs';
import path        from 'path';
import { imageSize } from 'image-size';

// ── Paleta ────────────────────────────────────────────────────
const C = {
  navy:   [12, 0, 95],    gold:   [232, 168, 32],
  red:    [220, 38, 38],  green:  [22, 163, 74],
  cyan:   [8, 145, 178],  purple: [124, 58, 237],
  pink:   [219, 39, 119], gray:   [107, 114, 128],
  dark:   [31, 41, 55],   white:  [255, 255, 255],
  lgreen: [240, 253, 244],lred:   [254, 242, 242],
  lyell:  [255, 251, 235],lblue:  [240, 244, 255],
  lgray:  [249, 250, 251],border: [229, 231, 235],
};

const TAGS = { Playa: C.cyan, Aventura: C.green, Cultural: C.purple, Romántico: C.pink, Oferta: C.red };

// ── Precio formateado ─────────────────────────────────────────
function fmtPrice(price, usd = false) {
  try {
    const n = typeof price === 'string' ? parseInt(price.replace(/[.,]/g, '')) : Math.round(price);
    return usd ? `USD $${n.toLocaleString('en-US')}` : `$${n.toLocaleString('es-CO')} COP`;
  } catch { return String(price); }
}

// ── Resolver ruta de imagen local ─────────────────────────────
function resolveImage(imgPath) {
  if (!imgPath) return null;
  const s = String(imgPath);
  if (s.startsWith('http://') || s.startsWith('https://')) return null;
  for (const base of [
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'public'),
    process.cwd(),
  ]) {
    const full = path.join(base, s);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

// ── Cover: centra y recorta igual que object-fit:cover ────────
function drawCover(doc, filePath, x, y, w, h) {
  try {
    const buf  = fs.readFileSync(filePath);
    const dims = imageSize(buf);
    if (!dims?.width || !dims?.height) return false;

    const scale = Math.max(w / dims.width, h / dims.height);
    const sw    = dims.width  * scale;
    const sh    = dims.height * scale;
    const ox    = x - (sw - w) / 2;
    const oy    = y - (sh - h) / 2;

    doc.save();
    doc.rect(x, y, w, h).clip();
    doc.image(filePath, ox, oy, { width: sw, height: sh });
    doc.restore();
    return true;
  } catch (e) {
    console.error('COVER ERROR:', filePath, e?.message);
    return false;
  }
}

function safeImage(doc, filePath, x, y, opts = {}) {
  try { doc.image(filePath, x, y, opts); return true; }
  catch (e) { console.error('IMG ERROR:', e?.message); return false; }
}

// ── Layout helpers ────────────────────────────────────────────
const PAGE_H = 841.89;

function ensureSpace(doc, y, needed, mt = 34) {
  if (y + needed > PAGE_H - 80) { doc.addPage({ size: 'A4', margin: 0 }); return mt; }
  return y;
}

function drawFooter(doc, logoPath, M, CW) {
  const fy = PAGE_H - 42;
  doc.moveTo(M, fy - 12).lineTo(M + CW, fy - 12)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  if (logoPath) safeImage(doc, logoPath, M, fy - 10, { height: 30 });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.gray)
    .text('+57 316 527 6338  |  almundotours.com', M, fy - 2, { width: CW, align: 'right' });
}

// ── Generador principal ───────────────────────────────────────
function generatePDF(dest) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 0, compress: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W  = 595.28;
    const M  = 34;
    const CW = W - M * 2;
    let   y  = M;

    // Solo PNG
    const logoPath = resolveImage('assets/images/Logo3.png');

    // Precios
    const usd      = !!dest.priceInUsd;
    const priceNum = typeof dest.price === 'string' ? parseInt(dest.price.replace(/[.,]/g, '')) : Math.round(dest.price || 0);
    const origNum  = dest.originalPrice
      ? (typeof dest.originalPrice === 'string' ? parseInt(dest.originalPrice.replace(/[.,]/g, '')) : Math.round(dest.originalPrice))
      : 0;
    const isOffer  = origNum > 0 && origNum < priceNum;
    const pct      = isOffer ? Math.round(((priceNum - origNum) / priceNum) * 100) : 0;
    const tagMain   = dest.tag || '';
    const tagsExtra = (dest.tags || []).filter(t => t !== tagMain).slice(0, 3);

    // ══ 1. HEADER ══════════════════════════════════════════════
    if (logoPath) safeImage(doc, logoPath, M, y - 6, { height: 40 });
    doc.font('Helvetica').fontSize(9).fillColor(C.gray)
      .text('almundotours.com  |  +57 316 527 6338', M, y + 14, { width: CW, align: 'right' });
    y += 54;

    // ══ 2. BADGES ══════════════════════════════════════════════
    let bx = M;
    const badge = (text, color, bold = true) => {
      const fn = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(fn).fontSize(8).fillColor(color).text(text, bx, y, { lineBreak: false });
      bx += doc.font(fn).fontSize(8).widthOfString(text);
    };
    if (isOffer) { badge('OFERTA ESPECIAL', C.red); bx += 10; badge('·', C.gray, false); bx += 10; }
    if (tagMain) { badge(tagMain, TAGS[tagMain] || C.navy); bx += 10; }
    tagsExtra.forEach(t => { badge('·', C.gray, false); bx += 10; badge(t, TAGS[t] || C.navy); bx += 10; });
    y += 18;

    // ══ 3. IMAGEN HERO — cover ══════════════════════════════════
    const heroH    = 160;
    y = ensureSpace(doc, y, heroH + 40);
    const heroFile = resolveImage(dest.image);

    if (!heroFile || !drawCover(doc, heroFile, M, y, CW, heroH)) {
      doc.rect(M, y, CW, heroH).fill(C.navy);
    }
    // Gradiente overlay
    try {
      doc.save();
      doc.rect(M, y, CW, heroH).clip();
      const grad = doc.linearGradient(M, y, M, y + heroH);
      grad.stop(0, 'black', 0).stop(0.6, 'black', 0.05).stop(1, 'black', 0.5);
      doc.rect(M, y, CW, heroH).fill(grad);
      doc.restore();
    } catch (_) {}
    y += heroH + 14;

    // ══ 4. TÍTULO + DESCRIPCIÓN ════════════════════════════════
    y = ensureSpace(doc, y, 90);
    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.navy).text(dest.name || '', M, y);
    y += 30;

    const desc = dest.description || '';
    doc.font('Helvetica').fontSize(9.5).fillColor(C.gray).text(desc, M, y, { width: CW, lineGap: 2 });
    y += doc.heightOfString(desc, { width: CW }) + 12;

    // META horizontal
    const meta = [];
    if (dest.region)       meta.push(String(dest.region));
    if (dest.durationText) meta.push(String(dest.durationText).trim());
    if (dest.availability) meta.push(`${dest.availability} cupos`);
    if (dest.rating)       meta.push(`${dest.rating}% satisfacción`);

    let mx = M;
    meta.forEach((item, idx) => {
      const iw = doc.font('Helvetica-Bold').fontSize(8.5).widthOfString(item);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark).text(item, mx, y, { lineBreak: false });
      mx += iw;
      if (idx < meta.length - 1) {
        const sep = '  |  ';
        doc.font('Helvetica').fillColor([209, 213, 219]).text(sep, mx, y, { lineBreak: false });
        mx += doc.widthOfString(sep);
      }
    });
    y += 20;

    // ══ 5. PRECIO ══════════════════════════════════════════════
    y = ensureSpace(doc, y, 80);
    if (isOffer) {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text('Precio por persona', M, y);
      y += 12;
      const strikeStr = `Antes: ${fmtPrice(priceNum, usd)}`;
      doc.font('Helvetica').fontSize(9.5).fillColor([156, 163, 175]).text(strikeStr, M, y, { lineBreak: false });
      const sw = doc.widthOfString(strikeStr);
      doc.moveTo(M, y + 5).lineTo(M + sw, y + 5).strokeColor([156, 163, 175]).lineWidth(0.5).stroke();
      y += 16;
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.red).text(`Ahora: ${fmtPrice(origNum, usd)}`, M, y);
      doc.font('Helvetica-Bold').fontSize(30).fillColor(C.green).text(`${pct}%`, M, y - 28, { width: CW, align: 'right', lineBreak: false });
      doc.fontSize(9).text('DESCUENTO', M, y - 2, { width: CW, align: 'right' });
      doc.font('Helvetica').fontSize(7).fillColor(C.gray).text('Sujeto a cotización', M, y + 16, { width: CW, align: 'right' });
      y += 28;
    } else {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text('Precio por persona', M, y);
      y += 12;
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy).text(fmtPrice(priceNum, usd), M, y);
      doc.font('Helvetica').fontSize(7).fillColor(C.gray).text('Sujeto a cotización', M, y + 4, { width: CW, align: 'right' });
      y += 26;
    }
    y += 8;

    // ══ 6. DOS COLUMNAS ════════════════════════════════════════
    y = ensureSpace(doc, y, 260);
    const LW = CW * 0.52;
    const RX = M + LW + 14;
    const RW = CW * 0.48 - 14;
    let yL = y, yR = y;

    // ── Itinerario (izquierda) ──────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy).text('Itinerario', M, yL);
    yL += 16;

    (dest.itinerary || []).forEach((day, i) => {
      const num   = day?.day || (i + 1);
      const title = String(day?.title || '');
      const acts  = (day?.activities || []).map(a => String(a ?? '')).filter(Boolean);
      const bg    = i % 2 === 0 ? C.lblue : C.lgray;
      const bodyH = acts.length * 13 + 8 + 18;

      doc.rect(M, yL, LW, 14).fill(C.navy);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
        .text(`DÍA ${num}`, M + 8, yL + 4, { lineBreak: false });
      doc.rect(M, yL + 14, LW, bodyH).fill(bg);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
        .text(title, M + 8, yL + 20, { width: LW - 16 });
      doc.font('Helvetica').fontSize(7.5).fillColor(C.dark);
      acts.forEach((a, j) => {
        doc.text(`• ${a}`, M + 12, yL + 33 + j * 13, { width: LW - 20, lineBreak: false });
      });
      yL += 14 + bodyH + 4;
    });

    // ── Incluye / No incluye (derecha) ─────────────────────
    const incs  = (dest.includes    || []).map(x => String(x ?? '')).filter(Boolean);
    const nincs = (dest.notIncludes || []).map(s => String(s ?? '').replace(/^[-\s]+/, '')).filter(Boolean);
    const notes = String(dest.notes || '').trim();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.green).text('¿Qué incluye?', RX, yR);
    yR += 16;
    const incH = incs.length * 15 + 12;
    doc.rect(RX, yR, RW, incH).fill(C.lgreen);
    incs.forEach((item, j) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor([21, 128, 61])
        .text('•', RX + 6, yR + 7 + j * 15, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor([22, 101, 52])
        .text(item, RX + 18, yR + 8 + j * 15, { width: RW - 24, lineBreak: false });
    });
    yR += incH + 12;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.red).text('¿Qué no incluye?', RX, yR);
    yR += 16;
    const ninH = nincs.length * 15 + 12;
    doc.rect(RX, yR, RW, ninH).fill(C.lred);
    nincs.forEach((item, j) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor([185, 28, 28])
        .text('•', RX + 6, yR + 7 + j * 15, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor([153, 27, 27])
        .text(item, RX + 18, yR + 8 + j * 15, { width: RW - 24, lineBreak: false });
    });
    yR += ninH + 12;

    if (notes) {
      const noteH = doc.heightOfString(notes, { width: RW - 16 }) + 22;
      doc.rect(RX, yR, RW, noteH).fill(C.lyell);
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor([146, 64, 14]).text('Importante:', RX + 6, yR + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor([120, 53, 15]).text(notes, RX + 6, yR + 20, { width: RW - 12 });
      yR += noteH + 12;
    }

    doc.rect(RX, yR, RW, 38).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
      .text('¿Te interesa este destino?', RX, yR + 9, { width: RW, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor([199, 210, 254])
      .text('Escríbenos · Te asesoramos sin costo', RX, yR + 23, { width: RW, align: 'center' });

    y = Math.max(yL, yR) + 14;

    // ══ 7. GALERÍA — cover ══════════════════════════════════════
    const gH = 90;
    y = ensureSpace(doc, y, 14 + gH + 18);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy).text('Galería', M, y);
    y += 14;

    const gallery    = Array.isArray(dest.gallery) ? dest.gallery : [];
    const gW         = (CW - 8) / 3;
    const gFallbacks = [C.cyan, C.navy, [0, 100, 150]];

    for (let i = 0; i < 3; i++) {
      const gx   = M + i * (gW + 4);
      const gSrc = gallery[i] ? resolveImage(gallery[i]) : null;
      if (gSrc && drawCover(doc, gSrc, gx, y, gW, gH)) continue;
      doc.rect(gx, y, gW, gH).fill(gFallbacks[i] || C.navy);
    }

    // ══ 8. FOOTER ══════════════════════════════════════════════
    drawFooter(doc, logoPath, M, CW);

    doc.end();
  });
}

// ── Handler Netlify ───────────────────────────────────────────
export async function handler(event) {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  let destination;
  try {
    const body = JSON.parse(event.body || '{}');
    destination = body.destination;
    if (!destination?.name) throw new Error('Missing destination');
  } catch (e) {
    return { statusCode: 400, body: `Bad Request: ${e.message}` };
  }

  try {
    const pdfBuffer = await generatePDF(destination);
    const safeName  = (destination.name || 'destino')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '-').toLowerCase();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}-itinerario.pdf"`,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('generate-pdf ERROR:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
}