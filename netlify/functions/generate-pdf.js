// ═══════════════════════════════════════════════════════════════
// netlify/functions/generate-pdf.js
// Ubicación en tu proyecto: netlify/functions/generate-pdf.js
// Instalar dependencia: npm install jspdf
// ═══════════════════════════════════════════════════════════════

import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const C = {
  navy:   [12, 0, 95],   gold:  [232, 168, 32],
  red:    [220, 38, 38], green: [22, 163, 74],
  cyan:   [8, 145, 178], purple:[124, 58, 237],
  pink:   [219, 39, 119],gray:  [107, 114, 128],
  dark:   [31, 41, 55],  white: [255, 255, 255],
  lgreen: [240, 253, 244],lred: [254, 242, 242],
  lyell:  [255, 251, 235],
  lblue:  [240, 244, 255],lgray: [249, 250, 251],
};

function tagColor(tag) {
  return { Playa:C.cyan, Aventura:C.green, Cultural:C.purple,
           Romántico:C.pink, Oferta:C.red }[tag] || C.navy;
}

function fmtPrice(price, usd=false) {
  try {
    const n = typeof price === 'string' ? parseInt(price.replace(/[.,]/g,'')) : Math.round(price);
    return usd ? `USD $${n.toLocaleString('en-US')}` : `$${n.toLocaleString('es-CO')} COP`;
  } catch { return String(price); }
}

function sf(doc, rgb) { doc.setFillColor(rgb[0],rgb[1],rgb[2]); }
function st(doc, rgb) { doc.setTextColor(rgb[0],rgb[1],rgb[2]); }

function loadImage(imgPath) {
  try {
    const candidates = [
      path.join(process.cwd(), 'dist', imgPath),
      path.join(process.cwd(), 'public', imgPath),
      path.join(process.cwd(), imgPath),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const ext = path.extname(p).slice(1).toUpperCase();
        const mime = ext === 'PNG' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
      }
    }
  } catch {}
  return null;
}

function addImage(doc, imgPath, x, y, w, h, fallbackColor) {
  const data = loadImage(imgPath || '');
  if (data) {
    try { doc.addImage(data, 'JPEG', x, y, w, h); return; } catch {}
  }
  // Fallback: degradado simulado
  const c1 = fallbackColor || C.navy;
  const c2 = fallbackColor ? fallbackColor.map(v => Math.max(0, v-40)) : [0,60,120];
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    doc.setFillColor(
      Math.round(c1[0]+(c2[0]-c1[0])*t),
      Math.round(c1[1]+(c2[1]-c1[1])*t),
      Math.round(c1[2]+(c2[2]-c1[2])*t)
    );
    doc.rect(x + w*i/steps, y, w/steps+0.5, h, 'F');
  }
}

