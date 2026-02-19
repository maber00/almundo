// ═══════════════════════════════════════════════════════════════
// netlify/functions/generate-pdf.js
// Instalar: npm install pdfkit
// Nota: usa LOGO en PNG/JPG (evita WEBP en PDFKit)
// Coloca el logo en: /public/assets/images/Logo3.png
// ═══════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ── Paleta ───────────────────────────────────────────────────
const C = {
  navy:  [12, 0, 95],     gold:   [232, 168, 32],
  red:   [220, 38, 38],   green:  [22, 163, 74],
  cyan:  [8, 145, 178],   purple: [124, 58, 237],
  pink:  [219, 39, 119],  gray:   [107, 114, 128],
  dark:  [31, 41, 55],    white:  [255, 255, 255],
  lgreen:[240, 253, 244], lred:   [254, 242, 242],
  lyell: [255, 251, 235], lblue:  [240, 244, 255],
  lgray: [249, 250, 251], border: [229, 231, 235],
};

const TAGS = { Playa:C.cyan, Aventura:C.green, Cultural:C.purple, Romántico:C.pink, Oferta:C.red };

function fmtPrice(price, usd = false) {
  try {
    const n = typeof price === 'string'
      ? parseInt(price.replace(/[.,]/g, ''))
      : Math.round(price);
    return usd ? `USD $${n.toLocaleString('en-US')}` : `$${n.toLocaleString('es-CO')} COP`;
  } catch {
    return String(price);
  }
}

