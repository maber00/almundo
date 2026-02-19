// ═══════════════════════════════════════════════════════════════
// netlify/functions/generate-pdf.js
// Instalar: npm install pdfkit
// Logo:     /public/assets/images/Logo3.png  (PNG o JPG, no WEBP)
// ═══════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ── Paleta ───────────────────────────────────────────────────
const C = {
  navy:  [12,0,95],    gold:   [232,168,32],
  red:   [220,38,38],  green:  [22,163,74],
  cyan:  [8,145,178],  purple: [124,58,237],
  pink:  [219,39,119], gray:   [107,114,128],
  dark:  [31,41,55],   white:  [255,255,255],
  lgreen:[240,253,244],lred:   [254,242,242],
  lyell: [255,251,235],lblue:  [240,244,255],
  lgray: [249,250,251],border: [229,231,235],
};

const TAGS = {
  Playa:C.cyan, Aventura:C.green, Cultural:C.purple,
  Romántico:C.pink, Oferta:C.red,
};

function fmtPrice(price, usd=false) {
  try {
    const n = typeof price==='string'
      ? parseInt(price.replace(/[.,]/g,''))
      : Math.round(price);
    return usd
      ? `USD $${n.toLocaleString('en-US')}`
      : `$${n.toLocaleString('es-CO')} COP`;
  } catch { return String(price); }
}

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

function safeImage(doc, filePath, x, y, opts={}) {
  try { doc.image(filePath, x, y, opts); return true; }
  catch(e) { console.error('IMG ERR:', filePath, e?.message); return false; }
}

