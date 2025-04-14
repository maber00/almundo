/**
 * Formatea una fecha en formato legible
 * @param {string} dateString - String con la fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }