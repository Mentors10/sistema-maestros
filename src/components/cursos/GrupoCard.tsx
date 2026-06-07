'use client';

import { useState } from 'react';
import { Grupo, Curso, Tecnico, Facilitador, CicloFormativo } from '@/types';
import { LayoutGrid, ChevronRight, Edit3, Hash, ArrowUp, ArrowDown } from 'lucide-react';
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
}: GrupoCardProps) {
  const [collapsed, setCollapsed] = useState(false);

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



  return (
    <div
      className={`grupo-card ${collapsed ? 'collapsed' : ''} ${isDimmed ? 'dimmed' : ''} ${isActive ? 'active-group' : ''}`}
      style={{ '--grupo-color': grupo.color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="grupo-header-bar" onClick={() => setCollapsed(!collapsed)}>
        <div className="grupo-header-left">
          <h2 className="grupo-title">
            <LayoutGrid size={20} className="grupo-icon" />
            {grupo.nombre}
          </h2>
          <span className="grupo-count-badge">
            <Hash size={12} />
            {grupo.cursos.length} nota{grupo.cursos.length !== 1 ? 's' : ''}
          </span>
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