// ── Helpers de imágenes ───────────────────────────────────────
function resolveImage(imgPath) {
  if (!imgPath) return null;

  const s = String(imgPath);
  if (s.startsWith('http://') || s.startsWith('https://')) return null;

  const bases = [
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'public'),
    process.cwd(),
  ];

  for (const base of bases) {
    const full = path.join(base, s);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function safeImage(doc, filePath, x, y, opts = {}) {
  try {
    if (!filePath) return false;
    doc.image(filePath, x, y, opts);
    return true;
  } catch (e) {
    console.error('IMAGE ERROR:', filePath, e?.message || e);
    return false;
  }
}

// ── Layout helpers ────────────────────────────────────────────
const PAGE_H = 841.89;
const FOOTER_SPACE = 90;

function ensureSpace(doc, y, needed, marginTop = 34) {
  if (y + needed > PAGE_H - FOOTER_SPACE) {
    doc.addPage({ size: 'A4', margin: 0 });
    return marginTop;
  }
  return y;
}

function drawFooterFixed(doc, logoPath, M, CW) {
  const footerY = PAGE_H - 42;

  doc.moveTo(M, footerY - 12)
    .lineTo(M + CW, footerY - 12)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();

  if (logoPath) {
    safeImage(doc, logoPath, M, footerY - 10, { height: 30 });
  }

  doc.font('Helvetica')
    .fontSize(8.5)
    .fillColor(C.gray)
    .text('+57 316 527 6338  |  almundotours.com', M, footerY - 2, {
      width: CW,
      align: 'right',
    });
}

function generatePDF(dest) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, compress: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595.28;
    const M = 34;
    const CW = W - M * 2;
    let y = M;

    // ✅ Logo (PNG/JPG)
    const logoPath =
      resolveImage('assets/images/Logo3.png') ||
      resolveImage('assets/images/Logo3.jpg');

    // Datos del destino
    const usd      = !!dest.priceInUsd;
    const priceNum = typeof dest.price === 'string'
      ? parseInt(dest.price.replace(/[.,]/g,''))
      : Math.round(dest.price || 0);

    const origNum  = dest.originalPrice
      ? (typeof dest.originalPrice === 'string'
        ? parseInt(dest.originalPrice.replace(/[.,]/g,''))
        : Math.round(dest.originalPrice))
      : 0;

    const isOffer  = origNum > 0 && origNum < priceNum;
    const pct      = isOffer ? Math.round(((priceNum - origNum) / priceNum) * 100) : 0;

    const tagMain   = dest.tag || '';
    const tagsExtra = (dest.tags || []).filter(t => t !== tagMain).slice(0, 3);

    // ══ 1. HEADER — logo + contacto ══════════════════════════
    if (logoPath) {
      safeImage(doc, logoPath, M, y - 6, { height: 40 });
    }

    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(C.gray)
      .text('almundotours.com  |  +57 316 527 6338', M, y + 14, { width: CW, align: 'right' });

    y += 44; // era 54

    // ══ 2. BADGES — sin fondo, texto en línea ════════════════
    let bx = M;
    const drawBadge = (text, color, bold = true) => {
      const fn = bold ? 'Helvetica-Bold' : 'Helvetica';
      const w  = doc.font(fn).fontSize(8).widthOfString(text);
      doc.font(fn).fontSize(8).fillColor(color).text(text, bx, y, { lineBreak: false });
      bx += w;
    };

    if (isOffer) {
      drawBadge('OFERTA ESPECIAL', C.red);
      bx += 10;
      drawBadge('·', C.gray, false);
      bx += 10;
    }

    if (tagMain) {
      drawBadge(tagMain, TAGS[tagMain] || C.navy);
      bx += 10;
    }

    tagsExtra.forEach(t => {
      drawBadge('·', C.gray, false); bx += 10;
      drawBadge(t, TAGS[t] || C.navy); bx += 10;
    });

    y += 12; // era 18

    // ══ 3. IMAGEN HERO ═══════════════════════════════════════
    const heroH = 150;
    y = ensureSpace(doc, y, heroH + 40, M);

    const heroFile = resolveImage(dest.image);
    if (heroFile) {
      try {
        doc.save();
        doc.rect(M, y, CW, heroH).clip();
        safeImage(doc, heroFile, M, y, { cover: [CW, heroH], align: 'center', valign: 'center' });

        const grad = doc.linearGradient(M, y, M, y + heroH);
        grad.stop(0, 'black', 0).stop(0.5, 'black', 0.1).stop(1, 'black', 0.5);
        doc.rect(M, y, CW, heroH).fill(grad);

        doc.restore();
      } catch (e) {
        console.error('HERO ERROR:', e?.message || e);
        doc.rect(M, y, CW, heroH).fill(C.navy);
      }
    } else {
      doc.rect(M, y, CW, heroH).fill(C.navy);
    }

    y += heroH + 8; // era +14

    // ══ 4. TÍTULO + DESCRIPCIÓN ══════════════════════════════
    y = ensureSpace(doc, y, 90, M);

    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.navy)
      .text(dest.name || '', M, y);
    y += 26; // era 30

    const desc = dest.description || '';
    doc.font('Helvetica').fontSize(9.5).fillColor(C.gray)
      .text(desc, M, y, { width: CW, lineGap: 2 });
    y += doc.heightOfString(desc, { width: CW }) + 6; // era +12

    // META horizontal sin emojis
    const metaItems = [];
    if (dest.region)       metaItems.push(String(dest.region));
    if (dest.durationText) metaItems.push(String(dest.durationText).trim());
    if (dest.availability) metaItems.push(`${dest.availability} cupos`);
    if (dest.rating)       metaItems.push(`${dest.rating}% satisfacción`);

    let mx = M;
    metaItems.forEach((item, idx) => {
      const iw = doc.font('Helvetica-Bold').fontSize(8.5).widthOfString(item);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark)
        .text(item, mx, y, { lineBreak: false });

      mx += iw;

      if (idx < metaItems.length - 1) {
        const sep = '  |  ';
        doc.font('Helvetica').fillColor([209, 213, 219])
          .text(sep, mx, y, { lineBreak: false });
        mx += doc.widthOfString(sep);
      }
    });
    y += 14; // era 20

    // ══ 5. PRECIO ════════════════════════════════════════════
    y = ensureSpace(doc, y, 90, M);

    if (isOffer) {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray)
        .text('Precio por persona', M, y);
      y += 10; // era 12

      const strikeStr = `Antes: ${fmtPrice(priceNum, usd)}`;
      doc.font('Helvetica').fontSize(9.5).fillColor([156, 163, 175])
        .text(strikeStr, M, y, { lineBreak: false });
      const sw = doc.widthOfString(strikeStr);
      doc.moveTo(M, y + 5).lineTo(M + sw, y + 5)
        .strokeColor([156, 163, 175]).lineWidth(0.5).stroke();
      y += 14; // era 16

      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.red)
        .text(`Ahora: ${fmtPrice(origNum, usd)}`, M, y);

      doc.font('Helvetica-Bold').fontSize(30).fillColor(C.green)
        .text(`${pct}%`, M, y - 28, { width: CW, align: 'right', lineBreak: false });
      doc.fontSize(9).text('DESCUENTO', M, y - 2, { width: CW, align: 'right' });

      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
        .text('Sujeto a cotización', M, y + 16, { width: CW, align: 'right' });

      y += 24; // era 28
    } else {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray)
        .text('Precio por persona', M, y);
      y += 10; // era 12

      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy)
        .text(fmtPrice(priceNum, usd), M, y);

      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
        .text('Sujeto a cotización', M, y + 4, { width: CW, align: 'right' });

      y += 22; // era 26
    }

    y += 6; // era 8

    // ══ 6. DOS COLUMNAS ══════════════════════════════════════
    y = ensureSpace(doc, y, 260, M);

    const LW  = CW * 0.52;
    const RX  = M + LW + 14;
    const RW  = CW * 0.48 - 14;
    let yL = y, yR = y;

    // ─── Itinerario (izquierda) ───────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
      .text('Itinerario', M, yL);
    yL += 13; // era 16

    (dest.itinerary || []).forEach((day, i) => {
      const num   = day?.day || (i + 1);
      const title = String(day?.title || '');
      const acts  = (day?.activities || []).map(a => String(a ?? '')).filter(Boolean);

      const bg    = i % 2 === 0 ? C.lblue : C.lgray;
      const actH  = acts.length * 13 + 8;
      const bodyH = actH + 18;

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

      yL += 14 + bodyH + 3; // era +4
    });

    // ─── Incluye / No incluye (derecha) ──────────────────────
    const incs  = (dest.includes || []).map(x => String(x ?? '')).filter(Boolean);
    const nincs = (dest.notIncludes || [])
      .map(s => String(s ?? '').replace(/^[-\s]+/, ''))
      .filter(Boolean);

    const notes = String(dest.notes || '').trim();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.green)
      .text('¿Qué incluye?', RX, yR);
    yR += 13; // era 16

    // Altura dinámica por item — respeta saltos de línea
    const incItemH = incs.map(item =>
      Math.max(doc.font('Helvetica').fontSize(7.8).heightOfString(item, { width: RW - 24 }) + 7, 16)
    );
    const incH = incItemH.reduce((a, b) => a + b, 0) + 10;
    doc.rect(RX, yR, RW, incH).fill(C.lgreen);

    let incY = yR + 6;
    incs.forEach((item, j) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor([21, 128, 61])
        .text('•', RX + 6, incY, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor([22, 101, 52])
        .text(item, RX + 18, incY + 0.5, { width: RW - 24 });
      incY += incItemH[j];
    });

    yR += incH + 8;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.red)
      .text('¿Qué no incluye?', RX, yR);
    yR += 13;

    // Altura dinámica por item — respeta saltos de línea
    const ninItemH = nincs.map(item =>
      Math.max(doc.font('Helvetica').fontSize(7.8).heightOfString(item, { width: RW - 24 }) + 7, 16)
    );
    const ninH = ninItemH.reduce((a, b) => a + b, 0) + 10;
    doc.rect(RX, yR, RW, ninH).fill(C.lred);

    let ninY = yR + 6;
    nincs.forEach((item, j) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor([185, 28, 28])
        .text('•', RX + 6, ninY, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor([153, 27, 27])
        .text(item, RX + 18, ninY + 0.5, { width: RW - 24 });
      ninY += ninItemH[j];
    });

    yR += ninH + 8;

    if (notes) {
      const noteH = doc.heightOfString(notes, { width: RW - 16 }) + 22;
      doc.rect(RX, yR, RW, noteH).fill(C.lyell);

      doc.font('Helvetica-Bold').fontSize(7.8).fillColor([146, 64, 14])
        .text('Importante:', RX + 6, yR + 8);

      doc.font('Helvetica').fontSize(7.5).fillColor([120, 53, 15])
        .text(notes, RX + 6, yR + 20, { width: RW - 12 });

      yR += noteH + 8; // era +12
    }

    doc.rect(RX, yR, RW, 38).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
      .text('¿Te interesa este destino?', RX, yR + 9, { width: RW, align: 'center' });

    doc.font('Helvetica').fontSize(8).fillColor([199, 210, 254])
      .text('Escríbenos · Te asesoramos sin costo', RX, yR + 23, { width: RW, align: 'center' });

    y = Math.max(yL, yR) + 38; // espacio tras CTA antes de galería

    // ══ 7. GALERÍA ═══════════════════════════════════════════
    const gH = 90;
    y = ensureSpace(doc, y, 14 + gH + 18, M);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
      .text('Galería', M, y);
    y += 12; // era 14

    const gallery = Array.isArray(dest.gallery) ? dest.gallery : [];
    const gW  = (CW - 8) / 3;
    const gFallbacks = [C.cyan, C.navy, [0, 100, 150]];

    for (let i = 0; i < 3; i++) {
      const gx   = M + i * (gW + 4);
      const gSrc = gallery[i] ? resolveImage(gallery[i]) : null;

      if (gSrc) {
        try {
          doc.save();
          doc.rect(gx, y, gW, gH).clip();
          safeImage(doc, gSrc, gx, y, { cover: [gW, gH], align: 'center', valign: 'center' });
          doc.restore();
          continue;
        } catch (e) {
          console.error('GALLERY ERROR:', e?.message || e);
        }
      }
      doc.rect(gx, y, gW, gH).fill(gFallbacks[i] || C.navy);
    }

    // ══ 8. FOOTER — FIJO (siempre visible) ════════════════════
    drawFooterFixed(doc, logoPath, M, CW);

    doc.end();
  });
}

// ── Handler Netlify ───────────────────────────────────────────
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let destination;
  try {
    const body = JSON.parse(event.body || '{}');
    destination = body.destination;
    if (!destination || !destination.name) throw new Error('Missing destination');
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