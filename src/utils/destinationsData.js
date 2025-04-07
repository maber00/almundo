// Importar datos de destinos
import destinationsData from '../data/destinations.json';

/**
 * Obtiene todos los destinos disponibles
 */
export function getAllDestinations() {
  return destinationsData.destinations;
}

/**
 * Obtiene un destino específico por su ID
 */
export function getDestinationById(id) {
  return destinationsData.destinations.find(destination => destination.id === id);
}

/**
 * Obtiene los destinos destacados
 */
export function getFeaturedDestinations() {
  return destinationsData.destinations.filter(destination => destination.featured);
}

/**
 * Filtra destinos según criterios específicos
 * @param {Object} filters - Criterios de filtrado
 */
export function getFilteredDestinations(filters = {}) {
  let filteredDestinations = [...destinationsData.destinations];
  
  // Filtrar por tipo de destino (nacional, internacional, etc.)
  if (filters.destination_type) {
    filteredDestinations = filteredDestinations.filter(dest => 
      dest.type === filters.destination_type
    );
  }
  
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
  
  // Filtrar por fecha (esto sería más complejo y requeriría datos adicionales)
  // Por ahora, simplemente lo dejamos comentado como ejemplo
  /*
  if (filters.travel_date) {
    const selectedDate = new Date(filters.travel_date);
    // Implementar lógica para filtrar por fecha aquí...
  }
  */
  
  return filteredDestinations;
}