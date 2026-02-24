/**
 * Formatea una fecha en formato legible
 * @param {string | Date} dateInput - Fecha en string ISO o Date
 * @returns {string} - Fecha formateada
 */
export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string'
    ? new Date(dateInput)
    : dateInput;

  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}