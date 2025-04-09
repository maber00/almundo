// src/pages/api/tripadvisor-reviews.ts
import type { APIRoute } from 'astro';

export const get: APIRoute = async ({ url }) => {
  // Obtener parámetros de la query string o usar valores por defecto
  const locationId = url.searchParams.get('locationId') || '32812634';
  const lang = url.searchParams.get('lang') || 'es';
  const limit = url.searchParams.get('limit') || '5';

  // La API key se debe definir en tus variables de entorno (por ejemplo, en .env)
  const apiKey = import.meta.env.TRIPADVISOR_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Falta la API key de TripAdvisor en las variables de entorno.' }),
      { status: 500 }
    );
  }

  // Construir la URL de la API de TripAdvisor según la documentación
  const apiUrl = `https://api.tripadvisor.com/api/content/v1/location_reviews?location_id=${locationId}&lang=${lang}&limit=${limit}`;

  // Llamada a la API de TripAdvisor con la cabecera de autenticación
  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'X-TripAdvisor-API-Key': apiKey
    }
  });

  if (!response.ok) {
    // Puedes capturar el error y enviarlo al cliente
    return new Response(
      JSON.stringify({ error: 'Error al obtener datos desde TripAdvisor', details: await response.text() }),
      { status: response.status }
    );
  }

  const data = await response.json();

  // Retornamos los datos obtenidos en formato JSON
  return new Response(JSON.stringify(data), { status: 200 });
};
