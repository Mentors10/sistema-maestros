'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Curso } from '@/types';
import { X, Printer, Loader2, FileText, User } from 'lucide-react';
import Swal from 'sweetalert2';

interface Participant {
  ci: string;
  nombres: string;
  apellidos: string;
  rda: string | null;
  celular: string | null;
  sie: string | null;
  unidad_educativa: string | null;
}

interface InscripcionRow {
  id: number;
  participantes: Participant | null;
}

interface FichaInscripcionModalProps {
  curso: Curso;
  onClose: () => void;
}

export default function FichaInscripcionModal({ curso, onClose }: FichaInscripcionModalProps) {
  const [inscripciones, setInscripciones] = useState<InscripcionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCi, setSelectedCi] = useState<string>('blank');

  useEffect(() => {
    async function fetchEnrolled() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('inscripcion_ciclo')
          .select(`
            id,
            participantes (
              ci,
              nombres,
              apellidos,
              rda,
              celular,
              sie,
              unidad_educativa
            )
          `)
          .eq('curso_id', curso.id);

        if (error) throw error;
        setInscripciones((data || []) as unknown as InscripcionRow[]);
      } catch (err) {
        console.error('Error fetching enrolled for Ficha:', err);
        Swal.fire('Error', 'No se pudieron cargar los participantes inscritos', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchEnrolled();
  }, [curso.id]);

  const handlePrint = () => {
    let part: Participant | null = null;
    if (selectedCi !== 'blank') {
      const found = inscripciones.find(ins => ins.participantes?.ci === selectedCi);
      if (found && found.participantes) {
        part = found.participantes;
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Bloqueador', 'Habilita las ventanas flotantes para imprimir la ficha.', 'warning');
      return;
    }

    const todayStr = new Date().toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const buildFichaHtml = () => {
      // Logic to determine checks
      const isUrbano = curso.area_urbano_rural?.toUpperCase().includes('URBANO');
      const isRural = curso.area_urbano_rural?.toUpperCase().includes('RURAL');

      // Nivel Regular
      const groupText = (curso.ciclo_grupo || curso.area_formativa || '').toUpperCase();
      const isInicial = groupText.includes('INICIAL');
      const isPrimaria = groupText.includes('PRIMARIA');
      const isSecundaria = groupText.includes('SECUNDARIA');

      // RDA RP
      const rdaVal = part?.rda || '';

      return `
        <div class="ficha">
          <!-- Header Logos & Title -->
          <table class="header-table">
            <tr>
              <td width="25%" align="left" class="logo-col">
                <div class="bolivia-logo">
                  <span class="bolivia-pill"></span>
                  <span class="m-title">MINISTERIO DE EDUCACIÓN</span>
                  <span class="m-sub">ESTADO PLURINACIONAL DE BOLIVIA</span>
                </div>
              </td>
              <td width="50%" align="center">
                <div class="title-main">FICHA DE INSCRIPCIÓN</div>
                <div class="title-sub">ITINERARIOS FORMATIVOS - MODALIDAD SEMIPRESENCIAL</div>
              </td>
              <td width="25%" align="right" class="logo-col">
                <div class="unefco-logo">
                  <span class="unefco-title">UNEFCO</span>
                  <span class="unefco-sub">Unidad Especializada de Formación Continua</span>
                </div>
              </td>
            </tr>
          </table>

          <!-- 1. Table for Course Details -->
          <table class="data-table">
            <tr>
              <td class="lbl" width="18%">Area</td>
              <td class="val">${curso.area_formativa || curso.ciclo_grupo || ''}</td>
            </tr>
            <tr>
              <td class="lbl">Ciclo Formativo</td>
              <td class="val"><b>${curso.ciclo_nombre || ''}</b></td>
            </tr>
            <tr>
              <td class="lbl">Curso Nº 1</td>
              <td class="val">${curso.tema1 || ''}</td>
            </tr>
            <tr>
              <td class="lbl">Curso Nº 2</td>
              <td class="val">${curso.tema2 || ''}</td>
            </tr>
            <tr>
              <td class="lbl">Curso Nº 3</td>
              <td class="val">${curso.tema3 || ''}</td>
            </tr>
            <tr>
              <td class="lbl">Curso Nº 4</td>
              <td class="val">${curso.tema4 || ''}</td>
            </tr>
          </table>

          <!-- 2. Personal Info Section -->
          <table class="personal-table">
            <tr>
              <td class="lbl" width="20%">Apellido(s) y Nombre(s):</td>
              <td class="val" colspan="3">${part ? `${part.apellidos} ${part.nombres}` : ''}</td>
              <td class="lbl" width="12%">Telf/Cel:</td>
              <td class="val" width="15%">${part?.celular || ''}</td>
            </tr>
            <tr>
              <td class="lbl">Carnet de Identidad:</td>
              <td class="val" width="25%">${part?.ci || ''}</td>
              <td class="lbl" width="10%">E-mail:</td>
              <td class="val">${part ? '' : ''}</td>
              <td class="lbl">RDA/RP:</td>
              <td class="val">${rdaVal}</td>
            </tr>
            <tr>
              <td class="lbl">Fecha de Nacimiento:</td>
              <td class="val" colspan="5"></td>
            </tr>
          </table>

          <!-- 3. Form Selection Options (Checkboxes) -->
          <div class="checks-section">
            <div class="check-row">
              <span class="lbl-check">Función que cumple:</span>
              <span class="chk-box-label">Docente <span class="chk">${part ? 'X' : ''}</span></span>
              <span class="chk-box-label">Director <span class="chk"></span></span>
              <span class="chk-box-label">Administrativo <span class="chk"></span></span>
              <span class="chk-box-label">Estudiante ESFM <span class="chk"></span></span>
              <span class="chk-box-label">Estudiante Sec. <span class="chk"></span></span>
              <span class="chk-box-label">Padre de Familia <span class="chk"></span></span>
              <span class="chk-box-label">No aplica <span class="chk"></span></span>
            </div>

            <div class="check-row">
              <span class="lbl-check">Área:</span>
              <span class="chk-box-label">Urbano <span class="chk">${isUrbano ? 'X' : ''}</span></span>
              <span class="chk-box-label">Rural <span class="chk">${isRural ? 'X' : ''}</span></span>
            </div>

            <table class="check-table">
              <tr>
                <td width="75%">
                  <div class="field-line">
                    <span class="lbl-line">Distrito Educativo:</span>
                    <span class="val-line">${curso.distrito || ''}</span>
                  </div>
                  <div class="field-line">
                    <span class="lbl-line">Unidad Educativa:</span>
                    <span class="val-line">${part ? `${part.unidad_educativa || ''} ${part.sie ? `(SIE: ${part.sie})` : ''}` : ''}</span>
                  </div>
                </td>
                <td width="25%" align="right">
                  <div class="check-vertical">
                    <span class="chk-box-label">No aplica <span class="chk"></span></span>
                    <span class="chk-box-label">No aplica <span class="chk"></span></span>
                  </div>
                </td>
              </tr>
            </table>

            <div class="check-row" style="margin-top: 4px;">
              <span class="lbl-check">Subsistema:</span>
              <span class="chk-box-label">Educación Regular <span class="chk">X</span></span>
              <span class="chk-box-label">Educación Alternativa y Especial <span class="chk"></span></span>
              <span class="chk-box-label">Ed. Superior <span class="chk"></span></span>
              <span class="chk-box-label">No aplica <span class="chk"></span></span>
            </div>

            <div class="check-row">
              <span class="lbl-check">Nivel de Ed. Regular:</span>
              <span class="chk-box-label">Inicial <span class="chk">${isInicial ? 'X' : ''}</span></span>
              <span class="chk-box-label">Primaria <span class="chk">${isPrimaria ? 'X' : ''}</span></span>
              <span class="chk-box-label">Secundaria <span class="chk">${isSecundaria ? 'X' : ''}</span></span>
              <span class="chk-box-label">Ed. Superior <span class="chk"></span></span>
              <span class="chk-box-label">No aplica <span class="chk">${(!isInicial && !isPrimaria && !isSecundaria) ? 'X' : ''}</span></span>
            </div>

            <table class="check-table" style="margin-top: 4px;">
              <tr>
                <td width="55%">
                  <div class="field-line">
                    <span class="lbl-line">Especialidad:</span>
                    <span class="val-line"></span>
                  </div>
                </td>
                <td width="45%">
                  <div class="field-line">
                    <span class="lbl-line">Año de Formación:</span>
                    <span class="val-line"></span>
                  </div>
                </td>
              </tr>
            </table>

            <div class="check-row" style="margin-top: 4px;">
              <span class="lbl-check">Discapacidad:</span>
              <span class="chk-box-label">Auditiva <span class="chk"></span></span>
              <span class="chk-box-label">Visual <span class="chk"></span></span>
              <span class="chk-box-label">Otros <span class="chk"></span></span>
              <span style="border-bottom: 1px solid #444; width: 140px; display: inline-block; height: 12px; margin-left: 5px;"></span>
            </div>
          </div>

          <!-- 4. Footer & Signature -->
          <table class="footer-table">
            <tr>
              <td width="50%" align="left" valign="bottom">
                <span class="lbl">Fecha de inscripción:</span>
                <span style="border-bottom: 1px solid #000; padding: 0 10px; font-weight: bold;">
                  &nbsp;&nbsp;${todayStr.split('/')[0]}&nbsp;&nbsp;
                </span> / 
                <span style="border-bottom: 1px solid #000; padding: 0 10px; font-weight: bold;">
                  &nbsp;&nbsp;${todayStr.split('/')[1]}&nbsp;&nbsp;
                </span> / 
                <span style="border-bottom: 1px solid #000; padding: 0 15px; font-weight: bold;">
                  &nbsp;&nbsp;${todayStr.split('/')[2]}&nbsp;&nbsp;
                </span>
              </td>
              <td width="50%" align="center" valign="bottom">
                <div class="signature-line"></div>
                <div class="signature-lbl">Firma Participante</div>
              </td>
            </tr>
          </table>
        </div>
      `;
    };

    const fichaHtml = buildFichaHtml();

    printWindow.document.write(`
      <html>
      <head>
        <title>Ficha de Inscripción - ID ${curso.id}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 0.3in 0.25in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .sheet-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: space-between;
            box-sizing: border-box;
          }
          .ficha {
            height: 48.5%;
            box-sizing: border-box;
            border: 2px solid #000;
            border-radius: 4px;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: #fff;
          }
          
          /* Custom divider to guide cutting the sheet */
          .divider-line {
            border-top: 1px dashed #777;
            width: 100%;
            text-align: center;
            margin: 4px 0;
            font-size: 8pt;
            color: #777;
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
          }
          
          /* Table structures */
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          /* Header Logos styling */
          .header-table {
            margin-bottom: 8px;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
          }
          .bolivia-logo {
            display: flex;
            flex-direction: column;
            text-align: left;
            line-height: 1.1;
          }
          .bolivia-pill {
            height: 8px;
            width: 70px;
            background: linear-gradient(to right, #e8112d 33.3%, #f7e112 33.3%, #f7e112 66.6%, #009e49 66.6%);
            margin-bottom: 4px;
            border-radius: 1px;
          }
          .m-title {
            font-size: 7.5pt;
            font-weight: 800;
            color: #111;
          }
          .m-sub {
            font-size: 5.8pt;
            color: #555;
            font-weight: bold;
          }
          .title-main {
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #000;
            line-height: 1.1;
          }
          .title-sub {
            font-size: 7.8pt;
            font-weight: bold;
            color: #333;
          }
          .unefco-logo {
            display: flex;
            flex-direction: column;
            text-align: right;
            line-height: 1.1;
          }
          .unefco-title {
            font-size: 13pt;
            font-weight: 900;
            color: #0c2340;
            letter-spacing: 0.5px;
          }
          .unefco-sub {
            font-size: 5.5pt;
            color: #444;
            font-weight: 600;
          }

          /* General Label / Values */
          .lbl {
            font-size: 8pt;
            font-weight: bold;
            color: #000;
          }
          .val {
            font-size: 8.5pt;
            color: #111;
          }

          /* Courses data table */
          .data-table {
            margin-bottom: 8px;
          }
          .data-table td {
            border: 1px solid #000;
            padding: 3.5px 6px;
            vertical-align: middle;
          }
          .data-table .lbl {
            background-color: #f2f2f2;
            text-align: right;
            padding-right: 10px;
          }
          
          /* Personal table */
          .personal-table {
            margin-bottom: 8px;
          }
          .personal-table td {
            border: 1px solid #000;
            padding: 3.5px 6px;
            vertical-align: middle;
          }
          .personal-table .lbl {
            background-color: #f2f2f2;
            text-align: right;
            padding-right: 8px;
          }

          /* Checkboxes */
          .checks-section {
            font-size: 7.2pt;
            line-height: 1.2;
            margin-bottom: 8px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .check-row {
            margin-bottom: 4.5px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
          }
          .lbl-check {
            font-weight: bold;
            margin-right: 10px;
            width: 105px;
            display: inline-block;
          }
          .chk-box-label {
            margin-right: 12px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .chk {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1.5px solid #000;
            text-align: center;
            font-size: 7.5pt;
            line-height: 12px;
            font-weight: bold;
            background: #fff;
          }

          .check-table {
            width: 100%;
          }
          .check-table td {
            padding: 0;
            vertical-align: middle;
          }
          .field-line {
            display: flex;
            align-items: flex-end;
            margin-bottom: 3.5px;
            width: 98%;
          }
          .lbl-line {
            font-weight: bold;
            margin-right: 6px;
            white-space: nowrap;
          }
          .val-line {
            border-bottom: 1px solid #444;
            flex: 1;
            padding-left: 5px;
            font-size: 8.5pt;
            font-weight: bold;
            height: 14px;
            line-height: 14px;
          }
          .check-vertical {
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: flex-end;
          }

          /* Footer / Signatures */
          .footer-table {
            margin-top: auto;
            padding-top: 10px;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 80%;
            margin: 0 auto;
          }
          .signature-lbl {
            font-size: 8.5pt;
            font-weight: bold;
            margin-top: 3px;
          }

          @media print {
            .divider-line { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          <!-- Duplicate Copy 1 (UNEFCO COPY) -->
          ${fichaHtml}
          
          <!-- Visual line dividing the page when cutting -->
          <div class="divider-line">---------------------- CORTE POR AQUÍ PARA ENTREGAR AL MAESTRO / UNEFCO ----------------------</div>
          
          <!-- Duplicate Copy 2 (PARTICIPANT COPY) -->
          ${fichaHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(11,21,32,0.6)', backdropFilter: 'blur(8px)', zIndex: 1100, padding: '20px' }}>
      <div className="modal-container" style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', background: 'var(--primary-900)', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              Impresión de Fichas de Inscripción
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', opacity: 0.8 }}>
              Ciclo ID {curso.id} — Genera 2 copias idénticas por hoja carta.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--primary-50)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-100)' }}>
            <FileText style={{ color: 'var(--primary-600)' }} size={32} />
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--primary-900)', lineHeight: 1.4 }}>
              Este proceso generará un documento en tamaño <b>Carta Vertical</b> conteniendo <b>dos fichas idénticas</b> (una para el Técnico/Facilitador y otra para el Maestro).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gray-700)' }}>
              SELECCIONA PARTICIPANTE (PRELLENADO)
            </label>
            
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <Loader2 className="spin" size={14} />
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Cargando inscritos...</span>
              </div>
            ) : (
              <select
                value={selectedCi}
                onChange={(e) => setSelectedCi(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.88rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', background: 'var(--white)' }}
              >
                <option value="blank">-- IMPRIMIR FICHA EN BLANCO (Solo curso) --</option>
                {inscripciones.map((ins) => {
                  const p = ins.participantes;
                  if (!p) return null;
                  return (
                    <option key={p.ci} value={p.ci}>
                      {p.apellidos} {p.nombres} (CI: {p.ci})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Cancelar
          </button>
          <button 
            onClick={handlePrint}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
          >
            <Printer size={14} />
            Generar Impresión
          </button>
        </div>

      </div>
    </div>
  );
}
