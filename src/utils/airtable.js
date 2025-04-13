// src/utils/airtable.js
import { getCollection } from 'astro:content';

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} image
 * @property {string[]} destinations
 * @property {string} url
 */

/**
 * @typedef {Object} Destination
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} region
 * @property {number} price
 * @property {string} currency
 * @property {boolean} priceInUsd
 * @property {number|null} originalPrice
 * @property {number} duration
 * @property {string} durationText
 * @property {string} image
 * @property {string[]} gallery
 * @property {string} description
 * @property {boolean} featured
 * @property {number} rating
 * @property {number} availability
 * @property {string[]} tag
 * @property {string[]} includes
 * @property {string[]} notIncludes
 * @property {string} notes
 */

// Configuración de Airtable
const apiKey = import.meta.env.AIRTABLE_API_KEY;
const baseId = import.meta.env.AIRTABLE_BASE_ID;

// Inicializar Airtable
Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// IDs de las tablas
const TABLES = {
  DESTINOS: 'tblTSmKhU0R0urLz3',
  CATEGORIAS: 'tbloFFx79ZZVWyv8O',
  PROMOCIONES: 'tblefGnpmqDD7oTrA',
  ALIANZAS: 'tbldBSBABDn2JiyTG'
};
// Interfaces para los datos


// IDs de los campos
const FIELDS = {
  DESTINOS: {
    ID: 'fldQRvcLqDZLYUSG0',
    NOMBRE: 'fld9gYgWCjFvIa8qn',
    TIPO: 'fldHcBuNH2yCtCtrG',
    REGION: 'fldRTQfu8LeeaoHVh',
    PRECIO: 'fldzJbQ0TPGMqt0fX',
    MONEDA: 'fldPRuNVWPv3q8wSl',
    PRECIO_ORIGINAL: 'fldJdkDVkO16gFEiO',
    DURACION: 'fldT7aW1Dl9rpiIlO',
    DURACION_TEXTO: 'fldPy6ds1HUOTI7Q9',
    IMAGEN_PRINCIPAL: 'fld0TloYnvGbTlamP',
    GALERIA: 'fldq3Px5zR2PSNrhs',
    DESCRIPCION: 'fldCtWKkQU4ADLeeCL',
    FEATURED: 'fldfByRXJ2PA7jK1g',
    RATING: 'fldcNTQtJpwAO0MVI',
    DISPONIBILIDAD: 'fldvTzb9e2NTONjwm',
    TAG: 'fldPbpMHiOfwT7YzO',
    INCLUYE: 'fldSrHdKTsmpNGMNr',
    NO_INCLUYE: 'fldxW33lxsL3pRk44',
    NOTAS: 'fldxCSfrQxucswQAl'
  },
  CATEGORIAS: {
    ID: 'fldPZ9AbFobMpKDL8',
    NOMBRE: 'fld1afVYzrqShMOCL',
    DESCRIPCION: 'fldX0fbWD8BrmPWAT',
    IMAGEN: 'fldDAVBrxZnYsblQe',
    DESTINOS_POPULARES: 'fldDOUXopyTD9iBav'
  },
  ALIANZAS: {
    NOMBRE: 'fldmqUMxRjKWqVfd8',
    NOMBRE_COMPLETO: 'fldPMltgAEc9bG6pE',
    DESCRIPCION: 'fldtonn5CqffUUNma',
    LOGO: 'fld2gjhTLRo1ESabM',
    BENEFICIOS: 'fldyhXEvRNtpdi3Lg',
    ACTIVO: 'fldSTcQtCUMu8p2sr'
  },
  PROMOCIONES: {
    TITULO: 'fld00u8DmbXHYrjNh',
    DESCRIPCION: 'fldygvqj70oEByIiT',
    DESTINO_RELACIONADO: 'fldnCVXQe8nX8bvuG',
    FECHA_INICIO: 'fldZYNlFrRal8zfRq',
    FECHA_FIN: 'fldg8dGhvp1oU1Lj6',
    DESCUENTO: 'fldyC0KNwUhLxMshD',
    IMAGEN: 'fldjq0C35PofkWyOx',
    ACTIVA: 'fldOjzz7lbk8UkI08'
  }
};

