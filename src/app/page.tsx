'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Curso, Grupo, AppFilters, DEFAULT_FILTERS, Tecnico, Facilitador, CicloFormativo, AgendaContacto } from '@/types';
import { getNoteCompliance, getReviewCount } from '@/lib/utils/compliance';
import { supabase } from '@/lib/supabase/client';
import { Search, Filter, RefreshCw, Plus, LayoutGrid, CalendarDays, ChevronDown, AlertTriangle, BookOpen, Contact, Users } from 'lucide-react';
import GrupoCard from '@/components/cursos/GrupoCard';
import CursoForm from '@/components/cursos/CursoForm';
import AgendaCard from '@/components/agenda/AgendaCard';
import AgendaForm from '@/components/agenda/AgendaForm';
import ParticipantesModal from '@/components/participantes/ParticipantesModal';
import Swal from 'sweetalert2';

export default function HomePage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [ciclos, setCiclos] = useState<CicloFormativo[]>([]);
  const [agenda, setAgenda] = useState<AgendaContacto[]>([]);
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'cursos' | 'agenda'>('cursos');
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);

  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [editingContacto, setEditingContacto] = useState<AgendaContacto | null>(null);

  const [activeCursoParticipantes, setActiveCursoParticipantes] = useState<Curso | null>(null);
  const [customGrupoOrder, setCustomGrupoOrder] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('grupo_orden');
      if (stored) {
        try {
          setCustomGrupoOrder(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse group_orden from localStorage', e);
        }
      }
    }
  }, []);

  const currentModalCurso = useMemo(() => {
    if (!activeCursoParticipantes) return null;
    return cursos.find((c) => c.id === activeCursoParticipantes.id) || activeCursoParticipantes;
  }, [cursos, activeCursoParticipantes]);

  // ─── Load data ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cursosRes, tecRes, facRes, cicRes, agendaRes] = await Promise.all([
        supabase.from('cursos_enriquecidos').select('*, inscripcion_ciclo(count)').order('created_at', { ascending: false }).order('id', { ascending: true }),
        supabase.from('tecnicos').select('*').order('nombre'),
        supabase.from('facilitadores').select('*').order('nombre'),
        supabase.from('ciclos_formativos').select('*').order('grupo, nombre'),
        supabase.from('agenda_contactos').select('*').order('nombre'),
      ]);

      if (cursosRes.data) {
        const mapped = (cursosRes.data as any[]).map((c) => {
          const countVal = c.inscripcion_ciclo?.[0]?.count ?? 0;
          return {
            ...c,
            inscritos_formulario: countVal,
          };
        });
        setCursos(mapped as Curso[]);
      }
      if (tecRes.data) setTecnicos(tecRes.data as Tecnico[]);
      if (facRes.data) setFacilitadores(facRes.data as Facilitador[]);
      if (cicRes.data) setCiclos(cicRes.data as CicloFormativo[]);
      if (agendaRes.data) setAgenda(agendaRes.data as AgendaContacto[]);
    } catch (err) {
      console.error('Error loading data:', err);
      Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Filter Logic ───────────────────────────────────────────
  const filteredCursos = useMemo(() => {
    let result = [...cursos];

    // Búsqueda
    if (filters.busqueda) {
      const q = filters.busqueda.toLowerCase();
      result = result.filter((c) =>
        c.id.toLowerCase().includes(q) ||
        (c.grupo_nombre || '').toLowerCase().includes(q) ||
        (c.lugar || '').toLowerCase().includes(q) ||
        (c.distrito || '').toLowerCase().includes(q) ||
        (c.facilitador_nombre || '').toLowerCase().includes(q) ||
        (c.tecnico_nombre || '').toLowerCase().includes(q) ||
        (c.ciclo_nombre || '').toLowerCase().includes(q) ||
        (c.prev || '').toLowerCase().includes(q) ||
        (c.organizador_nombre || '').toLowerCase().includes(q)
      );
    }

    // Preventivo
    if (filters.preventivo) {
      result = result.filter((c) => (c.prev || '').includes(filters.preventivo));
    }

    // Mes
    if (filters.mes) {
      result = result.filter((c) => (c.mes || '').toUpperCase() === filters.mes.toUpperCase());
    }

    // Técnico
    if (filters.tecnico) {
      result = result.filter((c) => c.tecnico_carnet === filters.tecnico);
    }

    // Grupo
    if (filters.grupo !== 'todos') {
      result = result.filter((c) => c.grupo_nombre === filters.grupo);
    }

    // Alerta
    if (filters.alerta !== 'todas') {
      result = result.filter((c) => {
        const alerts = getNoteCompliance(c);
        return alerts.some((a) => a.type === filters.alerta);
      });
    }

    // Orden
    switch (filters.orden) {
      case 'id-asc':
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case 'id-desc':
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'antiguos':
        result.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
        break;
      case 'recientes':
      default:
        result.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
        break;
    }

    return result;
  }, [cursos, filters]);

  // ─── Filter Logic for Agenda ────────────────────────────────
  const filteredAgenda = useMemo(() => {
    let result = [...agenda];

    // Búsqueda
    if (filters.busqueda) {
      const q = filters.busqueda.toLowerCase();
      result = result.filter((c) =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.telefono || '').toLowerCase().includes(q) ||
        (c.lugar || '').toLowerCase().includes(q) ||
        (c.descripcion || '').toLowerCase().includes(q)
      );
    }

    // Técnico
    if (filters.tecnico) {
      result = result.filter((c) => c.tecnico_carnet === filters.tecnico);
    }

    return result;
  }, [agenda, filters.busqueda, filters.tecnico]);

  // ─── Group cursos ───────────────────────────────────────────
  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();

    filteredCursos.forEach((c) => {
      let key = 'Sin agrupar';
      let color = '#2f80ed';

      if (filters.agruparPor === 'grupo') {
        key = c.grupo_nombre || 'Sin grupo';
        color = c.grupo_color || '#2f80ed';
      } else if (filters.agruparPor === 'tecnico') {
        key = c.tecnico_nombre || 'Sin técnico';
        color = c.grupo_color || '#1a4a73';
      } else if (filters.agruparPor === 'distrito') {
        key = c.distrito || 'Sin distrito';
        color = '#2e9f5e';
      } else if (filters.agruparPor === 'ninguno') {
        key = 'Todos los cursos';
        color = '#1a4a73';
      }

      if (!map.has(key)) {
        map.set(key, { nombre: key, color, cursos: [] });
      }
      map.get(key)!.cursos.push(c);
    });

    const list = Array.from(map.values());

    if (filters.agruparPor === 'grupo') {
      const getGroupMinCreatedAt = (g: Grupo) => {
        const times = g.cursos.map((c) => c.created_at).filter(Boolean);
        if (times.length === 0) return '';
        times.sort();
        return times[0];
      };

      list.sort((a, b) => {
        const indexA = customGrupoOrder.indexOf(a.nombre);
        const indexB = customGrupoOrder.indexOf(b.nombre);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return 1;
        if (indexB !== -1) return -1;

        // Default: newest groups at the top (highest minimum created_at first)
        const timeA = getGroupMinCreatedAt(a);
        const timeB = getGroupMinCreatedAt(b);
        return timeB.localeCompare(timeA);
      });
    }

    return list;
  }, [filteredCursos, filters.agruparPor, customGrupoOrder]);

  // ─── Available group names for filter ───────────────────────
  const grupoNames = useMemo(() => {
    const names = new Set<string>();
    cursos.forEach((c) => { if (c.grupo_nombre) names.add(c.grupo_nombre); });
    return Array.from(names).sort();
  }, [cursos]);

  const reviewCount = useMemo(() => getReviewCount(filteredCursos), [filteredCursos]);

  // ─── CRUD callbacks ────────────────────────────────────────
  const handleSaveCurso = async (data: Partial<Curso>) => {
    try {
      if (editingCurso) {
        const { error } = await supabase.from('cursos').update(data).eq('id', editingCurso.id);
        if (error) throw error;
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado con éxito!',
          text: `El curso ${editingCurso.id} se ha actualizado correctamente.`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#bfa05e',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: true
        });
      } else {
        const { error } = await supabase.from('cursos').insert(data);
        if (error) throw error;
        Swal.fire({
          icon: 'success',
          title: '¡Creado con éxito!',
          text: `El curso ${data.id} se ha registrado correctamente.`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#bfa05e',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: true
        });
      }
      setShowForm(false);
      setEditingCurso(null);
      loadData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const handleDeleteCurso = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar curso?',
      text: `Se eliminará el curso ${id}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d93025',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (result.isConfirmed) {
      const { error } = await supabase.from('cursos').delete().eq('id', id);
      if (error) {
        Swal.fire('Error', error.message, 'error');
      } else {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        loadData();
      }
    }
  };

  const handleEditCurso = (curso: Curso) => {
    setEditingCurso(curso);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCurso = async (id: string, data: Partial<Curso>) => {
    try {
      // 1. Intercept organizer updates
      const hasOrganizerUpdate = 'organizador_nombre' in data || 'organizador_telefono' in data || 'organizador_maps' in data;
      
      if (hasOrganizerUpdate) {
        // Fetch current curso to get contacto_agenda
        const { data: cursoDb, error: fetchErr } = await supabase
          .from('cursos')
          .select('contacto_agenda')
          .eq('id', id)
          .single();
          
        if (fetchErr) throw fetchErr;
        
        const orgData = {
          nombre: data.organizador_nombre,
          telefono: data.organizador_telefono,
          link_maps: data.organizador_maps
        };
        
        // Remove organizer fields from the cursos update payload (since they are not columns of "cursos")
        delete data.organizador_nombre;
        delete data.organizador_telefono;
        delete data.organizador_maps;
        
        if (cursoDb?.contacto_agenda) {
          // Update existing contact
          const { error: updateContactErr } = await supabase
            .from('agenda_contactos')
            .update(orgData)
            .eq('id_contacto', cursoDb.contacto_agenda);
            
          if (updateContactErr) throw updateContactErr;
        } else {
          // Insert new contact
          const { data: newContact, error: insertContactErr } = await supabase
            .from('agenda_contactos')
            .insert({
              ...orgData,
              estado_semaforo: 'Atendido'
            })
            .select('id_contacto')
            .single();
            
          if (insertContactErr) throw insertContactErr;
          
          // Reference the new contact in cursos
          data.contacto_agenda = newContact.id_contacto;
        }
      }

      const { error } = await supabase.from('cursos').update(data).eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const handleRenameGrupo = async (oldName: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('cursos')
        .update({ grupo_nombre: newName })
        .eq('grupo_nombre', oldName);
      if (error) throw error;
      Swal.fire({
        icon: 'success',
        title: '¡Grupo renombrado!',
        text: 'El nombre del grupo se ha actualizado correctamente.',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#bfa05e',
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: true
      });
      loadData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const handleMoveGrupo = useCallback((nombre: string, direction: 'up' | 'down') => {
    const currentGroupNames = grupos.map((g) => g.nombre);
    const index = currentGroupNames.indexOf(nombre);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentGroupNames.length) return;

    const newOrder = [...currentGroupNames];
    newOrder[index] = currentGroupNames[newIndex];
    newOrder[newIndex] = currentGroupNames[index];

    setCustomGrupoOrder(newOrder);
    localStorage.setItem('grupo_orden', JSON.stringify(newOrder));
  }, [grupos]);

  // ─── Agenda CRUD callbacks ──────────────────────────────────
  const handleSaveContacto = async (data: Partial<AgendaContacto>) => {
    try {
      if (editingContacto) {
        const { error } = await supabase.from('agenda_contactos').update(data).eq('id_contacto', editingContacto.id_contacto);
        if (error) throw error;
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado con éxito!',
          text: 'El contacto de la agenda se ha actualizado correctamente.',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#bfa05e',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: true
        });
      } else {
        const { error } = await supabase.from('agenda_contactos').insert(data);
        if (error) throw error;
        Swal.fire({
          icon: 'success',
          title: '¡Creado con éxito!',
          text: 'El contacto se ha registrado correctamente en la agenda.',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#bfa05e',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: true
        });
      }
      setShowAgendaForm(false);
      setEditingContacto(null);
      loadData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const handleDeleteContacto = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar contacto?',
      text: 'Se eliminará el contacto. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d93025',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (result.isConfirmed) {
      const { error } = await supabase.from('agenda_contactos').delete().eq('id_contacto', id);
      if (error) {
        Swal.fire('Error', error.message, 'error');
      } else {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        loadData();
      }
    }
  };

  const handleEditContacto = (contacto: AgendaContacto) => {
    setEditingContacto(contacto);
    setShowAgendaForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Header */}
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--gray-200)' }}>
        <h1 style={{ margin: 0, padding: 0 }}>
          <CalendarDays className="header-icon" size={32} />
          Sistema de Control de Maestros
        </h1>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.75)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', backdropFilter: 'blur(8px)' }}>
          <button 
            type="button"
            className="btn btn-sm" 
            style={{ 
              background: viewMode === 'cursos' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'cursos' ? 'var(--white)' : 'var(--gray-700)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: viewMode === 'cursos' ? 'var(--shadow-sm)' : 'none'
            }} 
            onClick={() => { setViewMode('cursos'); setShowForm(false); setShowAgendaForm(false); }}
          >
            <CalendarDays size={14} /> Cursos
          </button>
          <button 
            type="button"
            className="btn btn-sm" 
            style={{ 
              background: viewMode === 'agenda' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'agenda' ? 'var(--white)' : 'var(--gray-700)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: viewMode === 'agenda' ? 'var(--shadow-sm)' : 'none'
            }} 
            onClick={() => { setViewMode('agenda'); setShowForm(false); setShowAgendaForm(false); }}
          >
            <Contact size={14} /> Agenda
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label"><Search size={12} /> Buscar</label>
          <input
            className="filter-input"
            type="text"
            placeholder={viewMode === 'cursos' ? "ID, ciclo, distrito, facilitador, grupo..." : "Nombre, teléfono, lugar, descripción..."}
            value={filters.busqueda}
            onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
          />
        </div>

        {viewMode === 'cursos' && (
          <div className="filter-group">
            <label className="filter-label"><Filter size={12} /> Preventivo</label>
            <input
              className="filter-input"
              type="text"
              placeholder="Número de preventivo"
              value={filters.preventivo}
              onChange={(e) => setFilters({ ...filters, preventivo: e.target.value })}
            />
          </div>
        )}

        {viewMode === 'cursos' && (
          <div className="filter-group">
            <label className="filter-label"><CalendarDays size={12} /> Mes</label>
            <select
              className="filter-select"
              value={filters.mes}
              onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
            >
              <option value="">Todos los meses</option>
              {['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">Técnico</label>
          <select
            className="filter-select"
            value={filters.tecnico}
            onChange={(e) => setFilters({ ...filters, tecnico: e.target.value })}
          >
            <option value="">Todos los técnicos</option>
            {tecnicos.map((t) => (
              <option key={t.carnet} value={t.carnet}>{t.nombre}</option>
            ))}
          </select>
        </div>

        {viewMode === 'cursos' && (
          <div className="filter-group">
            <label className="filter-label">Orden</label>
            <select
              className="filter-select"
              value={filters.orden}
              onChange={(e) => setFilters({ ...filters, orden: e.target.value as AppFilters['orden'] })}
            >
              <option value="recientes">Últimas notas creadas</option>
              <option value="antiguos">Primeras notas creadas</option>
              <option value="id-asc">ID ascendente</option>
              <option value="id-desc">ID descendente</option>
            </select>
          </div>
        )}

        {viewMode === 'cursos' && (
          <div className="filter-group">
            <label className="filter-label">Agrupar por</label>
            <select
              className="filter-select"
              value={filters.agruparPor}
              onChange={(e) => setFilters({ ...filters, agruparPor: e.target.value as AppFilters['agruparPor'] })}
            >
              <option value="grupo">Grupo de color</option>
              <option value="tecnico">Técnico</option>
              <option value="distrito">Distrito</option>
              <option value="ninguno">Sin agrupar</option>
            </select>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
          </button>

          {viewMode === 'cursos' && (
            <>
              <div className="toolbar-filter-group">
                <label><LayoutGrid size={12} /> Grupos</label>
                <select
                  value={filters.grupo}
                  onChange={(e) => setFilters({ ...filters, grupo: e.target.value })}
                >
                  <option value="todos">Todos los grupos</option>
                  {grupoNames.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="toolbar-filter-group">
                <label><AlertTriangle size={12} /> Alertas</label>
                <select
                  value={filters.alerta}
                  onChange={(e) => setFilters({ ...filters, alerta: e.target.value })}
                >
                  <option value="todas">Todas las notas</option>
                  <option value="sin-fecha">Sin fechas programadas</option>
                  <option value="proximo">Curso próximo</option>
                  <option value="inminente">Curso inminente</option>
                  <option value="en-proceso">Curso en proceso</option>
                  <option value="planificacion-requerida">Planificación requerida</option>
                  <option value="planificacion-atrasada">Planificación atrasada</option>
                  <option value="soc-pendiente">SOC sin programar</option>
                  <option value="eval-proxima">Evaluación próxima</option>
                  <option value="eval-pendiente">Evaluación pendiente</option>
                  <option value="informe-por-vencer">Informe por vencer</option>
                  <option value="informe-atrasado">Informe atrasado</option>
                  <option value="completo">Curso completado</option>
                </select>
              </div>

              {reviewCount > 0 && (
                <div className="alert-chip">
                  <AlertTriangle size={14} />
                  {reviewCount} curso{reviewCount > 1 ? 's' : ''} por revisar
                </div>
              )}
            </>
          )}
        </div>

        <div className="toolbar-right">
          {viewMode === 'cursos' ? (
            <button
              className="btn btn-success"
              onClick={() => { setEditingCurso(null); setShowForm(!showForm); }}
            >
              <Plus size={14} /> Nuevo curso
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={() => { setEditingContacto(null); setShowAgendaForm(!showAgendaForm); }}
            >
              <Plus size={14} /> Nuevo contacto
            </button>
          )}
        </div>
      </div>

      {/* Curso Form */}
      {viewMode === 'cursos' && showForm && (
        <CursoForm
          curso={editingCurso}
          tecnicos={tecnicos}
          facilitadores={facilitadores}
          ciclos={ciclos}
          grupoNames={grupoNames}
          onSave={handleSaveCurso}
          onCancel={() => { setShowForm(false); setEditingCurso(null); }}
        />
      )}

      {/* Agenda Form */}
      {viewMode === 'agenda' && showAgendaForm && (
        <AgendaForm
          contacto={editingContacto}
          tecnicos={tecnicos}
          onSave={handleSaveContacto}
          onCancel={() => { setShowAgendaForm(false); setEditingContacto(null); }}
        />
      )}

      {/* Content */}
      {loading && (viewMode === 'cursos' ? cursos.length === 0 : agenda.length === 0) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', padding: '20px 0' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : viewMode === 'cursos' ? (
        grupos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No se encontraron cursos</p>
            <p style={{ fontSize: '0.88rem', marginTop: '8px', color: '#9ca3af' }}>
              {cursos.length === 0
                ? 'Crea tu primer curso con el botón "Nuevo curso"'
                : 'Intenta cambiar los filtros de búsqueda'}
            </p>
          </div>
        ) : (
          grupos.map((grupo, idx) => (
            <GrupoCard
              key={grupo.nombre}
              grupo={grupo}
              activeGroup={filters.grupo}
              tecnicos={tecnicos}
              facilitadores={facilitadores}
              ciclos={ciclos}
              grupoNames={grupoNames}
              onEditCurso={handleEditCurso}
              onDeleteCurso={handleDeleteCurso}
              onUpdateCurso={handleUpdateCurso}
              onRenameGrupo={handleRenameGrupo}
              onMoveGrupo={filters.agruparPor === 'grupo' ? handleMoveGrupo : undefined}
              isFirst={idx === 0}
              isLast={idx === grupos.length - 1}
              onManageParticipantes={setActiveCursoParticipantes}
            />
          ))
        )
      ) : (
        /* Agenda View */
        filteredAgenda.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>No se encontraron contactos</p>
            <p style={{ fontSize: '0.88rem', marginTop: '8px', color: '#9ca3af' }}>
              {agenda.length === 0
                ? 'Crea tu primer contacto con el botón "Nuevo contacto"'
                : 'Intenta cambiar los filtros de búsqueda'}
            </p>
          </div>
        ) : (
          <div className="agenda-grid">
            {filteredAgenda.map((contacto) => (
              <AgendaCard
                key={contacto.id_contacto}
                contacto={contacto}
                tecnicos={tecnicos}
                onEdit={() => handleEditContacto(contacto)}
                onDelete={() => handleDeleteContacto(contacto.id_contacto)}
              />
            ))}
          </div>
        )
      )}

      {currentModalCurso && (
        <ParticipantesModal
          curso={currentModalCurso}
          onClose={() => setActiveCursoParticipantes(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
