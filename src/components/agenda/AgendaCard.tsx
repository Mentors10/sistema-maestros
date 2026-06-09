'use client';

import { AgendaContacto, Tecnico } from '@/types';
import { Phone, MessageCircle, MapPin, Edit3, Trash2, Calendar, User, FileText } from 'lucide-react';
import { formatFechaDisplay } from '@/lib/utils/calendar';

interface AgendaCardProps {
  contacto: AgendaContacto;
  tecnicos: Tecnico[];
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export default function AgendaCard({ contacto, tecnicos, onEdit, onDelete, readOnly = false }: AgendaCardProps) {
  const tecnicoNombre = tecnicos.find(t => t.carnet === contacto.tecnico_carnet)?.nombre || 'Sin técnico';

  // Traffic light styling
  const getSemaforoClass = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'atendido':
      case 'verde':
        return 'semaforo-verde';
      case 'pendiente':
      case 'amarillo':
        return 'semaforo-amarillo';
      case 'crítico':
      case 'critico':
      case 'rojo':
      default:
        return 'semaforo-rojo';
    }
  };

  const cleanPhone = contacto.telefono?.replace(/\D/g, '') || '';

  return (
    <div className={`agenda-card ${getSemaforoClass(contacto.estado_semaforo)}`}>
      {/* Header with state indicator */}
      <div className="agenda-card-header">
        <div className="agenda-status-pill">
          <span className="status-dot"></span>
          {contacto.estado_semaforo || 'Pendiente'}
        </div>
        {!readOnly && (
          <div className="agenda-card-actions">
            <button className="btn btn-ghost btn-icon btn-xs" onClick={onEdit} title="Editar contacto">
              <Edit3 size={13} />
            </button>
            <button className="btn btn-ghost btn-icon btn-xs" onClick={onDelete} title="Eliminar contacto" style={{ color: 'var(--red-500)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="agenda-card-body">
        <h3 className="agenda-contact-name">
          <User size={16} />
          {contacto.nombre || 'Sin nombre'}
        </h3>
        
        {contacto.descripcion && (
          <p className="agenda-contact-desc">
            <FileText size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            {contacto.descripcion}
          </p>
        )}

        <div className="agenda-info-rows">
          {contacto.lugar && (
            <div className="agenda-info-row">
              <MapPin size={13} />
              <span>{contacto.lugar}</span>
            </div>
          )}
          
          <div className="agenda-info-row">
            <Phone size={13} />
            <span>{contacto.telefono || 'Sin teléfono'}</span>
          </div>

          {contacto.fecha_interaccion && (
            <div className="agenda-info-row">
              <Calendar size={13} />
              <span>Interacción: {formatFechaDisplay(contacto.fecha_interaccion)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer with communication buttons */}
      <div className="agenda-card-footer">
        <span className="agenda-tech-badge">
          {tecnicoNombre.split(' ')[0]} {/* Show first name */}
        </span>
        <div className="agenda-comm-buttons">
          {contacto.link_maps && (
            <a 
              href={contacto.link_maps} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-map btn-xs"
              title="Abrir ubicación"
            >
              <MapPin size={12} /> Maps
            </a>
          )}
          {contacto.telefono && (
            <a 
              href={`https://wa.me/${cleanPhone}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-whatsapp btn-xs"
              title="Enviar WhatsApp"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