// Función para obtener todos los destinos
export async function getAllDestinations() {
    try {
      const records = await base(TABLES.DESTINOS).select({
        view: 'Grid view', // asegúrate de que aquí esté la vista con el campo de imagen visible
      }).all();
      return records.map(formatDestination);
    } catch (error) {
      console.error('Error al obtener destinos:', error);
      return [];
    }
  }
  function formatCategory(record) {
    const f = record.fields;
    const destinosPopulares = f['Destinos Populares'] || '';
  
    let destinos = [];
    if (destinosPopulares) {
      // si está en un multilinea o CSV
      destinos = destinosPopulares
        .split(/[\n,]/)  // separa por comas o saltos de línea
        .map(d => d.trim())
        .filter(d => d);
    }
  
    return {
      id: f.ID || '',
      title: f.Nombre || '',
      description: f.Descripción || '',
      image: getImageUrl(f['Imagen']), 
      destinations: destinos,
      url: `/destinos/${f.ID || ''}`,
    };
  }
  

// Función para obtener destinos destacados
export async function getFeaturedDestinations() {
  try {
    const records = await base(TABLES.DESTINOS).select({
      filterByFormula: '{Featured} = TRUE()',
      view: 'Grid view'
    }).all();
    
    return records.map(record => formatDestination(record));
  } catch (error) {
    console.error('Error al obtener destinos destacados:', error);
    return [];
  }
}

// Función para obtener destinos por tipo (nacionales, internacionales)
export async function getDestinationsByType(type) {
  try {
    const records = await base(TABLES.DESTINOS).select({
      filterByFormula: `{Tipo} = '${type}'`,
      view: 'Grid view'
    }).all();
    
    return records.map(record => formatDestination(record));
  } catch (error) {
    console.error(`Error al obtener destinos de tipo ${type}:`, error);
    return [];
  }
}

