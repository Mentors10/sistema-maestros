// ============================================================
// Excel Export Utilities (Single-Sheet Area View Report)
// Generates an elegant, professional .xlsx report for the Area view using ExcelJS
// ============================================================

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

/** Helper to set cell value, type and style options in ExcelJS */
interface CellStyleOptions {
  bold?: boolean;
  sz?: number;
  color?: string; // Hex color code (e.g. 'FFFFFF')
  bg?: string;    // Hex background color code (e.g. '0F766E')
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
  border?: 'thin' | 'subtotal' | 'total' | 'double' | 'none';
}

function setCellExcelJS(
  worksheet: any,
  r: number, // 0-based row
  c: number, // 0-based col
  value: any,
  options: CellStyleOptions = {}
): void {
  const cell = worksheet.getCell(r + 1, c + 1);
  cell.value = value;

  // Font styling
  const font: any = {
    name: 'Calibri',
    size: options.sz || 11,
    bold: !!options.bold,
  };
  if (options.color) {
    font.color = { argb: 'FF' + options.color.replace('#', '') };
  }
  cell.font = font;

  // Background Fill styling
  if (options.bg) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + options.bg.replace('#', '') }
    };
  } else {
    cell.fill = null;
  }

  // Alignment styling
  const alignment: any = {
    vertical: 'middle',
    wrapText: true
  };
  if (options.align) {
    alignment.horizontal = options.align;
  } else if (typeof value === 'number') {
    alignment.horizontal = 'right';
  } else {
    alignment.horizontal = 'left';
  }
  cell.alignment = alignment;

  // Number Format
  if (options.numFmt) {
    cell.numFmt = options.numFmt;
  }

  // Border styling
  const borderHex = 'E2E8F0'; // Gray-200 border
  if (options.border === 'thin') {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + borderHex } },
      bottom: { style: 'thin', color: { argb: 'FF' + borderHex } },
      left: { style: 'thin', color: { argb: 'FF' + borderHex } },
      right: { style: 'thin', color: { argb: 'FF' + borderHex } },
    };
  } else if (options.border === 'subtotal') {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF9CA3AF' } }, // Gray-400
      bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin', color: { argb: 'FF' + borderHex } },
      right: { style: 'thin', color: { argb: 'FF' + borderHex } },
    };
  } else if (options.border === 'total') {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4B5563' } }, // Gray-600
      bottom: { style: 'medium', color: { argb: 'FF111827' } }, // Gray-900
      left: { style: 'thin', color: { argb: 'FF' + borderHex } },
      right: { style: 'thin', color: { argb: 'FF' + borderHex } },
    };
  } else if (options.border === 'double') {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF111827' } },
      bottom: { style: 'double', color: { argb: 'FF111827' } },
      left: { style: 'thin', color: { argb: 'FF' + borderHex } },
      right: { style: 'thin', color: { argb: 'FF' + borderHex } },
    };
  } else {
    cell.border = null;
  }
}

// ============================================================
// SINGLE SHEET REPORT BY AREAS
// ============================================================

