'use client';

import { useMemo } from 'react';
import { Curso } from '@/types';
import { Calendar, Clock, MapPin, User, TrendingUp } from 'lucide-react';

interface CiclosProximosProps {
  cursos: Curso[];
}

interface CursoProximo {
  curso: Curso;
  primeraFecha: string;
  diasRestantes: number;
  etiqueta: string;
  urgencia: 'hoy' | 'manana' | 'esta-semana' | 'proxima-semana' | 'futuro';
}

const URGENCIA_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  'hoy': { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  'manana': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  'esta-semana': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'proxima-semana': { bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' },
  'futuro': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dayNames[date.getDay()]} ${d} ${monthNames[m - 1]}`;
}

export default function CiclosProximos({ cursos }: CiclosProximosProps) {
  const cursosProximos = useMemo<CursoProximo[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().slice(0, 10);

    const resultado: CursoProximo[] = [];

    for (const curso of cursos) {
      const slots = curso.horarios_tentativos || [];
      if (slots.length === 0) continue;

      // Get the first date from all slots
      const fechas = slots.map((s) => s.date).filter(Boolean).sort();
      if (fechas.length === 0) continue;

      const primeraFecha = fechas[0];

      // Only include courses that haven't finished yet or are starting soon
      // Use the first course date
      const primeraDate = new Date(primeraFecha + 'T00:00:00');
      const diffMs = primeraDate.getTime() - now.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Only show upcoming (include today up to 60 days ahead, or recently started within 3 days)
      if (diasRestantes < -3 || diasRestantes > 60) continue;
      // Skip already executed
      if (curso.estado === 'EJECUTADO') continue;

      let etiqueta = '';
      let urgencia: CursoProximo['urgencia'] = 'futuro';

      if (diasRestantes === 0) {
        etiqueta = '¡HOY!';
        urgencia = 'hoy';
      } else if (diasRestantes === 1) {
        etiqueta = 'Mañana';
        urgencia = 'manana';
      } else if (diasRestantes < 0) {
        etiqueta = `Hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}`;
        urgencia = 'hoy';
      } else if (diasRestantes <= 7) {
        etiqueta = `En ${diasRestantes} días`;
        urgencia = 'esta-semana';
      } else if (diasRestantes <= 14) {
        etiqueta = `En ${diasRestantes} días`;
        urgencia = 'proxima-semana';
      } else {
        etiqueta = `En ${diasRestantes} días`;
        urgencia = 'futuro';
      }

      resultado.push({ curso, primeraFecha, diasRestantes, etiqueta, urgencia });
    }

    // Sort by proximity (soonest first)
    resultado.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return resultado;
  }, [cursos]);

  if (cursosProximos.length === 0) {
    return (
      <div className="ciclos-proximos-panel">
        <div className="ciclos-proximos-header">
          <h3><TrendingUp size={18} /> Ciclos Próximos a Iniciar</h3>
        </div>
        <div className="ciclos-proximos-empty">
          <Calendar size={32} style={{ opacity: 0.3 }} />
          <p>No hay ciclos próximos por iniciar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ciclos-proximos-panel">
      <div className="ciclos-proximos-header">
        <h3><TrendingUp size={18} /> Ciclos Próximos a Iniciar</h3>
        <span className="ciclos-proximos-count">{cursosProximos.length} ciclo{cursosProximos.length > 1 ? 's' : ''}</span>
      </div>

      <div className="ciclos-proximos-grid">
        {cursosProximos.map((cp) => {
          const style = URGENCIA_STYLES[cp.urgencia];
          return (
            <div key={cp.curso.id} className="ciclo-proximo-card" style={{ borderLeftColor: style.border }}>
              {/* Urgency badge */}
              <div className="ciclo-proximo-urgencia" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                <Clock size={11} />
                {cp.etiqueta}
              </div>

              {/* Ciclo name */}
              <div className="ciclo-proximo-nombre">
                {cp.curso.ciclo_nombre || cp.curso.grupo_nombre || 'Sin ciclo asignado'}
              </div>

              {/* Meta info */}
              <div className="ciclo-proximo-meta">
                <span title="Fecha de inicio">
                  <Calendar size={11} /> {formatDateShort(cp.primeraFecha)}
                </span>
                {cp.curso.distrito && (
                  <span title="Distrito">
                    <MapPin size={11} /> {cp.curso.distrito}
                  </span>
                )}
                {cp.curso.tecnico_nombre && (
                  <span title="Técnico asignado">
                    <User size={11} /> {cp.curso.tecnico_nombre}
                  </span>
                )}
              </div>

              {/* ID */}
              <div className="ciclo-proximo-id">ID: {cp.curso.id}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
