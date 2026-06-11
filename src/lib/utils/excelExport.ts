// ============================================================
// Excel Export Utilities (Single-Sheet Area View Report)
// Generates an elegant, professional .xlsx report for the Area view
// ============================================================

// @ts-ignore
import * as XLSX from 'xlsx-js-style';
import { Curso, CicloFormativo, Grupo } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────

/** Count non-empty cuadernos (tema1..tema4) for a curso */
function countCuadernos(curso: Curso): number {
  let n = 0;
  if (curso.tema1 && curso.tema1.trim()) n++;
  if (curso.tema2 && curso.tema2.trim()) n++;
  if (curso.tema3 && curso.tema3.trim()) n++;
  if (curso.tema4 && curso.tema4.trim()) n++;
  return n || 1;
}

/** Calculate total Bs: inscritos × costo × cuadernos */
function calcTotalBs(curso: Curso): number {
  return (curso.inscritos_formulario || 0) * (curso.costo || 0) * countCuadernos(curso);
}

/** Determine estado: Confirmado / Proyectado */
function getEstado(curso: Curso): string {
  const isConfirmado = !!curso.facilitador_nombre &&
    curso.facilitador_nombre.trim() !== '' &&
    !/por confirmar/i.test(curso.facilitador_nombre);
  return isConfirmado ? 'Confirmado' : 'Proyectado';
}

/** Format a date string for display */
function formatDate(fecha: string | null | undefined): string {
  if (!fecha) return '';
  const clean = fecha.replace('T', ' ').trim();
  return clean.substring(0, 16);
}

