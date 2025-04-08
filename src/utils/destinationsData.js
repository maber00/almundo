// src/utils/destinationsData.js
import Airtable from 'airtable';

// Configuración de Airtable
const apiKey = import.meta.env.AIRTABLE_API_KEY;
const baseId = import.meta.env.AIRTABLE_BASE_ID;

// Inicializar Airtable
Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// ID de la tabla de destinos
const DESTINOS_TABLE = 'tblTSmKhU0R0urLz3';

/**
 * Formato de destino para mantener compatibilidad
 * @param {Object} record - Registro de Airtable
 * @returns {Object} - Objeto de destino formateado
 */
function formatDestination(record) {
  const fields = record.fields;
  
  // Procesamos el campo Tag que puede ser un array o un único valor
  let tags = [];
  if (fields.Tag) {
    if (Array.isArray(fields.Tag)) {
      tags = fields.Tag;
    } else {
      tags = [fields.Tag];
    }
  }
  
  // Obtener moneda y determinar si es USD
  const currency = fields.Moneda?.trim() || 'COP';
  const priceInUsd = currency === 'USD';
  
  return {
    id: fields.ID || '',
    name: fields.Nombre || '',
    type: fields.Tipo?.toLowerCase() || '',
    region: fields.Región || '',
    price: fields.Precio || 0,
    priceInUsd,
    originalPrice: fields['Precio Original'] || null,
    duration: fields.Duración || 0,
    durationText: fields['Duración Texto']?.trim() || '',
    image: fields['Imagen Principal']?.[0]?.url || '',
    gallery: Array.isArray(fields.Galería) ? 
      fields.Galería.map(img => img.url) : [],
    description: fields.Descripción || '',
    featured: fields.Featured || false,
    rating: fields.Rating || 0,
    availability: fields.Disponibilidad || 0,
    tag: tags.length > 0 ? tags[0] : '',
    includes: fields.Incluye ? 
      fields.Incluye.split('\n').filter(line => line.trim()) : [],
    notIncludes: fields['No Incluye'] ? 
      fields['No Incluye'].split('\n').filter(line => line.trim()) : [],
    notes: fields.Notas || ''
  };
}

/**
 * Obtiene todos los destinos disponibles
 */
export async function getAllDestinations() {
  try {
    const records = await base(DESTINOS_TABLE).select({
      view: 'Grid view'
    }).all();
    
    return records.map(record => formatDestination(record));
  } catch (error) {
    console.error('Error al obtener destinos:', error);
    return [];
  }
}

/**
 * Obtiene un destino específico por su ID
 */
export async function getDestinationById(id) {
  try {
    const records = await base(DESTINOS_TABLE).select({
      filterByFormula: `{ID} = '${id}'`,
      maxRecords: 1
    }).all();
    
    if (records.length === 0) return null;
    
    return formatDestination(records[0]);
  } catch (error) {
    console.error(`Error al obtener destino con ID ${id}:`, error);
    return null;
  }
}

/**
 * Obtiene los destinos destacados
 */
export async function getFeaturedDestinations() {
  try {
    const records = await base(DESTINOS_TABLE).select({
      filterByFormula: '{Featured} = TRUE()',
      view: 'Grid view'
    }).all();
    
    return records.map(record => formatDestination(record));
  } catch (error) {
    console.error('Error al obtener destinos destacados:', error);
    return [];
  }
}

/**
 * Filtra destinos según criterios específicos
 * @param {Object} filters - Criterios de filtrado
 */
export async function getFilteredDestinations(filters = {}) {
  try {
    // Preparamos la fórmula de filtro para Airtable
    let formula = '';
    
    if (filters.destination_type) {
      formula = `{Tipo} = '${filters.destination_type.charAt(0).toUpperCase() + filters.destination_type.slice(1)}'`;
    }
    
    // Obtenemos todos los destinos (o filtrados por tipo)
    const records = await base(DESTINOS_TABLE).select({
      filterByFormula: formula || 'TRUE()',
      view: 'Grid view'
    }).all();
    
    let filteredDestinations = records.map(record => formatDestination(record));
    
    // Filtrar por rango de presupuesto
    if (filters.budget) {
      // Mapear identificadores de presupuesto a rangos numéricos
      const budgetRanges = {
        'budget-1': { min: 0, max: 1000000 },
        'budget-2': { min: 1000000, max: 3000000 },
        'budget-3': { min: 3000000, max: 5000000 },
        'budget-4': { min: 5000000, max: 10000000 },
        'budget-5': { min: 10000000, max: Infinity }
      };
      
      const range = budgetRanges[filters.budget];
      if (range) {
        filteredDestinations = filteredDestinations.filter(dest => 
          dest.price >= range.min && dest.price <= range.max
        );
      }
    }
    
    // Filtrar por duración del viaje
    if (filters.duration) {
      // Mapear identificadores de duración a rangos de días
      const durationRanges = {
        'duration-1': { min: 3, max: 5 },
        'duration-2': { min: 6, max: 8 },
        'duration-3': { min: 9, max: 12 },
        'duration-4': { min: 13, max: 15 },
        'duration-5': { min: 16, max: Infinity }
      };
      
      const range = durationRanges[filters.duration];
      if (range) {
        filteredDestinations = filteredDestinations.filter(dest => 
          dest.duration >= range.min && dest.duration <= range.max
        );
      }
    }
    
    return filteredDestinations;
  } catch (error) {
    console.error('Error al filtrar destinos:', error);
    return [];
  }
}