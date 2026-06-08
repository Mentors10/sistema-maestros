'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { HorarioSlot } from '@/types';
import {
  getMonthDays, DAY_NAMES_SHORT, MONTH_NAMES, formatDateStr,
  getSlotsForDate, autoAssignSocNumber, getCourseRanges, getReportRanges, ReportRangeInfo
} from '@/lib/utils/calendar';
import { CALENDAR_DAY_COLORS, RANGE_COLORS, getCourseLabel, getCourseColor, COURSE_COLORS } from '@/lib/utils/colors';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar } from 'lucide-react';
import { ComplianceAlert } from '@/lib/utils/compliance';

interface MiniMonthCalendarProps {
  slots: HorarioSlot[];
  onSaveSlots: (slots: HorarioSlot[]) => void;
  noteColor?: string;
  initialDate?: Date;
  compliance?: ComplianceAlert[];
  planificacionRecibida: boolean;
  evaluacionRealizada: boolean;
  informeFinalRecibido: boolean;
  onToggleCheck: (field: 'planificacion_recibida' | 'evaluacion_realizada' | 'informe_final_recibido') => void;
}

export default function MiniMonthCalendar({
  slots,
  onSaveSlots,
  noteColor = '#2f80ed',
  initialDate,
  compliance = [],
  planificacionRecibida,
  evaluacionRealizada,
  informeFinalRecibido,
  onToggleCheck,
}: MiniMonthCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(initialDate?.getFullYear() || now.getFullYear());
  const [month, setMonth] = useState(initialDate?.getMonth() ?? now.getMonth());
  const [popoverDate, setPopoverDate] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState('1');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('12:00');
  const calRef = useRef<HTMLDivElement>(null);

  const days = getMonthDays(year, month);
  const ranges = useMemo(() => getCourseRanges(slots), [slots]);
  const reportRanges = useMemo(() => getReportRanges(slots), [slots]);
  const totalHours = useMemo(() => slots.reduce((sum, s) => sum + (s.hours || 0), 0), [slots]);

  const [localPlani, setLocalPlani] = useState(planificacionRecibida);
  const [localEval, setLocalEval] = useState(evaluacionRealizada);
  const [localInfo, setLocalInfo] = useState(informeFinalRecibido);

  useEffect(() => {
    setLocalPlani(planificacionRecibida);
  }, [planificacionRecibida]);

  useEffect(() => {
    setLocalEval(evaluacionRealizada);
  }, [evaluacionRealizada]);

  useEffect(() => {
    setLocalInfo(informeFinalRecibido);
  }, [informeFinalRecibido]);

  const handleTogglePlanificacion = () => {
    setLocalPlani(!localPlani);
    onToggleCheck('planificacion_recibida');
  };

  const handleToggleEvaluacion = () => {
    setLocalEval(!localEval);
    onToggleCheck('evaluacion_realizada');
  };

  const handleToggleInforme = () => {
    setLocalInfo(!localInfo);
    onToggleCheck('informe_final_recibido');
  };

  // ─── Navigate ───────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // ─── Wheel scroll by weeks ─────────────────────────────────
  useEffect(() => {
    const el = calRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) nextMonth();
      else prevMonth();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  });

  // ─── Day click → popover ───────────────────────────────────
  const handleDayClick = (dateStr: string) => {
    setPopoverDate(dateStr);
  };

  // ─── Add slot ──────────────────────────────────────────────
  const handleAddSlot = () => {
    if (!popoverDate) return;

    let courseValue: number | string = newCourse;
    if (['1','2','3','4'].includes(newCourse)) {
      courseValue = parseInt(newCourse);
    } else if (newCourse === 'soc') {
      courseValue = autoAssignSocNumber(slots, popoverDate, 'soc');
    } else if (newCourse === 'eval') {
      courseValue = autoAssignSocNumber(slots, popoverDate, 'eval');
    }

    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;

    const newSlot: HorarioSlot = {
      date: popoverDate,
      startTime: newStart,
      endTime: newEnd,
      hours: Math.max(hours, 0),
      course: courseValue,
      hour: sh,
      minute: sm,
      endHour: eh,
      endMinute: em,
    };

    onSaveSlots([...slots, newSlot]);
  };

  // ─── Delete slot ───────────────────────────────────────────
  const handleDeleteSlot = (index: number) => {
    const dateSlots = getSlotsForDate(slots, popoverDate!);
    const slotToRemove = dateSlots[index];
    const newSlots = slots.filter((s) => s !== slotToRemove);
    onSaveSlots(newSlots);
  };

  // ─── Get cell styles ──────────────────────────────────────
  const getDayCellStyle = (dateStr: string) => {
    const daySlots = getSlotsForDate(slots, dateStr);

    const hasPlanningDelay = compliance.some((a) => a.type === 'planificacion-atrasada');
    const hasPlanningRequired = compliance.some((a) => a.type === 'planificacion-requerida');
    const hasEvalDelay = compliance.some((a) => a.type === 'eval-pendiente');

    if (daySlots.length > 0) {
      const mainSlot = daySlots[0];
      const key = String(mainSlot.course);
      const colors = CALENDAR_DAY_COLORS[key];
      if (colors) {
        // Class slots
        if (['1', '2', '3', '4'].includes(key)) {
          if (hasPlanningDelay) {
            return {
              background: colors.bg,
              borderColor: '#dc2626', // Red border
              borderWidth: '2.5px',
              boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.15)'
            };
          } else if (hasPlanningRequired) {
            return {
              background: colors.bg,
              borderColor: '#d97706', // Yellow/Amber border
              borderWidth: '2.5px',
              boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.15)'
            };
          }
        }
        // Evaluation slots
        if (key.startsWith('eval') && hasEvalDelay) {
          return {
            background: '#fee2e2',
            borderColor: '#dc2626',
            borderWidth: '2.5px',
            boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.15)'
          };
        }
        return { background: colors.bg, borderColor: colors.border };
      }
    }
    // Check ranges
    const rangeNum = ranges.get(dateStr);
    if (rangeNum) {
      const rc = RANGE_COLORS[String(rangeNum)];
      if (rc) return { background: rc.bg, borderColor: rc.border };
    }
    // Check report ranges
    const reportInfo = reportRanges.get(dateStr);
    if (reportInfo) {
      const hasReportDelay = compliance.some((a) => a.type === 'informe-atrasado');
      const hasReportWarning = compliance.some((a) => a.type === 'informe-por-vencer');

      if (hasReportDelay) {
        return {
          background: '#fef2f2',
          borderColor: '#fca5a5',
          borderStyle: 'dashed',
          borderWidth: '1.5px',
        };
      } else if (hasReportWarning) {
        return {
          background: '#fffbeb',
          borderColor: '#fde047',
          borderStyle: 'dashed',
          borderWidth: '1.5px',
        };
      } else {
        return {
          background: '#eef2ff',
          borderColor: '#c7d2fe',
          borderStyle: 'dashed',
          borderWidth: '1.5px',
        };
      }
    }
    return {};
  };

  const popoverSlots = popoverDate ? getSlotsForDate(slots, popoverDate) : [];

  // Compliance calculations for individual cells
  const getDayComplianceStatus = (dateStr: string) => {
    const daySlots = getSlotsForDate(slots, dateStr);
    if (daySlots.length > 0) {
      const mainSlot = daySlots[0];
      const key = String(mainSlot.course);
      if (['1', '2', '3', '4'].includes(key)) {
        return { hasBar: true, isOk: localPlani };
      }
      if (key.startsWith('eval')) {
        return { hasBar: true, isOk: localEval };
      }
      if (key.startsWith('soc')) {
        return { hasBar: true, isOk: localInfo };
      }
    }
    
    const rangeNum = ranges.get(dateStr);
    if (rangeNum) {
      return { hasBar: true, isOk: localPlani };
    }
    
    const reportInfo = reportRanges.get(dateStr);
    if (reportInfo) {
      return { hasBar: true, isOk: localInfo };
    }
    
    return { hasBar: false, isOk: false };
  };

  return (
    <>
      {popoverDate && (
        <div 
          className="day-popover-overlay-transparent" 
          onClick={() => setPopoverDate(null)} 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            background: 'transparent',
            cursor: 'default'
          }}
        />
      )}

      {/* Title + Nav */}
      <div className="calendar-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} /> 
          Calendario
          {totalHours > 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.85, background: '#e2e8f0', color: '#1e293b', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}>
              {totalHours}h
            </span>
          )}
        </h4>
        <div className="calendar-nav">
          <button onClick={prevMonth}><ChevronLeft size={14} /></button>
          <span className="calendar-month-label">
            {MONTH_NAMES[month].toUpperCase()} {year}
          </span>
          <button onClick={nextMonth}><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mini-month" ref={calRef}>
        {/* Headers */}
        {DAY_NAMES_SHORT.map((d, i) => (
          <div key={i} className="mini-month-head">{d}</div>
        ))}

        {/* Days */}
        {days.map((day, i) => {
          const daySlots = getSlotsForDate(slots, day.dateStr);
          const cellStyle = getDayCellStyle(day.dateStr);
          const isSelected = popoverDate === day.dateStr;
          
          const reportInfo = reportRanges.get(day.dateStr);
          const isReportDeadline = reportInfo?.isDeadline;
          const reportCourseNum = reportInfo?.courseNum;
          const compStatus = getDayComplianceStatus(day.dateStr);

          const colIndex = i % 7; // 0 = Mon, 1 = Tue, ..., 6 = Sun
          const alignClass = colIndex <= 1 ? 'align-left' : colIndex >= 5 ? 'align-right' : 'align-center';

          return (
            <div
              key={i}
              className={`mini-month-day ${!day.isCurrentMonth ? 'muted' : ''} ${day.isToday ? 'today' : ''} ${daySlots.length > 0 ? 'has-slot' : ''}`}
              style={{ ...cellStyle, position: 'relative', zIndex: isSelected ? 100 : undefined }}
              onClick={() => handleDayClick(day.dateStr)}
            >
              <span className="mini-day-number">{day.dayNumber}</span>
              {daySlots.length > 0 && (
                <div className="mini-day-badges">
                  {daySlots.map((s, j) => (
                    <span key={j} className="mini-day-dot" style={{ color: getCourseColor(s.course) }}>
                      {getCourseLabel(s.course)}
                    </span>
                  ))}
                </div>
              )}
              {isReportDeadline && (() => {
                const hasReportDelay = compliance.some((a) => a.type === 'informe-atrasado');
                const hasReportWarning = compliance.some((a) => a.type === 'informe-por-vencer');

                let textColor = '#4f46e5';
                let bgColor = '#e0e7ff';
                let borderColor = '#c7d2fe';
                if (hasReportDelay) {
                  textColor = '#b91c1c';
                  bgColor = '#fee2e2';
                  borderColor = '#fca5a5';
                } else if (hasReportWarning) {
                  textColor = '#b45309';
                  bgColor = '#fef3c7';
                  borderColor = '#fde047';
                }

                return (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                    <span 
                      style={{ 
                        fontSize: '0.62rem', 
                        fontWeight: 800, 
                        color: textColor, 
                        backgroundColor: bgColor,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        border: `1px solid ${borderColor}`
                      }}
                      title="Fecha límite de entrega de informe"
                    >
                      INF{reportCourseNum}
                    </span>
                  </div>
                );
              })()}

              {/* Compliance Horizontal Bar (red if not presented, green if presented) */}
              {compStatus.hasBar && (
                <div 
                  className={`day-compliance-bar ${compStatus.isOk ? 'ok' : 'pending'}`}
                  style={{
                    height: '4px',
                    width: '90%',
                    background: compStatus.isOk ? '#10b981' : '#ef4444',
                    borderRadius: '2px',
                    marginTop: 'auto',
                    marginBottom: '2px',
                    transition: 'all 0.2s ease'
                  }}
                />
              )}

              {/* Day Popover (Centered floating bubble arrow dialog) */}
              {isSelected && (
                <div className={`day-popover ${alignClass}`} onClick={(e) => e.stopPropagation()}>
                  <h4>
                    <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> 
                    {day.dayNumber} {MONTH_NAMES[month]}
                  </h4>

                  {/* Existing slots */}
                  {popoverSlots.length > 0 && (
                    <div className="day-popover-slots">
                      {popoverSlots.map((s, idx) => (
                        <div key={idx} className="day-slot-row" style={{ borderLeftColor: getCourseColor(s.course) }}>
                          <div>
                            <strong style={{ color: getCourseColor(s.course) }}>{getCourseLabel(s.course)}</strong>
                            {' '}{s.startTime}-{s.endTime}
                          </div>
                          <button className="btn btn-danger btn-xs" style={{ padding: '2px 4px' }} onClick={() => handleDeleteSlot(idx)}>
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add form */}
                  <div className="day-popover-form">
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label>Act.</label>
                        <select value={newCourse} onChange={(e) => setNewCourse(e.target.value)} style={{ padding: '3px 4px' }}>
                          <option value="1">C1</option>
                          <option value="2">C2</option>
                          <option value="3">C3</option>
                          <option value="4">C4</option>
                          <option value="soc">SOC</option>
                          <option value="eval">EVAL</option>
                        </select>
                      </div>
                      <div style={{ width: '60px' }}>
                        <label>De</label>
                        <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={{ padding: '3px 4px' }} />
                      </div>
                      <div style={{ width: '60px' }}>
                        <label>A</label>
                        <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={{ padding: '3px 4px' }} />
                      </div>
                    </div>
                  </div>

                  <div className="day-popover-actions">
                    <button className="btn btn-success" onClick={handleAddSlot}>
                      <Plus size={11} /> Agregar
                    </button>
                    <button className="btn btn-secondary" onClick={() => setPopoverDate(null)}>
                      <X size={11} /> Cerrar
                    </button>
                  </div>

                  {/* Compliance Toggles inside Popover */}
                  <div className="day-popover-compliance" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={localPlani} 
                        onChange={handleTogglePlanificacion} 
                        style={{ width: '12px', height: '12px', margin: 0 }}
                      />
                      Planificación
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={localEval} 
                        onChange={handleToggleEvaluacion} 
                        style={{ width: '12px', height: '12px', margin: 0 }}
                      />
                      Evaluación
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={localInfo} 
                        onChange={handleToggleInforme} 
                        style={{ width: '12px', height: '12px', margin: 0 }}
                      />
                      Informe Final
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