/** Get current date-time formatted for file names */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/** Get current date formatted for report headers */
function getFormattedDate(): string {
  const now = new Date();
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Helper to set cell value, type and style options in a sheet */
interface CellStyleOptions {
  bold?: boolean;
  sz?: number;
  color?: string; // Hex color code (e.g. 'FFFFFF')
  bg?: string;    // Hex background color code (e.g. '0F766E')
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
  border?: 'thin' | 'subtotal' | 'total' | 'double' | 'none';
}

function setCell(
  ws: any,
  r: number,
  c: number,
  value: any,
  options: CellStyleOptions = {}
): void {
  const cellRef = XLSX.utils.encode_cell({ r, c });

  let t = 's'; // default string
  if (typeof value === 'number') {
    t = 'n';
  } else if (typeof value === 'boolean') {
    t = 'b';
  }

  const cell: any = { v: value, t };
  const s: any = {};

  // Font styling
  s.font = {
    name: 'Segoe UI',
    sz: options.sz || 10,
    bold: !!options.bold,
  };
  if (options.color) {
    s.font.color = { rgb: options.color };
  }

  // Background Fill styling
  if (options.bg) {
    s.fill = {
      patternType: 'solid',
      fgColor: { rgb: options.bg }
    };
  }

  // Alignment styling
  s.alignment = {
    vertical: 'center',
    wrapText: true
  };
  if (options.align) {
    s.alignment.horizontal = options.align;
  } else if (t === 'n') {
    s.alignment.horizontal = 'right';
  } else {
    s.alignment.horizontal = 'left';
  }

  // Number Format
  if (options.numFmt) {
    s.numFmt = options.numFmt;
  }

  // Border styling
  const borderColor = 'E2E8F0'; // Gray-200 border
  if (options.border === 'thin') {
    s.border = {
      top: { style: 'thin', color: { rgb: borderColor } },
      bottom: { style: 'thin', color: { rgb: borderColor } },
      left: { style: 'thin', color: { rgb: borderColor } },
      right: { style: 'thin', color: { rgb: borderColor } },
    };
  } else if (options.border === 'subtotal') {
    s.border = {
      top: { style: 'thin', color: { rgb: '9CA3AF' } },    // Gray-400
      bottom: { style: 'thin', color: { rgb: '9CA3AF' } },
      left: { style: 'thin', color: { rgb: borderColor } },
      right: { style: 'thin', color: { rgb: borderColor } },
    };
  } else if (options.border === 'total') {
    s.border = {
      top: { style: 'thin', color: { rgb: '4B5563' } },    // Gray-600
      bottom: { style: 'medium', color: { rgb: '111827' } }, // Gray-900
      left: { style: 'thin', color: { rgb: borderColor } },
      right: { style: 'thin', color: { rgb: borderColor } },
    };
  } else if (options.border === 'double') {
    s.border = {
      top: { style: 'thin', color: { rgb: '111827' } },
      bottom: { style: 'double', color: { rgb: '111827' } },
      left: { style: 'thin', color: { rgb: borderColor } },
      right: { style: 'thin', color: { rgb: borderColor } },
    };
  }

  cell.s = s;
  ws[cellRef] = cell;
}

/** Download a workbook as xlsx file */
function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// SINGLE SHEET REPORT BY AREAS
// ============================================================

export function exportAreaView(
  areaGroups: Grupo[],
  ciclos: CicloFormativo[]
): void {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};
  const merges: any[] = [];
  const colWidths = Array(13).fill(11); // Initial default column widths

  let r = 0; // Row tracker

  // 1. Report Title
  setCell(ws, r, 0, 'REPORTE CONSOLIDADO POR ÁREA FORMATIVA', {
    bold: true, sz: 16, color: '0F172A'
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 12 } });
  r++;

  // 2. Generation date & system info
  setCell(ws, r, 0, `Generado el: ${getFormattedDate()} | Sistema de Control de Maestros (UNEFCO)`, {
    sz: 10, color: '64748B'
  });
  merges.push({ s: { r, c: 0 }, e: { r, c: 12 } });
  r += 2; // Leave one empty row

  let grandTotalInscritos = 0;
  let grandTotalBs = 0;
  let hasCursos = false;

  const headers = [
    'Ciclo Formativo', 'ID', 'Grupo', 'Facilitador', 'Técnico',
    'Distrito', 'Lugar', 'Inscritos', 'Cuadernos', 'Costo/Part.',
    'Total Bs', 'Fecha Inicio', 'Estado'
  ];

  for (const areaGroup of areaGroups) {
    if (!areaGroup.cursos || areaGroup.cursos.length === 0) continue;
    hasCursos = true;

    // ─── Area Formativa Title Banner ───
    for (let c = 0; c <= 12; c++) {
      setCell(ws, r, c, c === 0 ? `ÁREA FORMATIVA: ${areaGroup.nombre.toUpperCase()}` : '', {
        bg: '0F766E', // Teal 700
        color: 'FFFFFF',
        bold: true,
        sz: 11,
        align: 'left'
      });
    }
    merges.push({ s: { r, c: 0 }, e: { r, c: 12 } });
    r++;

    // ─── Table Headers ───
    for (let c = 0; c <= 12; c++) {
      let align: 'left' | 'center' | 'right' = 'left';
      if (c === 1 || c === 7 || c === 8 || c === 11 || c === 12) align = 'center';
      if (c === 9 || c === 10) align = 'right';

      setCell(ws, r, c, headers[c], {
        bg: '334155', // Slate 700
        color: 'FFFFFF',
        bold: true,
        sz: 9.5,
        align
      });
      // Track header text width
      colWidths[c] = Math.max(colWidths[c], headers[c].length);
    }
    r++;

    // Group courses in this area by cycle name
    const cicloCourseMap = new Map<string, Curso[]>();
    for (const curso of areaGroup.cursos) {
      const cicloKey = curso.ciclo_nombre || 'Sin Ciclo';
      if (!cicloCourseMap.has(cicloKey)) {
        cicloCourseMap.set(cicloKey, []);
      }
      cicloCourseMap.get(cicloKey)!.push(curso);
    }

    let areaTotalInscritos = 0;
    let areaTotalBs = 0;

    for (const [cicloNombre, cursosList] of cicloCourseMap) {
      let cicloInscritos = 0;
      let cicloBs = 0;

      for (const curso of cursosList) {
        const cuadernos = countCuadernos(curso);
        const total = calcTotalBs(curso);

        const rowInscritos = curso.inscritos_formulario || 0;
        cicloInscritos += rowInscritos;
        cicloBs += total;

        const rowBg = r % 2 === 0 ? 'F8FAFC' : 'FFFFFF'; // Alternating soft row background

        // Write row cells
        setCell(ws, r, 0, cicloNombre, { bg: rowBg, border: 'thin' });
        setCell(ws, r, 1, curso.id, { bg: rowBg, align: 'center', border: 'thin' });
        setCell(ws, r, 2, curso.grupo_nombre || '', { bg: rowBg, border: 'thin' });
        setCell(ws, r, 3, curso.facilitador_nombre || '', { bg: rowBg, border: 'thin' });
        setCell(ws, r, 4, curso.tecnico_nombre || '', { bg: rowBg, border: 'thin' });
        setCell(ws, r, 5, curso.distrito || '', { bg: rowBg, border: 'thin' });
        setCell(ws, r, 6, curso.lugar || '', { bg: rowBg, border: 'thin' });
        setCell(ws, r, 7, rowInscritos, { bg: rowBg, align: 'center', numFmt: '#,##0', border: 'thin' });
        setCell(ws, r, 8, cuadernos, { bg: rowBg, align: 'center', numFmt: '#,##0', border: 'thin' });
        setCell(ws, r, 9, curso.costo || 0, { bg: rowBg, align: 'right', numFmt: '#,##0.00', border: 'thin' });
        setCell(ws, r, 10, total, { bg: rowBg, align: 'right', numFmt: '#,##0.00', border: 'thin' });
        setCell(ws, r, 11, formatDate(curso.fecha_inicio), { bg: rowBg, align: 'center', border: 'thin' });
        setCell(ws, r, 12, getEstado(curso), { bg: rowBg, align: 'center', border: 'thin' });

        // Update column width bounds based on values
        colWidths[0] = Math.max(colWidths[0], cicloNombre.length);
        colWidths[1] = Math.max(colWidths[1], String(curso.id).length);
        colWidths[2] = Math.max(colWidths[2], String(curso.grupo_nombre || '').length);
        colWidths[3] = Math.max(colWidths[3], String(curso.facilitador_nombre || '').length);
        colWidths[4] = Math.max(colWidths[4], String(curso.tecnico_nombre || '').length);
        colWidths[5] = Math.max(colWidths[5], String(curso.distrito || '').length);
        colWidths[6] = Math.max(colWidths[6], String(curso.lugar || '').length);
        colWidths[11] = Math.max(colWidths[11], String(formatDate(curso.fecha_inicio)).length);
        colWidths[12] = Math.max(colWidths[12], String(getEstado(curso)).length);

        r++;
      }

      // ─── Subtotal Ciclo row ───
      const subBg = 'F1F5F9'; // Light slate gray for subtotal row
      for (let c = 0; c <= 12; c++) {
        let val: any = '';
        let numFmt: string | undefined = undefined;
        let align: 'left' | 'center' | 'right' = 'left';

        if (c === 0) val = `  Subtotal: ${cicloNombre}`;
        if (c === 7) { val = cicloInscritos; numFmt = '#,##0'; align = 'center'; }
        if (c === 10) { val = cicloBs; numFmt = '#,##0.00'; align = 'right'; }

        setCell(ws, r, c, val, {
          bg: subBg,
          bold: true,
          align,
          numFmt,
          border: 'subtotal'
        });
      }
      r++;

      areaTotalInscritos += cicloInscritos;
      areaTotalBs += cicloBs;
    }

    // ─── Total Área row ───
    const areaBg = 'E2E8F0'; // Medium slate gray for Area Total
    for (let c = 0; c <= 12; c++) {
      let val: any = '';
      let numFmt: string | undefined = undefined;
      let align: 'left' | 'center' | 'right' = 'left';

      if (c === 0) val = `TOTAL ÁREA: ${areaGroup.nombre.toUpperCase()}`;
      if (c === 7) { val = areaTotalInscritos; numFmt = '#,##0'; align = 'center'; }
      if (c === 10) { val = areaTotalBs; numFmt = '#,##0.00'; align = 'right'; }

      setCell(ws, r, c, val, {
        bg: areaBg,
        bold: true,
        align,
        numFmt,
        border: 'total'
      });
    }
    r++;

    grandTotalInscritos += areaTotalInscritos;
    grandTotalBs += areaTotalBs;

    // Leave two empty rows between areas
    r += 2;
  }

  // 3. Grand Total Consolidated
  if (hasCursos) {
    const grandBg = 'CCFBF1'; // Soft pastel teal for grand total row
    for (let c = 0; c <= 12; c++) {
      let val: any = '';
      let numFmt: string | undefined = undefined;
      let align: 'left' | 'center' | 'right' = 'left';

      if (c === 0) val = 'TOTAL GENERAL CONSOLIDADO';
      if (c === 7) { val = grandTotalInscritos; numFmt = '#,##0'; align = 'center'; }
      if (c === 10) { val = grandTotalBs; numFmt = '#,##0.00'; align = 'right'; }

      setCell(ws, r, c, val, {
        bg: grandBg,
        color: '0F766E', // Deep Teal text
        bold: true,
        sz: 11,
        align,
        numFmt,
        border: 'double'
      });
    }
    r++;
  } else {
    // Write empty message if there are no records
    setCell(ws, r, 0, 'No hay cursos disponibles para exportar con los filtros seleccionados.', {
      bold: true, color: 'DC2626'
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: 12 } });
    r++;
  }

  // Define sheet dimensions and ranges
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: r - 1, c: 12 }
  });

  // Apply cell mergers
  ws['!merges'] = merges;

  // Set autofit column widths
  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w + 3, 50) }));

  // Ensure grid lines are visible in generated spreadsheet
  ws['!views'] = [{ showGridLines: true }];

  // Append sheet and download
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte por Áreas');
  downloadWorkbook(wb, `Reporte_Areas_${getTimestamp()}.xlsx`);
}
