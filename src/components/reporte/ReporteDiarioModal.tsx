'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, ExternalLink, Save, RefreshCw, FileText, CheckCircle2, Eraser } from 'lucide-react';
import { AuthUser } from '@/lib/auth/AuthContext';
import Swal from 'sweetalert2';

interface ReporteDiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
}

export default function ReporteDiarioModal({
  isOpen,
  onClose,
  currentUser,
}: ReporteDiarioModalProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [syncingSie, setSyncingSie] = useState<boolean>(false);
  const [isSieConnected, setIsSieConnected] = useState<boolean>(false);
  const [sieUser, setSieUser] = useState<string>('');
  const [siePass, setSiePass] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comprobar si el usuario actual es el técnico Gilmar Felix Chavarria Choque
  const isGilmar = useMemo(() => {
    if (!currentUser) return false;
    const name = (currentUser.nombre_completo || '').toUpperCase();
    const username = (currentUser.username || '').toUpperCase();
    return (
      name.includes('GILMAR') ||
      name.includes('CHAVARRIA') ||
      username.includes('GILMAR') ||
      username === '8639300'
    );
  }, [currentUser]);

  // Determinar el carnet del técnico actual para filtrar por defecto
  const defaultTecnicoCarnet = useMemo(() => {
    if (!currentUser) return 'todos';
    if (currentUser.rol === 'supervisor') return 'todos';
    if (currentUser.username === '7782629' || (currentUser.nombre_completo || '').toUpperCase().includes('JUAN PABLO')) return '7782629';
    if (currentUser.username === '3355859' || (currentUser.nombre_completo || '').toUpperCase().includes('CLAUDIA')) return '3355859';
    return '8639300'; // Gilmar por defecto
  }, [currentUser]);

  // Inyectar el filtro por defecto del usuario en la plantilla HTML
  const processedHtml = useMemo(() => {
    if (!htmlContent) return '';
    if (defaultTecnicoCarnet === 'todos') return htmlContent;
    return htmlContent.replace(
      "var tecParam = params.get('tecnico');",
      `var tecParam = params.get('tecnico') || '${defaultTecnicoCarnet}';`
    );
  }, [htmlContent, defaultTecnicoCarnet]);

  // Cargar contenido HTML desde el servidor o localStorage
  const loadHtmlReport = async (forceFetchServer: boolean = false) => {
    setLoading(true);

    const isUserUploaded = typeof window !== 'undefined' && localStorage.getItem('reporte_diario_user_uploaded') === 'true';
    const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('reporte_diario_custom_html') : null;

    if (!forceFetchServer && isUserUploaded && savedLocal && savedLocal.trim().length > 0) {
      setHtmlContent(savedLocal);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/reporte-diario?t=${Date.now()}`);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) {
          setHtmlContent(text);
          localStorage.setItem('reporte_diario_custom_html', text);
          if (forceFetchServer) {
            localStorage.removeItem('reporte_diario_user_uploaded');
          }
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error al obtener reporte desde API, intentando localStorage:', e);
    }

    if (savedLocal) {
      setHtmlContent(savedLocal);
    }
    setLoading(false);
  };

  // Limpiar el reporte TANTO EN LOCAL COMO EN EL SERVIDOR (SUPABASE)
  const handleClearReport = async () => {
    const result = await Swal.fire({
      title: '¿Limpiar Reporte en Local y Servidor?',
      text: 'Se eliminará la plantilla guardada en la base de datos (Supabase) y en la memoria local, restableciendo la versión base.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Limpiar Todo',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        // 1. Limpiar en Servidor (API DELETE /api/reporte-diario en Supabase)
        await fetch('/api/reporte-diario', { method: 'DELETE' });

        // 2. Limpiar memoria local del navegador
        if (typeof window !== 'undefined') {
          localStorage.removeItem('reporte_diario_custom_html');
          localStorage.removeItem('reporte_diario_user_uploaded');
        }

        setSieUser('');
        setSiePass('');
        setIsSieConnected(false);

        // 3. Recargar la plantilla limpia directamente del servidor
        await loadHtmlReport(true);

        Swal.fire({
          icon: 'success',
          title: '¡Reporte Limpiado!',
          text: 'Se ha eliminado la plantilla del servidor (Supabase) y de la memoria local exitosamente.',
          timer: 2500,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error('Error al limpiar reporte en servidor:', err);
        Swal.fire('Error', 'No se pudo limpiar la plantilla del servidor', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHtmlReport();
    }
  }, [isOpen]);

  // Manejar la extracción y sincronización de datos en tiempo real desde el SIE UNEFCO
  const handleSyncSieData = async (userToUse?: string, passToUse?: string) => {
    const username = (userToUse || sieUser || '').trim();
    const password = passToUse || siePass;

    if (!username || !password) {
      Swal.fire({
        title: 'Credenciales Requeridas',
        text: 'Ingresa tu usuario y contraseña del SIE UNEFCO a un lado de la cabecera.',
        icon: 'warning',
        confirmButtonColor: '#0d3b66',
      });
      return;
    }

    setSyncingSie(true);

    // Ventana emergente indicando "Analizando..."
    Swal.fire({
      title: '🔍 Analizando Datos del SIE...',
      html: `
        <div style="font-size:0.9rem;color:#334155;margin-top:6px;">
          <p style="margin-bottom:8px;">🟢 <b>Conectado al portal SIE UNEFCO</b> (${username})</p>
          <p style="color:#0284c7;font-weight:600;margin-bottom:4px;">Analizando participantes, eventos, planificaciones e informes finales en tiempo real...</p>
          <p style="font-size:0.8rem;color:#64748b;">Por favor espera unos momentos mientras se procesan las baterías de monitoreo.</p>
        </div>
      `,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const res = await fetch('/api/sie/sync-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSieConnected(true);
        await loadHtmlReport(true);
        // Mensaje de finalización exacta "Monitoreo Realizado"
        Swal.fire({
          icon: 'success',
          title: '✅ Monitoreo Realizado',
          html: '<b>¡Análisis y Monitoreo completados con éxito!</b><br>Los participantes, valoraciones y eventos del SIE han sido validados y guardados en Supabase.',
          confirmButtonColor: '#0d3b66',
          timer: 4000,
          timerProgressBar: true,
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de Conexión al SIE',
          text: data.error || 'No se pudo iniciar sesión en el SIE UNEFCO. Revisa tus credenciales en el panel lateral.',
          confirmButtonColor: '#0d3b66',
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Servidor',
        text: 'Ocurrió un error al conectar con el servicio de monitoreo.',
        confirmButtonColor: '#0d3b66',
      });
    } finally {
      setSyncingSie(false);
    }
  };

  // Manejar la subida de un nuevo archivo HTML (exclusivo para Gilmar Felix Chavarria Choque)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      Swal.fire('Formato no válido', 'Por favor selecciona un archivo con extensión .html o .htm', 'warning');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (!content) {
          Swal.fire('Error', 'El archivo seleccionado está vacío', 'error');
          setUploading(false);
          return;
        }

        // Guardar en servidor y base de datos Supabase mediante API POST
        const res = await fetch('/api/reporte-diario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: content }),
        });

        const data = await res.json().catch(() => ({}));
        const finalHtml = data.enrichedHtml || content;

        setHtmlContent(finalHtml);
        if (typeof window !== 'undefined') {
          localStorage.setItem('reporte_diario_custom_html', finalHtml);
          localStorage.setItem('reporte_diario_user_uploaded', 'true');
        }

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Plantilla Guardada Exitosamente!',
            html: `La plantilla del <b>Reporte Diario</b> fue guardada permanentemente en la base de datos de Supabase y estará activa en <b>todas las pestañas, recargas y dispositivos</b>.`,
            confirmButtonColor: '#0d3b66',
            timer: 4000,
            timerProgressBar: true,
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: '¡Plantilla Guardada!',
            html: `La plantilla se ha activado correctamente en tu navegador.`,
            confirmButtonColor: '#0d3b66',
            timer: 3000,
          });
        }
        setUploading(false);
      };
      reader.readAsText(file, 'UTF-8');
    } catch (err: any) {
      console.error('Error al subir plantilla HTML:', err);
      Swal.fire('Error', 'Ocurrió un error al procesar el archivo HTML', 'error');
      setUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <style>{`.swal2-container { z-index: 999999 !important; }`}</style>
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '96vw',
          height: '92vh',
          maxWidth: '1850px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d3b66 0%, #1a5276 50%, #2e86c1 100%)',
            color: '#ffffff',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(13, 59, 102, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.3px', color: '#ffffff' }}>
                  REPORTE DIARIO DE MONITOREO ACADÉMICO
                </h2>
                {isSieConnected && (
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                    }}
                    title="Conexión en tiempo real con el portal SIE UNEFCO activa"
                  >
                    🟢 Conectado al SIE UNEFCO
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Visualización e informe actualizado en tiempo real
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Panel de Conexión al SIE disponible para todos los técnicos */}
            {currentUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <input
                    type="text"
                    value={sieUser}
                    onChange={(e) => setSieUser(e.target.value)}
                    placeholder="Usuario / Correo SIE"
                    autoComplete="off"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      borderRadius: '5px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      width: '185px',
                      outline: 'none',
                      fontWeight: 600,
                    }}
                    title="Usuario del SIE UNEFCO"
                  />
                  <input
                    type="password"
                    value={siePass}
                    onChange={(e) => setSiePass(e.target.value)}
                    placeholder="Contraseña SIE"
                    autoComplete="new-password"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      borderRadius: '5px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      width: '185px',
                      outline: 'none',
                      fontWeight: 600,
                    }}
                    title="Contraseña del SIE UNEFCO"
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleSyncSieData(sieUser, siePass)}
                    disabled={syncingSie}
                    style={{
                      background: syncingSie
                        ? '#64748b'
                        : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: syncingSie ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                      height: '38px',
                    }}
                    title="Conectar al SIE de Participantes e Iniciar Monitoreo"
                  >
                    <RefreshCw size={14} className={syncingSie ? 'spin' : ''} />
                    {syncingSie ? 'Analizando...' : 'Conectar SIE'}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearReport}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '38px',
                      transition: 'all 0.2s ease',
                    }}
                    title="Limpiar datos locales y restablecer plantilla del reporte"
                  >
                    <Eraser size={14} /> Limpiar Reporte
                  </button>
                </div>
              </div>
            )}

            <a
              href={`/api/reporte-diario?standalone=true&tecnico=${defaultTecnicoCarnet}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
              title="Abrir reporte directo a la tabla en nueva pestaña"
            >
              <ExternalLink size={15} /> Pestaña Nueva
            </a>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '6px',
              }}
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>



        {/* Creador/Visor Iframe */}
        <div style={{ flex: 1, backgroundColor: '#eef2f7', position: 'relative' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: '12px',
                color: '#64748b',
              }}
            >
              <RefreshCw size={32} className="spin" />
              <span>Cargando Reporte Diario...</span>
            </div>
          ) : (
            <iframe
              srcDoc={processedHtml}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#ffffff',
              }}
              title="Reporte Diario"
            />
          )}
        </div>
      </div>
    </div>
  );
}
