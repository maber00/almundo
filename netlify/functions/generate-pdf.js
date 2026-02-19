import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const C = {
  navy:[12,0,95], gold:[232,168,32],
  red:[220,38,38], green:[22,163,74],
  cyan:[8,145,178], purple:[124,58,237],
  pink:[219,39,119], gray:[107,114,128],
  dark:[31,41,55], white:[255,255,255],
  lgreen:[240,253,244], lred:[254,242,242],
  lyell:[255,251,235], lblue:[240,244,255],
  lgray:[249,250,251], border:[229,231,235],
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 34;
const CW = PAGE_W - M * 2;
const FOOTER_SPACE = 70;

function fmtPrice(price, usd=false){
  try{
    const n = typeof price==='string'
      ? parseInt(price.replace(/[.,]/g,''))
      : Math.round(price);
    return usd ? `USD $${n.toLocaleString('en-US')}`
               : `$${n.toLocaleString('es-CO')} COP`;
  }catch{ return String(price); }
}

function resolveImage(p){
  if(!p) return null;
  const bases = [
    path.join(process.cwd(),'public'),
    process.cwd()
  ];
  for(const b of bases){
    const full = path.join(b,p);
    if(fs.existsSync(full)) return full;
  }
  return null;
}

function safeImage(doc,file,x,y,opts={}){
  try{
    if(file) doc.image(file,x,y,opts);
  }catch(e){
    console.error('IMAGE ERROR:',e?.message);
  }
}

function drawFooter(doc,logoPath){
  const footerY = PAGE_H - 42;

  doc.moveTo(M, footerY - 12)
     .lineTo(M + CW, footerY - 12)
     .strokeColor(C.border)
     .lineWidth(0.5)
     .stroke();

  if(logoPath){
    safeImage(doc,logoPath,M,footerY-8,{height:18});
  }

  doc.font('Helvetica')
     .fontSize(8.5)
     .fillColor(C.gray)
     .text('+57 316 527 6338  |  almundotours.com',
           M, footerY-2,
           { width: CW, align:'right' });
}

function ensureSpace(doc,y,needed){
  if(y + needed > PAGE_H - FOOTER_SPACE){
    doc.addPage({ size:'A4', margin:0 });
    return M;
  }
  return y;
}

function generatePDF(dest){
  return new Promise((resolve,reject)=>{
    const doc = new PDFDocument({ size:'A4', margin:0 });
    const chunks=[];
    doc.on('data',c=>chunks.push(c));
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    doc.on('error',reject);

    let y = M;
    const logoPath = resolveImage('assets/images/Logo3.png');

    // HEADER
    if(logoPath){
      safeImage(doc,logoPath,M,y-2,{height:22});
    }

    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(C.gray)
       .text('almundotours.com  |  +57 316 527 6338',
             M,y+6,{width:CW,align:'right'});

    y+=30;

    // HERO
    y = ensureSpace(doc,y,140);

    const heroH=110;
    const heroFile=resolveImage(dest.image);

    if(heroFile){
      doc.save();
      doc.rect(M,y,CW,heroH).clip();
      safeImage(doc,heroFile,M,y,{width:CW,height:heroH});
      doc.restore();
    }else{
      doc.rect(M,y,CW,heroH).fill(C.navy);
    }

    y+=heroH+14;

    // TITLE
    doc.font('Helvetica-Bold')
       .fontSize(22)
       .fillColor(C.navy)
       .text(dest.name||'',M,y);

    y+=30;

    // DESCRIPTION
    const desc=dest.description||'';
    doc.font('Helvetica')
       .fontSize(9.5)
       .fillColor(C.gray)
       .text(desc,M,y,{width:CW,lineGap:2});

    y+=doc.heightOfString(desc,{width:CW})+12;

    // META
    const meta=[];
    if(dest.region) meta.push(dest.region);
    if(dest.durationText) meta.push(dest.durationText.trim());
    if(dest.availability) meta.push(`${dest.availability} cupos`);
    if(dest.rating) meta.push(`${dest.rating}% satisfacción`);

    let mx=M;
    meta.forEach((item,i)=>{
      const w=doc.font('Helvetica-Bold')
                 .fontSize(8.5)
                 .widthOfString(item);

      doc.font('Helvetica-Bold')
         .fontSize(8.5)
         .fillColor(C.dark)
         .text(item,mx,y,{lineBreak:false});

      mx+=w;

      if(i<meta.length-1){
        const sep='  |  ';
        doc.font('Helvetica')
           .fillColor([209,213,219])
           .text(sep,mx,y,{lineBreak:false});
        mx+=doc.widthOfString(sep);
      }
    });

    y+=24;

    // PRICE
    y=ensureSpace(doc,y,60);

    const priceNum = typeof dest.price==='string'
      ? parseInt(dest.price.replace(/[.,]/g,''))
      : Math.round(dest.price||0);

    doc.font('Helvetica')
       .fontSize(7.5)
       .fillColor(C.gray)
       .text('Precio por persona',M,y);

    y+=12;

    doc.font('Helvetica-Bold')
       .fontSize(18)
       .fillColor(C.navy)
       .text(fmtPrice(priceNum,false),M,y);

    y+=30;

    // (puedes seguir agregando itinerario aquí si quieres)

    // FOOTER
    drawFooter(doc,logoPath);

    doc.end();
  });
}

// NETLIFY HANDLER
export async function handler(event){
  if(event.httpMethod!=='POST'){
    return { statusCode:405, body:'Method Not Allowed' };
  }

  try{
    const body=JSON.parse(event.body||'{}');
    const destination=body.destination;

    if(!destination?.name)
      throw new Error('Missing destination');

    const pdf=await generatePDF(destination);

    const safeName=(destination.name||'destino')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]/gi,'-')
      .toLowerCase();

    return{
      statusCode:200,
      headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':`attachment; filename="${safeName}-itinerario.pdf"`,
      },
      body:pdf.toString('base64'),
      isBase64Encoded:true,
    };

  }catch(e){
    console.error('generate-pdf ERROR:',e);
    return{
      statusCode:500,
      body:JSON.stringify({error:e.message}),
      headers:{'Content-Type':'application/json'},
    };
  }
}
