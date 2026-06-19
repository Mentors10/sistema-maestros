// ============================================================
// Types: Filtros del sistema
// ============================================================

export interface AppFilters {
  busqueda: string;
  preventivo: string;
  mes: string;
  tecnico: string;
  notasRevisadas: 'todos' | 'sie-validado' | 'sie-pendiente' | 'pago-pendiente' | 'pago-pagado' | 'validados-pagados';
  agruparPor: 'grupo' | 'color' | 'tecnico' | 'distrito' | 'ninguno' | 'facilitador';
  grupo: string;          // "todos" | nombre del grupo
  alerta: string;         // "todas" | tipo de alerta
  conteoMode: 'FORM' | 'ID';
}

export const DEFAULT_FILTERS: AppFilters = {
  busqueda: '',
  preventivo: '',
  mes: '',
  tecnico: '',
  notasRevisadas: 'todos',
  agruparPor: 'grupo',
  grupo: 'todos',
  alerta: 'todas',
  conteoMode: 'FORM',
};

export const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];
