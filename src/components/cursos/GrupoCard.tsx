'use client';

import { useState } from 'react';
import { Grupo, Curso, Tecnico, Facilitador, CicloFormativo } from '@/types';
import { LayoutGrid, ChevronRight, Edit3, Hash, ArrowUp, ArrowDown, FileText, FileCheck } from 'lucide-react';
import NotaCard from './NotaCard';
import Swal from 'sweetalert2';

interface GrupoCardProps {
  grupo: Grupo;
  activeGroup: string;
  tecnicos: Tecnico[];
  facilitadores: Facilitador[];
  ciclos: CicloFormativo[];
  grupoNames: string[];
  onEditCurso: (curso: Curso) => void;
  onDeleteCurso: (id: string) => void;
  onUpdateCurso: (id: string, data: Partial<Curso>) => void;
  onRenameGrupo: (oldName: string, newName: string) => void;
  onMoveGrupo?: (nombre: string, direction: 'up' | 'down') => void;
  isFirst?: boolean;
  isLast?: boolean;
  onManageParticipantes: (curso: Curso) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function GrupoCard({
  grupo,
  activeGroup,
  tecnicos,
  facilitadores,
  ciclos,
  grupoNames,
  onEditCurso,
  onDeleteCurso,
  onUpdateCurso,
  onRenameGrupo,
  onMoveGrupo,
  isFirst = false,
  isLast = false,
  onManageParticipantes,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}: GrupoCardProps) {
  const [localCollapsed, setLocalCollapsed] = useState(true); // default to collapsed

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : localCollapsed;
  const toggleCollapsed = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  const isActive = activeGroup === grupo.nombre;
  const isDimmed = activeGroup !== 'todos' && !isActive;

  const handleRename = async () => {
    const { value } = await Swal.fire({
      title: 'Renombrar grupo',
      input: 'text',
      inputValue: grupo.nombre,
      inputPlaceholder: 'Nuevo nombre del grupo',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Renombrar',
      confirmButtonColor: '#2f80ed',
      inputValidator: (v) => (!v ? 'Ingresa un nombre' : null),
    });
    if (value && value !== grupo.nombre) {
      onRenameGrupo(grupo.nombre, value);
    }
  };

  // Compliance counts for the group header
  const total = grupo.cursos.length;
  const planiCount = grupo.cursos.filter(c => c.planificacion_recibida).length;
  const reportCount = grupo.cursos.filter(c => c.informe_final_recibido).length;
  const uniqueTecnicos = Array.from(new Set(
    grupo.cursos
      .map(c => c.tecnico_nombre)
      .filter(Boolean)
  )) as string[];

  return (
    <div
      className={`grupo-card ${collapsed ? 'collapsed' : ''} ${isDimmed ? 'dimmed' : ''} ${isActive ? 'active-group' : ''}`}
      style={{ '--grupo-color': grupo.color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="grupo-header-bar" onClick={toggleCollapsed}>
        <div className="grupo-header-left">
          <h2 className="grupo-title">
            <LayoutGrid size={20} className="grupo-icon" />
            {grupo.nombre}
          </h2>
          <span className="grupo-count-badge">
            <Hash size={12} />
            {grupo.cursos.length} nota{grupo.cursos.length !== 1 ? 's' : ''}
          </span>

          {/* Indicadores de cumplimiento */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            {uniqueTecnicos.length > 0 && (
              <span 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: 'color-mix(in srgb, var(--grupo-color, var(--primary-500)) 12%, #f1f5f9)',
                  color: 'color-mix(in srgb, var(--grupo-color, var(--primary-500)) 85%, #1e293b)',
                  border: '1px solid color-mix(in srgb, var(--grupo-color, var(--primary-500)) 30%, #cbd5e1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                title={`Técnico(s) asignado(s): ${uniqueTecnicos.join(', ')}`}
              >
                👤 {uniqueTecnicos.join(', ')}
              </span>
            )}

            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: planiCount === total ? '#ecfdf5' : '#fee2e2',
                color: planiCount === total ? '#065f46' : '#991b1b',
                border: `1px solid ${planiCount === total ? '#a7f3d0' : '#fca5a5'}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
              title={planiCount === total ? "Todas las planificaciones recibidas" : `Faltan ${total - planiCount} planificaciones`}
            >
              <FileText size={12} />
              Planif: {planiCount}/{total}
            </span>

            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: reportCount === total ? '#ecfdf5' : '#fee2e2',
                color: reportCount === total ? '#065f46' : '#991b1b',
                border: `1px solid ${reportCount === total ? '#a7f3d0' : '#fca5a5'}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
              title={reportCount === total ? "Todos los informes recibidos" : `Faltan ${total - reportCount} informes`}
            >
              <FileCheck size={12} />
              Informes: {reportCount}/{total}
            </span>
          </div>
        </div>

        <div className="grupo-header-right">
          {/* Move Up/Down arrows */}
          {onMoveGrupo && (
            <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isFirst}
                onClick={(e) => { e.stopPropagation(); onMoveGrupo(grupo.nombre, 'up'); }}
                title="Subir grupo"
                style={{ padding: '6px', minWidth: '28px', opacity: isFirst ? 0.4 : 1, cursor: isFirst ? 'not-allowed' : 'pointer' }}
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isLast}
                onClick={(e) => { e.stopPropagation(); onMoveGrupo(grupo.nombre, 'down'); }}
                title="Bajar grupo"
                style={{ padding: '6px', minWidth: '28px', opacity: isLast ? 0.4 : 1, cursor: isLast ? 'not-allowed' : 'pointer' }}
              >
                <ArrowDown size={12} />
              </button>
            </div>
          )}

          {/* Rename */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => { e.stopPropagation(); handleRename(); }}
          >
            <Edit3 size={12} /> Renombrar
          </button>

          {/* Toggle */}
          <ChevronRight size={18} className="grupo-toggle-arrow" />
        </div>
      </div>

      {/* Grid of notas */}
      <div className="grupo-grid">
        {grupo.cursos.map((curso, idx) => (
          <NotaCard
            key={curso.id}
            curso={curso}
            tecnicos={tecnicos}
            facilitadores={facilitadores}
            ciclos={ciclos}
            grupoNames={grupoNames}
            onEdit={() => onEditCurso(curso)}
            onDelete={() => onDeleteCurso(curso.id)}
            onUpdate={(data) => onUpdateCurso(curso.id, data)}
            onManageParticipantes={onManageParticipantes}
            animationDelay={idx * 0.06}
          />
        ))}
      </div>
    </div>
  );
}
