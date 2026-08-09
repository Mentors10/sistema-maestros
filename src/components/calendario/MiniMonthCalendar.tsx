'use client';

import { useState, useMemo } from 'react';
import { HorarioSlot } from '@/types';
import {
  getCurrentMonthDays, MONTH_NAMES, autoAssignSocNumber
} from '@/lib/utils/calendar';
import { Zap, Printer, Clock } from 'lucide-react';
import { ComplianceAlert } from '@/lib/utils/compliance';

interface MiniMonthCalendarProps {
  slots: HorarioSlot[];
  onSaveSlots: (slots: HorarioSlot[]) => void;
  noteColor?: string;
  initialDate?: Date;
  compliance?: ComplianceAlert[];
  planificacionRecibida?: boolean;
  evaluacionRealizada?: boolean;
  informeFinalRecibido?: boolean;
  onToggleCheck?: (field: 'planificacion_recibida' | 'evaluacion_realizada' | 'informe_final_recibido') => void;
  readOnly?: boolean;
}

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS_OF_WEEK = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const formatLetterDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, monthIdx, day);
  const dayName = DAYS_OF_WEEK[dateObj.getDay()] || '';
  
  return `${dayName} ${day}/${MONTH_ABBR[monthIdx] || parts[1]}`;
};

const getFullActivityLabel = (course: number | string): string => {
  const key = String(course);
  if (key === '1') return 'C1';
  if (key === '2') return 'C2';
  if (key === '3') return 'C3';
  if (key === '4') return 'C4';
  if (key.startsWith('soc')) {
    const num = key.replace('soc', '');
    return `Soc ${num}`.trim();
  }
  if (key.startsWith('eval')) {
    const num = key.replace('eval', '');
    return `Eval ${num}`.trim();
  }
  return key.toUpperCase();
};