// Función para obtener un destino específico por ID
export async function getDestinationById(id) {
  try {
    const records = await base(TABLES.DESTINOS).select({
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

// Función para obtener todas las categorías
/**
 * Función para obtener todas las categorías
 * @returns {Promise<Category[]>}
 */
export async function getAllCategories() {
    try {
      const records = await base(TABLES.CATEGORIAS).select({
        view: 'Grid view',
      }).all();
  
      return records.map(formatCategory);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return [];
    }
  }
  

// Función para obtener todas las promociones activas
export async function getActivePromotions() {
  try {
    const records = await base(TABLES.PROMOCIONES).select({
      filterByFormula: '{Activa} = TRUE()',
      view: 'Grid view'
    }).all();
    
    return records.map(record => ({
      title: record.get('Título') || '',
      description: record.get('Descripción') || '',
      destinationId: record.get('Destino Relacionado') || '',
      startDate: record.get('Fecha Inicio'),
      endDate: record.get('Fecha Fin'),
      discount: record.get('Descuento') || 0,
      image: getImageUrl(record.get('Imagen')),
      isActive: record.get('Activa') || false
    }));
  } catch (error) {
    console.error('Error al obtener promociones:', error);
    return [];
  }
}

// Función para obtener todas las alianzas
export async function getAllAlliances() {
  try {
    const records = await base(TABLES.ALIANZAS).select({
      view: 'Grid view'
    }).all();
    
    return records.map(record => {
      // Procesamos los beneficios como una lista
      const beneficiosText = record.get('Beneficios') || '';
      let beneficios = [];
      
      if (beneficiosText) {
        // Verificamos si tiene separadores de línea o comas
        if (beneficiosText.includes('\n')) {
          beneficios = beneficiosText.split('\n').filter(b => b.trim());
        } else if (beneficiosText.includes(',')) {
          beneficios = beneficiosText.split(',').map(b => b.trim());
        } else {
          // Si es un solo texto largo, lo mantenemos como un único elemento
          beneficios = [beneficiosText];
        }
      }
      
      return {
        id: record.get('Nombre')?.toLowerCase().replace(/\s+/g, '-') || '',
        name: record.get('Nombre') || '',
        fullName: record.get('Nombre Completo') || '',
        description: record.get('Descripción') || '',
        logo: getImageUrl(record.get('Logo')),
        benefits: beneficios,
        active: record.get('Activo') || false
      };
    });
  } catch (error) {
    console.error('Error al obtener alianzas:', error);
    return [];
  }
}

// ID de la tabla de slides del hero
const HERO_SLIDES_TABLE = 'tblGpCQfQLcsnDnGu';

/**
 * Obtiene los slides para el Hero carrusel
 * @returns {Promise<Array>} Lista de slides
 */
export async function getHeroSlides() {
  try {
    const records = await base(HERO_SLIDES_TABLE).select({
      filterByFormula: '{Activo} = TRUE()',
      sort: [{ field: 'Orden', direction: 'asc' }]
    }).all();
    
    return records.map(record => ({
      image: getImageUrl(record.get('Imagen')),
      title: record.get('Título') || '',
      subtitle: record.get('Subtítulo') || '',
      offerText: record.get('Texto oferta') || '',
      buttonText: record.get('Texto botón') || 'Ver oferta',
      buttonUrl: record.get('URL botón') || '#',
      order: record.get('Orden') || 0
    }));
  } catch (error) {
    console.error('Error al obtener slides del hero:', error);
    return [];
  }
}

// Puedes usar los IDs de campos si prefieres, así:
export async function getHeroSlidesWithFieldIds() {
  try {
    const records = await base(HERO_SLIDES_TABLE).select({
      filterByFormula: '{fldNXHvDCvq4jNUIg} = TRUE()',
      sort: [{ field: 'fld4DM7cZIKFe0Ff5', direction: 'asc' }]
    }).all();
    
    return records.map(record => ({
      image: getImageUrl(record.get('fldYUEHrJ2EYlwpiP')),
      title: record.get('fldJFGedk97bA1q8N') || '',
      subtitle: record.get('fldTQQGIDt9vbd1Kn') || '',
      offerText: record.get('fldqWPAxCUMHyjqwP') || '',
      buttonText: record.get('fldf0bILzIIfBcp86') || 'Ver oferta',
      buttonUrl: record.get('fldSgYCBMCL5L0y8k') || '#',
      order: record.get('fld4DM7cZIKFe0Ff5') || 0
    }));
  } catch (error) {
    console.error('Error al obtener slides del hero:', error);
    return [];
  }
}

// Función auxiliar para transformar un registro de destino al formato deseado
function formatDestination(record) {
    const f = record.fields;
    // Determinar si la moneda es USD
    const currency = f.Moneda?.trim() || 'COP';
    const priceInUsd = currency === 'USD';
  
    return {
      id: f.ID || '',
      name: f.Nombre || '',
      type: f.Tipo || '',
      region: f.Región || '',
      price: f.Precio || 0,
      currency,
      originalPrice: f['Precio Original'] || null,
      duration: f.Duración || 0,
      durationText: f['Duración Texto']?.trim() || '',
      image: getImageUrl(f["Imagen Principal"]),
      gallery: [],
      description: f.Descripción || '',
      featured: f.Featured || false,
      rating: f.Rating || 0,
      availability: f.Disponibilidad || 0,
      tag: [],
      includes: [],
      notIncludes: [],
      notes: '',
      // Aquí asignas el valor calculado:
      priceInUsd,
    };
  }
  
  
  

// Función auxiliar para obtener la URL de una imagen
// Función auxiliar mejorada para obtener la URL de una imagen desde Airtable
function getImageUrl(attachmentField) {
    if (!attachmentField) {
      return '/images/placeholder.jpg';
    }
    if (typeof attachmentField === 'string') {
      return attachmentField;
    }
    if (Array.isArray(attachmentField) && attachmentField.length > 0) {
      if (attachmentField[0].url) {
        return attachmentField[0].url;
      }
      if (attachmentField[0].thumbnails?.full?.url) {
        return attachmentField[0].thumbnails.full.url;
      }
    }
    return '/images/placeholder.jpg';
  }
  
  
// Función para filtrar destinos según criterios
export async function getFilteredDestinations(filters = {}) {
  try {
    // Construir una fórmula de filtro basada en los criterios proporcionados
    let formula = '';
    
    if (filters.destination_type) {
      formula = `{Tipo} = '${filters.destination_type}'`;
    }
    
    // Nota: Para filtros más complejos necesitarías construir fórmulas AND/OR más elaboradas
    
    const records = await base(TABLES.DESTINOS).select({
      filterByFormula: formula || 'TRUE()',
      view: 'Grid view'
    }).all();
    
    let results = records.map(record => formatDestination(record));
    
    // Aplicar filtros adicionales en JavaScript si es necesario
    // (para filtros complejos que no se pueden hacer fácilmente con las fórmulas de Airtable)
    
    // Filtrar por presupuesto
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
        results = results.filter(dest => 
          dest.price >= range.min && dest.price <= range.max
        );
      }
    }
    
    // Filtrar por duración
    if (filters.duration) {
      const durationRanges = {
        'duration-1': { min: 3, max: 5 },
        'duration-2': { min: 6, max: 8 },
        'duration-3': { min: 9, max: 12 },
        'duration-4': { min: 13, max: 15 },
        'duration-5': { min: 16, max: Infinity }
      };
      
      const range = durationRanges[filters.duration];
      if (range) {
        results = results.filter(dest => 
          dest.duration >= range.min && dest.duration <= range.max
        );
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error al filtrar destinos:', error);
    return [];
  }
}