'use client';

import { useState, useCallback, useEffect } from 'react';
import { Curso, HorarioSlot, Tecnico, Facilitador, CicloFormativo } from '@/types';
import Swal from 'sweetalert2';
import { getNoteCompliance } from '@/lib/utils/compliance';
import { buildMapEmbedSrc, buildMapOpenLink } from '@/lib/utils/maps';
import { GROUP_COLORS } from '@/lib/utils/colors';
import { formatFechaDisplay, getTotalHours, getHoursByCourse } from '@/lib/utils/calendar';
import MiniMonthCalendar from '@/components/calendario/MiniMonthCalendar';
import { distritosData } from '@/lib/utils/distritos';
import {
  Edit3, Trash2, Users, Wrench, Globe, FileText, BookOpen,
  ClipboardEdit, ToggleLeft, Link2, MapPin, ExternalLink,
  Phone, MessageCircle, Share2, Eye, CheckCircle2,
  Calendar, Clock, Save, User
} from 'lucide-react';
import InscripcionOnlineModal from '@/components/cursos/InscripcionOnlineModal';

const getInitialFechaInicio = (c: Curso | null): string => {
  if (!c) return '';
  if (c.fecha_inicio) {
    let cleanStr = c.fecha_inicio.trim().replace(/\s+/g, 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      cleanStr += 'T08:00';
    }
    const match = cleanStr.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (match) {
      return match[1];
    }
    return cleanStr;
  }
  if (c.horarios_tentativos && c.horarios_tentativos.length > 0) {
    const first = c.horarios_tentativos.reduce((a, b) => (a.date < b.date ? a : b));
    return `${first.date}T${first.startTime || '08:00'}`;
  }
  return '';
};

const AREAS_FORMATIVAS = [
  'EDUCACION ALTERNATIVA',
  'DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS',
  'EDUCACION INICIAL EN FAMILIA COMUNITARIA',
  'PARA TODOS LOS ACTORES DEL SEP',
  'TACFI',
  'EDUCACION ESPECIAL',
  'EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA',
  'EDUCACION PRIMARIA COMUNITARIA VOCACIONAL'
];

const SEGMENTO_OPTIONS = [
  'Maestros(as), P. Admin.',
  'Egresados',
  'Estudiantes ESFM/UA',
  'Otros'
];

interface NotaCardProps {
  curso: Curso;
  tecnicos: Tecnico[];
  facilitadores: Facilitador[];
  ciclos: CicloFormativo[];
  grupoNames: string[];
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (data: Partial<Curso>) => void;
  onManageParticipantes: (curso: Curso) => void;
  animationDelay?: number;
  readOnly?: boolean;
}

