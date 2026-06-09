'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Grupo, Curso, Tecnico, Facilitador, CicloFormativo, HorarioSlot } from '@/types';
import { LayoutGrid, ChevronRight, Edit3, Hash, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import NotaCard from './NotaCard';
import Swal from 'sweetalert2';
import { formatDateStr, getSlotsForDate, getCourseRanges, getReportRanges, MONTH_NAMES, DAY_NAMES_SHORT, DAY_NAMES_FULL } from '@/lib/utils/calendar';
import { CALENDAR_DAY_COLORS, RANGE_COLORS, getCourseColor, getCourseLabel } from '@/lib/utils/colors';
import { getNoteCompliance } from '@/lib/utils/compliance';

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
  readOnly?: boolean;
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
  readOnly = false,
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

  // Técnicos únicos para el header
  const uniqueTecnicos = Array.from(new Set(
    grupo.cursos
      .map(c => c.tecnico_nombre)
      .filter(Boolean)
  )) as string[];

  // ─── Hovered day for week strip popover ─────────────────
  const [hoveredDayStr, setHoveredDayStr] = useState<string | null>(null);
  const [newsIndex, setNewsIndex] = useState(0);
  const weekStripRef = useRef<HTMLDivElement>(null);

  // ─── Current week days (Mon-Sun) ───────────────────────
  const weekDays = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dow = now.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);

    const days: { date: Date; dateStr: string; dayNumber: number; dayIndex: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        dateStr: formatDateStr(d),
        dayNumber: d.getDate(),
        dayIndex: i,
        isToday: d.getTime() === now.getTime(),
      });
    }
    return days;
  }, []);

  // ─── Aggregate all slots + ranges across all courses in this group ──
  const allSlots = useMemo(() => {
    return grupo.cursos.flatMap(c => c.horarios_tentativos || []);
  }, [grupo.cursos]);

  const allRanges = useMemo(() => getCourseRanges(allSlots), [allSlots]);
  const allReportRanges = useMemo(() => getReportRanges(allSlots), [allSlots]);

  // Per-course slot/compliance map for popover
  const courseDataForDay = useMemo(() => {
    // Returns a map of dateStr -> [{curso, slots, compliance}] for courses that have activity on that day
    const map = new Map<string, { curso: Curso; daySlots: HorarioSlot[]; plani: boolean; eval: boolean; informe: boolean }[]>();
    for (const day of weekDays) {
      const entries: { curso: Curso; daySlots: HorarioSlot[]; plani: boolean; eval: boolean; informe: boolean }[] = [];
      for (const curso of grupo.cursos) {
        const slots = curso.horarios_tentativos || [];
        const daySlots = getSlotsForDate(slots, day.dateStr);
        // Also check ranges/report ranges for this curso
        const cursoRanges = getCourseRanges(slots);
        const cursoReportRanges = getReportRanges(slots);
        const hasRange = cursoRanges.has(day.dateStr);
        const hasReport = cursoReportRanges.has(day.dateStr);
        if (daySlots.length > 0 || hasRange || hasReport) {
          entries.push({
            curso,
            daySlots,
            plani: curso.planificacion_recibida,
            eval: curso.evaluacion_realizada,
            informe: curso.informe_final_recibido,
          });
        }
      }
      if (entries.length > 0) {
        map.set(day.dateStr, entries);
      }
    }
    return map;
  }, [weekDays, grupo.cursos]);

  // ─── Get cell background for a day (aggregated across all courses) ─
  const getWeekCellStyle = (dateStr: string) => {
    const daySlots = getSlotsForDate(allSlots, dateStr);
    if (daySlots.length > 0) {
      const mainSlot = daySlots[0];
      const key = String(mainSlot.course);
      const colors = CALENDAR_DAY_COLORS[key];
      if (colors) return { background: colors.bg, borderColor: colors.border };
    }
    const rangeNum = allRanges.get(dateStr);
    if (rangeNum) {
      const rc = RANGE_COLORS[String(rangeNum)];
      if (rc) return { background: rc.bg, borderColor: rc.border };
    }
    const reportInfo = allReportRanges.get(dateStr);
    if (reportInfo) {
      return { background: '#e0e7ff', borderColor: '#818cf8' };
    }
    return {};
  };

  // ─── Does this day have any painted activity? ──────────
  const isDayPainted = (dateStr: string) => {
    return courseDataForDay.has(dateStr);
  };

  // ─── Group-level announcements ─────────────────────────
  const announcements = useMemo(() => {
    const msgs: string[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const curso of grupo.cursos) {
      const alerts = getNoteCompliance(curso);
      const label = curso.ciclo_nombre || curso.distrito || `Nota ${curso.id.slice(-4)}`;
      for (const a of alerts) {
        if (a.type === 'hoy') msgs.push(`🔴 ¡${label} tiene curso HOY!`);
        else if (a.type === 'inminente') msgs.push(`⚡ ${label}: ${a.label}`);
        else if (a.type === 'proximo') msgs.push(`📅 ${label}: ${a.label}`);
        else if (a.type === 'en-proceso') msgs.push(`▶️ ${label} en proceso`);
        else if (a.type === 'curso-terminado') msgs.push(`✅ ${label}: marcar ejecutado`);
        else if (a.type === 'planificacion-atrasada') msgs.push(`🚨 ${label}: planificación atrasada`);
        else if (a.type === 'informe-atrasado') msgs.push(`📛 ${label}: ${a.label}`);
        else if (a.type === 'informe-por-vencer') msgs.push(`⏳ ${label}: ${a.label}`);
      }
    }
    if (msgs.length === 0) {
      msgs.push('✅ Sin alertas pendientes');
    }
    return msgs;
  }, [grupo.cursos]);

  // Rotate news ticker every 5 seconds
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  return (
    <div
      className={`grupo-card ${collapsed ? 'collapsed' : ''} ${isDimmed ? 'dimmed' : ''} ${isActive ? 'active-group' : ''}`}
      style={{ '--grupo-color': grupo.color, zIndex: hoveredDayStr ? 50 : undefined } as React.CSSProperties}
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
          </div>

          {/* ─── Mini Week Calendar Strip ─────────────── */}
          <div className="week-calendar-strip" ref={weekStripRef} onClick={(e) => e.stopPropagation()}>
            {weekDays.map((day, i) => {
              const cellStyle = getWeekCellStyle(day.dateStr);
              const painted = isDayPainted(day.dateStr);
              const isHovered = hoveredDayStr === day.dateStr;
              const alignClass = i <= 1 ? 'align-left' : i >= 5 ? 'align-right' : '';

              // Popover theme color
              const daySlots = getSlotsForDate(allSlots, day.dateStr);
              const firstSlot = daySlots[0];
              let themeColor = grupo.color || '#2f80ed';
              if (firstSlot) themeColor = getCourseColor(firstSlot.course);
              const popoverBg = `color-mix(in srgb, ${themeColor} 9%, #ffffff)`;
              const popoverBorder = `color-mix(in srgb, ${themeColor} 40%, #cbd5e1)`;

              return (
                <div
                  key={day.dateStr}
                  className={`week-day-cell ${day.isToday ? 'today' : ''}`}
                  style={{ ...cellStyle }}
                  onMouseEnter={() => painted && setHoveredDayStr(day.dateStr)}
                  onMouseLeave={() => setHoveredDayStr(null)}
                >
                  <span className="day-name">{DAY_NAMES_SHORT[day.dayIndex]}</span>
                  <span className="day-number">{day.dayNumber}</span>

                  {/* Hover Popover */}
                  {isHovered && painted && (() => {
                    const entries = courseDataForDay.get(day.dateStr) || [];
                    return (
                      <div
                        className={`week-day-popover ${alignClass}`}
                        style={{
                          '--popover-bg': popoverBg,
                          '--popover-border': popoverBorder,
                        } as React.CSSProperties}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h4>
                          <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          {day.dayNumber} {MONTH_NAMES[day.date.getMonth()]}
                        </h4>

                        <div className="week-day-popover-slots">
                          {entries.map((entry, eIdx) => (
                            <div key={eIdx} className="week-day-popover-course-section">
                              <div className="week-day-popover-course-title" style={{ color: getCourseColor(entry.daySlots[0]?.course || 1) }}>
                                {entry.curso.ciclo_nombre || entry.curso.distrito || `Nota ${entry.curso.id.slice(-4)}`}
                              </div>
                              {/* Slots */}
                              {entry.daySlots.map((s, sIdx) => (
                                <div key={sIdx} className="day-slot-row" style={{ borderLeftColor: getCourseColor(s.course) }}>
                                  <div>
                                    <strong style={{ color: getCourseColor(s.course) }}>{getCourseLabel(s.course)}</strong>
                                    {' '}{s.startTime}–{s.endTime}
                                  </div>
                                </div>
                              ))}
                              {/* Compliance status */}
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px',
                                  color: entry.plani ? '#059669' : '#dc2626',
                                  background: entry.plani ? '#ecfdf5' : '#fee2e2',
                                  border: `1px solid ${entry.plani ? '#a7f3d0' : '#fca5a5'}`,
                                }}>{entry.plani ? '✓ Plan' : '✗ Plan'}</span>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px',
                                  color: entry.eval ? '#059669' : '#dc2626',
                                  background: entry.eval ? '#ecfdf5' : '#fee2e2',
                                  border: `1px solid ${entry.eval ? '#a7f3d0' : '#fca5a5'}`,
                                }}>{entry.eval ? '✓ Eval' : '✗ Eval'}</span>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px',
                                  color: entry.informe ? '#059669' : '#dc2626',
                                  background: entry.informe ? '#ecfdf5' : '#fee2e2',
                                  border: `1px solid ${entry.informe ? '#a7f3d0' : '#fca5a5'}`,
                                }}>{entry.informe ? '✓ Inf' : '✗ Inf'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* ─── News Ticker ──────────────────────────── */}
          <div className="news-ticker-container" onClick={(e) => e.stopPropagation()}>
            <div className="news-ticker-dot" />
            <span className="news-ticker-text" key={newsIndex}>
              {announcements[newsIndex % announcements.length]}
            </span>
          </div>
        </div>

        <div className="grupo-header-right">
          {/* Move Up/Down arrows (hidden in readOnly) */}
          {!readOnly && onMoveGrupo && (
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

          {/* Rename (hidden in readOnly) */}
          {!readOnly && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => { e.stopPropagation(); handleRename(); }}
            >
              <Edit3 size={12} /> Renombrar
            </button>
          )}

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
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