export async function exportAreaView(
  areaGroups: Grupo[],
  ciclos: CicloFormativo[]
): Promise<void> {
  // Dynamic import of the browser build of exceljs to avoid build/Webpack/Turbopack issues in Next.js
  // @ts-ignore
  const ExcelJSImport = await import('exceljs/dist/exceljs.min.js');
  const ExcelJS = ExcelJSImport.default || ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte por Áreas', {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 1 as any, // Letter size (8.5 x 11 in)
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0 // 0 = auto height (extend vertically to as many pages as needed)
    }
  });

  // Set tight margins to maximize print area usage in landscape letter format
  worksheet.pageSetup.margins = {
    left: 0.25,
    right: 0.25,
    top: 0.3,
    bottom: 0.3,
    header: 0.15,
    footer: 0.15
  };

  const colWidths = Array(13).fill(14); // Initial default column widths
  let r = 0; // Row tracker

  // 1. Report Title
  setCellExcelJS(worksheet, r, 0, 'REPORTE CONSOLIDADO POR ÁREA FORMATIVA', {
    bold: true, sz: 20, color: '0F172A'
  });
  worksheet.mergeCells(r + 1, 1, r + 1, 13);
  worksheet.getRow(r + 1).height = 50; // Taller row for title
  r++;

  // 2. Generation date & system info
  setCellExcelJS(worksheet, r, 0, `Generado el: ${getFormattedDate()} | Sistema de Control de Maestros (UNEFCO)`, {
    sz: 12, color: '64748B'
  });
  worksheet.mergeCells(r + 1, 1, r + 1, 13);
  worksheet.getRow(r + 1).height = 30; // Medium height for subtitle
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
      setCellExcelJS(worksheet, r, c, c === 0 ? `ÁREA FORMATIVA: ${areaGroup.nombre.toUpperCase()}` : '', {
        bg: '0F766E', // Teal 700
        color: 'FFFFFF',
        bold: true,
        sz: 14,
        align: 'left'
      });
    }
    worksheet.mergeCells(r + 1, 1, r + 1, 13);
    worksheet.getRow(r + 1).height = 42; // Banner height
    r++;

    // ─── Table Headers ───
    for (let c = 0; c <= 12; c++) {
      let align: 'left' | 'center' | 'right' = 'left';
      if (c === 1 || c === 7 || c === 8 || c === 11 || c === 12) align = 'center';
      if (c === 9 || c === 10) align = 'right';

      setCellExcelJS(worksheet, r, c, headers[c], {
        bg: '334155', // Slate 700
        color: 'FFFFFF',
        bold: true,
        sz: 11,
        align
      });
      colWidths[c] = Math.max(colWidths[c], headers[c].length);
    }
    worksheet.getRow(r + 1).height = 42; // Table header row height
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

        const rowBg = r % 2 === 0 ? 'F8FAFC' : 'FFFFFF'; // Alternating soft background
        const dataSz = 11;

        // Write row cells
        setCellExcelJS(worksheet, r, 0, cicloNombre, { bg: rowBg, border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 1, curso.id, { bg: rowBg, align: 'center', border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 2, curso.grupo_nombre || '', { bg: rowBg, border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 3, curso.facilitador_nombre || '', { bg: rowBg, border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 4, curso.tecnico_nombre || '', { bg: rowBg, border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 5, curso.distrito || '', { bg: rowBg, border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 6, curso.lugar || '', { bg: rowBg, border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 7, rowInscritos, { bg: rowBg, align: 'center', numFmt: '#,##0', border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 8, cuadernos, { bg: rowBg, align: 'center', numFmt: '#,##0', border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 9, curso.costo || 0, { bg: rowBg, align: 'right', numFmt: '#,##0.00', border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 10, total, { bg: rowBg, align: 'right', numFmt: '#,##0.00', border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 11, formatDate(curso.fecha_inicio), { bg: rowBg, align: 'center', border: 'thin', sz: dataSz });
        setCellExcelJS(worksheet, r, 12, getEstado(curso), { bg: rowBg, align: 'center', border: 'thin', sz: dataSz });

        // Update column width bounds
        colWidths[0] = Math.max(colWidths[0], cicloNombre.length);
        colWidths[1] = Math.max(colWidths[1], String(curso.id).length);
        colWidths[2] = Math.max(colWidths[2], String(curso.grupo_nombre || '').length);
        colWidths[3] = Math.max(colWidths[3], String(curso.facilitador_nombre || '').length);
        colWidths[4] = Math.max(colWidths[4], String(curso.tecnico_nombre || '').length);
        colWidths[5] = Math.max(colWidths[5], String(curso.distrito || '').length);
        colWidths[6] = Math.max(colWidths[6], String(curso.lugar || '').length);
        colWidths[11] = Math.max(colWidths[11], String(formatDate(curso.fecha_inicio)).length);
        colWidths[12] = Math.max(colWidths[12], String(getEstado(curso)).length);

        worksheet.getRow(r + 1).height = 37.5; // ≈50px row height for data row
        r++;
      }

      // ─── Subtotal Ciclo row ───
      const subBg = 'F1F5F9'; // Light slate gray
      for (let c = 0; c <= 12; c++) {
        let val: any = '';
        let numFmt: string | undefined = undefined;
        let align: 'left' | 'center' | 'right' = 'left';

        if (c === 0) val = `  Subtotal: ${cicloNombre}`;
        if (c === 7) { val = cicloInscritos; numFmt = '#,##0'; align = 'center'; }
        if (c === 10) { val = cicloBs; numFmt = '#,##0.00'; align = 'right'; }

        setCellExcelJS(worksheet, r, c, val, {
          bg: subBg,
          bold: true,
          sz: 11,
          align,
          numFmt,
          border: 'subtotal'
        });
      }
      worksheet.getRow(r + 1).height = 37.5; // ≈50px row height for subtotal row
      r++;

      areaTotalInscritos += cicloInscritos;
      areaTotalBs += cicloBs;
    }

    // ─── Total Área row ───
    const areaBg = 'E2E8F0'; // Medium slate gray
    for (let c = 0; c <= 12; c++) {
      let val: any = '';
      let numFmt: string | undefined = undefined;
      let align: 'left' | 'center' | 'right' = 'left';

      if (c === 0) val = `TOTAL ÁREA: ${areaGroup.nombre.toUpperCase()}`;
      if (c === 7) { val = areaTotalInscritos; numFmt = '#,##0'; align = 'center'; }
      if (c === 10) { val = areaTotalBs; numFmt = '#,##0.00'; align = 'right'; }

      setCellExcelJS(worksheet, r, c, val, {
        bg: areaBg,
        bold: true,
        sz: 12,
        align,
        numFmt,
        border: 'total'
      });
    }
    worksheet.getRow(r + 1).height = 37.5; // ≈50px row height for total area row
    r++;

    grandTotalInscritos += areaTotalInscritos;
    grandTotalBs += areaTotalBs;

    // Leave two empty rows between areas (default to height 37.5pt / 50px each)
    r += 2;
  }

  // 3. Grand Total Consolidated
  if (hasCursos) {
    const grandBg = 'CCFBF1'; // Soft pastel teal
    for (let c = 0; c <= 12; c++) {
      let val: any = '';
      let numFmt: string | undefined = undefined;
      let align: 'left' | 'center' | 'right' = 'left';

      if (c === 0) val = 'TOTAL GENERAL CONSOLIDADO';
      if (c === 7) { val = grandTotalInscritos; numFmt = '#,##0'; align = 'center'; }
      if (c === 10) { val = grandTotalBs; numFmt = '#,##0.00'; align = 'right'; }

      setCellExcelJS(worksheet, r, c, val, {
        bg: grandBg,
        color: '0F766E', // Deep Teal text
        bold: true,
        sz: 13,
        align,
        numFmt,
        border: 'double'
      });
    }
    worksheet.getRow(r + 1).height = 37.5; // ≈50px row height for grand total row
    r++;
  }

  // Set autofit column widths (using measured bounds)
  colWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = Math.min(w + 4, 55);
  });

  // Set general row heights for any un-configured rows in our range
  for (let i = 0; i < r; i++) {
    const row = worksheet.getRow(i + 1);
    if (!row.height) {
      row.height = 37.5; // 50px default
    }
  }

  // Generate blob and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Areas_${getTimestamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
