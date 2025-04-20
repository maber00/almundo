// src/utils/content.js
import { getCollection, getEntry } from 'astro:content';

/**
 * Verifica si un destino tiene una etiqueta específica
 * @param {Object} destination - Objeto de destino o datos de destino
 * @param {string} tagName - Nombre de la etiqueta a buscar
 * @returns {boolean} - true si el destino tiene la etiqueta, false en caso contrario
 */
export function hasTag(destination, tagName) {
  if (!destination) return false;
  
  // Si recibimos un objeto de entrada de Astro, accedemos a sus datos
  const data = destination.data || destination;
  
  // Verificar en la etiqueta principal (case insensitive)
  if (data.tag && data.tag.toLowerCase() === tagName.toLowerCase()) {
    return true;
  }
  
  // Verificar en el array de tags adicionales (si existe)
  if (Array.isArray(data.tags) && data.tags.some(tag => tag.toLowerCase() === tagName.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Obtener todos los destinos
 * @returns {Promise<Array>} Lista de destinos
 */
export async function getAllDestinations() {
  try {
    const destinations = await getCollection('destinations');
    return destinations.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al obtener destinos:', error);
    return [];
  }
}

/**
 * Obtener destinos destacados
 * @returns {Promise<Array>} Lista de destinos destacados
 */
export async function getFeaturedDestinations() {
  try {
    const destinations = await getCollection('destinations');
    const featured = destinations.filter(entry => entry.data.featured);
    return featured.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al obtener destinos destacados:', error);
    return [];
  }
}

/**
 * Obtener destinos por tipo
 * @param {string} type - Tipo de destino (nacional, internacional)
 * @returns {Promise<Array>} Lista de destinos filtrados por tipo
 */
export async function getDestinationsByType(type) {
  try {
    const destinations = await getCollection('destinations');
    const filtered = destinations.filter(entry => entry.data.type === type);
    return filtered.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error(`Error al obtener destinos de tipo ${type}:`, error);
    return [];
  }
}

/**
 * Obtener destinos por tag
 * @param {string} tagName - Nombre del tag a buscar
 * @returns {Promise<Array>} Lista de destinos que tienen ese tag
 */
export async function getDestinationsByTag(tagName) {
  try {
    const destinations = await getCollection('destinations');
    const filtered = destinations.filter(entry => hasTag(entry, tagName));
    return filtered.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error(`Error al obtener destinos con tag ${tagName}:`, error);
    return [];
  }
}

/**
 * Obtener destinos en oferta
 * @returns {Promise<Array>} Lista de destinos en oferta
 */
export async function getOfferDestinations() {
  try {
    const destinations = await getCollection('destinations');
    
    // Función para verificar si un destino está en oferta por precio
    const isOfferByPrice = (dest) => {
      const originalPrice = dest.data.originalPrice 
        ? (typeof dest.data.originalPrice === 'string' 
            ? Number(String(dest.data.originalPrice).replace(/\./g, '')) || 0
            : dest.data.originalPrice) 
        : 0;
      
      return originalPrice > 0 && originalPrice > dest.data.price;
    };
    
    // Obtener destinos con precio de oferta
    const priceOfferDestinations = destinations.filter(dest => isOfferByPrice(dest));
    
    // Obtener destinos con tag "Oferta"
    const tagOfferDestinations = destinations.filter(dest => hasTag(dest, 'Oferta'));
    
    // Combinar ambos conjuntos y eliminar duplicados por id
    const combinedDestinations = [...priceOfferDestinations, ...tagOfferDestinations];
    const offerDestinations = combinedDestinations.filter((dest, index, self) => 
      index === self.findIndex((d) => d.data.id === dest.data.id)
    );
    
    return offerDestinations.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al obtener destinos en oferta:', error);
    return [];
  }
}

/**
 * Obtener un destino específico por ID o slug
 * @param {string} idOrSlug - ID o slug del destino
 * @returns {Promise<Object|null>} Destino o null si no se encuentra
 */
export async function getDestinationById(idOrSlug) {
  try {
    const destinations = await getCollection('destinations');
    const destination = destinations.find(entry => 
      entry.data.id === idOrSlug || entry.slug === idOrSlug
    );
    
    if (!destination) return null;
    
    return {
      ...destination.data,
      slug: destination.slug
    };
  } catch (error) {
    console.error(`Error al obtener destino con ID/slug ${idOrSlug}:`, error);
    return null;
  }
}

/**
 * Obtener todas las categorías
 * @returns {Promise<Array>} Lista de categorías
 */
export async function getAllCategories() {
  try {
    const categories = await getCollection('categories');
    return categories.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

/**
 * Obtener todas las alianzas
 * @returns {Promise<Array>} Lista de alianzas
 */
export async function getAllAlliances() {
  try {
    const alliances = await getCollection('alliances');
    return alliances.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al obtener alianzas:', error);
    return [];
  }
}

/**
 * Obtener todas las diapositivas del hero
 * @returns {Promise<Array>} Lista de diapositivas del hero
 */
export async function getHeroSlides() {
  try {
    const slides = await getCollection('hero-slides');
    // Ordenar por la propiedad 'order'
    const sortedSlides = slides.sort((a, b) => 
      (a.data.order || 0) - (b.data.order || 0)
    );
    // Filtrar solo las diapositivas activas
    const activeSlides = sortedSlides.filter(slide => slide.data.active !== false);
    
    return activeSlides.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al obtener diapositivas del hero:', error);
    return [];
  }
}

/**
 * Filtrar destinos según criterios específicos
 * @param {Object} filters - Criterios de filtrado
 * @returns {Promise<Array>} Lista de destinos filtrados
 */
export async function getFilteredDestinations(filters = {}) {
  try {
    const destinations = await getCollection('destinations');
    
    // Aplicar filtros
    let results = destinations;
    
    // Filtrar por tipo de destino
    if (filters.destination_type) {
      results = results.filter(entry => 
        entry.data.type === filters.destination_type
      );
    }
    
    // Filtrar por presupuesto
    if (filters.budget) {
      const budgetRanges = {
        'budget-1': { min: 0, max: 1000000 },
        'budget-2': { min: 1000000, max: 3000000 },
        'budget-3': { min: 3000000, max: 5000000 },
        'budget-4': { min: 5000000, max: 10000000 },
        'budget-5': { min: 10000000, max: Infinity }
      };
      
      const range = budgetRanges[filters.budget];
      if (range) {
        results = results.filter(entry => 
          entry.data.price >= range.min && entry.data.price <= range.max
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
        results = results.filter(entry => 
          entry.data.duration >= range.min && entry.data.duration <= range.max
        );
      }
    }
    
    // Filtrar por tag
    if (filters.tag) {
      results = results.filter(entry => 
        hasTag(entry, filters.tag)
      );
    }
    
    // Filtrar por fecha (si se implementa en el futuro)
    if (filters.travel_date) {
      // Lógica para filtrar por fecha
    }
    
    // Convertir a formato compatible con el código existente
    return results.map(entry => ({
      ...entry.data,
      slug: entry.slug
    }));
  } catch (error) {
    console.error('Error al filtrar destinos:', error);
    return [];
  }
}