function generatePDF(dest) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W=210, M=12, CW=W-M*2;
  let y = M;

  const usd      = !!dest.priceInUsd;
  const priceNum = typeof dest.price==='string' ? parseInt(dest.price.replace(/[.,]/g,'')) : Math.round(dest.price||0);
  const origNum  = dest.originalPrice ? (typeof dest.originalPrice==='string' ? parseInt(dest.originalPrice.replace(/[.,]/g,'')) : Math.round(dest.originalPrice)) : 0;
  const isOffer  = origNum>0 && origNum<priceNum;
  const pct      = isOffer ? Math.round(((priceNum-origNum)/priceNum)*100) : 0;
  const tagMain  = dest.tag || '';
  const tagsExtra = (dest.tags||[]).filter(t=>t!==tagMain).slice(0,3);

  // ══ 1. HEADER ══════════════════════════════════════════════
  st(doc, C.navy); doc.setFontSize(17); doc.setFont('helvetica','bold');
  doc.text('AL MUNDO', M, y+7);
  st(doc, C.gold);
  doc.text('TOURS', M+doc.getTextWidth('AL MUNDO '), y+7);
  st(doc, C.gray); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text('✈  almundotours.com  |  +57 316 527 6338', W-M, y+7, {align:'right'});
  y += 12;

  // ══ 2. BADGES ══════════════════════════════════════════════
  let bx = M;
  if (isOffer) {
    st(doc,C.red); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text('⭐ OFERTA ESPECIAL', bx, y+5); bx+=doc.getTextWidth('⭐ OFERTA ESPECIAL')+5;
    st(doc,[209,213,219]); doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('·', bx, y+5); bx+=5;
  }
  if (tagMain) {
    st(doc,tagColor(tagMain)); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text(tagMain, bx, y+5); bx+=doc.getTextWidth(tagMain)+5;
  }
  tagsExtra.forEach(t=>{
    st(doc,[209,213,219]); doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('·', bx, y+5); bx+=5;
    st(doc,tagColor(t)); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text(t, bx, y+5); bx+=doc.getTextWidth(t)+5;
  });
  y += 10;

  // ══ 3. HERO ════════════════════════════════════════════════
  const heroH = 38;
  addImage(doc, dest.image, M, y, CW, heroH, [0,130,185]);
  y += heroH+7;

  // ══ 4. TÍTULO + DESC + META ════════════════════════════════
  st(doc,C.navy); doc.setFontSize(22); doc.setFont('helvetica','bold');
  doc.text(dest.name||'', M, y); y+=7;

  st(doc,C.gray); doc.setFontSize(9.5); doc.setFont('helvetica','normal');
  const descLines = doc.splitTextToSize(dest.description||'', CW);
  descLines.forEach((l,i)=>doc.text(l, M, y+i*5));
  y += descLines.length*5+5;

  // META sin fondo
  const metaItems=[];
  if(dest.region)       metaItems.push(`📍 ${String(dest.region).charAt(0).toUpperCase()+String(dest.region).slice(1)}`);
  if(dest.durationText) metaItems.push(`⏱ ${String(dest.durationText).trim()}`);
  if(dest.availability) metaItems.push(`👥 ${dest.availability} cupos`);
  if(dest.rating)       metaItems.push(`⭐ ${dest.rating}% satisfacción`);

  let mx=M;
  doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  metaItems.forEach((item,idx)=>{
    st(doc,C.dark); doc.text(item, mx, y);
    mx+=doc.getTextWidth(item)+2;
    if(idx<metaItems.length-1){
      st(doc,[209,213,219]); doc.setFont('helvetica','normal');
      doc.text(' | ', mx, y); mx+=doc.getTextWidth(' | ')+1;
      doc.setFont('helvetica','bold');
    }
  });
  y+=8;

  // ══ 5. PRECIO ══════════════════════════════════════════════
  if(isOffer){
    st(doc,C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    doc.text('Precio por persona', M, y+5);
    const strikeStr=`Antes: ${fmtPrice(priceNum,usd)}`;
    st(doc,[156,163,175]); doc.setFontSize(9.5);
    doc.text(strikeStr, M, y+11);
    doc.setDrawColor(156,163,175); doc.setLineWidth(0.3);
    doc.line(M, y+10.3, M+doc.getTextWidth(strikeStr), y+10.3);
    st(doc,C.red); doc.setFontSize(17); doc.setFont('helvetica','bold');
    doc.text(`Ahora: ${fmtPrice(origNum,usd)}`, M, y+19);
    // % derecha
    st(doc,C.green); doc.setFontSize(28); doc.setFont('helvetica','bold');
    doc.text(`${pct}%`, W-M-2, y+14, {align:'right'});
    doc.setFontSize(9); doc.text('DESCUENTO', W-M-2, y+19, {align:'right'});
    st(doc,C.gray); doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('Sujeto a cotización', W-M-2, y+22, {align:'right'});
  } else {
    st(doc,C.gray); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    doc.text('Precio por persona', M, y+5);
    st(doc,C.navy); doc.setFontSize(17); doc.setFont('helvetica','bold');
    doc.text(fmtPrice(priceNum,usd), M, y+15);
    st(doc,C.gray); doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('Sujeto a cotización', W-M-2, y+15, {align:'right'});
  }
  y+=26;

  // ══ 6. DOS COLUMNAS ════════════════════════════════════════
  const LW=CW*0.52, RX=M+LW+8, RW=CW*0.48-8;
  let yL=y, yR=y;

  // Itinerario (izq)
  st(doc,C.navy); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('📅 Itinerario', M, yL); yL+=5;

  (dest.itinerary||[]).forEach((day,i)=>{
    const num=day.day||(i+1), title=day.title||'', acts=day.activities||[];
    const bg = i%2===0 ? C.lblue : C.lgray;
    sf(doc,C.navy); doc.rect(M,yL,LW,5,'F');
    st(doc,C.white); doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text(`DÍA ${num}`, M+3, yL+3.5);
    const bodyH=5+acts.length*4.5+3;
    sf(doc,bg); doc.rect(M,yL+5,LW,bodyH,'F');
    st(doc,C.navy); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text(title, M+3, yL+10);
    st(doc,C.dark); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    acts.forEach((a,j)=>doc.text(`• ${a}`, M+4, yL+14.5+j*4.5));
    yL+=5+bodyH+2;
  });

  // Incluye / No incluye (der)
  const incs=(dest.includes||[]).filter(Boolean);
  const nincs=(dest.notIncludes||[]).map(s=>s.replace(/^[-\s]+/,'')).filter(Boolean);
  const notes=(dest.notes||'').trim();

  st(doc,C.green); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('✅ ¿Qué incluye?', RX, yR); yR+=5;
  const incH=incs.length*5+6;
  sf(doc,C.lgreen); doc.rect(RX,yR,RW,incH,'F');
  incs.forEach((item,j)=>{
    st(doc,[21,128,61]); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('✓', RX+2, yR+4.5+j*5);
    st(doc,[22,101,52]); doc.setFontSize(7.8); doc.setFont('helvetica','normal');
    const line=doc.splitTextToSize(item, RW-10)[0];
    doc.text(line, RX+8, yR+4.5+j*5);
  });
  yR+=incH+6;

  st(doc,C.red); doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('❌ ¿Qué no incluye?', RX, yR); yR+=5;
  const ninH=nincs.length*5+6;
  sf(doc,C.lred); doc.rect(RX,yR,RW,ninH,'F');
  nincs.forEach((item,j)=>{
    st(doc,[185,28,28]); doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('✗', RX+2, yR+4.5+j*5);
    st(doc,[153,27,27]); doc.setFontSize(7.8); doc.setFont('helvetica','normal');
    doc.text(item, RX+8, yR+4.5+j*5);
  });
  yR+=ninH+6;

  if(notes){
    const nl=doc.splitTextToSize(notes,RW-8);
    const nH=nl.length*4.5+8;
    sf(doc,C.lyell); doc.rect(RX,yR,RW,nH,'F');
    st(doc,[146,64,14]); doc.setFontSize(7.8); doc.setFont('helvetica','bold');
    doc.text('ℹ️ Importante:', RX+3, yR+5);
    doc.setFont('helvetica','normal');
    nl.forEach((l,j)=>doc.text(l, RX+3, yR+9.5+j*4.5));
    yR+=nH+6;
  }

  sf(doc,C.navy); doc.rect(RX,yR,RW,14,'F');
  st(doc,C.white); doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('¿Te interesa este destino?', RX+RW/2, yR+6, {align:'center'});
  st(doc,[199,210,254]); doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('Escríbenos · Te asesoramos sin costo', RX+RW/2, yR+11, {align:'center'});
  yR+=20;

  y=Math.max(yL,yR)+6;

  // ══ 7. GALERÍA ════════════════════════════════════════════
  st(doc,C.navy); doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('📸 Galería', M, y); y+=4;
  const gallery=(dest.gallery&&dest.gallery.length>0)?dest.gallery:[];
  const gW=(CW-4)/3, gH=22;
  const galFallbacks=[[0,130,185],[0,100,160],[0,155,175]];
  for(let i=0;i<3;i++){
    const gx=M+i*(gW+2);
    addImage(doc, gallery[i]||null, gx, y, gW, gH, galFallbacks[i]);
  }
  y+=gH+8;

  // ══ 8. FOOTER ════════════════════════════════════════════
  st(doc,C.navy); doc.setFontSize(12); doc.setFont('helvetica','bold');
  doc.text('AL MUNDO', M, y+5);
  st(doc,C.gold); doc.text('TOURS', M+doc.getTextWidth('AL MUNDO '), y+5);
  st(doc,C.gray); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text('📞 +57 316 527 6338  |  🌐 almundotours.com', W-M, y+5, {align:'right'});

  return Buffer.from(doc.output('arraybuffer'));
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  let destination;
  try {
    destination = JSON.parse(event.body).destination;
    if (!destination) throw new Error('Missing destination');
  } catch(e) { return { statusCode:400, body:`Bad Request: ${e.message}` }; }

  try {
    const pdfBuffer = generatePDF(destination);
    const safeName  = (destination.name||'destino').replace(/[^a-z0-9]/gi,'-').toLowerCase();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}-itinerario.pdf"`,
        'Cache-Control': 'no-cache',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch(e) {
    console.error('PDF error:', e);
    return { statusCode:500, body:`Error: ${e.message}` };
  }
}