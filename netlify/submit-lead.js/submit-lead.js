// netlify/functions/submit-lead.js
import dotenv from 'dotenv';
import Airtable from 'airtable';
import { URLSearchParams } from 'url';

dotenv.config(); // Carga las variables de entorno desde .env en local

export async function handler(event) {
  const headers = { 'Content-Type': 'application/json' };

  // 1) Solo aceptamos POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // 2) Leer credenciales de entorno
  const apiKey    = process.env.AIRTABLE_API_KEY;
  const baseId    = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_LEADS_TABLE;

  if (!apiKey || !baseId || !tableName) {
    console.error('❌ Missing ENV vars:', { apiKey: !!apiKey, baseId, tableName });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Faltan variables de entorno de Airtable' })
    };
  }

  // 3) Configurar Airtable
  Airtable.configure({ apiKey });
  const base  = Airtable.base(baseId);
  const table = base(tableName);

  // 4) Parsear body (JSON o x-www-form-urlencoded)
  let formData;
  try {
    formData = JSON.parse(event.body);
  } catch {
    formData = Object.fromEntries(new URLSearchParams(event.body));
  }

  console.log('📩 formData:', formData);

  // 5) Validaciones mínimas
  if (!formData.full_name || !formData.email || !formData.phone) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Por favor complete los campos obligatorios: nombre, email y teléfono.'
      })
    };
  }

  // 6) Preparar arrays para campos multi-select
  const travelWith = typeof formData.travel_with === 'string'
    ? [formData.travel_with]
    : formData.travel_with || [];
  const experience = typeof formData.experience === 'string'
    ? [formData.experience]
    : formData.experience || [];

  // 7) Mapeo de campos a IDs de Airtable
  const airtableData = {
    // Datos Básicos
    fldGN0l6rGnvTcQKS: formData.full_name,
    fld0K1mktA66OCGrV: formData.email,
    fldacrfOAB08VhKxa: formData.phone,

    // Preferencias de Viaje
    fld9eJV2leiWH6OQS: formData.destination || '',
    fldO2muQiwECT44mi: formData.travel_time || '',
    fldxuuxj50XPps4dY: formData.budget || '',
    fldn6taclzJeo0mjP: travelWith,
    fld2YAxfZzOpdBonQ: experience,

    // Preguntas de Calificación
    fld9Fh7npBUhVf536: formData.previous_travel || '',
    fldYESTPyxmDCugfT: formData.contact_method || '',
    fld7a0UBCmclThXIM: formData.contact_time || '',
    fldrfsBjE0nKuTunp: formData.referral_source || '',
    fldpNEm6QGBWc7ObS: formData.additional_info || '',

    // Consentimiento y Promociones
    fld9IdaRmjDF2LwB9: formData.receive_promotions === 'yes',
    fld6lMG2LtTX0oM2i: formData.accept_communications === 'yes',

    // Metadatos
    fld8GIrfZCGB7juIq: new Date().toISOString(),
    fldEFAOt5sVG5YAu0: 'Formulario Web',
    fld9f0TtUQwvaOfpc: 'Nuevo'
  };

  console.log('➡️ airtableData:', airtableData);

  // 8) Crear el registro en Airtable
  try {
    const record = await table.create(airtableData, { typecast: true });
    console.log('✅ Lead creado con ID:', record.getId());
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: record.getId() })
    };
  } catch (error) {
    console.error('❌ Error creando lead:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Error interno del servidor.',
        error: error.message
      })
    };
  }
}
