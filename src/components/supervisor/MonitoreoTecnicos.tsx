'use client';

import { useMemo } from 'react';
import { Curso, Tecnico } from '@/types';
import { BarChart3 } from 'lucide-react';

interface MonitoreoTecnicosProps {
  cursos: Curso[];
  tecnicos: Tecnico[];
}

export default function MonitoreoTecnicos({ cursos, tecnicos }: MonitoreoTecnicosProps) {
  const stats = useMemo(() => {
    // Map of carnet -> tech statistics
    const techStatsMap = new Map<string, {
      nombre: string;
      totalCursos: number;
      distritos: Set<string>;
      ejecutados: number;
      porEjecutar: number;
    }>();

    // Initialize all technicians
    tecnicos.forEach((t) => {
      techStatsMap.set(t.carnet, {
        nombre: t.nombre,
        totalCursos: 0,
        distritos: new Set<string>(),
        ejecutados: 0,
        porEjecutar: 0,
      });
    });

    // Populate from courses
    cursos.forEach((c) => {
      const tKey = c.tecnico_carnet;
      if (!tKey) return;
      
      let stat = techStatsMap.get(tKey);
      if (!stat) {
        // Fallback if technician is not in the list
        stat = {
          nombre: c.tecnico_nombre || 'Sin nombre',
          totalCursos: 0,
          distritos: new Set<string>(),
          ejecutados: 0,
          porEjecutar: 0,
        };
        techStatsMap.set(tKey, stat);
      }

      stat.totalCursos++;
      if (c.distrito) {
        stat.distritos.add(c.distrito);
      }
      if (c.estado === 'EJECUTADO') {
        stat.ejecutados++;
      } else {
        stat.porEjecutar++;
      }
    });

    return Array.from(techStatsMap.values())
      .filter((s) => s.totalCursos > 0) // only show active ones
      .sort((a, b) => b.totalCursos - a.totalCursos);
  }, [cursos, tecnicos]);

  if (stats.length === 0) return null;

  return (
    <div className="monitoreo-tecnicos-panel" style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      marginBottom: 'var(--space-6)',
      boxShadow: 'var(--shadow-lg)'
    }}>
      <div className="ciclos-proximos-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-200)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-900)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <BarChart3 size={18} /> Monitoreo de Cursos y Distritos por Técnico
        </h3>
        <span className="ciclos-proximos-count">{stats.length} Técnico{stats.length > 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1.5px solid var(--gray-200)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.25s ease',
          }}
          className="tecnico-monitoreo-card"
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary-900)' }}>
                👨‍💻 {stat.nombre}
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>{stat.totalCursos}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', marginTop: '2px' }}>
                  Cursos
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{stat.distritos.size}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', marginTop: '2px' }}>
                  Distritos
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ color: '#475569' }}>Ejecutados:</span>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>{stat.ejecutados}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ color: '#475569' }}>Por ejecutar / En curso:</span>
                <span style={{ color: '#d97706', fontWeight: 800 }}>{stat.porEjecutar}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
              <span style={{ fontWeight: 700 }}>Distritos:</span>
              {Array.from(stat.distritos).map((d) => (
                <span key={d} style={{ background: '#e2e8f0', color: '#334155', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
