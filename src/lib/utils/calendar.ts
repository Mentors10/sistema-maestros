// ============================================================
// Utilidades de calendario
// ============================================================

import { HorarioSlot } from '@/types';

/** Nombres de días empezando por lunes */
export const DAY_NAMES_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Obtiene los días del mes con padding para empezar en lunes.
 * Retorna un array de objetos { date, dayNumber, isCurrentMonth, isToday }
 */
export function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Día de la semana del primer día (0=Domingo). Convertir a lunes-base
  let startDow = firstDay.getDay(); // 0=Dom, 1=Lun...
  startDow = startDow === 0 ? 6 : startDow - 1; // 0=Lun, 6=Dom

  const days: {
    date: Date;
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  // Días del mes anterior para relleno
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: d,
      dateStr: formatDateStr(d),
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: d.getTime() === today.getTime(),
    });
  }

  // Días del mes actual
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      dateStr: formatDateStr(d),
      dayNumber: i,
      isCurrentMonth: true,
      isToday: d.getTime() === today.getTime(),
    });
  }

  // Rellenar al final hasta completar la última semana
  while (days.length % 7 !== 0) {
    const nextDay = days.length - startDow - lastDay.getDate() + 1;
    const d = new Date(year, month + 1, nextDay);
    days.push({
      date: d,
      dateStr: formatDateStr(d),
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: d.getTime() === today.getTime(),
    });
  }

  return days;
}

/**
 * Obtiene SOLO los días del mes actual (sin relleno de meses anteriores/siguientes).
 * Útil para vista de calendario apilado donde los meses están uno debajo del otro.
 */
export function getCurrentMonthDays(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startDow = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const days: {
    date: Date;
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    emptyCells: number;
  }[] = [];

  // First day's position in the week (Mon=0 .. Sun=6)
  // We store emptyCells so the grid can start at the right column
  let firstEmptyCells = startDow;

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      dateStr: formatDateStr(d),
      dayNumber: i,
      isCurrentMonth: true,
      isToday: d.getTime() === today.getTime(),
      emptyCells: i === 1 ? firstEmptyCells : 0,
    });
  }

  return days;
}

/** Formatea Date a "YYYY-MM-DD" */
export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Obtiene los slots de un día específico */
export function getSlotsForDate(slots: HorarioSlot[], dateStr: string): HorarioSlot[] {
  return slots.filter((s) => s.date === dateStr);
}

/** Calcula total de horas de un conjunto de slots */
export function getTotalHours(slots: HorarioSlot[]): number {
  return slots.reduce((sum, s) => sum + (s.hours || 0), 0);
}

/** Calcula total de horas por tipo de curso */
export function getHoursByCourse(slots: HorarioSlot[]): Record<string, number> {
  const result: Record<string, number> = {};
  slots.forEach((s) => {
    const key = String(s.course);
    result[key] = (result[key] || 0) + (s.hours || 0);
  });
  return result;
}

/**
 * Determina los rangos suaves entre curso y socialización.
 * Devuelve un Map de dateStr -> courseNumber para los días intermedios.
 */
export function getCourseRanges(slots: HorarioSlot[]): Map<string, number> {
  const ranges = new Map<string, number>();

  for (const courseNum of [1, 2, 3, 4]) {
    // Encontrar fechas de curso y de socialización correspondiente
    const courseSlots = slots.filter((s) => Number(s.course) === courseNum);
    const socSlots = slots.filter((s) => String(s.course) === `soc${courseNum}`);

    if (courseSlots.length === 0 || socSlots.length === 0) continue;

    // Encontrar la primera fecha del curso y la primera fecha de socialización
    const courseDates = courseSlots.map((s) => parseLocalDate(s.date)).sort((a, b) => a.getTime() - b.getTime());
    const socDates = socSlots.map((s) => parseLocalDate(s.date)).sort((a, b) => a.getTime() - b.getTime());

    const firstCourseDate = courseDates[0];
    const firstSocDate = socDates[0];

    if (firstCourseDate >= firstSocDate) continue;

    // Llenar los días intermedios (desde el primer día de clase hasta la socialización)
    const current = new Date(firstCourseDate);
    current.setDate(current.getDate() + 1);
    while (current < firstSocDate) {
      ranges.set(formatDateStr(current), courseNum);
      current.setDate(current.getDate() + 1);
    }
  }

  return ranges;
}

export interface ReportRangeInfo {
  courseNum: number;
  isDeadline: boolean;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getReportRanges(slots: HorarioSlot[]): Map<string, ReportRangeInfo> {
  const reportRanges = new Map<string, ReportRangeInfo>();

  for (const courseNum of [1, 2, 3, 4]) {
    const socSlots = slots.filter((s) => String(s.course) === `soc${courseNum}`);
    if (socSlots.length === 0) continue;

    const socDates = socSlots.map((s) => parseLocalDate(s.date)).sort((a, b) => a.getTime() - b.getTime());
    const socDate = socDates[0];

    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const current = new Date(socDate);
      current.setDate(current.getDate() + dayOffset);
      const dateStr = formatDateStr(current);
      
      reportRanges.set(dateStr, {
        courseNum,
        isDeadline: dayOffset === 5
      });
    }
  }

  return reportRanges;
}

/**
 * Auto-asigna número de socialización basado en la fecha del curso más cercano.
 * Si se agrega SOC genérico, determina si es SOC1, SOC2, SOC3 o SOC4.
 */
export function autoAssignSocNumber(
  slots: HorarioSlot[],
  newDate: string,
  type: 'soc' | 'eval'
): string {
  const d = new Date(newDate);

  // Buscar el curso más cercano anterior a la fecha
  let bestCourse = 0;
  let bestDiff = Infinity;

  for (const courseNum of [1, 2, 3, 4]) {
    const courseSlots = slots.filter((s) => Number(s.course) === courseNum);
    if (courseSlots.length === 0) continue;

    const lastDate = courseSlots
      .map((s) => new Date(s.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const diff = d.getTime() - lastDate.getTime();
    if (diff >= 0 && diff < bestDiff) {
      bestDiff = diff;
      bestCourse = courseNum;
    }
  }

  // Si no se encontró por fecha, usar el primer número faltante
  if (bestCourse === 0) {
    for (const n of [1, 2, 3, 4]) {
      const existing = slots.filter((s) => String(s.course) === `${type}${n}`);
      if (existing.length === 0) {
        bestCourse = n;
        break;
      }
    }
    if (bestCourse === 0) bestCourse = 1;
  }

  return `${type}${bestCourse}`;
}

/** Parsea la fecha de inicio del curso a Date */
export function parseFechaInicio(fechaStr: string): Date | null {
  if (!fechaStr) return null;
  const d = new Date(fechaStr);
  return isNaN(d.getTime()) ? null : d;
}

/** Formatea fecha para display */
export function formatFechaDisplay(fechaStr: string): string {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return fechaStr;
  return d.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
