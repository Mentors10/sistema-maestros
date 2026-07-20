'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { HorarioSlot } from '@/types';
import {
  getCurrentMonthDays, DAY_NAMES_SHORT, MONTH_NAMES,
  getSlotsForDate, autoAssignSocNumber, getCourseRanges, getReportRanges
} from '@/lib/utils/calendar';
import { CALENDAR_DAY_COLORS, RANGE_COLORS, getCourseColor, getCourseLabel } from '@/lib/utils/colors';
import { Plus, Trash2, X, Calendar, ChevronRight, Zap } from 'lucide-react';
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
  readOnly?: boolean;
}

// Full labels for display
const ACT_LABELS: Record<string, string> = {
  '1': 'Curso 1',
  '2': 'Curso 2',
  '3': 'Curso 3',
  '4': 'Curso 4',
  'soc': 'Socialización',
  'eval': 'Evaluación',
};

const ACT_COLORS: Record<string, string> = {
  '1': '#1D4ED8',
  '2': '#047857',
  '3': '#B45309',
  '4': '#6D28D9',
  'soc': '#0F172A',
  'eval': '#B91C1C',
};

const ACT_OPTIONS = ['1', '2', '3', '4', 'soc', 'eval'];

const MAX_SESSIONS = 3;
const TARGET_HOURS = 12;

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
  readOnly = false,
}: MiniMonthCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(initialDate?.getFullYear() || now.getFullYear());
  const [month, setMonth] = useState(initialDate?.getMonth() ?? now.getMonth());
  const [popoverDate, setPopoverDate] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState('1');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('12:00');
  const [newDate, setNewDate] = useState('');

  // Automated scheduling states
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [autoStartDate, setAutoStartDate] = useState('');
  const [autoStartHour, setAutoStartHour] = useState('08:00');
  const [autoEndHour, setAutoEndHour] = useState('12:00');
  const [autoNumCourses, setAutoNumCourses] = useState(3);
  const [autoPreview, setAutoPreview] = useState<HorarioSlot[]>([]);
  const [autoAudience, setAutoAudience] = useState<'estudiantes' | 'maestros'>('estudiantes');
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>({ year, month });
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const TIME_OPTIONS = useMemo(() => {
    const opts: string[] = [];
    for (let h = 6; h <= 22; h++) {
      opts.push(`${String(h).padStart(2, '0')}:00`);
      opts.push(`${String(h).padStart(2, '0')}:30`);
    }
    return opts;
  }, []);

  const ranges = useMemo(() => getCourseRanges(slots), [slots]);
  const reportRanges = useMemo(() => getReportRanges(slots), [slots]);
  const totalHours = useMemo(() => slots.reduce((sum, s) => sum + (s.hours || 0), 0), [slots]);

  const [localPlani, setLocalPlani] = useState(planificacionRecibida);
  const [localEval, setLocalEval] = useState(evaluacionRealizada);
  const [localInfo, setLocalInfo] = useState(informeFinalRecibido);

  useEffect(() => { setLocalPlani(planificacionRecibida); }, [planificacionRecibida]);
  useEffect(() => { setLocalEval(evaluacionRealizada); }, [evaluacionRealizada]);
  useEffect(() => { setLocalInfo(informeFinalRecibido); }, [informeFinalRecibido]);

  const handleTogglePlanificacion = () => { setLocalPlani(!localPlani); onToggleCheck('planificacion_recibida'); };
  const handleToggleEvaluacion = () => { setLocalEval(!localEval); onToggleCheck('evaluacion_realizada'); };
  const handleToggleInforme = () => { setLocalInfo(!localInfo); onToggleCheck('informe_final_recibido'); };

  // â”€â”€â”€ Build months from current to December â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const months = useMemo(() => {
    const result: { year: number; month: number; days: ReturnType<typeof getCurrentMonthDays>; isCurrent: boolean }[] = [];
    const endYear = now.getFullYear();
    const endMonth = 11;
    let y = year;
    let m = month;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      result.push({
        year: y,
        month: m,
        days: getCurrentMonthDays(y, m),
        isCurrent: y === year && m === month,
      });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return result;
  }, [year, month]);

  // â”€â”€â”€ Track visible month via IntersectionObserver â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute('data-month-key');
            if (key) {
              const [y, m] = key.split('-').map(Number);
              setVisibleMonth({ year: y, month: m });
            }
          }
        }
      },
      { root: scrollEl, threshold: 0.3 }
    );

    monthBlockRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [months]);

  // â”€â”€â”€ Close popover on outside click â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!popoverDate) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.cal-popover-panel')) return;
      if (target.closest('.mini-month-day')) return;
      setPopoverDate(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverDate]);

  // â”€â”€â”€ Lock body scroll when popover is open â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (popoverDate) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [popoverDate]);

  // â”€â”€â”€ Scroll to selected date in calendar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!newDate || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-date="${newDate}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [newDate]);

  // â”€â”€â”€ Day click â†’ toggle popover panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDayClick = (dateStr: string) => {
    if (popoverDate === dateStr) {
      setPopoverDate(null);
    } else {
      setPopoverDate(dateStr);
      setNewDate(dateStr);
    }
  };

  // â”€â”€â”€ Calculate hours from start/end time â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const calcHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
  };

  // â”€â”€â”€ Count sessions and total hours for a course type â”€â”€â”€â”€
  const getCourseStats = (courseType: string, dateSlots: HorarioSlot[]) => {
    const sameType = dateSlots.filter(s => String(s.course) === courseType || String(s.course).startsWith(courseType));
    const sessionCount = sameType.length;
    const totalH = sameType.reduce((sum, s) => sum + (s.hours || 0), 0);
    return { sessionCount, totalH };
  };

  // â”€â”€â”€ Get next session number for a course type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getNextSessionNum = (courseType: string, dateSlots: HorarioSlot[]): number => {
    const sameType = dateSlots.filter(s => String(s.course) === courseType || String(s.course).startsWith(courseType));
    return sameType.length + 1;
  };

  // â”€â”€â”€ Check if course type can accept more sessions â”€â”€â”€â”€â”€â”€â”€
  const canAddSession = (courseType: string, dateSlots: HorarioSlot[]): boolean => {
    if (courseType === 'soc' || courseType === 'eval') return true;
    const stats = getCourseStats(courseType, dateSlots);
    if (stats.sessionCount >= MAX_SESSIONS) return false;
    if (stats.totalH >= TARGET_HOURS) return false;
    return true;
  };

  // â”€â”€â”€ Auto-suggest next course type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getRecommendedCourse = (dateSlots: HorarioSlot[]): string => {
    for (const act of ['1', '2', '3', '4']) {
      const stats = getCourseStats(act, dateSlots);
      if (stats.sessionCount < MAX_SESSIONS && stats.totalH < TARGET_HOURS) return act;
    }
    // Check SOC/EVAL
    const hasSoc = dateSlots.some(s => String(s.course).startsWith('soc'));
    if (!hasSoc) return 'soc';
    const hasEval = dateSlots.some(s => String(s.course).startsWith('eval'));
    if (!hasEval) return 'eval';
    return '1';
  };

  // â”€â”€â”€ Add slot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAddSlot = () => {
    if (!newDate) return;
    const targetDate = newDate;
    let courseValue: number | string = newCourse;
    if (['1', '2', '3', '4'].includes(newCourse)) {
      courseValue = parseInt(newCourse);
    } else if (newCourse === 'soc') {
      courseValue = autoAssignSocNumber(slots, targetDate, 'soc');
    } else if (newCourse === 'eval') {
      courseValue = autoAssignSocNumber(slots, targetDate, 'eval');
    }
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
    const newSlot: HorarioSlot = {
      date: targetDate,
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

  // â”€â”€â”€ Delete slot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeleteSlot = (globalIndex: number) => {
    const newSlots = slots.filter((_, i) => i !== globalIndex);
    onSaveSlots(newSlots);
  };

  // â”€â”€â”€ Duplicate slot (same course, different day) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDuplicateSlot = (slot: HorarioSlot) => {
    const courseKey = String(slot.course);
    const baseType = courseKey.replace(/\d+$/, '') || courseKey;
    setNewCourse(baseType === 'soc' || baseType === 'eval' ? baseType : String(parseInt(courseKey)));
    setNewStart(slot.startTime);
    setNewEnd(slot.endTime);
  };

  // ─── Automated Scheduling ────────────────────────────────
  const generateAutoPreview = () => {
    if (!autoStartDate) return;
    const [sh, sm] = autoStartHour.split(':').map(Number);
    const [eh, em] = autoEndHour.split(':').map(Number);
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
    if (hours <= 0) return;
    const preview: HorarioSlot[] = [];
    const startDate = new Date(autoStartDate + 'T12:00:00');
    for (let courseNum = 1; courseNum <= autoNumCourses; courseNum++) {
      const courseStart = new Date(startDate);
      courseStart.setDate(courseStart.getDate() + (courseNum - 1) * (autoAudience === 'estudiantes' ? 35 : 14));
      for (let session = 0; session < 3; session++) {
        const sessionDate = new Date(courseStart);
        sessionDate.setDate(sessionDate.getDate() + session * 7);
        const dateStr = sessionDate.toISOString().split('T')[0];
        preview.push({ date: dateStr, startTime: autoStartHour, endTime: autoEndHour, hours: Math.max(hours, 0), course: courseNum, hour: sh, minute: sm, endHour: eh, endMinute: em });
      }
      const socDate = new Date(courseStart);
      socDate.setDate(socDate.getDate() + (autoAudience === 'estudiantes' ? 29 : 14));
      const socDateStr = socDate.toISOString().split('T')[0];
      preview.push({ date: socDateStr, startTime: autoStartHour, endTime: autoEndHour, hours: Math.max(hours, 0), course: `soc${courseNum}`, hour: sh, minute: sm, endHour: eh, endMinute: em });
      preview.push({ date: socDateStr, startTime: autoStartHour, endTime: autoEndHour, hours: Math.max(hours, 0), course: `eval${courseNum}`, hour: sh, minute: sm, endHour: eh, endMinute: em });
    }
    setAutoPreview(preview);
  };
  const handleConfirmAutoSchedule = () => {
    if (autoPreview.length === 0) return;
    onSaveSlots(autoPreview);
    setShowAutoSchedule(false);
    setAutoPreview([]);
  };
  const autoPreviewByCourse = useMemo(() => {
    const map = new Map<string, HorarioSlot[]>();
    autoPreview.forEach(s => {
      const key = String(s.course).replace(/\d+$/, '') || String(s.course);
      const existing = map.get(key) || [];
      existing.push(s);
      map.set(key, existing);
    });
    return map;
  }, [autoPreview]);

  // â”€â”€â”€ Cell styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getDayCellStyle = (dateStr: string): React.CSSProperties => {
    const daySlots = getSlotsForDate(slots, dateStr);
    const hasPlanningDelay = !readOnly && compliance.some((a) => a.type === 'planificacion-atrasada');
    const hasPlanningRequired = !readOnly && compliance.some((a) => a.type === 'planificacion-requerida');
    const hasEvalDelay = !readOnly && compliance.some((a) => a.type === 'eval-pendiente');

    if (daySlots.length > 0) {
      const key = String(daySlots[0].course);
      const colors = CALENDAR_DAY_COLORS[key];
      if (colors) {
        if (['1', '2', '3', '4'].includes(key)) {
          if (hasPlanningDelay) return { background: colors.bg, borderColor: '#dc2626', borderWidth: '2.5px', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.15)' };
          if (hasPlanningRequired) return { background: colors.bg, borderColor: '#d97706', borderWidth: '2.5px', boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.15)' };
        }
        if (key.startsWith('eval') && hasEvalDelay) return { background: '#fee2e2', borderColor: '#dc2626', borderWidth: '2.5px', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.15)' };
        return { background: colors.bg, borderColor: colors.border };
      }
    }
    const rangeNum = ranges.get(dateStr);
    if (rangeNum) {
      const rc = RANGE_COLORS[String(rangeNum)];
      if (rc) return { background: rc.bg, borderColor: rc.border };
    }
    if (!readOnly) {
      const reportInfo = reportRanges.get(dateStr);
      if (reportInfo) {
        const hasReportDelay = compliance.some((a) => a.type === 'informe-atrasado');
        const hasReportWarning = compliance.some((a) => a.type === 'informe-por-vencer');
        if (hasReportDelay) return { background: '#fef2f2', borderColor: '#fca5a5', borderStyle: 'dashed', borderWidth: '1.5px' };
        if (hasReportWarning) return { background: '#fffbeb', borderColor: '#fde047', borderStyle: 'dashed', borderWidth: '1.5px' };
        return { background: '#eef2ff', borderColor: '#c7d2fe', borderStyle: 'dashed', borderWidth: '1.5px' };
      }
    }
    return {};
  };

  const popoverSlots = newDate ? getSlotsForDate(slots, newDate) : [];

  const getDayComplianceStatus = (dateStr: string) => {
    const daySlots = getSlotsForDate(slots, dateStr);
    if (daySlots.length > 0) {
      const key = String(daySlots[0].course);
      if (['1', '2', '3', '4'].includes(key)) return { hasBar: true, isOk: localPlani };
      if (key.startsWith('eval')) return { hasBar: true, isOk: localEval };
      if (key.startsWith('soc')) return { hasBar: true, isOk: localInfo };
    }
    if (ranges.get(dateStr)) return { hasBar: true, isOk: localPlani };
    if (reportRanges.get(dateStr)) return { hasBar: true, isOk: localInfo };
    return { hasBar: false, isOk: false };
  };

  // â”€â”€â”€ Popover panel content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const popoverDayDate = newDate ? new Date(newDate + 'T12:00:00') : null;

  // Compute stats for current popover date
  const dayCourseStats = newDate ? ACT_OPTIONS.filter(a => a === '1' || a === '2' || a === '3' || a === '4').map(act => ({
    act,
    label: ACT_LABELS[act],
    color: ACT_COLORS[act],
    ...getCourseStats(act, popoverSlots),
  })) : [];

  const nextRecommended = newDate ? getRecommendedCourse(popoverSlots) : '1';

  // All slots grouped by date
  const allSlotsByDate = useMemo(() => {
    const map = new Map<string, HorarioSlot[]>();
    slots.forEach(s => {
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    });
    return map;
  }, [slots]);

  const sortedDates = useMemo(() => {
    return Array.from(allSlotsByDate.keys()).sort();
  }, [allSlotsByDate]);

  const renderPopoverPanel = () => {
    if (!newDate || !popoverDayDate) return null;

    return (
      <div className="cal-popover-panel" onClick={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '18px',
        width: '520px',
        maxHeight: '85vh',
        overflowY: 'auto',
        background: '#ffffff',
        border: `2.5px solid ${noteColor}`,
        borderRadius: '14px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px ${noteColor}30`,
        zIndex: 9000,
        animation: 'popoverFadeIn 0.15s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: `2px solid ${noteColor}30` }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} style={{ color: noteColor }} />
            ProgramaciÃ³n â€” {popoverDayDate.getDate()} {MONTH_NAMES[popoverDayDate.getMonth()]}
          </h4>
          <button onClick={() => setPopoverDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Automated Schedule Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => { setShowAutoSchedule(!showAutoSchedule); if (showAutoSchedule) { setAutoPreview([]); } }}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '12px',
              background: showAutoSchedule ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}
          >
            <Zap size={16} />
            {showAutoSchedule ? 'Cerrar Automatizado' : 'Programación Automatizada'}
          </button>
        )}

        {/* Automated Schedule Panel */}
        {showAutoSchedule && (
          <div style={{ border: '1.5px solid #8b5cf6', borderRadius: '8px', padding: '12px', background: '#faf5ff', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
              Configurar Programación Automática
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.72rem', color: '#6b7280' }}>
              Genera todas las sesiones (C1-C4 + SOC) automáticamente. Reemplaza las programaciones existentes.
            </p>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ width: '130px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>Fecha Inicio</label>
                <input type="date" value={autoStartDate} onChange={(e) => { setAutoStartDate(e.target.value); setAutoPreview([]); }} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '85px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>De</label>
                <select value={autoStartHour} onChange={(e) => { setAutoStartHour(e.target.value); setAutoPreview([]); }} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ width: '85px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>A</label>
                <select value={autoEndHour} onChange={(e) => { setAutoEndHour(e.target.value); setAutoPreview([]); }} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ width: '100px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>Para</label>
                <select value={autoAudience} onChange={(e) => { setAutoAudience(e.target.value as 'estudiantes' | 'maestros'); setAutoPreview([]); }} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                  <option value="estudiantes">Estudiantes (35 dias)</option>
                  <option value="maestros">Maestros/as (14 dias)</option>
                </select>
              </div>
              <div style={{ width: '90px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>Cursos</label>
                <select value={autoNumCourses} onChange={(e) => { setAutoNumCourses(Number(e.target.value)); setAutoPreview([]); }} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                  <option value={3}>3 Cursos</option>
                  <option value={4}>4 Cursos</option>
                </select>
              </div>
              <button type="button" onClick={generateAutoPreview} disabled={!autoStartDate} style={{ padding: '6px 12px', background: autoStartDate ? '#8b5cf6' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem', cursor: autoStartDate ? 'pointer' : 'not-allowed' }}>
                Vista Previa
              </button>
            </div>
            {autoPreview.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Se generarán <b>{autoPreview.length}</b> programaciones:
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #c4b5fd', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ background: '#ede9fe', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 800, color: '#5b21b6' }}>Curso</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 800, color: '#5b21b6' }}>Sesiones (3x4h)</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 800, color: '#5b21b6' }}>SOC</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 800, color: '#5b21b6' }}>EVAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: autoNumCourses }, (_, i) => i + 1).map(courseNum => {
                        const courseSlots = autoPreview.filter(s => s.course === courseNum);
                        const socSlots = autoPreview.filter(s => String(s.course) === 'soc' + courseNum);
                        const evalSlots = autoPreview.filter(s => String(s.course) === 'eval' + courseNum);
                        const color = ACT_COLORS[String(courseNum)] || '#6b7280';
                        const fmtDate = (d: string) => { const dt = new Date(d + 'T12:00:00'); return dt.getDate() + '/' + (dt.getMonth() + 1); };
                        return (
                          <tr key={courseNum} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '4px 6px', fontWeight: 700, color }}>{ACT_LABELS[String(courseNum)]}</td>
                            <td style={{ padding: '4px 6px', color: '#374151' }}>
                              {courseSlots.sort((a, b) => a.date.localeCompare(b.date)).map(s => fmtDate(s.date)).join(', ')}
                            </td>
                            <td style={{ padding: '4px 6px', color: '#0F172A', fontWeight: 600 }}>
                              {socSlots.map(s => fmtDate(s.date)).join(', ')}
                            </td>
                            <td style={{ padding: '4px 6px', color: '#B91C1C', fontWeight: 600 }}>
                              {evalSlots.map(s => fmtDate(s.date)).join(', ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setAutoPreview([])} style={{ padding: '6px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleConfirmAutoSchedule} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={14} /> Generar {autoPreview.length} Programaciones
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All sessions as table â€” filtered by selected activity */}
        {sortedDates.length > 0 && (
          <div style={{ marginBottom: '12px', maxHeight: '35vh', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.68rem', borderBottom: '2px solid #cbd5e1' }}>Fecha</th>
                  <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.68rem', borderBottom: '2px solid #cbd5e1' }}>S</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.68rem', borderBottom: '2px solid #cbd5e1' }}>De</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.68rem', borderBottom: '2px solid #cbd5e1' }}>A</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.68rem', borderBottom: '2px solid #cbd5e1' }}>H</th>
                  {!readOnly && <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '0.68rem', borderBottom: '2px solid #cbd5e1' }}></th>}
                </tr>
              </thead>
              <tbody>
                {sortedDates.map((date) => {
                  const dateObj = new Date(date + 'T12:00:00');
                  const isCurrentDate = date === newDate;
                  const daySlots = (allSlotsByDate.get(date) || []).filter((s) => {
                    const ck = String(s.course);
                    const bt = ck.replace(/\d+$/, '') || ck;
                    if (newCourse === 'soc') return bt === 'soc';
                    if (newCourse === 'eval') return bt === 'eval';
                    return ck === newCourse || bt === newCourse;
                  });
                  if (daySlots.length === 0) return null;
                  return daySlots.map((s, idx) => {
                    const courseKey = String(s.course);
                    const baseType = courseKey.replace(/\d+$/, '') || courseKey;
                    const color = ACT_COLORS[baseType] || getCourseColor(s.course);
                    const sessionNum = daySlots.filter((ss, i) => i <= idx && (String(ss.course) === courseKey || String(ss.course).replace(/\d+$/, '') === baseType)).length;
                    const fullLabel = ACT_LABELS[baseType] || courseKey.toUpperCase();
                    const globalIdx = slots.indexOf(s);
                    const isFirstOfDay = idx === 0;
                    return (
                      <tr key={globalIdx} style={{
                        background: isCurrentDate ? `${color}10` : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                      }}>
                        <td style={{ padding: '4px 6px', fontWeight: isCurrentDate ? 800 : 400, color: isCurrentDate ? '#1e293b' : '#64748b', whiteSpace: 'nowrap' }}>
                          {isFirstOfDay ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}` : ''}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <span style={{
                            background: color,
                            color: '#fff',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                          }}>S{sessionNum}</span>
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#475569' }}>{s.startTime}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#475569' }}>{s.endTime}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>{s.hours}h</td>
                        {!readOnly && (
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            {isCurrentDate && (
                              <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                <button style={{ padding: '1px 5px', fontSize: '0.65rem', borderRadius: '3px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={() => handleDuplicateSlot(s)} title="Duplicar">Dup</button>
                                <button style={{ padding: '1px 5px', fontSize: '0.65rem', borderRadius: '3px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteSlot(globalIdx)} title="Eliminar">X</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add form */}
        <div style={{ border: '1.5px solid #3b82f6', borderRadius: '8px', padding: '10px', background: '#f0f9ff' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Nueva ProgramaciÃ³n
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '130px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>DÃ­a</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div style={{ flex: 1.2 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>Actividad</label>
              <select value={newCourse} onChange={(e) => setNewCourse(e.target.value)} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                {ACT_OPTIONS.map(act => {
                  const stats = getCourseStats(act, popoverSlots);
                  const isFull = act !== 'soc' && act !== 'eval' && (stats.sessionCount >= MAX_SESSIONS || stats.totalH >= TARGET_HOURS);
                  return (
                    <option key={act} value={act} disabled={isFull}>
                      {ACT_LABELS[act]} {isFull ? 'âœ“' : `(S${stats.sessionCount + 1} Â· ${stats.totalH}h)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ width: '95px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>De</label>
              <select value={newStart} onChange={(e) => setNewStart(e.target.value)} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ width: '95px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '3px', display: 'block' }}>A</label>
              <select value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={{ padding: '5px 6px', fontSize: '0.82rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '14px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: calcHours(newStart, newEnd) > 0 ? '#059669' : '#dc2626' }}>
                {calcHours(newStart, newEnd)}h
              </span>
              <button className="btn btn-success" onClick={handleAddSlot} style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.82rem' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // â”€â”€â”€ Render a single month block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderMonthBlock = (m: { year: number; month: number; days: ReturnType<typeof getCurrentMonthDays>; isCurrent: boolean }) => {
    const key = `${m.year}-${m.month}`;
    const firstDayEmptyCells = m.days[0]?.emptyCells || 0;
    return (
      <div
        className="cal-month-block"
        key={key}
        data-month-key={key}
        ref={(el) => { if (el) monthBlockRefs.current.set(key, el); }}
      >
        <div style={{
          textAlign: 'center',
          fontSize: '0.68rem',
          fontWeight: 900,
          color: 'var(--nota-color, #2563EB)',
          padding: '4px 0 2px 0',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--nota-color, #2563EB) 8%, #ffffff), transparent)`,
          borderBottom: `2px solid var(--nota-color, #2563EB)`,
        }}>
          {MONTH_NAMES[m.month].substring(0, 3).toUpperCase()} {m.year}
        </div>
        <div className="cal-month-grid">
          {Array.from({ length: firstDayEmptyCells }, (_, i) => (
            <div key={`empty-${i}`} className="mini-month-day" style={{ visibility: 'hidden' }} />
          ))}
          {m.days.map((day, i) => {
            const daySlots = getSlotsForDate(slots, day.dateStr);
            const cellStyle = getDayCellStyle(day.dateStr);
            const isSelected = popoverDate === day.dateStr;
            const reportInfo = reportRanges.get(day.dateStr);
            const isReportDeadline = reportInfo?.isDeadline;
            const reportCourseNum = reportInfo?.courseNum;
            const compStatus = getDayComplianceStatus(day.dateStr);

            return (
              <div
                key={i}
                data-date={day.dateStr}
                className={`mini-month-day ${!m.isCurrent && !day.isCurrentMonth ? 'muted' : ''} ${day.isToday ? 'today' : ''} ${daySlots.length > 0 ? 'has-slot' : ''} ${isSelected ? 'selected-day' : ''}`}
                style={{ ...cellStyle, position: 'relative', zIndex: isSelected ? 10 : undefined, cursor: 'pointer' }}
                onClick={() => !readOnly && handleDayClick(day.dateStr)}
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
                {!readOnly && isReportDeadline && (() => {
                  const hasReportDelay = compliance.some((a) => a.type === 'informe-atrasado');
                  const hasReportWarning = compliance.some((a) => a.type === 'informe-por-vencer');
                  let textColor = '#4f46e5';
                  let bgColor = '#e0e7ff';
                  let borderColor = '#c7d2fe';
                  if (hasReportDelay) { textColor = '#b91c1c'; bgColor = '#fee2e2'; borderColor = '#fca5a5'; }
                  else if (hasReportWarning) { textColor = '#b45309'; bgColor = '#fef3c7'; borderColor = '#fde047'; }
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: textColor, backgroundColor: bgColor, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${borderColor}` }}>
                        INF{reportCourseNum}
                      </span>
                    </div>
                  );
                })()}
                {!readOnly && compStatus.hasBar && (
                  <div style={{ height: '4px', width: '90%', background: compStatus.isOk ? '#10b981' : '#ef4444', borderRadius: '2px', marginTop: 'auto', marginBottom: '2px', transition: 'all 0.2s ease' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Title bar */}
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
      </div>

      {/* Vertical scroll container with months */}
      <div ref={scrollRef} className="calendar-scroll-wrapper">
        <div className="cal-month-grid" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(180deg, var(--nota-color, #2563EB), color-mix(in srgb, var(--nota-color, #2563EB) 80%, #000))', margin: 0, padding: '5px 8px' }}>
          {DAY_NAMES_SHORT.map((d, i) => (
            <div key={i} className="mini-month-head" style={{ color: '#ffffff' }}>{d}</div>
          ))}
        </div>

        {months.map((m) => renderMonthBlock(m))}
      </div>

      {/* Popover */}
      {popoverDate && (
        <>
          <div onClick={() => { setPopoverDate(null); }} onWheel={(e) => e.preventDefault()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 8999 }} />
          {renderPopoverPanel()}
        </>
      )}
    </>
  );
}





