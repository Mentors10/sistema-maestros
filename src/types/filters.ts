// ============================================================
// Types: Filtros del sistema
// ============================================================

export interface AppFilters {
  busqueda: string;
  preventivo: string;
  mes: string;
  tecnico: string;
  orden: 'recientes' | 'antiguos' | 'id-asc' | 'id-desc';
  agruparPor: 'grupo' | 'color' | 'tecnico' | 'distrito' | 'ninguno';
  grupo: string;          // "todos" | nombre del grupo
  alerta: string;         // "todas" | tipo de alerta
  conteoMode: 'FORM' | 'ID';
}

export const DEFAULT_FILTERS: AppFilters = {
  busqueda: '',
  preventivo: '',
  mes: '',
  tecnico: '',
  orden: 'recientes',
  agruparPor: 'grupo',
  grupo: 'todos',
  alerta: 'todas',
  conteoMode: 'FORM',
};

export const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];
