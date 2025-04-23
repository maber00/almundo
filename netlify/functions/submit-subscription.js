// netlify/functions/submit-subscription.js
import dotenv from 'dotenv';
import Airtable from 'airtable';

dotenv.config();

export async function handler(event) {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  // Solo aceptamos POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  }

  try {
    // 1) Parsear body JSON
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: 'El email es requerido' }),
      };
    }

    // 2) Cargar credenciales desde vars de entorno
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const table  = process.env.AIRTABLE_SUBSCRIPTIONS_TABLE_NAME; // debe ser 'tblhVXCjM4LSYvJ4B'

    if (!apiKey || !baseId || !table) {
      throw new Error('Variables de entorno no configuradas');
    }

    // 3) Insertar registro en Airtable
    const base = new Airtable({ apiKey }).base(baseId);
    const record = await base(table).create(
      {
        // Field para el email
        fldE5NsQ2cfQI9ROV: email,
        // Como el checkbox es required, siempre marcamos true
        fldcRg3vjliY9O8oR: true,
      },
      { typecast: true }
    );

    // 4) Responder éxito
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, id: record.getId() }),
    };

  } catch (err) {
    console.error('submit-subscription ERROR:', err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
}
