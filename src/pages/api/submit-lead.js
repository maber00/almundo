// Nos conectamos con Airtable para guardar los leads

export async function post({ request }) {
    try {
      // Obtener los datos del cuerpo de la solicitud
      const formData = await request.json();
      
      // Validar datos básicos requeridos
      if (!formData.full_name || !formData.email || !formData.phone || !formData.contact_method || !formData.accept_communications) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Por favor complete todos los campos obligatorios.' 
          }), 
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Formato específico para Airtable
      const airtableData = {
        // Datos Básicos
        "Nombre completo": formData.full_name,
        "Correo electrónico": formData.email,
        "Teléfono": formData.phone,
        
        // Preferencias de Viaje
        "Destino interesado": formData.destination || "",
        "Cuando planea viajar": formData.travel_time || "",
        "Presupuesto aproximado": formData.budget || "",
        "Con quién viajaría": Array.isArray(formData.travel_with) ? formData.travel_with.join(", ") : formData.travel_with || "",
        "Tipo de experiencia": Array.isArray(formData.experience) ? formData.experience.join(", ") : formData.experience || "",
        
        // Preguntas de Calificación
        "Viajes anteriores": formData.previous_travel || "",
        "Método de contacto preferido": formData.contact_method,
        "Horario de contacto": formData.contact_time || "",
        
        // Consentimiento y Promociones
        "Cómo nos conoció": formData.referral_source || "",
        "Recibir promociones": formData.receive_promotions === "yes" ? true : false,
        "Acepta comunicaciones": true, // Siempre es true ya que es obligatorio
        
        // Información Adicional
        "Información adicional": formData.additional_info || "",
        
        // Metadatos
        "Fecha de registro": new Date().toISOString(),
        "Origen del lead": "Formulario Web",
        "Estado": "Nuevo"
      };
      
      // Clave API de Airtable (deberías tener esto en variables de entorno)
      const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
      const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;
      const AIRTABLE_TABLE_NAME = 'Leads'; // Nombre de tu tabla en Airtable
      
      // Endpoint de la API de Airtable
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
      
      // Configuración de la solicitud a Airtable
      const airtableResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: airtableData
        })
      });
      
      // Verificar respuesta de Airtable
      if (!airtableResponse.ok) {
        const errorData = await airtableResponse.json();
        console.error('Error de Airtable:', errorData);
        throw new Error('Error al guardar en Airtable');
      }
      
      // Si todo va bien, devolver respuesta satisfactoria
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead registrado correctamente.' 
        }), 
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      
      // Devolver respuesta de error
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error interno del servidor.' 
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }