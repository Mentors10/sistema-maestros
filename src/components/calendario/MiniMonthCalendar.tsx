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
}

export default function MiniMonthCalendar({
  slots,
  onSaveSlots,
  noteColor = '#2f80ed',
  initialDate,
  compliance = [],
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

  return (
    <>
      {/* Title + Nav */}
      <div className="calendar-title-bar">
        <h4><Calendar size={14} /> Calendario de Actividades</h4>
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
          
          const reportInfo = reportRanges.get(day.dateStr);
          const isReportDeadline = reportInfo?.isDeadline;
          const reportCourseNum = reportInfo?.courseNum;

          return (
            <div
              key={i}
              className={`mini-month-day ${!day.isCurrentMonth ? 'muted' : ''} ${day.isToday ? 'today' : ''} ${daySlots.length > 0 ? 'has-slot' : ''}`}
              style={cellStyle}
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
            </div>
          );
        })}
      </div>

      {compliance.length > 0 && (
        <div className="calendar-compliance-strip" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 14px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', alignItems: 'center' }}>
          {compliance.map((alert, idx) => (
            <div key={idx} className={`compliance-chip ${alert.severity}`} style={{ fontSize: '0.7rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {alert.label}
            </div>
          ))}
        </div>
      )}

      {/* Day Popover */}
      {popoverDate && (
        <>
          <div className="day-popover-overlay" onClick={() => setPopoverDate(null)} />
          <div className="day-popover">
            <h4>
              <Calendar size={14} /> Planificación: {popoverDate}
            </h4>

            {/* Existing slots */}
            {popoverSlots.length > 0 && (
              <div className="day-popover-slots">
                {popoverSlots.map((s, i) => (
                  <div key={i} className="day-slot-row" style={{ borderLeftColor: getCourseColor(s.course) }}>
                    <div>
                      <strong style={{ color: getCourseColor(s.course) }}>{getCourseLabel(s.course)}</strong>
                      {' '}{s.startTime} - {s.endTime} ({s.hours}h)
                    </div>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDeleteSlot(i)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            <div className="day-popover-form">
              <div>
                <label>Actividad</label>
                <select value={newCourse} onChange={(e) => setNewCourse(e.target.value)}>
                  <option value="1">C1</option>
                  <option value="2">C2</option>
                  <option value="3">C3</option>
                  <option value="4">C4</option>
                  <option value="soc">SOC</option>
                  <option value="eval">EVAL</option>
                </select>
              </div>
              <div>
                <label>Entrada</label>
                <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div>
                <label>Salida</label>
                <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>

            <div className="day-popover-actions">
              <button className="btn btn-success" onClick={handleAddSlot}>
                <Plus size={13} /> Agregar
              </button>
              <button className="btn btn-secondary" onClick={() => setPopoverDate(null)}>
                <X size={13} /> Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
