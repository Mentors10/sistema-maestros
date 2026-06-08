'use client';

import { useState, useEffect } from 'react';
import { Curso, CursoFormData, Tecnico, Facilitador, CicloFormativo } from '@/types';
import { GROUP_COLORS } from '@/lib/utils/colors';
import { Save, X } from 'lucide-react';

interface CursoFormProps {
  curso: Curso | null;
  tecnicos: Tecnico[];
  facilitadores: Facilitador[];
  ciclos: CicloFormativo[];
  grupoNames: string[];
  onSave: (data: Partial<Curso>) => void;
  onCancel: () => void;
}

const getInitialFechaInicio = (c: Curso | null): string => {
  if (!c) return '';
  if (c.fecha_inicio) {
    let cleanStr = c.fecha_inicio.trim().replace(/\s+/g, 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      cleanStr += 'T08:00';
    }
    const match = cleanStr.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (match) {
      return match[1];
    }
    return cleanStr;
  }
  if (c.horarios_tentativos && c.horarios_tentativos.length > 0) {
    const first = c.horarios_tentativos.reduce((a, b) => (a.date < b.date ? a : b));
    return `${first.date}T${first.startTime || '08:00'}`;
  }
  return '';
};

const AREAS_FORMATIVAS = [
  'EDUCACION ALTERNATIVA',
  'DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS',
  'EDUCACION INICIAL EN FAMILIA COMUNITARIA',
  'PARA TODOS LOS ACTORES DEL SEP',
  'TACFI',
  'EDUCACION ESPECIAL',
  'EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA',
  'EDUCACION PRIMARIA COMUNITARIA VOCACIONAL'
];

const SEGMENTO_OPTIONS = [
  'Maestros(as), P. Admin.',
  'Egresados',
  'Estudiantes ESFM/UA',
  'Otros'
];

