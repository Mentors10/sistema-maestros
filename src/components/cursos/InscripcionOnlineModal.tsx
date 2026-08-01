'use client';

import { useState, useEffect } from 'react';
import { Curso } from '@/types';
import { X, Copy, Check, MessageCircle, Loader2, RefreshCw, Sparkles, Calendar, Clock, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';

interface InscripcionOnlineModalProps {
  curso: Curso;
  onClose: () => void;
}

export default function InscripcionOnlineModal({ curso, onClose }: InscripcionOnlineModalProps) {
  // Interactive options requested by user
  const [diaClase, setDiaClase] = useState<string>('Sábados');
  const [turnoHorario, setTurnoHorario] = useState<string>('Mañana (08:00 a 12:00)');
  
  const [inviteText, setInviteText] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedPrompt, setIsCopiedPrompt] = useState(false);

  const linkInscripcion = `${window.location.origin}/participantes/${curso.id}`;

  // Helper to format days and schedule info
  const getHorarioDetallado = () => {
    let diasStr = diaClase;
    let horarioStr = turnoHorario;

    if (diaClase === 'Sábados') {
      diasStr = 'Sábados (Modalidad Semipresencial - 12 hrs por curso)';
      if (turnoHorario.includes('Mañana')) {
        horarioStr = '1er Sábado de 08:00 a 12:00 | 2do Sábado de 08:00 a 16:00';
      }
    } else if (diaClase === 'Domingos') {
      diasStr = 'Domingos (Modalidad Semipresencial - 12 hrs por curso)';
      if (turnoHorario.includes('Mañana')) {
        horarioStr = '1er Domingo de 08:00 a 12:00 | 2do Domingo de 08:00 a 16:00';
      }
    } else if (diaClase === 'Entre semana') {
      diasStr = 'Lunes, Martes y Miércoles';
      if (turnoHorario.includes('Tarde')) {
        horarioStr = 'De 14:00 a 18:00 (Cumplimiento 12 hrs de clases)';
      }
    }

    return { diasStr, horarioStr };
  };

  // Build WhatsApp invite message and AI Image Prompt
  const buildContent = () => {
    const { diasStr, horarioStr } = getHorarioDetallado();

    // 1. WhatsApp Text Message (ALWAYS "Fecha: A CONFIRMAR")
    const textMsg = `*CONVOCATORIA OFICIAL UNEFCO* 📚\n\n` +
      `Estimados maestros(as), los invitamos a inscribirse en el ciclo formativo:\n` +
      `📖 *${curso.ciclo_nombre || 'Ciclo Formativo'}*\n` +
      `🗂️ *Área Formativa:* ${curso.area_formativa || curso.ciclo_grupo || 'General'}\n\n` +
      `📝 *Cursos del Ciclo:*\n` +
      (curso.tema1 ? `🔹 Curso 1: ${curso.tema1}\n` : '') +
      (curso.tema2 ? `🔹 Curso 2: ${curso.tema2}\n` : '') +
      (curso.tema3 ? `🔹 Curso 3: ${curso.tema3}\n` : '') +
      (curso.tema4 ? `🔹 Curso 4: ${curso.tema4}\n` : '') + `\n` +
      `📅 *Fecha de Inicio:* A CONFIRMAR\n` +
      `🗓️ *Días de Clases:* ${diasStr}\n` +
      `⏰ *Horario:* ${horarioStr}\n` +
      `📍 *Lugar:* ${curso.lugar || 'POR CONFIRMAR'} (${curso.distrito || ''})\n` +
      `👤 *Facilitador:* ${curso.facilitador_nombre || 'POR CONFIRMAR'}\n` +
      `🔧 *Técnico UNEFCO:* ${curso.tecnico_nombre || 'POR CONFIRMAR'}\n` +
      `💵 *Inversión:* ${curso.costo || 50} Bs.\n\n` +
      `⚠️ *IMPORTANTE:* No realizar ningún depósito hasta confirmar la apertura del grupo en WhatsApp.\n\n` +
      `🔗 *Inscríbete en línea aquí:* ${linkInscripcion}\n\n` +
      `¡Fortalece tu desarrollo profesional con UNEFCO! 🚀`;

    setInviteText(textMsg);

    // 2. AI Image Prompt (Detailed prompt following user specifications)
    const prompt = `Crea un afiche publicitario educativo profesional, limpio y moderno de alta calidad para un ciclo formativo institucional.

[ENCABEZADO INSTITUCIONAL OBLIGATORIO]:
- En la parte superior del afiche debe haber un encabezado horizontal limpio con los dos logos oficiales de Bolivia:
  1. A la izquierda: Logo del Ministerio de Educación de Bolivia.
  2. A la derecha: Logo de la UNEFCO (Unidad de Especialización de Formación Continua).
- Paleta de colores oficial: Azul Marino (#0d3b66), Azul Real (#2e86c1), Amarillo/Dorado (#fbbc05) y Blanco (#ffffff).

[ILUSTRACIÓN PRINCIPAL / PERSONAJES]:
- Incluir en la composición a DOS facilitadores/docentes profesionales sonrientes de pie (UN FACILITADOR VARÓN Y UNA FACILITADORA MUJER), vestidos de manera formal y profesional, sosteniendo material educativo/tecnológico en un entorno educativo moderno.

[CONTENIDO TEXTUAL DEL AFICHE]:
- Título principal destacado: "${curso.ciclo_nombre || 'CICLO FORMATIVO'}"
- Subtítulo / Área: "Área Formativa: ${curso.area_formativa || curso.ciclo_grupo || 'General'}"
- Módulos / Cursos incluidos:
  • Curso 1: ${curso.tema1 || 'Módulo 1'}
  • Curso 2: ${curso.tema2 || 'Módulo 2'}
  ${curso.tema3 ? `• Curso 3: ${curso.tema3}` : ''}
  ${curso.tema4 ? `• Curso 4: ${curso.tema4}` : ''}
- Datos de Convocatoria:
  • Fecha de Inicio: A CONFIRMAR
  • Días de Clases: ${diaClase}
  • Horario / Turno: ${horarioStr}
  • Lugar: ${curso.lugar || 'POR CONFIRMAR'} (${curso.distrito || ''})
  • Facilitador: ${curso.facilitador_nombre || 'POR CONFIRMAR'}
  • Inversión: ${curso.costo || 50} Bs.
- Nota al pie: "Paso 1: Registra tu pre-inscripción online. Paso 2: Únete al grupo de WhatsApp oficial."

[ESTILO VISUAL Y FORMATO]:
- Formato vertical 4:5 o 9:16 para redes sociales y WhatsApp.
- Diseño tipográfico limpio, nítido y legible, fondo degradado azul marino elegante con marcos dorados y estética educativa moderna de alta definición.`;

    setPromptText(prompt);
  };

  useEffect(() => {
    buildContent();
  }, [diaClase, turnoHorario, curso]);

  const copyTextToClipboard = () => {
    navigator.clipboard.writeText(inviteText);
    setIsCopiedText(true);
    setTimeout(() => setIsCopiedText(false), 2000);
    Swal.fire({
      icon: 'success',
      title: 'Mensaje copiado',
      text: 'Texto de invitación para WhatsApp copiado al portapapeles.',
      timer: 1800,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(promptText);
    setIsCopiedPrompt(true);
    setTimeout(() => setIsCopiedPrompt(false), 2000);
    Swal.fire({
      icon: 'success',
      title: 'Prompt copiado',
      text: 'Prompt para generar el afiche en IA copiado al portapapeles.',
      timer: 1800,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const shareWhatsApp = () => {
    const encodedText = encodeURIComponent(inviteText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(11,21,32,0.65)', backdropFilter: 'blur(8px)', zIndex: 1100, padding: '20px', overflowY: 'auto' }}>
      <div className="modal-container" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '1050px', maxHeight: '92vh', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #0d3b66 0%, #1a5276 100%)', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: '#fbbc05' }} />
              Inscripción Online y Generador de Afiche (IA)
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', opacity: 0.85 }}>
              ID Curso: {curso.id} — Configura días y horarios, redacta la invitación y genera el Prompt para el Afiche.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Controles de Selección Interactiva de Días y Horarios */}
        <div style={{ background: '#f8fafc', padding: '14px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: '#0d3b66' }} />
            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gray-700)', whiteSpace: 'nowrap' }}>Días de Clases:</label>
            <select
              value={diaClase}
              onChange={(e) => setDiaClase(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#0d3b66' }}
            >
              <option value="Sábados">Sábados (Semipresencial 12h)</option>
              <option value="Domingos">Domingos (Semipresencial 12h)</option>
              <option value="Entre semana">Entre semana (Lun, Mar, Mié)</option>
              <option value="A confirmar">A confirmar</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#0d3b66' }} />
            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gray-700)', whiteSpace: 'nowrap' }}>Turno / Horario:</label>
            <select
              value={turnoHorario}
              onChange={(e) => setTurnoHorario(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#0d3b66' }}
            >
              <option value="Mañana (08:00 a 12:00)">Mañana (08:00 a 12:00)</option>
              <option value="Tarde (14:00 a 18:00)">Tarde (14:00 a 18:00)</option>
              <option value="Noche (19:00 a 22:00)">Noche (19:00 a 22:00)</option>
              <option value="A confirmar">A confirmar</option>
            </select>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#b45309', background: '#fffbe6', padding: '6px 12px', borderRadius: '6px', border: '1px solid #f59e0b', fontWeight: 700 }}>
            📌 Fecha: siempre A CONFIRMAR
          </div>
        </div>

        {/* Modal Body: 2 Column Layout */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 }}>
          
          {/* Left Column: WhatsApp Text Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={16} style={{ color: '#25D366' }} />
                Mensaje de Convocatoria para WhatsApp
              </span>
            </div>

            <textarea
              value={inviteText}
              onChange={(e) => setInviteText(e.target.value)}
              style={{ flex: 1, padding: '12px', fontSize: '0.84rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)', background: '#fcfdfd', resize: 'none', fontFamily: 'sans-serif', minHeight: '320px', lineHeight: '1.45' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={copyTextToClipboard}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', fontWeight: 700 }}
              >
                {isCopiedText ? <Check size={14} /> : <Copy size={14} />}
                {isCopiedText ? '¡Texto Copiado!' : 'Copiar Texto'}
              </button>
              <button 
                onClick={shareWhatsApp}
                className="btn btn-whatsapp btn-sm"
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', fontWeight: 700 }}
              >
                <MessageCircle size={14} />
                Enviar a WhatsApp
              </button>
            </div>
          </div>

          {/* Right Column: AI Prompt for Afiche / Poster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: '#fbbc05' }} />
                Prompt para Generar Afiche en IA
              </span>
              <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#1e3a8a', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                ChatGPT / Midjourney / DALL-E / Gemini
              </span>
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              style={{ flex: 1, padding: '12px', fontSize: '0.82rem', border: '1px solid #c7d2fe', borderRadius: 'var(--radius-md)', background: '#f5f7ff', resize: 'none', fontFamily: 'monospace', minHeight: '320px', lineHeight: '1.4' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={copyPromptToClipboard}
                className="btn btn-success btn-sm"
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', fontWeight: 700, background: 'linear-gradient(135deg, #0d3b66 0%, #1a5276 100%)', color: '#fff', border: 'none' }}
              >
                {isCopiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                {isCopiedPrompt ? '¡Prompt Copiado!' : 'Copiar Prompt para Afiche'}
              </button>
              <a 
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
              >
                Abrir ChatGPT <ExternalLink size={12} />
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
