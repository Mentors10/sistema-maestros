// ============================================================
// Types: Catálogos (técnicos, facilitadores, ciclos)
// ============================================================

export interface Tecnico {
  carnet: string;
  nombre: string;
}

export interface Facilitador {
  carnet: string;
  nombre: string;
}

export interface CicloFormativo {
  id: string;
  grupo: string;
  nombre: string;
  area_formativa: string;
  tema1: string;
  tema2: string;
  tema3: string;
  tema4: string;
}

export interface SieUe {
  codigo_sie: string;
  unidad_educativa: string;
}
