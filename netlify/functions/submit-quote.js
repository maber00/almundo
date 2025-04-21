// netlify/functions/submit-quote.js
import dotenv from 'dotenv';
import Airtable from 'airtable';
import { URLSearchParams } from 'url';

dotenv.config();

export async function handler(event) {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('🌐 Incoming request:', {
    method: event.httpMethod,
    path: event.path,
    rawBody: event.body?.slice(0, 200)  // primeros 200 chars
  });

  if (event.httpMethod !== 'POST') {
    console.log('⛔ Method Not Allowed');
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Credenciales
  const apiKey    = process.env.AIRTABLE_API_KEY;
  const baseId    = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  console.log('🔑 ENV vars:', {
    hasApiKey:   !!apiKey,
    baseId,
    tableName
  });

  if (!apiKey || !baseId || !tableName) {
    console.error('❌ Missing ENV vars');
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ success:false, message:'Variables de entorno no configuradas' })
    };
  }

  const base  = new Airtable({ apiKey }).base(baseId);
  const table = base(tableName);

  try {
    // Parsear body
    let formData;
    try {
      formData = JSON.parse(event.body);
      console.log('🛠 Parsed JSON body');
    } catch (e) {
      formData = Object.fromEntries(new URLSearchParams(event.body));
      console.log('🛠 Parsed URLSearchParams body');
    }

    console.log('📩 formData completo:', formData);

    // Validación mínima
    if (!formData.full_name || !formData.email || !formData.phone) {
      console.warn('⚠️ Datos obligatorios faltantes:', {
        full_name: formData.full_name,
        email:     formData.email,
        phone:     formData.phone
      });
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Completa los campos obligatorios: nombre, email y teléfono.'
        })
      };
    }

    // Mapeo
    const airtableData = {
      fld6WphBS9rq3mJze: formData.full_name,
      fldhZHEJeExsJ4Jc8: formData.email,
      fldovkonKPU5vQXhD: formData.phone,
      fldCrsfmlQbLLNQWB: formData.destination || '',
      fld9GXo6EUfvDBtGy: formData.travel_date || '',
      fldK03RoicTrc3Rur: formData.budget || '',
      fldbYoqnaJXM4xncR: formData.travel_with || '',
      fldi2yf14ZvbySO5C: Number(formData.travelers) || 0,
      fldd8BLYEWLYwTUb3: formData.duration || '',
      fldK6RyD4ic1ynCzQ: formData.contact_method || '',
      fldLVG9zf4zptBEWN: formData.contact_time || '',
      fldXENVqjmpyOYlxu: formData.special_requirements || '',
      fldKU02vahAdd0sIJ: formData.receive_promotions === 'yes',
      fld6rLcIgL4c6cAKP: new Date().toISOString(),
      fldKKD1SWnPExQOCc: 'Pendiente',
    };

    console.log('➡️ airtableData a enviar:', airtableData);

    // Crear registro
    const record = await table.create(airtableData, { typecast: true });
    console.log('✅ Registro Airtable creado con ID:', record.getId());

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, id: record.getId() })
    };

  } catch (error) {
    console.error('❌ submit-quote ERROR:', error.stack || error);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        message: 'Error interno del servidor.',
        error: error.message
      })
    };
  }
}
