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

// Busca la imagen en dist/ o public/ del servidor (solo archivos locales)
function resolveImage(imgPath) {
  if (!imgPath) return null;

  const s = String(imgPath);
  // Si te llega URL, NO intentamos fs.existsSync (por ahora)
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

function generatePDF(dest) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, compress: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595.28;
    const M = 34;          // margen lateral
    const CW = W - M * 2;  // ancho útil
    let y = M;

    // ✅ Logo UNA sola vez (usa PNG/JPG, evita WEBP)
    const logoPath = resolveImage('assets/images/Logo3.png') || resolveImage('assets/images/Logo3.jpg');

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
      safeImage(doc, logoPath, M, y - 2, { height: 22 });
      doc.x = M + 60;
    }

    doc.font('Helvetica').fontSize(8).fillColor(C.gray)
      .text('almundotours.com  |  +57 316 527 6338', M, y + 6, { width: CW, align: 'right' });

    y += 26;

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

    y += 18;

    // ══ 3. IMAGEN HERO ═══════════════════════════════════════
    const heroH = 110;
    const heroFile = resolveImage(dest.image);

    if (heroFile) {
      try {
        doc.save();
        doc.rect(M, y, CW, heroH).clip();
        safeImage(doc, heroFile, M, y, { width: CW, height: heroH });

        // overlay oscuro inferior para legibilidad
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

    y += heroH + 14;

    // ══ 4. TÍTULO + DESCRIPCIÓN ══════════════════════════════
    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.navy)
      .text(dest.name || '', M, y);
    y += 30;

    const desc = dest.description || '';
    doc.font('Helvetica').fontSize(9.5).fillColor(C.gray)
      .text(desc, M, y, { width: CW, lineGap: 2 });
    y += doc.heightOfString(desc, { width: CW }) + 12;

    // META horizontal sin emojis (para no romper encoding)
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
    y += 20;

    // ══ 5. PRECIO ════════════════════════════════════════════
    if (isOffer) {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray)
        .text('Precio por persona', M, y);
      y += 12;

      // Precio anterior tachado
      const strikeStr = `Antes: ${fmtPrice(priceNum, usd)}`;
      doc.font('Helvetica').fontSize(9.5).fillColor([156, 163, 175])
        .text(strikeStr, M, y, { lineBreak: false });
      const sw = doc.widthOfString(strikeStr);
      doc.moveTo(M, y + 5).lineTo(M + sw, y + 5)
        .strokeColor([156, 163, 175]).lineWidth(0.5).stroke();
      y += 16;

      // Precio nuevo
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.red)
        .text(`Ahora: ${fmtPrice(origNum, usd)}`, M, y);

      // % descuento — derecha
      doc.font('Helvetica-Bold').fontSize(30).fillColor(C.green)
        .text(`${pct}%`, M, y - 28, { width: CW, align: 'right', lineBreak: false });
      doc.fontSize(9).text('DESCUENTO', M, y - 2, { width: CW, align: 'right' });

      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
        .text('Sujeto a cotización', M, y + 16, { width: CW, align: 'right' });

      y += 28;
    } else {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray)
        .text('Precio por persona', M, y);
      y += 12;

      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy)
        .text(fmtPrice(priceNum, usd), M, y);

      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
        .text('Sujeto a cotización', M, y + 4, { width: CW, align: 'right' });

      y += 26;
    }

    y += 8;

    // ══ 6. DOS COLUMNAS ══════════════════════════════════════
    const LW  = CW * 0.52;
    const RX  = M + LW + 14;
    const RW  = CW * 0.48 - 14;
    let yL = y, yR = y;

    // ─── Itinerario (izquierda) ───────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
      .text('Itinerario', M, yL);
    yL += 16;

    (dest.itinerary || []).forEach((day, i) => {
      const num   = day?.day || (i + 1);
      const title = String(day?.title || '');
      const acts  = (day?.activities || []).map(a => String(a ?? '')).filter(Boolean);

      const bg    = i % 2 === 0 ? C.lblue : C.lgray;
      const actH  = acts.length * 13 + 8;
      const bodyH = actH + 18;

      // Header azul
      doc.rect(M, yL, LW, 14).fill(C.navy);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
        .text(`DÍA ${num}`, M + 8, yL + 4, { lineBreak: false });

      // Body
      doc.rect(M, yL + 14, LW, bodyH).fill(bg);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
        .text(title, M + 8, yL + 20, { width: LW - 16 });

      doc.font('Helvetica').fontSize(7.5).fillColor(C.dark);
      acts.forEach((a, j) => {
        doc.text(`• ${a}`, M + 12, yL + 33 + j * 13, { width: LW - 20, lineBreak: false });
      });

      yL += 14 + bodyH + 4;
    });

    // ─── Incluye / No incluye (derecha) ──────────────────────
    const incs  = (dest.includes || []).map(x => String(x ?? '')).filter(Boolean);
    const nincs = (dest.notIncludes || [])
      .map(s => String(s ?? '').replace(/^[-\s]+/, ''))
      .filter(Boolean);

    const notes = String(dest.notes || '').trim();

    // ¿Qué incluye?
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.green)
      .text('¿Qué incluye?', RX, yR);
    yR += 16;

    const incH = incs.length * 15 + 12;
    doc.rect(RX, yR, RW, incH).fill(C.lgreen);

    incs.forEach((item, j) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor([21, 128, 61])
        .text('✓', RX + 6, yR + 8 + j * 15, { lineBreak: false });

      doc.font('Helvetica').fontSize(7.8).fillColor([22, 101, 52])
        .text(item, RX + 18, yR + 8 + j * 15, { width: RW - 24, lineBreak: false });
    });

    yR += incH + 12;

    // ¿Qué no incluye?
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.red)
      .text('¿Qué no incluye?', RX, yR);
    yR += 16;

    const ninH = nincs.length * 15 + 12;
    doc.rect(RX, yR, RW, ninH).fill(C.lred);

    nincs.forEach((item, j) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor([185, 28, 28])
        .text('✗', RX + 6, yR + 8 + j * 15, { lineBreak: false });

      doc.font('Helvetica').fontSize(7.8).fillColor([153, 27, 27])
        .text(item, RX + 18, yR + 8 + j * 15, { width: RW - 24, lineBreak: false });
    });

    yR += ninH + 12;

    // Info importante
    if (notes) {
      const noteH = doc.heightOfString(notes, { width: RW - 16 }) + 22;
      doc.rect(RX, yR, RW, noteH).fill(C.lyell);

      doc.font('Helvetica-Bold').fontSize(7.8).fillColor([146, 64, 14])
        .text('Importante:', RX + 6, yR + 8);

      doc.font('Helvetica').fontSize(7.5).fillColor([120, 53, 15])
        .text(notes, RX + 6, yR + 20, { width: RW - 12 });

      yR += noteH + 12;
    }

    // CTA
    doc.rect(RX, yR, RW, 38).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
      .text('¿Te interesa este destino?', RX, yR + 9, { width: RW, align: 'center' });

    doc.font('Helvetica').fontSize(8).fillColor([199, 210, 254])
      .text('Escríbenos · Te asesoramos sin costo', RX, yR + 23, { width: RW, align: 'center' });

    yR += 50;

    y = Math.max(yL, yR) + 14;

    // ══ 7. GALERÍA ═══════════════════════════════════════════
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
      .text('Galería', M, y);
    y += 14;

    const gallery = Array.isArray(dest.gallery) ? dest.gallery : [];
    const gW  = (CW - 8) / 3;
    const gH  = 62;
    const gFallbacks = [C.cyan, C.navy, [0, 100, 150]];

    for (let i = 0; i < 3; i++) {
      const gx   = M + i * (gW + 4);
      const gSrc = gallery[i] ? resolveImage(gallery[i]) : null;

      if (gSrc) {
        try {
          doc.save();
          doc.rect(gx, y, gW, gH).clip();
          safeImage(doc, gSrc, gx, y, { width: gW, height: gH });
          doc.restore();
          continue;
        } catch (e) {
          console.error('GALLERY ERROR:', e?.message || e);
        }
      }

      doc.rect(gx, y, gW, gH).fill(gFallbacks[i] || C.navy);
    }

    y += gH + 14;

    // ══ 8. FOOTER — sin fondo ════════════════════════════════
    doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(C.border).lineWidth(0.5).stroke();
    y += 10;

    if (logoPath) {
      safeImage(doc, logoPath, M, y - 2, { height: 18 });
      doc.x = M + 60;
    }

    // sin emojis (evita problemas de encoding)
    doc.font('Helvetica').fontSize(8.5).fillColor(C.gray)
      .text('+57 316 527 6338  |  almundotours.com', M, y + 3, { width: CW, align: 'right' });

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