export default function NotaCard({
  curso,
  tecnicos,
  facilitadores,
  ciclos,
  grupoNames,
  onEdit,
  onDelete,
  onUpdate,
  onManageParticipantes,
  animationDelay = 0,
  readOnly = false,
}: NotaCardProps) {
  const [orgNombre, setOrgNombre] = useState(curso.organizador_nombre || '');
  const [orgTelefono, setOrgTelefono] = useState(curso.organizador_telefono || '');
  const [orgMaps, setOrgMaps] = useState(curso.organizador_maps || '');
  const [observaciones, setObservaciones] = useState(curso.observaciones || '');
  const [linkExterno, setLinkExterno] = useState(curso.link_inscripcion_externo || '');
  const [noteColor, setNoteColor] = useState(curso.grupo_color || '#2f80ed');
  const [prev, setPrev] = useState(curso.prev || '');
  const [showInscripcionModal, setShowInscripcionModal] = useState(false);
  const [resolvedMapSrc, setResolvedMapSrc] = useState('');

  // Estados locales para la edición directa del curso
  const [lastCursoId, setLastCursoId] = useState(curso.id);
  const [editTecnico, setEditTecnico] = useState(curso.tecnico_carnet || '');
  const [editCiclo, setEditCiclo] = useState(curso.ciclo_id || '');
  const [editAreaFormativa, setEditAreaFormativa] = useState(() => {
    const currentCiclo = ciclos.find((c) => c.id === curso.ciclo_id);
    return currentCiclo?.area_formativa || '';
  });
  const [editFacilitador, setEditFacilitador] = useState(curso.facilitador_carnet || '');
  const [editDistrito, setEditDistrito] = useState(curso.distrito || '');
  const [editLugar, setEditLugar] = useState(curso.lugar || '');
  const [editArea, setEditArea] = useState(curso.area_urbano_rural || 'Urbano');
  const [editSegmento, setEditSegmento] = useState(curso.segmento || '');
  const [editFechaInicio, setEditFechaInicio] = useState(getInitialFechaInicio(curso));
  const [editMes, setEditMes] = useState(curso.mes || '');
  const [editCosto, setEditCosto] = useState(curso.costo || 50);
  const [editGrupoNombre, setEditGrupoNombre] = useState(curso.grupo_nombre || '');
  const [editNewGrupoNombre, setEditNewGrupoNombre] = useState('');

  // Sincronizar estados locales con las props del curso
  useEffect(() => {
    const isDifferentCurso = curso.id !== lastCursoId;
    if (isDifferentCurso) {
      setLastCursoId(curso.id);
    }

    const hasOrgChanges = !isDifferentCurso && (
      orgNombre !== (curso.organizador_nombre || '') ||
      orgTelefono !== (curso.organizador_telefono || '') ||
      orgMaps !== (curso.organizador_maps || '') ||
      observaciones !== (curso.observaciones || '') ||
      linkExterno !== (curso.link_inscripcion_externo || '') ||
      noteColor !== (curso.grupo_color || '#2f80ed')
    );

    const cleanEditFecha = (editFechaInicio || '').replace('T', ' ').substring(0, 16);
    const cleanCursoFecha = (curso.fecha_inicio || '').trim().replace(/\s+/g, ' ').substring(0, 16);
    const hasCurChanges = !isDifferentCurso && (
      editTecnico !== (curso.tecnico_carnet || '') ||
      editCiclo !== (curso.ciclo_id || '') ||
      editFacilitador !== (curso.facilitador_carnet || '') ||
      editDistrito !== (curso.distrito || '') ||
      editLugar !== (curso.lugar || '') ||
      editArea !== (curso.area_urbano_rural || 'Urbano') ||
      editSegmento !== (curso.segmento || '') ||
      cleanEditFecha !== cleanCursoFecha ||
      editMes !== (curso.mes || '') ||
      editCosto !== (curso.costo || 50) ||
      editGrupoNombre !== (curso.grupo_nombre || '') ||
      editNewGrupoNombre.trim() !== ''
    );

    if (!hasOrgChanges) {
      setOrgNombre(curso.organizador_nombre || '');
      setOrgTelefono(curso.organizador_telefono || '');
      setOrgMaps(curso.organizador_maps || '');
      setObservaciones(curso.observaciones || '');
      setLinkExterno(curso.link_inscripcion_externo || '');
      setNoteColor(curso.grupo_color || '#2f80ed');
    }

    setPrev(curso.prev || '');

    if (!hasCurChanges) {
      setEditTecnico(curso.tecnico_carnet || '');
      setEditCiclo(curso.ciclo_id || '');
      const currentCiclo = ciclos.find((c) => c.id === curso.ciclo_id);
      setEditAreaFormativa(currentCiclo?.area_formativa || '');
      setEditFacilitador(curso.facilitador_carnet || '');
      setEditDistrito(curso.distrito || '');
      setEditLugar(curso.lugar || '');
      setEditArea(curso.area_urbano_rural || 'Urbano');
      setEditSegmento(curso.segmento || '');
      setEditFechaInicio(getInitialFechaInicio(curso));
      setEditMes(curso.mes || '');
      setEditCosto(curso.costo || 50);
      setEditGrupoNombre(curso.grupo_nombre || '');
      setEditNewGrupoNombre('');
    }
  }, [
    curso.id,
    curso.organizador_nombre,
    curso.organizador_telefono,
    curso.organizador_maps,
    curso.observaciones,
    curso.link_inscripcion_externo,
    curso.grupo_color,
    curso.prev,
    curso.tecnico_carnet,
    curso.ciclo_id,
    curso.facilitador_carnet,
    curso.distrito,
    curso.lugar,
    curso.area_urbano_rural,
    curso.segmento,
    curso.fecha_inicio,
    curso.mes,
    curso.costo,
    curso.grupo_nombre,
    ciclos,
    lastCursoId
  ]);

  useEffect(() => {
    const rawLocation = orgMaps || curso.lugar || '';
    if (!rawLocation.trim()) {
      setResolvedMapSrc('');
      return;
    }

    if (rawLocation.includes('maps.app.goo.gl') || rawLocation.includes('goo.gl/maps') || rawLocation.includes('goo.gl')) {
      fetch(`/api/maps/resolve?url=${encodeURIComponent(rawLocation)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.embedSrc) {
            setResolvedMapSrc(data.embedSrc);
          } else {
            setResolvedMapSrc(buildMapEmbedSrc(rawLocation));
          }
        })
        .catch((err) => {
          console.error('Error resolving map:', err);
          setResolvedMapSrc(buildMapEmbedSrc(rawLocation));
        });
    } else {
      setResolvedMapSrc(buildMapEmbedSrc(rawLocation));
    }
  }, [orgMaps, curso.lugar]);

  const hasOrganizerChanges =
    orgNombre !== (curso.organizador_nombre || '') ||
    orgTelefono !== (curso.organizador_telefono || '') ||
    orgMaps !== (curso.organizador_maps || '') ||
    observaciones !== (curso.observaciones || '') ||
    linkExterno !== (curso.link_inscripcion_externo || '') ||
    noteColor !== (curso.grupo_color || '#2f80ed');

  const cleanEditFecha = (editFechaInicio || '').replace('T', ' ').substring(0, 16);
  const cleanCursoFecha = (curso.fecha_inicio || '').trim().replace(/\s+/g, ' ').substring(0, 16);
  const hasCursoChanges =
    editTecnico !== (curso.tecnico_carnet || '') ||
    editCiclo !== (curso.ciclo_id || '') ||
    editFacilitador !== (curso.facilitador_carnet || '') ||
    editDistrito !== (curso.distrito || '') ||
    editLugar !== (curso.lugar || '') ||
    editArea !== (curso.area_urbano_rural || 'Urbano') ||
    editSegmento !== (curso.segmento || '') ||
    cleanEditFecha !== cleanCursoFecha ||
    editMes !== (curso.mes || '') ||
    editCosto !== (curso.costo || 50) ||
    editGrupoNombre !== (curso.grupo_nombre || '') ||
    editNewGrupoNombre.trim() !== '';

  const compliance = getNoteCompliance(curso);
  const isConfirmado = !!curso.facilitador_nombre && 
    curso.facilitador_nombre.trim() !== '' && 
    !/por confirmar/i.test(curso.facilitador_nombre);
  const count = curso.inscritos_formulario;
  const slots = curso.horarios_tentativos || [];
  const totalHours = getTotalHours(slots);
  const hoursByCourse = getHoursByCourse(slots);

  const mapLink = buildMapOpenLink(orgMaps || curso.lugar);

  // ─── First course date for calendar display ─────────────────
  const firstSlot = slots.length > 0
    ? slots.reduce((a, b) => (a.date < b.date ? a : b))
    : null;

  const handleAreaFormativaChange = (newArea: string) => {
    setEditAreaFormativa(newArea);
    const currentCicloObj = ciclos.find((c) => c.id === editCiclo);
    if (!newArea || currentCicloObj?.area_formativa !== newArea) {
      setEditCiclo('');
    }
  };

  const filteredCiclos = ciclos.filter((c) => c.area_formativa === editAreaFormativa);

  // ─── Save organizador ──────────────────────────────────────
  const handleSaveOrganizador = () => {
    onUpdate({
      observaciones,
      link_inscripcion_externo: linkExterno,
      grupo_color: noteColor,
      prev,
      organizador_nombre: orgNombre,
      organizador_telefono: orgTelefono,
      organizador_maps: orgMaps,
    });

    Swal.fire({
      icon: 'success',
      title: '¡Guardado con éxito!',
      text: 'Los datos del organizador se han actualizado correctamente.',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#bfa05e',
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: true
    });
  };

  // ─── Save curso info ───────────────────────────────────────
  const handleSaveCursoInfo = () => {
    const finalGrupoNombre = editNewGrupoNombre.trim() ? editNewGrupoNombre.trim() : editGrupoNombre;
    const finalTotalBs = curso.inscritos_formulario * editCosto;

    onUpdate({
      tecnico_carnet: editTecnico || null,
      ciclo_id: editCiclo || null,
      facilitador_carnet: editFacilitador || null,
      distrito: editDistrito,
      lugar: editLugar,
      area_urbano_rural: editArea,
      segmento: editSegmento,
      fecha_inicio: editFechaInicio ? editFechaInicio.replace('T', ' ') : '',
      mes: editMes,
      costo: editCosto,
      grupo_nombre: finalGrupoNombre,
      total_bs: finalTotalBs,
    });

    Swal.fire({
      icon: 'success',
      title: '¡Guardado con éxito!',
      text: 'Los datos del curso se han actualizado correctamente.',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#bfa05e',
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: true
    });
  };

  // ─── Save calendar slots ───────────────────────────────────
  const handleSaveSlots = useCallback((newSlots: HorarioSlot[]) => {
    onUpdate({ horarios_tentativos: newSlots });
  }, [onUpdate]);

  // ─── Save checks ───────────────────────────────────────────
  const handleToggleCheck = (field: 'planificacion_recibida' | 'evaluacion_realizada' | 'informe_final_recibido') => {
    onUpdate({ [field]: !curso[field] });
  };

  // ─── Print Ficha de Inscripción 2-up Letter (Blank template with official logos) ───
  const handlePrintFichaInscripcion = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Bloqueador', 'Habilita las ventanas flotantes para imprimir la ficha.', 'warning');
      return;
    }

    const logoMineduUrl = window.location.origin + '/logo-minedu.jpg';
    const logoUnefcoUrl = window.location.origin + '/logo-unefco.jpg';

    const buildFichaHtml = () => {
      return `
        <div class="ficha">
          <!-- Header Logos & Title -->
          <table class="header-table">
            <tr>
              <td width="35%" align="left" valign="middle">
                <img src="${logoMineduUrl}" class="logo-img" alt="Ministerio de Educación" />
              </td>
              <td width="30%" align="center" valign="middle">
                <div class="title-main">FICHA DE INSCRIPCIÓN</div>
                <div class="title-sub">ITINERARIOS FORMATIVOS - MODALIDAD SEMIPRESENCIAL</div>
              </td>
              <td width="35%" align="right" valign="middle">
                <img src="${logoUnefcoUrl}" class="logo-img" alt="UNEFCO" />
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
              <td class="val" colspan="3"></td>
              <td class="lbl" width="12%">Telf/Cel:</td>
              <td class="val" width="15%"></td>
            </tr>
            <tr>
              <td class="lbl">Carnet de Identidad:</td>
              <td class="val" width="25%"></td>
              <td class="lbl" width="10%">E-mail:</td>
              <td class="val"></td>
              <td class="lbl">RDA/RP:</td>
              <td class="val"></td>
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
              <span class="chk-box-label">Docente <span class="chk"></span></span>
              <span class="chk-box-label">Director <span class="chk"></span></span>
              <span class="chk-box-label">Administrativo <span class="chk"></span></span>
              <span class="chk-box-label">Estudiante ESFM <span class="chk"></span></span>
              <span class="chk-box-label">Estudiante Sec. <span class="chk"></span></span>
              <span class="chk-box-label">Padre de Familia <span class="chk"></span></span>
              <span class="chk-box-label">No aplica <span class="chk"></span></span>
            </div>

            <div class="check-row">
              <span class="lbl-check">Área:</span>
              <span class="chk-box-label">Urbano <span class="chk"></span></span>
              <span class="chk-box-label">Rural <span class="chk"></span></span>
            </div>

            <table class="check-table">
              <tr>
                <td width="75%">
                  <div class="field-line">
                    <span class="lbl-line">Distrito Educativo:</span>
                    <span class="val-line"></span>
                  </div>
                  <div class="field-line">
                    <span class="lbl-line">Unidad Educativa:</span>
                    <span class="val-line"></span>
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
              <span class="chk-box-label">Educación Regular <span class="chk"></span></span>
              <span class="chk-box-label">Educación Alternativa y Especial <span class="chk"></span></span>
              <span class="chk-box-label">Ed. Superior <span class="chk"></span></span>
              <span class="chk-box-label">No aplica <span class="chk"></span></span>
            </div>

            <div class="check-row">
              <span class="lbl-check">Nivel de Ed. Regular:</span>
              <span class="chk-box-label">Inicial <span class="chk"></span></span>
              <span class="chk-box-label">Primaria <span class="chk"></span></span>
              <span class="chk-box-label">Secundaria <span class="chk"></span></span>
              <span class="chk-box-label">Ed. Superior <span class="chk"></span></span>
              <span class="chk-box-label">No aplica <span class="chk"></span></span>
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
                <span style="border-bottom: 1px solid #000; padding: 0 20px; font-weight: bold;">
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span> / 
                <span style="border-bottom: 1px solid #000; padding: 0 20px; font-weight: bold;">
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span> / 
                <span style="border-bottom: 1px solid #000; padding: 0 30px; font-weight: bold;">
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
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
            margin: 0.25in 0.25in;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background: #fff;
          }
          .sheet-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: space-between;
            box-sizing: border-box;
            padding: 0.1in 0;
            position: relative;
          }
          .ficha {
            height: 48%;
            box-sizing: border-box;
            border: 2px solid #000;
            border-radius: 4px;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: #fff;
          }
          
          /* Custom divider to guide cutting the sheet */
          .divider-line {
            border-top: 1.5px dashed #777;
            width: 100%;
            text-align: center;
            padding: 6px 0;
            font-size: 8pt;
            color: #555;
            box-sizing: border-box;
          }
          
          /* Table structures */
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          /* Header Logos styling */
          .header-table {
            margin-bottom: 6px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 4px;
          }
          .logo-img {
            height: 44px;
            max-width: 100%;
            object-fit: contain;
            display: block;
          }
          .title-main {
            font-size: 13pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #000;
            line-height: 1.1;
          }
          .title-sub {
            font-size: 7.2pt;
            font-weight: bold;
            color: #333;
          }

          /* General Label / Values */
          .lbl {
            font-size: 7.8pt;
            font-weight: bold;
            color: #000;
          }
          .val {
            font-size: 8.2pt;
            color: #111;
          }

          /* Courses data table */
          .data-table {
            margin-bottom: 6px;
          }
          .data-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            vertical-align: middle;
          }
          .data-table .lbl {
            background-color: #f2f2f2;
            text-align: right;
            padding-right: 8px;
          }
          
          /* Personal table */
          .personal-table {
            margin-bottom: 6px;
          }
          .personal-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            vertical-align: middle;
          }
          .personal-table .lbl {
            background-color: #f2f2f2;
            text-align: right;
            padding-right: 6px;
          }

          /* Checkboxes */
          .checks-section {
            font-size: 7pt;
            line-height: 1.15;
            margin-bottom: 6px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .check-row {
            margin-bottom: 4px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
          }
          .lbl-check {
            font-weight: bold;
            margin-right: 8px;
            width: 100px;
            display: inline-block;
          }
          .chk-box-label {
            margin-right: 10px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .chk {
            display: inline-block;
            width: 11px;
            height: 11px;
            border: 1.5px solid #000;
            text-align: center;
            font-size: 7pt;
            line-height: 11px;
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
            margin-bottom: 3px;
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
            font-size: 8pt;
            font-weight: bold;
            height: 13px;
            line-height: 13px;
          }
          .check-vertical {
            display: flex;
            flex-direction: column;
            gap: 3px;
            align-items: flex-end;
          }

          /* Footer / Signatures */
          .footer-table {
            margin-top: auto;
            padding-top: 6px;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 80%;
            margin: 0 auto;
          }
          .signature-lbl {
            font-size: 8pt;
            font-weight: bold;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          <!-- Duplicate Copy 1 (UNEFCO COPY) -->
          ${fichaHtml}
          
          <!-- Visual line dividing the page when cutting -->
          .divider-line {
            border-top: 1.5px dashed #777;
            width: 100%;
            text-align: center;
            padding: 6px 0;
            font-size: 8pt;
            color: #555;
            box-sizing: border-box;
          }
          
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

  // ─── Dates summary ─────────────────────────────────────────
  const courseDatesStr = slots
    .filter((s) => typeof s.course === 'number' || ['1', '2', '3', '4'].includes(String(s.course)))
    .map((s) => s.date)
    .sort();
  const dateRangeLabel = courseDatesStr.length > 0
    ? `${formatFechaDisplay(courseDatesStr[0])} - ${formatFechaDisplay(courseDatesStr[courseDatesStr.length - 1])}`
    : 'Sin fechas';

  return (
    <div
      className={`nota-card ${readOnly ? 'read-only-card' : ''}`}
      style={{
        '--nota-color': noteColor,
        animationDelay: `${animationDelay}s`,
      } as React.CSSProperties}
    >
      {/* ─── Head ────────────────────────────────────────── */}
      <div className="nota-head" style={{ background: noteColor }}>
        <div className="nota-head-left">
          <h3>{curso.grupo_nombre || 'Sin grupo'}</h3>
          <span className="nota-head-pill">
            <Calendar size={11} /> {curso.ciclo_nombre ? curso.ciclo_nombre.substring(0, 30) : curso.segmento || ''}
          </span>
        </div>
        <div className="nota-head-right">
          <div className="nota-count-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="nota-count-value">{count}</div>
            <div className="nota-count-label">INSCRITOS</div>
          </div>
          {!readOnly && (
            <button className="btn btn-sm" onClick={onDelete} title="Eliminar">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Subbar ──────────────────────────────────────── */}
      <div className="nota-subbar">
        <span><Calendar size={13} /> Calendario y control del grupo</span>
        <span>{dateRangeLabel}</span>
      </div>

      <div className="nota-main-content">
        {/* ─── Columna Izquierda (Información) ─────────────────────────── */}
        <div className="nota-col-info">
          {/* ID + State */}
          <div className="nota-id-row">
            <span className="nota-id">ID: {curso.id}</span>
            {curso.tecnico_nombre && (
              <span className="nota-tecnico-badge" style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#1e3a8a',
                background: '#e0e7ff',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #c7d2fe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }} title={`Técnico encargado: ${curso.tecnico_nombre}`}>
                <User size={12} />
                {curso.tecnico_nombre}
              </span>
            )}
            <span className={`nota-state-chip ${curso.estado === 'EJECUTADO' ? 'ejecutado' : 'por-ejecutar'}`}>
              {curso.estado === 'EJECUTADO' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {curso.estado}
            </span>
            <span className={`nota-confirm-badge ${isConfirmado ? 'confirmado' : 'proyectado'}`} style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              backgroundColor: isConfirmado ? '#ecfdf5' : '#fff7ed',
              color: isConfirmado ? '#047857' : '#c2410c',
              borderColor: isConfirmado ? '#a7f3d0' : '#ffedd5',
              whiteSpace: 'nowrap'
            }}>
              {isConfirmado ? '✓ Confirmado' : '⚡ Proyectado'}
            </span>
          </div>

          {/* Preventivo */}
          <div className="nota-preventivo">
            <span className="prev-label">PREV:</span>
            {readOnly ? (
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{prev || '—'}</span>
            ) : (
              <>
                <input
                  type="text"
                  value={prev}
                  onChange={(e) => setPrev(e.target.value)}
                  placeholder="N° preventivo"
                />
                <button className="btn btn-success btn-xs" onClick={() => onUpdate({ prev })}>
                  <Save size={11} />
                </button>
              </>
            )}
          </div>

          {/* Formulario de Edición Directa */}
          <div className="nota-edit-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="organizador-field">
              <label>Grupo</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editGrupoNombre || '—'}</span>
              ) : (
                <>
                  <select
                    value={editGrupoNombre}
                    onChange={(e) => setEditGrupoNombre(e.target.value)}
                  >
                    <option value="">Sin grupo</option>
                    {grupoNames.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editNewGrupoNombre}
                    onChange={(e) => setEditNewGrupoNombre(e.target.value)}
                    placeholder="O crear grupo nuevo..."
                    style={{ marginTop: '4px' }}
                  />
                </>
              )}
            </div>

            <div className="organizador-field">
              <label>Técnico</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{curso.tecnico_nombre || '—'}</span>
              ) : (
                <select
                  value={editTecnico}
                  onChange={(e) => setEditTecnico(e.target.value)}
                >
                  <option value="">Seleccionar técnico</option>
                  {tecnicos.map((t) => (
                    <option key={t.carnet} value={t.carnet}>{t.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="organizador-field">
              <label>Área Formativa</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editAreaFormativa || '—'}</span>
              ) : (
                <select
                  value={editAreaFormativa}
                  onChange={(e) => handleAreaFormativaChange(e.target.value)}
                >
                  <option value="">Seleccionar área formativa</option>
                  {AREAS_FORMATIVAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="organizador-field">
              <label>Ciclo Formativo</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{curso.ciclo_nombre || '—'}</span>
              ) : (
                <select
                  value={editCiclo}
                  onChange={(e) => setEditCiclo(e.target.value)}
                  disabled={!editAreaFormativa}
                >
                  <option value="">
                    {!editAreaFormativa ? 'Selecciona área formativa primero' : 'Seleccionar ciclo'}
                  </option>
                  {filteredCiclos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="organizador-field">
              <label>Facilitador</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{curso.facilitador_nombre || '—'}</span>
              ) : (
                <select
                  value={editFacilitador}
                  onChange={(e) => setEditFacilitador(e.target.value)}
                >
                  <option value="">Seleccionar facilitador</option>
                  {facilitadores.map((f) => (
                    <option key={f.carnet} value={f.carnet}>{f.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="organizador-field">
              <label>Segmento</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editSegmento || '—'}</span>
              ) : (
                <select
                  value={editSegmento}
                  onChange={(e) => setEditSegmento(e.target.value)}
                >
                  <option value="">Selecciona segmento</option>
                  {SEGMENTO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {editSegmento && !SEGMENTO_OPTIONS.includes(editSegmento) && (
                    <option value={editSegmento}>{editSegmento}</option>
                  )}
                </select>
              )}
            </div>

            <div className="organizador-field">
              <label>Fecha Inicio</label>
              {readOnly ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editFechaInicio ? editFechaInicio.replace('T', ' ') : '—'}</span>
              ) : (
                <input
                  type="datetime-local"
                  value={editFechaInicio}
                  onChange={(e) => setEditFechaInicio(e.target.value)}
                />
              )}
            </div>

            <div className="nota-total-bar" style={{ marginTop: '8px' }}>
              <small>TOTAL ESTIMADO</small>
              <span>{curso.inscritos_formulario * editCosto} Bs</span>
            </div>
          </div>

          {/* Botón de guardado del curso (hidden in readOnly) */}
          {!readOnly && (
            <div className="organizador-save-container" style={{ display: 'flex', width: '100%', marginTop: 'auto', paddingTop: '12px' }}>
              <button
                className={`btn ${hasCursoChanges ? 'btn-danger pulse-danger-btn' : 'btn-success'}`}
                style={{
                  width: '100%',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: hasCursoChanges ? '10px 16px' : '8px 12px',
                  fontSize: hasCursoChanges ? '0.88rem' : '0.82rem',
                  transition: 'all 0.3s ease',
                  boxShadow: hasCursoChanges ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                  borderRadius: 'var(--radius-sm, 6px)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onClick={handleSaveCursoInfo}
              >
                <Save size={hasCursoChanges ? 15 : 13} />
                {hasCursoChanges ? '⚠️ Guardar Datos del Curso' : 'Guardar Datos del Curso'}
              </button>
            </div>
          )}
        </div>

        {/* ─── Columna Central (Costo y Organizador) ─────────────────────────── */}
        <div className="nota-col-costo">
          {/* Ubicación y Costo */}
          <div className="organizador-section" style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid color-mix(in srgb, var(--nota-color, var(--primary-500)) 30%, #e2e8f0)', borderTop: '4px solid var(--nota-color, var(--primary-500))', borderRadius: '8px', padding: '12px' }}>
            <div className="organizador-title" style={{ color: 'var(--nota-color, var(--primary-500))', fontWeight: 800 }}>
              <MapPin size={14} /> Ubicación y Costo
            </div>
            <div className="organizador-grid">
              <div className="organizador-field">
                <label>Distrito</label>
                {readOnly ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editDistrito || '—'}</span>
                ) : (
                  <select
                    value={editDistrito}
                    onChange={(e) => setEditDistrito(e.target.value)}
                  >
                    {distritosData.map((d, index) => {
                      const val = index === 0 ? "" : d[1];
                      return (
                        <option key={index} value={val}>
                          {d[1]}
                        </option>
                      );
                    })}
                    {editDistrito && !distritosData.some((d) => d[1] === editDistrito) && (
                      <option value={editDistrito}>{editDistrito}</option>
                    )}
                  </select>
                )}
              </div>
              <div className="organizador-field">
                <label>Área</label>
                {readOnly ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editArea}</span>
                ) : (
                  <select
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                  >
                    <option value="Urbano">Urbano</option>
                    <option value="Rural">Rural</option>
                  </select>
                )}
              </div>
              <div className="organizador-field full">
                <label>Lugar</label>
                {readOnly ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editLugar || '—'}</span>
                ) : (
                  <input
                    type="text"
                    value={editLugar}
                    onChange={(e) => setEditLugar(e.target.value)}
                    placeholder="U.E. o lugar de ejecución"
                  />
                )}
              </div>
              <div className="organizador-field">
                <label>Mes</label>
                {readOnly ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editMes || '—'}</span>
                ) : (
                  <select
                    value={editMes ? editMes.toUpperCase() : ''}
                    onChange={(e) => setEditMes(e.target.value)}
                  >
                    <option value="">Seleccionar mes</option>
                    {['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="organizador-field">
                <label>Costo por participante (Bs)</label>
                {readOnly ? (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{editCosto} Bs</span>
                ) : (
                  <input
                    type="number"
                    value={editCosto}
                    onChange={(e) => setEditCosto(parseFloat(e.target.value) || 0)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Organizador (hidden in readOnly) */}
          {!readOnly && (
            <div className="organizador-section" style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid color-mix(in srgb, var(--nota-color, var(--primary-500)) 30%, #e2e8f0)', borderTop: '4px solid var(--nota-color, var(--primary-500))', borderRadius: '8px', padding: '12px' }}>
              <div className="organizador-title" style={{ color: 'var(--nota-color, var(--primary-500))', fontWeight: 800 }}>
                <Users size={14} /> Datos del Organizador
              </div>
              <div className="organizador-grid">
                <div className="organizador-field">
                  <label>Organizador</label>
                  <input
                    type="text"
                    value={orgNombre}
                    onChange={(e) => setOrgNombre(e.target.value)}
                    placeholder="Nombre del organizador"
                  />
                </div>
                <div className="organizador-field">
                  <label>Celular</label>
                  <input
                    type="text"
                    value={orgTelefono}
                    onChange={(e) => setOrgTelefono(e.target.value)}
                    placeholder="Teléfono"
                  />
                </div>
                <div className="organizador-field full">
                  <label>Link Maps</label>
                  <input
                    type="text"
                    value={orgMaps}
                    onChange={(e) => setOrgMaps(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
                <div className="organizador-field full">
                  <label>Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Pendientes, detalles del organizador..."
                  />
                </div>
                <div className="organizador-field full">
                  <label>Link de inscripción</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={linkExterno}
                      onChange={(e) => setLinkExterno(e.target.value)}
                      placeholder="Google Sheet, formulario externo o lista compartida..."
                      style={{ flex: 1 }}
                    />
                    {linkExterno && (
                      <a
                        href={linkExterno}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-xs"
                      >
                        <ExternalLink size={11} /> Abrir
                      </a>
                    )}
                  </div>
                </div>
                <div className="organizador-field full">
                  <label>Color</label>
                  <div className="color-swatches">
                    {GROUP_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`color-swatch ${noteColor === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setNoteColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="organizador-save-container" style={{ display: 'flex', width: '100%', marginTop: 'auto', paddingTop: '12px' }}>
                <button
                  className={`btn ${hasOrganizerChanges ? 'btn-danger pulse-danger-btn' : 'btn-success'}`}
                  style={{
                    width: '100%',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: hasOrganizerChanges ? '10px 16px' : '8px 12px',
                    fontSize: hasOrganizerChanges ? '0.88rem' : '0.82rem',
                    transition: 'all 0.3s ease',
                    boxShadow: hasOrganizerChanges ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none',
                    borderRadius: 'var(--radius-sm, 6px)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onClick={handleSaveOrganizador}
                >
                  <Save size={hasOrganizerChanges ? 15 : 13} />
                  {hasOrganizerChanges ? '⚠️ Guardar Cambios del Organizador' : 'Guardar Datos del Organizador'}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Note: the old closing div of nota-layout was removed here to let columns stand as direct siblings */}

        {/* ─── Columna Derecha (Calendario y Mapa fusionados) ───────────────────── */}
        <div className="nota-col-widgets">
          {/* Calendario de Actividades */}
          <div className="calendar-section">
            <MiniMonthCalendar
              slots={slots}
              onSaveSlots={handleSaveSlots}
              noteColor={noteColor}
              initialDate={firstSlot ? new Date(firstSlot.date) : undefined}
              compliance={compliance}
              planificacionRecibida={curso.planificacion_recibida}
              evaluacionRealizada={curso.evaluacion_realizada}
              informeFinalRecibido={curso.informe_final_recibido}
              onToggleCheck={handleToggleCheck}
              readOnly={readOnly}
            />
          </div>

          {/* Ubicación exacta (Simétrica) */}
          <div className="map-panel">
            <div className="map-title">
              <h4><MapPin size={14} /> Ubicación exacta</h4>
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noopener noreferrer">
                  Ver en Google <ExternalLink size={11} />
                </a>
              )}
            </div>
            <div className="map-preview">
              {resolvedMapSrc ? (
                <iframe
                  src={resolvedMapSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="map-empty">
                  <div>
                    <MapPin size={28} style={{ opacity: 0.4 }} />
                    <p>Sin ubicación registrada</p>
                  </div>
                </div>
              )}
            </div>

            {/* Share / Comm Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {!readOnly && orgTelefono && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <a
                    href={`https://wa.me/${orgTelefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    style={{ width: '100%', textDecoration: 'none' }}
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                  <a
                    href={`tel:${orgTelefono}`}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', textDecoration: 'none' }}
                  >
                    <Phone size={12} /> Llamar
                  </a>
                </div>
              )}
              {mapLink && (
                <button
                  className="btn btn-map btn-sm"
                  style={{ width: '100%', backgroundColor: '#ea4335', color: '#fff' }}
                  onClick={() => {
                    navigator.clipboard?.writeText(mapLink);
                    Swal.fire({
                      icon: 'success',
                      title: 'Copiado',
                      text: 'Enlace de ubicación copiado al portapapeles.',
                      timer: 2000,
                      showConfirmButton: false,
                      toast: true,
                      position: 'top-end'
                    });
                  }}
                >
                  <Share2 size={12} /> Compartir ubicación
                </button>
              )}
            </div>
          </div>
        </div>

      </div> {/* Closing nota-main-content */}

      {/* ─── Middle Section (Unified Actions) — hidden in readOnly ────── */}
      {!readOnly && (
        <div className="nota-actions-section">
          <div className="nota-actions-grid-4x2">
            {/* Row 1 */}
            <button className="btn btn-danger btn-sm" onClick={onDelete}>
              <Trash2 size={12} /> Eliminar
            </button>
            <button className="btn btn-teal btn-sm" onClick={() => onManageParticipantes(curso)}>
              <Users size={12} /> Participantes
            </button>
            <button className="btn btn-whatsapp btn-sm" onClick={() => setShowInscripcionModal(true)}>
              <Globe size={12} /> Insc. online
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                const link = `${window.location.origin}/participantes/${curso.id}`;
                navigator.clipboard.writeText(link);
                Swal.fire({
                  icon: 'success',
                  title: 'Enlace copiado',
                  text: 'El enlace de inscripción para los participantes fue copiado al portapapeles.',
                  timer: 2500,
                  showConfirmButton: false,
                  toast: true,
                  position: 'top-end'
                });
              }}
            >
              <Link2 size={12} /> Link público
            </button>

            {/* Row 2 */}
            <button className="btn btn-purple btn-sm col-span-2" onClick={handlePrintFichaInscripcion}>
              <FileText size={12} /> Ficha inscripción
            </button>
            <button className="btn btn-orange btn-sm">
              <BookOpen size={12} /> Registro Pedg
            </button>
            <button 
              className={`btn ${curso.form_habilitado !== false ? 'btn-dark' : 'btn-secondary'} btn-sm`}
              onClick={() => onUpdate({ form_habilitado: !(curso.form_habilitado !== false) })}
            >
              <ToggleLeft size={12} style={{ transform: curso.form_habilitado !== false ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} /> On/Off Form: {curso.form_habilitado !== false ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {showInscripcionModal && (
        <InscripcionOnlineModal
          curso={curso}
          onClose={() => setShowInscripcionModal(false)}
        />
      )}
    </div>
  );
}