export default function CursoForm({
  curso,
  tecnicos,
  facilitadores,
  ciclos,
  grupoNames,
  onSave,
  onCancel,
}: CursoFormProps) {
  const isEdit = !!curso;

  const [form, setForm] = useState({
    id: curso?.id || '',
    tecnico_carnet: curso?.tecnico_carnet || '',
    ciclo_id: curso?.ciclo_id || '',
    facilitador_carnet: curso?.facilitador_carnet || '',
    distrito: curso?.distrito || '',
    lugar: curso?.lugar || '',
    area_urbano_rural: curso?.area_urbano_rural || 'Urbano',
    segmento: curso?.segmento || '',
    fecha_inicio: getInitialFechaInicio(curso),
    estado: curso?.estado || 'POR EJECUTAR',
    mostrar: curso?.mostrar || 'M',
    inscritos: curso?.inscritos_formulario || 0,
    costo: curso?.costo || 50,
    mes: curso?.mes || '',
    prev: curso?.prev || '',
    grupo_nombre: curso?.grupo_nombre || '',
    grupo_color: curso?.grupo_color || '#2f80ed',
    observaciones: curso?.observaciones || '',
  });

  const [areaFormativa, setAreaFormativa] = useState('');

  useEffect(() => {
    setForm({
      id: curso?.id || '',
      tecnico_carnet: curso?.tecnico_carnet || '',
      ciclo_id: curso?.ciclo_id || '',
      facilitador_carnet: curso?.facilitador_carnet || '',
      distrito: curso?.distrito || '',
      lugar: curso?.lugar || '',
      area_urbano_rural: curso?.area_urbano_rural || 'Urbano',
      segmento: curso?.segmento || '',
      fecha_inicio: getInitialFechaInicio(curso),
      estado: curso?.estado || 'POR EJECUTAR',
      mostrar: curso?.mostrar || 'M',
      inscritos: curso?.inscritos_formulario || 0,
      costo: curso?.costo || 50,
      mes: curso?.mes || '',
      prev: curso?.prev || '',
      grupo_nombre: curso?.grupo_nombre || '',
      grupo_color: curso?.grupo_color || '#2f80ed',
      observaciones: curso?.observaciones || '',
    });

    const currentCiclo = ciclos.find((c) => c.id === curso?.ciclo_id);
    setAreaFormativa(currentCiclo?.area_formativa || '');
  }, [curso, ciclos]);

  const [newGrupoName, setNewGrupoName] = useState('');
  const useNewGrupo = newGrupoName.trim().length > 0;

  const totalBs = form.inscritos * form.costo;

  const handleAreaFormativaChange = (newArea: string) => {
    setAreaFormativa(newArea);
    const currentCicloObj = ciclos.find((c) => c.id === form.ciclo_id);
    if (!newArea || currentCicloObj?.area_formativa !== newArea) {
      setForm((f) => ({ ...f, ciclo_id: '' }));
    }
  };

  const filteredCiclos = ciclos.filter((c) => c.area_formativa === areaFormativa);

  const handleSubmit = () => {
    if (!form.id.trim()) return;
    onSave({
      ...form,
      fecha_inicio: form.fecha_inicio ? form.fecha_inicio.replace('T', ' ') : '',
      grupo_nombre: useNewGrupo ? newGrupoName.trim() : form.grupo_nombre,
      total_bs: totalBs,
    });
  };

  return (
    <div className="curso-form" style={{ marginBottom: '20px', animation: 'slideUp 0.3s ease' }}>
      <div className="form-field">
        <label>ID del Curso *</label>
        <input
          type="text"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="Ej: 10001"
          disabled={isEdit}
        />
      </div>
      <div className="form-field">
        <label>Técnico</label>
        <select
          value={form.tecnico_carnet}
          onChange={(e) => setForm({ ...form, tecnico_carnet: e.target.value })}
        >
          <option value="">Seleccionar técnico</option>
          {tecnicos.map((t) => (
            <option key={t.carnet} value={t.carnet}>{t.nombre}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Área Formativa</label>
        <select
          value={areaFormativa}
          onChange={(e) => handleAreaFormativaChange(e.target.value)}
        >
          <option value="">Seleccionar área formativa</option>
          {AREAS_FORMATIVAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Ciclo Formativo</label>
        <select
          value={form.ciclo_id}
          onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}
          disabled={!areaFormativa}
        >
          <option value="">
            {!areaFormativa ? 'Selecciona área formativa primero' : 'Seleccionar ciclo'}
          </option>
          {filteredCiclos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Facilitador</label>
        <select
          value={form.facilitador_carnet}
          onChange={(e) => setForm({ ...form, facilitador_carnet: e.target.value })}
        >
          <option value="">Seleccionar facilitador</option>
          {facilitadores.map((f) => (
            <option key={f.carnet} value={f.carnet}>{f.nombre}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Distrito</label>
        <input
          type="text"
          value={form.distrito}
          onChange={(e) => setForm({ ...form, distrito: e.target.value })}
          placeholder="Distrito educativo"
        />
      </div>
      <div className="form-field">
        <label>Lugar</label>
        <input
          type="text"
          value={form.lugar}
          onChange={(e) => setForm({ ...form, lugar: e.target.value })}
          placeholder="U.E. o lugar de ejecución"
        />
      </div>
      <div className="form-field">
        <label>Área</label>
        <select
          value={form.area_urbano_rural}
          onChange={(e) => setForm({ ...form, area_urbano_rural: e.target.value })}
        >
          <option value="Urbano">Urbano</option>
          <option value="Rural">Rural</option>
        </select>
      </div>
      <div className="form-field">
        <label>Segmento</label>
        <select
          value={form.segmento}
          onChange={(e) => setForm({ ...form, segmento: e.target.value })}
        >
          <option value="">Selecciona segmento</option>
          {SEGMENTO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {form.segmento && !SEGMENTO_OPTIONS.includes(form.segmento) && (
            <option value={form.segmento}>{form.segmento}</option>
          )}
        </select>
      </div>
      <div className="form-field">
        <label>Fecha Inicio</label>
        <input
          type="datetime-local"
          value={form.fecha_inicio}
          onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label>Mes</label>
        <select
          value={form.mes}
          onChange={(e) => setForm({ ...form, mes: e.target.value })}
        >
          <option value="">Seleccionar mes</option>
          {['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Preventivo</label>
        <input
          type="text"
          value={form.prev}
          onChange={(e) => setForm({ ...form, prev: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label>Participantes inscritos</label>
        <input
          type="number"
          value={form.inscritos}
          disabled={true}
        />
      </div>
      <div className="form-field">
        <label>Costo por participante (Bs)</label>
        <input
          type="number"
          value={form.costo}
          onChange={(e) => setForm({ ...form, costo: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="form-field">
        <label>Total Bs: <strong>{totalBs}</strong></label>
      </div>
      <div className="form-field">
        <label>Grupo existente</label>
        <select
          value={form.grupo_nombre}
          onChange={(e) => setForm({ ...form, grupo_nombre: e.target.value })}
          disabled={useNewGrupo}
        >
          <option value="">Sin grupo</option>
          {grupoNames.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>O crear grupo nuevo</label>
        <input
          type="text"
          value={newGrupoName}
          onChange={(e) => setNewGrupoName(e.target.value)}
          placeholder="Nombre del nuevo grupo"
        />
      </div>
      <div className="form-field">
        <label>Color del grupo</label>
        <div className="color-swatches">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${form.grupo_color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setForm({ ...form, grupo_color: c })}
            />
          ))}
        </div>
      </div>
      <div className="form-field full">
        <label>Observaciones</label>
        <textarea
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          placeholder="Observaciones generales del curso..."
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-success" onClick={handleSubmit}>
          <Save size={14} /> {isEdit ? 'Actualizar curso' : 'Crear curso'}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}
