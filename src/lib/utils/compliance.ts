// ============================================================
// Utilidades de compliance / alertas operativas
// ============================================================

import { Curso, HorarioSlot } from '@/types';

export interface ComplianceAlert {
  type: string;
  label: string;
  severity: 'ok' | 'info' | 'warn' | 'danger';
  icon: string;
  pulse?: boolean;
}

/**
 * Calcula alertas operativas para una nota/curso.
 * Basado en fechas del calendario, checks y estado actual.
 */
export function getNoteCompliance(curso: Curso): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const slots = curso.horarios_tentativos || [];

  // Fechas de cursos, socializaciones y evaluaciones
  const courseSlots = slots.filter((s) => typeof s.course === 'number' || ['1','2','3','4'].includes(String(s.course)));
  const socSlots = slots.filter((s) => String(s.course).startsWith('soc'));
  const evalSlots = slots.filter((s) => String(s.course).startsWith('eval'));

  // Encontrar primera y última fecha de curso
  const allDates = slots.map((s) => new Date(s.date)).filter((d) => !isNaN(d.getTime()));
  const courseDates = courseSlots.map((s) => new Date(s.date)).filter((d) => !isNaN(d.getTime()));

  if (courseDates.length === 0 && curso.estado !== 'EJECUTADO') {
    alerts.push({
      type: 'sin-fecha',
      label: 'Sin fechas programadas',
      severity: 'warn',
      icon: 'CalendarX',
    });
    return alerts;
  }

  const firstCourse = courseDates.length > 0 ? new Date(Math.min(...courseDates.map((d) => d.getTime()))) : null;
  const lastCourse = courseDates.length > 0 ? new Date(Math.max(...courseDates.map((d) => d.getTime()))) : null;

  // Estado ejecutado
  if (curso.estado === 'EJECUTADO') {
    // Verificar informes pendientes
    if (!curso.informe_final_recibido && socSlots.length > 0) {
      const lastSocDate = new Date(Math.max(...socSlots.map((s) => new Date(s.date).getTime())));
      const daysSince = Math.floor((now.getTime() - lastSocDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 10) {
        alerts.push({
          type: 'informe-atrasado',
          label: `Informe atrasado (${daysSince} días)`,
          severity: 'danger',
          icon: 'FileWarning',
          pulse: true,
        });
      } else if (daysSince > 3) {
        alerts.push({
          type: 'informe-por-vencer',
          label: `Informe por vencer (${daysSince}/5 días)`,
          severity: 'warn',
          icon: 'FileClock',
          pulse: true,
        });
      }
    }

    if (curso.planificacion_recibida && curso.evaluacion_realizada && curso.informe_final_recibido) {
      alerts.push({
        type: 'completo',
        label: 'Curso completado',
        severity: 'ok',
        icon: 'CheckCircle2',
      });
    }
    return alerts;
  }

  // Curso por ejecutar
  if (firstCourse) {
    const daysUntil = Math.floor((firstCourse.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil > 14) {
      alerts.push({
        type: 'planificado',
        label: `Inicia en ${daysUntil} días`,
        severity: 'info',
        icon: 'Calendar',
      });
    } else if (daysUntil > 3) {
      alerts.push({
        type: 'proximo',
        label: `Próximo (${daysUntil} días)`,
        severity: 'warn',
        icon: 'CalendarClock',
        pulse: true,
      });
    } else if (daysUntil > 0) {
      alerts.push({
        type: 'inminente',
        label: `¡Inicia en ${daysUntil} día${daysUntil > 1 ? 's' : ''}!`,
        severity: 'danger',
        icon: 'AlertTriangle',
        pulse: true,
      });
    } else if (daysUntil === 0) {
      alerts.push({
        type: 'hoy',
        label: '¡Curso hoy!',
        severity: 'danger',
        icon: 'Zap',
        pulse: true,
      });
    } else {
      // Ya pasó la fecha de inicio
      if (lastCourse && now <= lastCourse) {
        alerts.push({
          type: 'en-proceso',
          label: 'Curso en proceso',
          severity: 'info',
          icon: 'Play',
        });
      } else {
        alerts.push({
          type: 'curso-terminado',
          label: 'Curso terminado (marcar ejecutado)',
          severity: 'warn',
          icon: 'CheckSquare',
        });
      }
    }
  }

  // Planificación
  if (!curso.planificacion_recibida) {
    if (firstCourse) {
      const daysUntil = Math.floor((firstCourse.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7 && daysUntil > 0) {
        alerts.push({
          type: 'planificacion-requerida',
          label: 'Planificación requerida',
          severity: 'warn',
          icon: 'FileText',
        });
      } else if (daysUntil <= 0) {
        alerts.push({
          type: 'planificacion-atrasada',
          label: 'Planificación atrasada',
          severity: 'danger',
          icon: 'FileX',
          pulse: true,
        });
      }
    }
  } else {
    alerts.push({
      type: 'planificacion-ok',
      label: 'Planificación ✓',
      severity: 'ok',
      icon: 'FileCheck',
    });
  }

  // Socialización pendiente
  if (courseSlots.length > 0 && socSlots.length === 0) {
    alerts.push({
      type: 'soc-pendiente',
      label: 'SOC sin programar',
      severity: 'warn',
      icon: 'Users',
    });
  }

  // Evaluación
  if (!curso.evaluacion_realizada) {
    if (evalSlots.length > 0) {
      const nextEval = evalSlots
        .map((s) => new Date(s.date))
        .filter((d) => d >= now)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (nextEval) {
        const daysUntilEval = Math.floor((nextEval.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilEval <= 3) {
          alerts.push({
            type: 'eval-proxima',
            label: `Evaluación en ${daysUntilEval} días`,
            severity: 'warn',
            icon: 'ClipboardCheck',
            pulse: true,
          });
        }
      }

      const pastEvals = evalSlots.filter((s) => new Date(s.date) < now);
      if (pastEvals.length > 0) {
        alerts.push({
          type: 'eval-pendiente',
          label: 'Evaluación pendiente de registro',
          severity: 'danger',
          icon: 'ClipboardX',
          pulse: true,
        });
      }
    }
  } else {
    alerts.push({
      type: 'eval-ok',
      label: 'Evaluación ✓',
      severity: 'ok',
      icon: 'ClipboardCheck',
    });
  }

  // Sin alertas críticas
  if (alerts.length === 0) {
    alerts.push({
      type: 'sin-alertas',
      label: 'Sin alertas críticas',
      severity: 'ok',
      icon: 'CheckCircle',
    });
  }

  return alerts;
}

/**
 * Obtiene conteo de alertas por tipo para el filtro superior
 */
export function getAlertCounts(cursos: Curso[]): Record<string, number> {
  const counts: Record<string, number> = {};
  cursos.forEach((c) => {
    const alerts = getNoteCompliance(c);
    alerts.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
  });
  return counts;
}

/**
 * Filtra cursos que tienen una alerta específica
 */
export function filterByAlert(cursos: Curso[], alertType: string): Curso[] {
  if (alertType === 'todas') return cursos;
  return cursos.filter((c) => {
    const alerts = getNoteCompliance(c);
    return alerts.some((a) => a.type === alertType);
  });
}

/**
 * Obtiene el total de alertas que requieren revisión
 */
export function getReviewCount(cursos: Curso[]): number {
  let count = 0;
  cursos.forEach((c) => {
    const alerts = getNoteCompliance(c);
    if (alerts.some((a) => a.severity === 'warn' || a.severity === 'danger')) {
      count++;
    }
  });
  return count;
}
