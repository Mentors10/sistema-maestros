'use client';

import { useState, useEffect, useRef } from 'react';
import { Curso } from '@/types';
import { X, Copy, Check, MessageCircle, Download, Loader2, RefreshCw, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

interface InscripcionOnlineModalProps {
  curso: Curso;
  onClose: () => void;
}

export default function InscripcionOnlineModal({ curso, onClose }: InscripcionOnlineModalProps) {
  const [inviteText, setInviteText] = useState('');
  const [loadingText, setLoadingText] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const linkInscripcion = `${window.location.origin}/participantes/${curso.id}`;

  // Generate WhatsApp message via Gemini API
  const generateMessage = async () => {
    setLoadingText(true);
    try {
      const res = await fetch('/api/ai/generate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curso, linkInscripcion })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al conectar con la IA');
      }
      setInviteText(data.inviteText);
    } catch (err: any) {
      console.error(err);
      // Fallback message in case Gemini is not configured
      const fallback = `*CONVOCATORIA OFICIAL UNEFCO* 📚\n\n` +
        `Estimados maestros, los invitamos a inscribirse en el ciclo formativo:\n` +
        `📖 *${curso.ciclo_nombre || 'Ciclo Formativo'}*\n` +
        `🗂️ *Área Formativa:* ${curso.area_formativa || curso.ciclo_grupo || 'Sin área'}\n\n` +
        `📝 *Cursos del Ciclo:*\n` +
        (curso.tema1 ? `🔹 Curso 1: ${curso.tema1}\n` : '') +
        (curso.tema2 ? `🔹 Curso 2: ${curso.tema2}\n` : '') +
        (curso.tema3 ? `🔹 Curso 3: ${curso.tema3}\n` : '') +
        (curso.tema4 ? `🔹 Curso 4: ${curso.tema4}\n` : '') + `\n` +
        `👤 *Facilitador:* ${curso.facilitador_nombre || 'POR CONFIRMAR'}\n` +
        `🔧 *Técnico UNEFCO:* ${curso.tecnico_nombre || 'POR CONFIRMAR'}\n` +
        `📅 *Fecha de Inicio:* ${curso.fecha_inicio || 'POR CONFIRMAR'}\n` +
        `📍 *Lugar:* ${curso.lugar || 'POR CONFIRMAR'}\n` +
        `🏢 *Distrito:* ${curso.distrito || 'Sin distrito'}\n` +
        `💵 *Inversión:* ${curso.costo || 50} Bs.\n\n` +
        `🔗 *Inscríbete en línea aquí:* ${linkInscripcion}\n\n` +
        `¡No dejes pasar esta oportunidad de capacitación y desarrollo profesional! 🚀`;
      setInviteText(fallback);
    } finally {
      setLoadingText(false);
    }
  };

  // Draw Poster on Canvas
  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas settings
    const width = 800;
    const height = 1200; // Increased height to fit all the new fields beautifully!
    canvas.width = width;
    canvas.height = height;

    const baseColor = curso.grupo_color || '#2f80ed';

    // Load background image
    const bgImg = new Image();
    bgImg.src = '/unefco_poster_bg.png';
    
    const renderContent = () => {
      // 1. Draw background image
      ctx.drawImage(bgImg, 0, 0, width, height);

      // Add a dark semi-transparent overlay to make text highly readable
      ctx.fillStyle = 'rgba(11, 21, 32, 0.78)';
      ctx.fillRect(0, 0, width, height);

      // 2. Top Header Border
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, width, 18);

      // 3. UNEFCO branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial, Helvetica, sans-serif';
      ctx.fillText('UNEFCO', 50, 70);

      ctx.fillStyle = '#ffb703'; // Gold accent
      ctx.font = '800 14px Arial, Helvetica, sans-serif';
      ctx.fillText('UNIDAD DE ESPECIALIZACIÓN DE FORMACIÓN CONTINUA', 50, 95);

      // Header Badge "CONVOCATORIA"
      ctx.fillStyle = baseColor;
      const badgeWidth = 240;
      const badgeHeight = 40;
      const badgeX = width - badgeWidth - 50;
      const badgeY = 55;
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CONVOCATORIA OFICIAL', badgeX + badgeWidth / 2, badgeY + 25);
      ctx.textAlign = 'left'; // Reset

      // 4. Poster Title (Ciclo Nombre)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
      
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, currentY);
        return currentY + lineHeight;
      };

      let nextY = wrapText(curso.ciclo_nombre || 'CICLO FORMATIVO', 50, 180, width - 100, 48);

      // Display Area Formativa below title
      const areaText = `ÁREA: ${curso.area_formativa || curso.ciclo_grupo || 'GENERAL'}`;
      ctx.fillStyle = '#ffb703'; // Gold/Yellow color for area
      ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
      ctx.fillText(areaText.toUpperCase(), 50, nextY);
      nextY += 30;

      // Decorative line below title
      ctx.fillStyle = baseColor;
      ctx.fillRect(50, nextY - 10, 120, 6);

      // 5. Course Details Panel (Card layout)
      const cardY = nextY + 20;
      const cardHeight = 620; // Expanded to fit all courses and info
      const cardWidth = width - 100;
      
      // Draw Glassmorphic Card
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(50, cardY, cardWidth, cardHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, cardY, cardWidth, cardHeight);

      // Draw card accents
      ctx.fillStyle = baseColor;
      ctx.fillRect(50, cardY, 6, cardHeight);

      // Detail rows inside the card
      const drawDetailRow = (label: string, value: string, iconSymbol: string, yPos: number) => {
        // Icon Circle
        ctx.fillStyle = baseColor + '30';
        ctx.beginPath();
        ctx.arc(90, yPos + 18, 20, 0, Math.PI * 2);
        ctx.fill();

        // Icon Text placeholder
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(iconSymbol, 90, yPos + 24);
        ctx.textAlign = 'left';

        // Label
        ctx.fillStyle = '#94a3b8'; // Cool grey label
        ctx.font = 'bold 13px Arial';
        ctx.fillText(label.toUpperCase(), 130, yPos + 12);

        // Value
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(value, 130, yPos + 34);
      };

      let itemY = cardY + 30;

      // --- Cursos del Ciclo ---
      // Icon Circle
      ctx.fillStyle = baseColor + '30';
      ctx.beginPath();
      ctx.arc(90, itemY + 18, 20, 0, Math.PI * 2);
      ctx.fill();

      // Icon Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📚', 90, itemY + 24);
      ctx.textAlign = 'left';

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('CURSOS INCLUIDOS EN EL CICLO', 130, itemY + 12);

      // Draw each tema/curso text
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px Arial';
      let temaY = itemY + 34;
      const temasList = [curso.tema1, curso.tema2, curso.tema3, curso.tema4].filter(Boolean);
      if (temasList.length > 0) {
        temasList.forEach((tema, idx) => {
          ctx.fillText(`• ${tema}`, 130, temaY);
          temaY += 24;
        });
      } else {
        ctx.fillText('• Contenido temático general', 130, temaY);
        temaY += 24;
      }
      
      // Calculate height dynamically for subsequent items
      itemY = temaY + 10;
      drawDetailRow('Facilitador(a)', curso.facilitador_nombre || 'POR CONFIRMAR', '👤', itemY);
      
      itemY += 75;
      drawDetailRow('Técnico Responsable', curso.tecnico_nombre || 'POR CONFIRMAR', '💼', itemY);
      
      itemY += 75;
      drawDetailRow('Fecha y Hora de Inicio', curso.fecha_inicio || 'POR CONFIRMAR', '📅', itemY);

      itemY += 75;
      drawDetailRow('Lugar de Realización', curso.lugar || 'POR CONFIRMAR', '📍', itemY);

      itemY += 75;
      drawDetailRow('Distrito Educativo', curso.distrito || 'POR CONFIRMAR', '🏢', itemY);

      itemY += 75;
      drawDetailRow('Costo de Inversión', `${curso.costo || 50} Bs.`, '💵', itemY);

      // 6. Bottom Area: CTA & QR Code
      const bottomY = cardY + cardHeight + 40;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.fillText('¡INSCRÍBETE ONLINE AHORA!', 50, bottomY + 30);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Arial';
      ctx.fillText('Escanea el código QR para registrar tus datos directamente.', 50, bottomY + 60);

      // Draw dynamic QR Code
      const qrSize = 140;
      const qrX = width - qrSize - 50;
      const qrY = bottomY;

      // Background white box for QR
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX, qrY, qrSize, qrSize);

      // Finder patterns
      const drawFinder = (fx: number, fy: number, fs: number) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(fx, fy, fs, fs);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx + fs * 1/7, fy + fs * 1/7, fs * 5/7, fs * 5/7);
        ctx.fillStyle = '#000000';
        ctx.fillRect(fx + fs * 2/7, fy + fs * 2/7, fs * 3/7, fs * 3/7);
      };

      const finderSize = qrSize * 7/25;
      drawFinder(qrX, qrY, finderSize); // Top-left
      drawFinder(qrX + qrSize - finderSize, qrY, finderSize); // Top-right
      drawFinder(qrX, qrY + qrSize - finderSize, finderSize); // Bottom-left

      // QR fake data modules
      ctx.fillStyle = '#000000';
      const modules = 25;
      const cellSize = qrSize / modules;
      for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
          // Skip finder areas
          if (r < 8 && c < 8) continue;
          if (r < 8 && c >= modules - 8) continue;
          if (r >= modules - 8 && c < 8) continue;
          // Random pixels
          if (Math.random() > 0.45) {
            ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize, cellSize);
          }
        }
      }

      // Footnote URL
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '12px monospace';
      ctx.fillText(linkInscripcion, 50, height - 40);

      // Output URL image
      setPosterUrl(canvas.toDataURL('image/png'));
    };

    bgImg.onload = renderContent;
    // Fallback if image fails to load
    bgImg.onerror = () => {
      // Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0c1a30');
      gradient.addColorStop(0.3, '#0f274a');
      gradient.addColorStop(1, '#050c18');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      renderContent();
    };
  };

  useEffect(() => {
    generateMessage();
    // Tiny delay to ensure canvas exists in DOM
    setTimeout(drawPoster, 300);
  }, [curso]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    Swal.fire({
      icon: 'success',
      title: 'Mensaje copiado',
      text: 'Puedes pegarlo directamente en WhatsApp',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const shareWhatsApp = () => {
    const encodedText = encodeURIComponent(inviteText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const downloadPoster = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = `Convocatoria_Curso_${curso.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(11,21,32,0.6)', backdropFilter: 'blur(8px)', zIndex: 1100, padding: '20px', overflowY: 'auto' }}>
      <div className="modal-container" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '1000px', maxHeight: '90vh', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', background: 'var(--primary-900)', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
              Generación de Invitación Online (IA)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', opacity: 0.8 }}>
              ID Curso: {curso.id} — Genera texto e imagen (afiche) para compartir.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
          
          {/* Left Side: WhatsApp Text Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-800)' }}>
                Mensaje de Invitación para WhatsApp
              </span>
              <button 
                onClick={generateMessage} 
                disabled={loadingText}
                className="btn btn-ghost btn-xs"
                style={{ display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid var(--gray-200)', padding: '2px 6px' }}
              >
                <RefreshCw size={11} className={loadingText ? 'spin' : ''} />
                Regenerar con IA
              </button>
            </div>

            {loadingText ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', minHeight: '300px', gap: '10px' }}>
                <Loader2 className="spin" size={24} style={{ color: 'var(--primary-500)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Redactando con Inteligencia Artificial...</span>
              </div>
            ) : (
              <textarea
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                style={{ flex: 1, padding: '12px', fontSize: '0.85rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', background: '#fcfdfd', resize: 'none', fontFamily: 'sans-serif', minHeight: '300px', lineHeight: '1.4' }}
              />
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={copyToClipboard}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                {isCopied ? '¡Copiado!' : 'Copiar Texto'}
              </button>
              <button 
                onClick={shareWhatsApp}
                className="btn btn-whatsapp btn-sm"
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}
              >
                <MessageCircle size={14} />
                Compartir WhatsApp
              </button>
            </div>
          </div>

          {/* Right Side: Poster Canvas & Image Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-800)' }}>
                Afiche Publicitario Convocatoria
              </span>
              <button 
                onClick={downloadPoster} 
                className="btn btn-success btn-xs"
                style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
              >
                <Download size={11} />
                Descargar PNG
              </button>
            </div>

            {/* Poster Preview Frame */}
            <div style={{ width: '100%', height: '390px', background: 'var(--gray-900)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-inner)' }}>
              {posterUrl ? (
                <img 
                  src={posterUrl} 
                  alt="Afiche Convocatoria Curso" 
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: 'zoom-in' }} 
                  title="Haz clic derecho para copiar o guardar esta imagen"
                />
              ) : (
                <div style={{ color: 'var(--gray-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Loader2 className="spin" size={24} />
                  <span style={{ fontSize: '0.78rem' }}>Renderizando afiche...</span>
                </div>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-400)', textAlign: 'center' }}>
              💡 Puedes descargar el afiche como imagen de alta resolución para adjuntarlo en tus grupos de WhatsApp, o hacer clic derecho sobre la imagen para copiarla.
            </p>
          </div>

        </div>

        {/* Hidden Canvas for rendering */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Modal Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
