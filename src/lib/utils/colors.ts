// ============================================================
// Utilidades de colores para cursos y calendario
// ============================================================

// Colores principales de los cursos (fondo sólido)
export const COURSE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  '1':     { bg: '#1D4ED8', text: '#ffffff', label: 'C1' },
  '2':     { bg: '#047857', text: '#ffffff', label: 'C2' },
  '3':     { bg: '#B45309', text: '#ffffff', label: 'C3' },
  '4':     { bg: '#6D28D9', text: '#ffffff', label: 'C4' },
  'soc':   { bg: '#0F172A', text: '#ffffff', label: 'SOC' },
  'soc1':  { bg: '#C2410C', text: '#ffffff', label: 'SOC1' },
  'soc2':  { bg: '#15803D', text: '#ffffff', label: 'SOC2' },
  'soc3':  { bg: '#6D28D9', text: '#ffffff', label: 'SOC3' },
  'soc4':  { bg: '#6D28D9', text: '#ffffff', label: 'SOC4' },
  'eval':  { bg: '#B91C1C', text: '#ffffff', label: 'EVAL' },
  'eval1': { bg: '#B91C1C', text: '#ffffff', label: 'EVAL1' },
  'eval2': { bg: '#7E22CE', text: '#ffffff', label: 'EVAL2' },
  'eval3': { bg: '#BE123C', text: '#ffffff', label: 'EVAL3' },
  'eval4': { bg: '#5B21B6', text: '#ffffff', label: 'EVAL4' },
};

// Colores de fondo de celda del calendario — FUERTES para que resalten
export const CALENDAR_DAY_COLORS: Record<string, { bg: string; border: string }> = {
  '1':     { bg: '#93C5FD', border: '#1D4ED8' },
  '2':     { bg: '#6EE7B7', border: '#047857' },
  '3':     { bg: '#FCD34D', border: '#B45309' },
  '4':     { bg: '#C4B5FD', border: '#6D28D9' },
  'soc':   { bg: '#cbd5e1', border: '#0F172A' },
  'soc1':  { bg: '#FB923C', border: '#C2410C' },
  'soc2':  { bg: '#4ADE80', border: '#15803D' },
  'soc3':  { bg: '#C4B5FD', border: '#6D28D9' },
  'soc4':  { bg: '#C4B5FD', border: '#6D28D9' },
  'eval':  { bg: '#FCA5A5', border: '#B91C1C' },
  'eval1': { bg: '#FCA5A5', border: '#B91C1C' },
  'eval2': { bg: '#D8B4FE', border: '#7E22CE' },
  'eval3': { bg: '#FDA4AF', border: '#BE123C' },
  'eval4': { bg: '#C4B5FD', border: '#5B21B6' },
};

// Colores de fondo rango suave entre curso y socialización
export const RANGE_COLORS: Record<string, { bg: string; border: string }> = {
  '1': { bg: '#BFDBFE', border: '#3B82F6' },
  '2': { bg: '#A7F3D0', border: '#10B981' },
  '3': { bg: '#FDE68A', border: '#F59E0B' },
  '4': { bg: '#DDD6FE', border: '#8B5CF6' },
};

// Paleta de colores para grupos/notas
export const GROUP_COLORS = [
  '#1D4ED8', '#047857', '#B45309', '#6D28D9',
  '#B91C1C', '#0891B2', '#C2410C', '#334155',
  '#4338CA', '#0D9488', '#F59E0B', '#78350F',
  '#1E40AF', '#991B1B', '#166534', '#5B21B6',
];

export function getCourseKey(course: number | string): string {
  return String(course);
}

export function getCourseLabel(course: number | string): string {
  const key = getCourseKey(course);
  return COURSE_COLORS[key]?.label || key.toUpperCase();
}

export function getCourseColor(course: number | string): string {
  const key = getCourseKey(course);
  return COURSE_COLORS[key]?.bg || '#6b7280';
}
