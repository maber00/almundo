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
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Cotizaciones';

  console.log('🔑 ENV vars:', {
    hasApiKey:   !!apiKey,
    baseId,
    tableName
  });

  if (!apiKey || !baseId) {
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

    // Mapeo de campos básicos (usando IDs de campos de Airtable)
    const airtableData = {
      // Datos Básicos
      "fld6WphBS9rq3mJze": formData.full_name,                 // Nombre completo
      "fldhZHEJeExsJ4Jc8": formData.email,                     // Correo electrónico
      "fldovkonKPU5vQXhD": formData.phone,                     // Teléfono
      "fldCrsfmlQbLLNQWB": formData.destination || '',         // Destino
      "fld9GXo6EUfvDBtGy": formData.travel_date || '',         // Fecha de viaje
      "fldK03RoicTrc3Rur": formData.budget || '',              // Presupuesto 
      "fldbYoqnaJXM4xncR": formData.travel_with || '',         // Con quién viaja
      "fldi2yf14ZvbySO5C": Number(formData.travelers) || 0,    // Número de viajeros
      "fldd8BLYEWLYwTUb3": formData.duration || '',            // Duración en días
      "fldK6RyD4ic1ynCzQ": formData.contact_method || '',      // Método de contacto
      "fldLVG9zf4zptBEWN": formData.contact_time || '',        // Horario de contacto
      "fldXENVqjmpyOYlxu": formData.special_requirements || '', // Requerimientos especiales
      "fldKU02vahAdd0sIJ": formData.receive_promotions === 'yes', // Recibir promociones
      "fld6rLcIgL4c6cAKP": new Date().toISOString(),           // Fecha de registro
      "fldKKD1SWnPExQOCc": 'Pendiente',                        // Estado
    };

    // Agregar campos específicos según con quién viaja
    if (formData.travel_with === 'solo') {
      // Si viaja solo
      airtableData["fldSG4GDMTf5BFkSB"] = Number(formData.traveler_age) || 0; // Edad del viajero
    }
    else if (formData.travel_with === 'pareja') {
      // Si viaja en pareja
      airtableData["fldc30lNK4CLm8hB5"] = formData.couple_ages || ''; // Edades de la pareja
    }
    else if (formData.travel_with === 'familia') {
      // Si viaja con familia
      airtableData["fldLs9IBmy8HQDPsx"] = Number(formData.adults_count) || 0; // Número de adultos
      airtableData["fldK3eI62Xp5JTXxG"] = Number(formData.children_count) || 0; // Número de niños
      airtableData["fldR3Jt7Ezv1gHLVK"] = formData.adults_ages || ''; // Edades de adultos
      airtableData["fldxR7Ajy7dDX8eGq"] = formData.children_ages || ''; // Edades de niños
      airtableData["fldY9j817wfhiDArE"] = formData.has_children === 'si' ? 'Sí, adultos y niños' : 'No, solo adultos'; // ¿Viajan niños?
    }
    else if (formData.travel_with === 'amigos') {
      // Si viaja con amigos
      airtableData["fldLs9IBmy8HQDPsx"] = Number(formData.friends_count) || 0; // Número de adultos (amigos)
      airtableData["fldrBchGbAtdmxDQj"] = formData.friends_ages || ''; // Edades de amigos
    }
    else if (formData.travel_with === 'grupo-empresarial') {
      // Si es un grupo empresarial
      airtableData["fldn4hvrjh8JbKaqh"] = formData.company_name || ''; // Nombre de la empresa
      airtableData["fldUU18Xaz5RhGbHw"] = formData.business_trip_type || ''; // Tipo de viaje empresarial
    }

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