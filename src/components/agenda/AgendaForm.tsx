'use client';

import { useState, useEffect } from 'react';
import { AgendaContacto, AgendaFormData, Tecnico } from '@/types';
import { GROUP_COLORS } from '@/lib/utils/colors';
import { Save, X } from 'lucide-react';

interface AgendaFormProps {
  contacto: AgendaContacto | null;
  tecnicos: Tecnico[];
  onSave: (data: Partial<AgendaContacto>) => void;
  onCancel: () => void;
}

export default function AgendaForm({ contacto, tecnicos, onSave, onCancel }: AgendaFormProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [lugar, setLugar] = useState('');
  const [linkMaps, setLinkMaps] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estadoSemaforo, setEstadoSemaforo] = useState('Pendiente');
  const [color, setColor] = useState('#2f80ed');
  const [tecnicoCarnet, setTecnicoCarnet] = useState('');

  useEffect(() => {
    if (contacto) {
      setNombre(contacto.nombre || '');
      setTelefono(contacto.telefono || '');
      setLugar(contacto.lugar || '');
      setLinkMaps(contacto.link_maps || '');
      setDescripcion(contacto.descripcion || '');
      setEstadoSemaforo(contacto.estado_semaforo || 'Pendiente');
      setColor(contacto.color || '#2f80ed');
      setTecnicoCarnet(contacto.tecnico_carnet || '');
    } else {
      setNombre('');
      setTelefono('');
      setLugar('');
      setLinkMaps('');
      setDescripcion('');
      setEstadoSemaforo('Pendiente');
      setColor('#2f80ed');
      setTecnicoCarnet(tecnicos[0]?.carnet || '');
    }
  }, [contacto, tecnicos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    onSave({
      nombre,
      telefono,
      lugar,
      link_maps: linkMaps,
      descripcion,
      estado_semaforo: estadoSemaforo,
      color,
      tecnico_carnet: tecnicoCarnet || null,
      fecha_interaccion: contacto?.fecha_interaccion || new Date().toISOString()
    });
  };

  return (
    <form className="curso-form" onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <div className="form-header">
        <h3>{contacto ? 'Editar Contacto' : 'Nuevo Contacto de Agenda'}</h3>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>

      <div className="form-grid">
        {/* Nombre */}
        <div className="form-group">
          <label className="form-label">Nombre del Contacto *</label>
          <input
            className="form-input"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Director Prof. Juan Flores"
          />
        </div>

        {/* Teléfono */}
        <div className="form-group">
          <label className="form-label">Teléfono/Celular</label>
          <input
            className="form-input"
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 71234567"
          />
        </div>

        {/* Lugar */}
        <div className="form-group">
          <label className="form-label">Ubicación/Lugar</label>
          <input
            className="form-input"
            type="text"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Ej: U.E. Simón Bolívar"
          />
        </div>

        {/* Técnico Responsable */}
        <div className="form-group">
          <label className="form-label">Técnico Responsable</label>
          <select
            className="form-select"
            value={tecnicoCarnet}
            onChange={(e) => setTecnicoCarnet(e.target.value)}
          >
            <option value="">Seleccionar técnico...</option>
            {tecnicos.map((t) => (
              <option key={t.carnet} value={t.carnet}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Grupo de WhatsApp / Enlace */}
        <div className="form-group full">
          <label className="form-label">Grupo de WhatsApp (o Enlace)</label>
          <input
            className="form-input"
            type="text"
            value={linkMaps}
            onChange={(e) => setLinkMaps(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
          />
        </div>

        {/* Estado Semáforo */}
        <div className="form-group">
          <label className="form-label">Estado de Interacción (Semáforo)</label>
          <select
            className="form-select"
            value={estadoSemaforo}
            onChange={(e) => setEstadoSemaforo(e.target.value)}
          >
            <option value="Pendiente">Pendiente (Amarillo)</option>
            <option value="Atendido">Atendido (Verde)</option>
            <option value="Crítico">Crítico (Rojo)</option>
          </select>
        </div>

        {/* Color Badge */}
        <div className="form-group">
          <label className="form-label">Color de Categoría</label>
          <div className="color-swatches" style={{ marginTop: '8px' }}>
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="form-group full">
          <label className="form-label">Notas / Descripción</label>
          <textarea
            className="form-input"
            style={{ minHeight: '80px', fontFamily: 'inherit' }}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles sobre el contacto, horarios disponibles, etc."
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-success">
          <Save size={14} /> Guardar
        </button>
      </div>
    </form>
  );
}
