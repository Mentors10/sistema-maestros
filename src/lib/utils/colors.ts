// ============================================================
// Utilidades de colores para cursos y calendario
// ============================================================

// Colores principales de los cursos (fondo sólido)
export const COURSE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  '1':     { bg: '#2f80ed', text: '#ffffff', label: 'C1' },
  '2':     { bg: '#2e9f5e', text: '#ffffff', label: 'C2' },
  '3':     { bg: '#fbbc05', text: '#1b1b1b', label: 'C3' },
  '4':     { bg: '#8e44ad', text: '#ffffff', label: 'C4' },
  'soc':   { bg: '#111827', text: '#ffffff', label: 'SOC' },
  'soc1':  { bg: '#f07a00', text: '#ffffff', label: 'SOC1' },
  'soc2':  { bg: '#22a354', text: '#ffffff', label: 'SOC2' },
  'soc3':  { bg: '#8e44ad', text: '#ffffff', label: 'SOC3' },
  'soc4':  { bg: '#8e44ad', text: '#ffffff', label: 'SOC4' },
  'eval':  { bg: '#e91e63', text: '#ffffff', label: 'EVAL' },
  'eval1': { bg: '#e91e63', text: '#ffffff', label: 'EVAL1' },
  'eval2': { bg: '#c026d3', text: '#ffffff', label: 'EVAL2' },
  'eval3': { bg: '#dc2626', text: '#ffffff', label: 'EVAL3' },
  'eval4': { bg: '#7c3aed', text: '#ffffff', label: 'EVAL4' },
};

// Colores de fondo de celda del calendario (para los días con actividad)
export const CALENDAR_DAY_COLORS: Record<string, { bg: string; border: string }> = {
  '1':     { bg: '#ffb35c', border: '#f07a00' },
  '2':     { bg: '#9be7b2', border: '#22a354' },
  '3':     { bg: '#d8a8ff', border: '#8e44ad' },
  '4':     { bg: '#d8a8ff', border: '#8e44ad' },
  'soc1':  { bg: '#ffb35c', border: '#f07a00' },
  'soc2':  { bg: '#9be7b2', border: '#22a354' },
  'soc3':  { bg: '#d8a8ff', border: '#8e44ad' },
  'soc4':  { bg: '#d8a8ff', border: '#8e44ad' },
  'eval1': { bg: '#ffe1ec', border: '#f49ac0' },
  'eval2': { bg: '#f6dcff', border: '#d38ce6' },
  'eval3': { bg: '#ffe0df', border: '#f39792' },
  'eval4': { bg: '#eadfff', border: '#b6a0f0' },
};

// Colores de fondo rango suave entre curso y socialización
export const RANGE_COLORS: Record<string, { bg: string; border: string }> = {
  '1': { bg: '#ffe0b8', border: '#f2a150' },
  '2': { bg: '#d6f5df', border: '#6fce8a' },
  '3': { bg: '#efd9ff', border: '#bd8ee3' },
  '4': { bg: '#efd9ff', border: '#bd8ee3' },
};

// Paleta de colores para grupos/notas
export const GROUP_COLORS = [
  '#2f80ed', '#2e9f5e', '#fbbc05', '#8e44ad',
  '#e91e63', '#00bcd4', '#ff5722', '#607d8b',
  '#3f51b5', '#009688', '#ff9800', '#795548',
  '#1a4a73', '#d84315', '#4caf50', '#673ab7',
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