// ────────────────────────────────────────────────────────────
function generatePDF(dest) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size:'A4', margin:0, compress:true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W  = 595.28;
    const M  = 30;          // margen lateral
    const CW = W - M * 2;  // 535.28 pt útil
    let   y  = M;

    // Logo
    const logoPath =
      resolveImage('assets/images/Logo3.png') ||
      resolveImage('assets/images/Logo3.jpg') ||
      resolveImage('assets/images/logo.png');

    // Datos
    const usd      = !!dest.priceInUsd;
    const priceNum = typeof dest.price==='string'
      ? parseInt(dest.price.replace(/[.,]/g,''))
      : Math.round(dest.price||0);
    const origNum  = dest.originalPrice
      ? (typeof dest.originalPrice==='string'
        ? parseInt(dest.originalPrice.replace(/[.,]/g,''))
        : Math.round(dest.originalPrice))
      : 0;
    const isOffer   = origNum>0 && origNum<priceNum;
    const pct       = isOffer ? Math.round(((priceNum-origNum)/priceNum)*100) : 0;
    const tagMain   = dest.tag || '';
    const tagsExtra = (dest.tags||[]).filter(t=>t!==tagMain).slice(0,3);

    // ══ 1. HEADER ════════════════════════════════════════════
    // Logo real si existe, si no tipografía
    if (logoPath) {
      safeImage(doc, logoPath, M, y-4, { height:32 });
    } else {
      doc.font('Helvetica-Bold').fontSize(16).fillColor(C.navy)
         .text('AL MUNDO', M, y, {continued:true, lineBreak:false})
         .fillColor(C.gold).text(' TOURS', {lineBreak:false});
    }
    doc.font('Helvetica').fontSize(8).fillColor(C.gray)
       .text('almundotours.com  |  +57 316 527 6338', M, y+4, {width:CW, align:'right'});
    y += 22;

    // ══ 2. BADGES ════════════════════════════════════════════
    let bx = M;
    const badge = (text, color, bold=true) => {
      const fn = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(fn).fontSize(8).fillColor(color).text(text, bx, y, {lineBreak:false});
      bx += doc.widthOfString(text);
    };
    if (isOffer) { badge('OFERTA ESPECIAL', C.red); bx+=8; badge('·',C.gray,false); bx+=8; }
    if (tagMain) { badge(tagMain, TAGS[tagMain]||C.navy); bx+=8; }
    tagsExtra.forEach(t => { badge('·',C.gray,false); bx+=8; badge(t,TAGS[t]||C.navy); bx+=8; });
    y += 14;

    // ══ 3. HERO ══════════════════════════════════════════════
    const heroH = 108;
    const heroFile = resolveImage(dest.image);
    if (heroFile) {
      try {
        doc.save();
        doc.rect(M,y,CW,heroH).clip();
        safeImage(doc, heroFile, M, y, {width:CW, height:heroH});
        const grad = doc.linearGradient(M,y,M,y+heroH);
        grad.stop(0,'black',0).stop(0.5,'black',0.08).stop(1,'black',0.45);
        doc.rect(M,y,CW,heroH).fill(grad);
        doc.restore();
      } catch { doc.rect(M,y,CW,heroH).fill(C.navy); }
    } else {
      doc.rect(M,y,CW,heroH).fill(C.navy);
    }
    y += heroH + 10;

    // ══ 4. TÍTULO + DESCRIPCIÓN ══════════════════════════════
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.navy)
       .text(dest.name||'', M, y);
    y += 24;

    const desc = dest.description || '';
    doc.font('Helvetica').fontSize(9).fillColor(C.gray)
       .text(desc, M, y, {width:CW, lineGap:1.5});
    y += doc.heightOfString(desc, {width:CW, lineGap:1.5}) + 8;

    // META horizontal
    const meta = [];
    if (dest.region)       meta.push(String(dest.region));
    if (dest.durationText) meta.push(String(dest.durationText).trim());
    if (dest.availability) meta.push(`${dest.availability} cupos`);
    if (dest.rating)       meta.push(`${dest.rating}% satisfacción`);

    let mx = M;
    meta.forEach((item, idx) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.dark)
         .text(item, mx, y, {lineBreak:false});
      mx += doc.widthOfString(item);
      if (idx < meta.length-1) {
        const sep = '  |  ';
        doc.font('Helvetica').fillColor([209,213,219]).text(sep, mx, y, {lineBreak:false});
        mx += doc.widthOfString(sep);
      }
    });
    y += 15;

    // ══ 5. PRECIO ════════════════════════════════════════════
    if (isOffer) {
      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
         .text('Precio por persona', M, y); y += 9;

      const ss = `Antes: ${fmtPrice(priceNum,usd)}`;
      doc.font('Helvetica').fontSize(9).fillColor([156,163,175])
         .text(ss, M, y, {lineBreak:false});
      const sw = doc.widthOfString(ss);
      doc.moveTo(M,y+4.5).lineTo(M+sw,y+4.5)
         .strokeColor([156,163,175]).lineWidth(0.4).stroke();
      y += 12;

      doc.font('Helvetica-Bold').fontSize(16).fillColor(C.red)
         .text(`Ahora: ${fmtPrice(origNum,usd)}`, M, y);

      // % a la derecha, alineado al mismo nivel
      doc.font('Helvetica-Bold').fontSize(26).fillColor(C.green)
         .text(`${pct}%`, M, y-20, {width:CW, align:'right', lineBreak:false});
      doc.fontSize(8).text('DESCUENTO', M, y, {width:CW, align:'right'});
      doc.font('Helvetica').fontSize(6.5).fillColor(C.gray)
         .text('Sujeto a cotización', M, y+12, {width:CW, align:'right'});
      y += 22;
    } else {
      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
         .text('Precio por persona', M, y); y += 9;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(C.navy)
         .text(fmtPrice(priceNum,usd), M, y);
      doc.font('Helvetica').fontSize(6.5).fillColor(C.gray)
         .text('Sujeto a cotización', M, y+3, {width:CW, align:'right'});
      y += 20;
    }
    y += 8;

    // ══ 6. DOS COLUMNAS ══════════════════════════════════════
    const LW = CW * 0.52;
    const RX = M + LW + 12;
    const RW = CW * 0.48 - 12;
    let yL = y, yR = y;

    // ─── Itinerario (izquierda) ──────────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
       .text('Itinerario', M, yL);
    yL += 12;

    (dest.itinerary||[]).forEach((day,i) => {
      const num   = day?.day||(i+1);
      const title = String(day?.title||'');
      const acts  = (day?.activities||[]).map(String).filter(Boolean);
      const bg    = i%2===0 ? C.lblue : C.lgray;
      const actH  = acts.length*12 + 6;
      const bodyH = actH + 14;

      // Cabecera azul
      doc.rect(M,yL,LW,12).fill(C.navy);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
         .text(`DÍA ${num}`, M+6, yL+3.5, {lineBreak:false});

      // Cuerpo
      doc.rect(M,yL+12,LW,bodyH).fill(bg);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.navy)
         .text(title, M+6, yL+16, {width:LW-12});
      doc.font('Helvetica').fontSize(7).fillColor(C.dark);
      acts.forEach((a,j) => {
        doc.text(`• ${a}`, M+8, yL+26+j*12, {width:LW-16, lineBreak:false});
      });

      yL += 12 + bodyH + 3;
    });

    // ─── Derecha: Incluye / No incluye ──────────────────────
    const incs  = (dest.includes||[]).map(String).filter(Boolean);
    const nincs = (dest.notIncludes||[]).map(s=>String(s).replace(/^[-\s]+/,'')).filter(Boolean);
    const notes = String(dest.notes||'').trim();

    // Incluye
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.green)
       .text('Que incluye', RX, yR);
    yR += 12;
    const incH = incs.length*13 + 8;
    doc.rect(RX,yR,RW,incH).fill(C.lgreen);
    incs.forEach((item,j) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor([21,128,61])
         .text('•', RX+5, yR+5+j*13, {lineBreak:false});
      doc.font('Helvetica').fontSize(7.5).fillColor([22,101,52])
         .text(item, RX+14, yR+5.5+j*13, {width:RW-20, lineBreak:false});
    });
    yR += incH + 9;

    // No incluye
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.red)
       .text('No incluye', RX, yR);
    yR += 12;
    const ninH = nincs.length*13 + 8;
    doc.rect(RX,yR,RW,ninH).fill(C.lred);
    nincs.forEach((item,j) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor([185,28,28])
         .text('•', RX+5, yR+5+j*13, {lineBreak:false});
      doc.font('Helvetica').fontSize(7.5).fillColor([153,27,27])
         .text(item, RX+14, yR+5.5+j*13, {width:RW-20, lineBreak:false});
    });
    yR += ninH + 9;

    // Info importante
    if (notes) {
      const nH = doc.heightOfString(notes,{width:RW-12}) + 16;
      doc.rect(RX,yR,RW,nH).fill(C.lyell);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor([146,64,14])
         .text('Importante:', RX+5, yR+6);
      doc.font('Helvetica').fontSize(7).fillColor([120,53,15])
         .text(notes, RX+5, yR+16, {width:RW-10});
      yR += nH + 8;
    }

    // CTA
    doc.rect(RX,yR,RW,32).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text('¿Te interesa este destino?', RX, yR+7, {width:RW, align:'center'});
    doc.font('Helvetica').fontSize(7.5).fillColor([199,210,254])
       .text('Escríbenos · Te asesoramos sin costo', RX, yR+19, {width:RW, align:'center'});
    yR += 40;

    y = Math.max(yL, yR) + 10;

    // ══ 7. GALERÍA ═══════════════════════════════════════════
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy)
       .text('Galería', M, y);
    y += 11;

    const gallery = Array.isArray(dest.gallery) ? dest.gallery : [];
    const gW = (CW-6)/3, gH = 58;
    const gFallbacks = [[0,130,185],[0,100,160],[0,155,175]];

    for (let i=0; i<3; i++) {
      const gx   = M + i*(gW+3);
      const gSrc = gallery[i] ? resolveImage(gallery[i]) : null;
      if (gSrc) {
        try {
          doc.save();
          doc.rect(gx,y,gW,gH).clip();
          safeImage(doc, gSrc, gx, y, {width:gW, height:gH});
          doc.restore();
          continue;
        } catch {}
      }
      doc.rect(gx,y,gW,gH).fill(gFallbacks[i]||C.navy);
    }
    y += gH + 10;

    // ══ 8. FOOTER ════════════════════════════════════════════
    doc.moveTo(M,y).lineTo(M+CW,y).strokeColor(C.border).lineWidth(0.5).stroke();
    y += 6;

    if (logoPath) {
      safeImage(doc, logoPath, M, y-2, {height:26});
    } else {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
         .text('AL MUNDO', M, y, {continued:true, lineBreak:false})
         .fillColor(C.gold).text(' TOURS', {lineBreak:false});
    }
    doc.font('Helvetica').fontSize(8).fillColor(C.gray)
       .text('+57 316 527 6338  |  almundotours.com', M, y+3, {width:CW, align:'right'});

    doc.end();
  });
}

// ── Handler Netlify ───────────────────────────────────────────
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode:405, body:'Method Not Allowed' };
  }

  let destination;
  try {
    const body = JSON.parse(event.body||'{}');
    destination = body.destination;
    if (!destination||!destination.name) throw new Error('Missing destination');
  } catch(e) {
    return { statusCode:400, body:`Bad Request: ${e.message}` };
  }

  try {
    const pdfBuffer = await generatePDF(destination);
    const safeName  = (destination.name||'destino')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]/gi,'-').toLowerCase();

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
  } catch(e) {
    console.error('generate-pdf ERROR:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
}