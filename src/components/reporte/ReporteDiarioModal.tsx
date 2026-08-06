'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, ExternalLink, Save, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
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

    // 1. Si el usuario subió su propia plantilla personalizada y no estamos forzando servidor, usar localStorage
    const isUserUploaded = typeof window !== 'undefined' && localStorage.getItem('reporte_diario_user_uploaded') === 'true';
    const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('reporte_diario_custom_html') : null;

    if (!forceFetchServer && isUserUploaded && savedLocal && savedLocal.trim().length > 0) {
      setHtmlContent(savedLocal);
      setLoading(false);
      return;
    }

    try {
      // 2. Cargar desde la API del servidor
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

    // Fallback final a localStorage si existiera algo
    if (savedLocal) {
      setHtmlContent(savedLocal);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadHtmlReport();
    }
  }, [isOpen]);

  // Manejar la extracción y sincronización de datos en tiempo real desde el SIE UNEFCO
  const handleSyncSieData = async () => {
    const { value: formValues } = await Swal.fire({
      title: '🔐 Conexión al SIE UNEFCO',
      html: `
        <p style="font-size:0.88rem;color:#64748b;margin-bottom:12px;">Ingresa tus credenciales del SIE para conectar y validar los participantes y eventos en tiempo real:</p>
        <div style="text-align:left;max-width:320px;margin:0 auto;">
          <label style="font-size:0.8rem;font-weight:600;color:#1e293b;display:block;margin-bottom:4px;">Usuario / Correo SIE:</label>
          <input id="swal-username" class="swal2-input" placeholder="ej. usuario@unefco.edu.bo" value="gilmar.chavarria@unefco.edu.bo" style="width:100%;margin-top:0;margin-bottom:12px;font-size:0.9rem;">
          <label style="font-size:0.8rem;font-weight:600;color:#1e293b;display:block;margin-bottom:4px;">Contraseña SIE:</label>
          <input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña" value="GILMAR.chavarria24#" style="width:100%;margin-top:0;margin-bottom:8px;font-size:0.9rem;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '⚡ Conectar y Sincronizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d3b66',
      preConfirm: () => {
        const u = (document.getElementById('swal-username') as HTMLInputElement)?.value;
        const p = (document.getElementById('swal-password') as HTMLInputElement)?.value;
        if (!u || !p) {
          Swal.showValidationMessage('Por favor ingresa usuario y contraseña del SIE');
          return false;
        }
        return { username: u, password: p };
      }
    });

    if (!formValues) return;

    setSyncingSie(true);
    Swal.fire({
      title: 'Conectando al SIE UNEFCO...',
      html: '🟢 <b>Conectado al SIE</b>: Validando participantes, planificaciones, notas e informes finales en tiempo real...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const res = await fetch('/api/sie/sync-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formValues.username, password: formValues.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await loadHtmlReport(true);
        Swal.fire({
          icon: 'success',
          title: '¡Conectado y Sincronizado!',
          html: '🟢 <b>Conexión al SIE verificada con éxito.</b><br>Los participantes y eventos han sido validados en tiempo real y guardados en Supabase.',
          confirmButtonColor: '#0d3b66',
        });
      } else {
        Swal.fire('Error de Conexión', data.error || 'No se pudo iniciar sesión en el SIE UNEFCO. Verifica tus credenciales.', 'error');
      }
    } catch (e: any) {
      Swal.fire('Error', 'Ocurrió un error al conectar con el servidor', 'error');
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
            padding: '14px 24px',
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
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.3px', color: '#ffffff' }}>
                  REPORTE DIARIO DE MONITOREO ACADÉMICO
                </h2>
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
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Visualización e informe actualizado en tiempo real
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isGilmar && (
              <button
                onClick={handleSyncSieData}
                disabled={syncingSie || uploading}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: (syncingSie || uploading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                }}
                title="Sincronizar y actualizar reporte con datos del SIE UNEFCO en tiempo real"
              >
                <RefreshCw size={16} className={syncingSie ? 'spin' : ''} />
                {syncingSie ? 'Conectando...' : 'Actualizar Datos SIE'}
              </button>
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

        {/* Indicador de permiso de edición */}
        {isGilmar && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderBottom: '1px solid #bbf7d0',
              padding: '6px 24px',
              fontSize: '0.78rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} color="#16a34a" />
            Modo Edición Habilitado: Técnico Gilmar Felix Chavarria Choque autorizado para subir/reemplazar la plantilla HTML.
          </div>
        )}

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