const ACT_LABELS: Record<string, string> = {
  '1': 'C1',
  '2': 'C2',
  '3': 'C3',
  '4': 'C4',
  'soc': 'Soc',
  'eval': 'Eval',
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

export default function MiniMonthCalendar({
  slots,
  onSaveSlots,
  initialDate,
  readOnly = false,
}: MiniMonthCalendarProps) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [newCourse, setNewCourse] = useState('1');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('12:00');
  const [newDate, setNewDate] = useState(initialDate ? initialDate.toISOString().split('T')[0] : todayStr);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Automated scheduling states
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [autoStartDate, setAutoStartDate] = useState(newDate);
  const [autoStartHour, setAutoStartHour] = useState('08:00');
  const [autoEndHour, setAutoEndHour] = useState('12:00');
  const [autoNumCourses, setAutoNumCourses] = useState(3);
  const [autoPreview, setAutoPreview] = useState<HorarioSlot[]>([]);
  const [autoAudience, setAutoAudience] = useState<'estudiantes' | 'maestros'>('estudiantes');

  const TIME_OPTIONS = useMemo(() => {
    const opts: string[] = [];
    for (let h = 6; h <= 22; h++) {
      opts.push(`${String(h).padStart(2, '0')}:00`);
      opts.push(`${String(h).padStart(2, '0')}:30`);
    }
    return opts;
  }, []);

  const totalHours = useMemo(() => slots.reduce((sum, s) => sum + (s.hours || 0), 0), [slots]);

  const handleAddSlot = () => {
    if (!newDate) return;
    let courseValue: number | string = newCourse;
    if (['1', '2', '3', '4'].includes(newCourse)) {
      courseValue = parseInt(newCourse);
    } else if (newCourse === 'soc') {
      courseValue = autoAssignSocNumber(slots, newDate, 'soc');
    } else if (newCourse === 'eval') {
      courseValue = autoAssignSocNumber(slots, newDate, 'eval');
    }
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
    const newSlot: HorarioSlot = {
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      hours: Math.max(hours, 0),
      course: courseValue,
      hour: sh,
      minute: sm,
      endHour: eh,
      endMinute: em,
    };
    
    if (editingSlotIndex !== null) {
      const updatedSlots = [...slots];
      updatedSlots[editingSlotIndex] = newSlot;
      onSaveSlots(updatedSlots);
      setEditingSlotIndex(null);
    } else {
      onSaveSlots([...slots, newSlot]);
    }
  };

  const handleDeleteSlot = (globalIndex: number) => {
    const newSlots = slots.filter((_, i) => i !== globalIndex);
    onSaveSlots(newSlots);
  };

  const handleDuplicateSlot = (slot: HorarioSlot) => {
    const newSlot = { ...slot };
    const idx = slots.indexOf(slot);
    if (idx !== -1) {
      const updatedSlots = [...slots];
      updatedSlots.splice(idx + 1, 0, newSlot);
      onSaveSlots(updatedSlots);
      setEditingSlotIndex(idx + 1);
    } else {
      onSaveSlots([...slots, newSlot]);
    }
  };

  const handleEditSlotSelect = (slot: HorarioSlot, globalIndex: number) => {
    setEditingSlotIndex(globalIndex);
    setNewDate(slot.date);
    const courseKey = String(slot.course);
    const baseType = courseKey.replace(/\d+$/, '') || courseKey;
    setNewCourse(baseType === 'soc' || baseType === 'eval' ? baseType : String(parseInt(courseKey)));
    setNewStart(slot.startTime);
    setNewEnd(slot.endTime);
  };

  // Generate automated preview slots
  const generateAutoPreview = () => {
    if (!autoStartDate) return;
    const [sh, sm] = autoStartHour.split(':').map(Number);
    const [eh, em] = autoEndHour.split(':').map(Number);
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
    if (hours <= 0) return;
    const preview: HorarioSlot[] = [];
    const startDate = new Date(autoStartDate + 'T12:00:00');

    const addHoursToTime = (timeStr: string, hToAdd: number) => {
      const [h, m] = timeStr.split(':').map(Number);
      const newH = (h + hToAdd) % 24;
      return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const courseDuration = autoAudience === 'estudiantes' ? 30 : 14;

    for (let courseNum = 1; courseNum <= autoNumCourses; courseNum++) {
      const courseStart = new Date(startDate);
      courseStart.setDate(courseStart.getDate() + (courseNum - 1) * courseDuration);

      const socStart = autoStartHour;
      const socEnd = addHoursToTime(autoStartHour, 3);
      const evalStart = socEnd;
      const evalEnd = addHoursToTime(autoStartHour, 4);

      if (autoAudience === 'estudiantes') {
        for (let session = 0; session < 3; session++) {
          const sessionDate = new Date(courseStart);
          sessionDate.setDate(sessionDate.getDate() + session * 7);
          const dateStr = sessionDate.toISOString().split('T')[0];
          preview.push({ date: dateStr, startTime: autoStartHour, endTime: autoEndHour, hours: Math.max(hours, 0), course: courseNum, hour: sh, minute: sm, endHour: eh, endMinute: em });
        }
        const socEvalDate = new Date(courseStart);
        socEvalDate.setDate(socEvalDate.getDate() + 30);
        const dateStr = socEvalDate.toISOString().split('T')[0];

        const [socSh, socSm] = socStart.split(':').map(Number);
        const [socEh, socEm] = socEnd.split(':').map(Number);
        preview.push({ date: dateStr, startTime: socStart, endTime: socEnd, hours: 3, course: `soc${courseNum}`, hour: socSh, minute: socSm, endHour: socEh, endMinute: socEm });

        const [evSh, evSm] = evalStart.split(':').map(Number);
        const [evEh, evEm] = evalEnd.split(':').map(Number);
        preview.push({ date: dateStr, startTime: evalStart, endTime: evalEnd, hours: 1, course: `eval${courseNum}`, hour: evSh, minute: evSm, endHour: evEh, endMinute: evEm });
      } else {
        for (let session = 0; session < 3; session++) {
          const sessionDate = new Date(courseStart);
          sessionDate.setDate(sessionDate.getDate() + session * 2);
          const dateStr = sessionDate.toISOString().split('T')[0];
          preview.push({ date: dateStr, startTime: autoStartHour, endTime: autoEndHour, hours: Math.max(hours, 0), course: courseNum, hour: sh, minute: sm, endHour: eh, endMinute: em });
        }
        const socEvalDate14 = new Date(courseStart);
        socEvalDate14.setDate(socEvalDate14.getDate() + 14);
        const dateStr14 = socEvalDate14.toISOString().split('T')[0];

        const [socSh, socSm] = socStart.split(':').map(Number);
        const [socEh, socEm] = socEnd.split(':').map(Number);
        preview.push({ date: dateStr14, startTime: socStart, endTime: socEnd, hours: 3, course: `soc${courseNum}`, hour: socSh, minute: socSm, endHour: socEh, endMinute: socEm });

        const [evSh, evSm] = evalStart.split(':').map(Number);
        const [evEh, evEm] = evalEnd.split(':').map(Number);
        preview.push({ date: dateStr14, startTime: evalStart, endTime: evalEnd, hours: 1, course: `eval${courseNum}`, hour: evSh, minute: evSm, endHour: evEh, endMinute: evEm });
      }
    }
    setAutoPreview(preview);
  };

  const handleConfirmAutoSchedule = () => {
    if (autoPreview.length === 0) return;
    onSaveSlots(autoPreview);
    setShowAutoSchedule(false);
    setAutoPreview([]);
  };

  // Group slots by date and sort
  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => a.date.localeCompare(b.date));
  }, [slots]);

  // Find the active row closest to today's date
  const activeRowIndex = useMemo(() => {
    if (sortedSlots.length === 0) return -1;
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    let closestIdx = 0;
    let minDiff = Infinity;

    sortedSlots.forEach((s, idx) => {
      const sMs = new Date(s.date + 'T00:00:00').getTime();
      const diff = Math.abs(sMs - todayMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    return closestIdx;
  }, [sortedSlots, todayStr]);

  // Printable A4 Monthly Calendar Generator
  const handlePrintCalendar = () => {
    const printWin = window.open('', '_blank', 'width=1100,height=850');
    if (!printWin) return;

    const firstDateStr = slots.length > 0 ? slots[0].date : (initialDate ? initialDate.toISOString().split('T')[0] : todayStr);
    const dParts = firstDateStr.split('-');
    const printYear = parseInt(dParts[0], 10);
    const printMonthIdx = parseInt(dParts[1], 10) - 1;
    const monthName = MONTH_NAMES[printMonthIdx] || 'Actual';

    const monthDays = getCurrentMonthDays(printYear, printMonthIdx);
    const slotsByDate: Record<string, HorarioSlot[]> = {};
    slots.forEach(s => {
      if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
      slotsByDate[s.date].push(s);
    });

    let calendarCellsHtml = '';
    const firstEmpty = monthDays[0]?.emptyCells || 0;
    for (let i = 0; i < firstEmpty; i++) {
      calendarCellsHtml += `<div style="background:#f8fafc;border:1px solid #cbd5e1;min-height:75px;"></div>`;
    }

    monthDays.forEach(dayObj => {
      const dateKey = dayObj.dateStr;
      const daySlots = slotsByDate[dateKey] || [];
      let slotsMarkup = '';

      daySlots.forEach(s => {
        const cKey = String(s.course);
        const baseKey = cKey.replace(/\d+$/, '') || cKey;
        const color = ACT_COLORS[baseKey] || ACT_COLORS[cKey] || '#1d4ed8';
        const label = getFullActivityLabel(s.course);
        slotsMarkup += `<div style="background:${color};color:#fff;font-size:7pt;padding:2px 4px;border-radius:3px;margin-top:2px;font-weight:bold;">${label}: ${s.startTime}-${s.endTime} (${s.hours}h)</div>`;
      });

      const dayClass = dayObj.isCurrentMonth ? 'background:#ffffff;' : 'background:#f8fafc;color:#94a3b8;';
      calendarCellsHtml += `
        <div style="border:1px solid #cbd5e1;min-height:75px;padding:4px;box-sizing:border-box;${dayClass}">
          <div style="font-weight:bold;font-size:9pt;text-align:right;color:#334155;">${dayObj.dayNumber}</div>
          ${slotsMarkup}
        </div>
      `;
    });

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Calendario Académico UNEFCO - ${monthName} ${printYear}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #0d3b66; padding-bottom: 10px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 16pt; color: #0d3b66; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p { margin: 3px 0 0 0; font-size: 9.5pt; color: #64748b; font-weight: 600; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; font-size: 9pt; margin-bottom: 12px; border: 1px solid #cbd5e1; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; background: #cbd5e1; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
    .day-name { background: #0d3b66; color: #ffffff; font-weight: bold; text-align: center; padding: 6px 2px; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 120px; margin-top: 35px; padding: 0 50px; }
    .sig-box { border-top: 1.5px dashed #475569; text-align: center; padding-top: 6px; font-size: 9pt; font-weight: bold; color: #334155; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>UNEFCO &middot; CALENDARIO ACADÉMICO OFICIAL</h1>
      <p>Cronograma Programado de Actividades y Sesiones de Formación</p>
    </div>
    <div style="text-align:right;">
      <span style="font-weight:bold;font-size:12pt;color:#0d3b66;">${monthName.toUpperCase()} ${printYear}</span><br>
      <span style="font-size:9pt;color:#475569;">Total Carga Horaria: <b>${totalHours} HORAS</b></span>
    </div>
  </div>

  <div class="meta-grid">
    <div><b>Mes / Gestión:</b> ${monthName} ${printYear}</div>
    <div><b>Sesiones Cargadas:</b> ${slots.length} sesiones</div>
    <div><b>Total Horas:</b> ${totalHours} hrs acumuladas</div>
    <div><b>Fecha de Emisión:</b> ${new Date().toLocaleDateString('es-BO')}</div>
  </div>

  <div class="cal-grid">
    <div class="day-name">Domingo</div>
    <div class="day-name">Lunes</div>
    <div class="day-name">Martes</div>
    <div class="day-name">Miércoles</div>
    <div class="day-name">Jueves</div>
    <div class="day-name">Viernes</div>
    <div class="day-name">Sábado</div>
    ${calendarCellsHtml}
  </div>

  <div style="margin-top:12px;font-size:8.5pt;color:#475569;background:#f8fafc;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
    <b>Leyenda de Actividades:</b>
    <span><span style="display:inline-block;width:10px;height:10px;background:#1D4ED8;border-radius:2px;margin-right:3px;"></span> C1</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#047857;border-radius:2px;margin-right:3px;"></span> C2</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#B45309;border-radius:2px;margin-right:3px;"></span> C3</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#6D28D9;border-radius:2px;margin-right:3px;"></span> C4</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#0F172A;border-radius:2px;margin-right:3px;"></span> Soc</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#B91C1C;border-radius:2px;margin-right:3px;"></span> Eval</span>
  </div>

  <div class="signatures">
    <div class="sig-box">Firma del Facilitador / Docente</div>
    <div class="sig-box">Firma del Técnico de Seguimiento UNEFCO</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Header Bar */}
      <div style={{ background: 'linear-gradient(135deg, #0d3b66 0%, #1a5276 100%)', color: '#ffffff', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#ffffff" />
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.3px' }}>
            Programación ({totalHours}h acumuladas)
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAutoSchedule(!showAutoSchedule)}
              style={{
                background: showAutoSchedule ? '#8b5cf6' : 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={showAutoSchedule ? 'Cerrar Auto Programación' : 'Auto Programar Sesiones'}
            >
              <Zap size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintCalendar}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
            }}
            title="Imprimir Calendario A4 (PDF)"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Auto-Schedule Drawer */}
      {showAutoSchedule && (
        <div style={{ borderBottom: '1.5px solid #8b5cf6', padding: '12px 14px', background: '#faf5ff' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Configurar Programación Automática
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: '130px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>Fecha Inicio</label>
              <input type="date" value={autoStartDate} onChange={(e) => { setAutoStartDate(e.target.value); setAutoPreview([]); }} style={{ padding: '5px', fontSize: '0.8rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }} />
            </div>
            <div style={{ width: '80px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>De</label>
              <select value={autoStartHour} onChange={(e) => { setAutoStartHour(e.target.value); setAutoPreview([]); }} style={{ padding: '5px', fontSize: '0.8rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ width: '80px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>A</label>
              <select value={autoEndHour} onChange={(e) => { setAutoEndHour(e.target.value); setAutoPreview([]); }} style={{ padding: '5px', fontSize: '0.8rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ width: '110px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>Público</label>
              <select value={autoAudience} onChange={(e) => { setAutoAudience(e.target.value as 'estudiantes' | 'maestros'); setAutoPreview([]); }} style={{ padding: '5px', fontSize: '0.8rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                <option value="estudiantes">Estudiantes (35d)</option>
                <option value="maestros">Maestros/as (14d)</option>
              </select>
            </div>
            <div style={{ width: '85px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>Cursos</label>
              <select value={autoNumCourses} onChange={(e) => { setAutoNumCourses(Number(e.target.value)); setAutoPreview([]); }} style={{ padding: '5px', fontSize: '0.8rem', width: '100%', border: '1px solid #c4b5fd', borderRadius: '4px' }}>
                <option value={3}>3 Cursos</option>
                <option value={4}>4 Cursos</option>
              </select>
            </div>
            <button type="button" onClick={generateAutoPreview} disabled={!autoStartDate} style={{ padding: '5px 12px', background: autoStartDate ? '#8b5cf6' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem', cursor: autoStartDate ? 'pointer' : 'not-allowed' }}>
              Generar Vista Previa
            </button>
          </div>

          {autoPreview.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Se generarán <b>{autoPreview.length}</b> sesiones automáticas:
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setAutoPreview([])} style={{ padding: '4px 10px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmAutoSchedule} style={{ padding: '4px 12px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={13} /> Confirmar {autoPreview.length} Sesiones
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <div style={{ padding: '12px' }}>
        {/* Quick Session Adder */}
        {!readOnly && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '6px' }}>
              {editingSlotIndex !== null ? '✏️ Editar Sesión Programada' : '➕ Agregar Nueva Sesión'}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '125px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>Fecha</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '110px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>Actividad</label>
                <select value={newCourse} onChange={(e) => setNewCourse(e.target.value)} style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  {ACT_OPTIONS.map(act => (
                    <option key={act} value={act}>{ACT_LABELS[act]}</option>
                  ))}
                </select>
              </div>
              <div style={{ width: '85px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>De</label>
                <select value={newStart} onChange={(e) => setNewStart(e.target.value)} style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ width: '85px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>A</label>
                <select value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={{ padding: '4px 6px', fontSize: '0.8rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '14px' }}>
                {editingSlotIndex !== null && (
                  <button type="button" onClick={() => setEditingSlotIndex(null)} style={{ padding: '5px 8px', fontSize: '0.75rem', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
                <button type="button" onClick={handleAddSlot} style={{ padding: '5px 12px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}>
                  {editingSlotIndex !== null ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions Table List with max 6 rows scrollbar & active row border highlight */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', maxHeight: '225px', overflowY: 'auto' }}>
          {sortedSlots.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              No hay sesiones programadas aún. Haz clic en el ícono de rayo para auto-programar o agrega sesiones manualmente arriba.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, color: '#475569', borderBottom: '2px solid #cbd5e1' }}>Fecha</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, color: '#475569', borderBottom: '2px solid #cbd5e1' }}>Actividad</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, color: '#475569', borderBottom: '2px solid #cbd5e1' }}>Horario</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, color: '#475569', borderBottom: '2px solid #cbd5e1' }}>Horas</th>
                  {!readOnly && <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, color: '#475569', borderBottom: '2px solid #cbd5e1' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedSlots.map((s, idx) => {
                  const cKey = String(s.course);
                  const baseKey = cKey.replace(/\d+$/, '') || cKey;
                  const color = ACT_COLORS[baseKey] || ACT_COLORS[cKey] || '#1d4ed8';
                  const isEditing = idx === editingSlotIndex;
                  const isActiveToday = idx === activeRowIndex;

                  // Active red border style taking today's date
                  const borderStyle = isActiveToday
                    ? { outline: '2px solid #ef4444', outlineOffset: '-2px', backgroundColor: '#fef2f2' }
                    : (isEditing ? { backgroundColor: '#eff6ff' } : { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' });

                  return (
                    <tr key={idx} style={{ ...borderStyle, borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1e293b' }}>
                        {formatLetterDate(s.date)}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ background: color, color: '#ffffff', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900 }}>
                          {getFullActivityLabel(s.course)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569' }}>
                        {s.startTime} - {s.endTime}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, color: '#059669' }}>
                        {s.hours}h
                      </td>
                      {!readOnly && (
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button type="button" onClick={() => handleEditSlotSelect(s, idx)} style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '3px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              Editar
                            </button>
                            <button type="button" onClick={() => handleDuplicateSlot(s)} style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '3px', background: '#fef3c7', color: '#b45309', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              Duplicar
                            </button>
                            <button type="button" onClick={() => handleDeleteSlot(idx)} style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '3px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
