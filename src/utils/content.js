// src/utils/content.js
import { getCollection, getEntry } from 'astro:content';

/**
 * Obtener todos los destinos
 * @returns {Promise<Array>} Lista de destinos
 */
export async function getAllDestinations() {
  try {
    const destinations = await getCollection('destinations');
    return destinations.map(entry => ({
      ...entry.data,
      // Asegurarnos que hay un slug disponible para las URL
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
 * Obtener un destino específico por ID
 * @param {string} id - ID del destino
 * @returns {Promise<Object|null>} Destino o null si no se encuentra
 */
export async function getDestinationById(id) {
  try {
    const destinations = await getCollection('destinations');
    const destination = destinations.find(entry => entry.data.id === id);
    
    if (!destination) return null;
    
    return {
      ...destination.data,
      slug: destination.slug
    };
  } catch (error) {
    console.error(`Error al obtener destino con ID ${id}:`, error);
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