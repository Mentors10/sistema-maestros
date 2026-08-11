import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeText(str: string) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hideHeaderCss = '<style>.header, .cards { display: none !important; } body { padding: 12px 16px !important; } .table-wrap { max-height: 88vh !important; }</style></head>';

    // 1. Intentar obtener plantilla guardada en Supabase (agenda_contactos CONFIG-REPORTE-PLANTILLA-HTML)
    try {
      const { data, error } = await supabase
        .from('agenda_contactos')
        .select('descripcion')
        .eq('id_contacto', 'CONFIG-REPORTE-PLANTILLA-HTML')
        .maybeSingle();

      if (!error && data?.descripcion && data.descripcion.trim().length > 0) {
        let outputHtml = data.descripcion;
        if (outputHtml.includes('</head>')) {
          outputHtml = outputHtml.replace('</head>', hideHeaderCss);
        }
        return new NextResponse(outputHtml, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    } catch (dbErr) {
      console.warn('Error leyendo plantilla desde Supabase:', dbErr);
    }

    // 2. Fallback a archivo de plantilla estático
    const filePath = path.join(process.cwd(), 'public', 'reporte_diario_template.html');
    if (fs.existsSync(filePath)) {
      let html = fs.readFileSync(filePath, 'utf8');
      if (html.includes('</head>')) {
        html = html.replace('</head>', hideHeaderCss);
      }
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    return new NextResponse('<h1>Reporte Diario no disponible</h1>', { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.html || typeof body.html !== 'string') {
      return NextResponse.json({ error: 'Contenido HTML no válido' }, { status: 400 });
    }

    let inputHtml = body.html;

    // Fetch database mappings for enrichment
    try {
      const [{ data: cursos }, { data: facs }, { data: tecnicosDB }] = await Promise.all([
        supabase.from('cursos').select('id, tecnico_carnet, facilitador_carnet'),
        supabase.from('facilitadores').select('carnet, nombre'),
        supabase.from('tecnicos').select('carnet, nombre'),
      ]);

      const courseMap: { [id: string]: string } = {};
      (cursos || []).forEach((c: any) => {
        if (c.id && c.tecnico_carnet) courseMap[c.id] = c.tecnico_carnet;
      });

      const facToTecnico: { [carnet: string]: string } = {};
      (cursos || []).forEach((c: any) => {
        if (c.facilitador_carnet && c.facilitador_carnet !== '9999999' && c.tecnico_carnet) {
          facToTecnico[c.facilitador_carnet] = c.tecnico_carnet;
        }
      });

      // Strip existing injected script if re-enriching
      if (inputHtml.includes('<!-- INJECTED_REPORTE_SCRIPT -->')) {
        inputHtml = inputHtml.split('<!-- INJECTED_REPORTE_SCRIPT -->')[0] + '</body></html>';
      }

      const trs = inputHtml.split('<tr');
      for (let i = 1; i < trs.length; i++) {
        const block = trs[i];
        if (block.includes('<th')) continue;

        let cleanBlock = block.replace(/\s*data-tecnico="[^"]*"/gi, '');
        const rowTextClean = normalizeText(cleanBlock.replace(/<[^>]+>/g, ' '));

        let tec: string | null = null;

        // 0. Match directly by explicit Technician name or surname from DB tecnicos table or row text
        for (const t of (tecnicosDB || [])) {
          const tNorm = normalizeText(t.nombre);
          if (!tNorm) continue;
          const tWords = tNorm.split(/\s+/).filter((w) => w.length >= 3);
          if (tWords.length > 0 && tWords.some((w) => rowTextClean.includes(w))) {
            tec = t.carnet;
            break;
          }
        }

        // Direct hardcoded fallback for key technicians if not in tecnicosDB table
        if (!tec) {
          if (rowTextClean.includes('juan pablo') || rowTextClean.includes('alba')) {
            tec = '7782629';
          } else if (rowTextClean.includes('claudia') || rowTextClean.includes('olivares')) {
            tec = '3355859';
          } else if (rowTextClean.includes('gilmar') || rowTextClean.includes('chavarria')) {
            tec = '8639300';
          } else if (rowTextClean.includes('violeta') || rowTextClean.includes('garay')) {
            const tecVio = (tecnicosDB || []).find((t: any) => normalizeText(t.nombre).includes('violeta') || normalizeText(t.nombre).includes('garay'));
            tec = tecVio ? tecVio.carnet : 'GARAY001';
          }
        }

        // 1. Try matching by Course ID in database
        if (!tec) {
          const idMatch = cleanBlock.match(/ID\s*[:\-]?\s*(\d+)/i);
          const id = idMatch ? idMatch[1] : null;
          tec = id && courseMap[id] ? courseMap[id] : null;
        }

        // 2. Try matching by Facilitador Name - REQUIRE 100% EXACT FULL NAME MATCH
        if (!tec) {
          for (const f of (facs || [])) {
            const dbNorm = normalizeText(f.nombre);
            if (!dbNorm || dbNorm === 'por confirmar') continue;
            
            // Require EVERY word of the facilitator's full name to be present in the row text (100% match)
            const dbWords = dbNorm.split(/\s+/).filter((w) => w.length >= 2);
            const allWordsMatch = dbWords.length > 0 && dbWords.every((w) => rowTextClean.includes(w));

            if (allWordsMatch && facToTecnico[f.carnet]) {
              tec = facToTecnico[f.carnet];
              break;
            }
          }
        }

        // 3. Fallback to first technician in DB, or Violeta/Gilmar
        if (!tec) {
          if (tecnicosDB && tecnicosDB.length > 0) {
            tec = tecnicosDB[0].carnet;
          } else {
            tec = '8639300';
          }
        }

        trs[i] = ` data-tecnico="${tec}"${cleanBlock}`;
      }

      inputHtml = trs.join('<tr');

      // Add dynamic technician filter dropdown in toolbar
      if (!inputHtml.includes('id="filtroTecnico"')) {
        const toolbarTarget = '<div class="toolbar">';
        
        let tecOptions = `<option value="todos">Todos los técnicos</option>`;
        if (tecnicosDB && tecnicosDB.length > 0) {
          tecOptions += tecnicosDB.map((t: any) => `<option value="${t.carnet}">${t.nombre}</option>`).join('');
        } else {
          tecOptions += `
            <option value="8639300">Gilmar Felix Chavarria Choque</option>
            <option value="7782629">Juan Pablo Alba Vaca</option>
            <option value="3355859">Claudia Lisett Olivares Rivero</option>
          `;
        }

        const toolbarReplacement = `<div class="toolbar">
    <select id="filtroTecnico" onchange="buscar()" style="padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: #fff; font-weight: 600; color: var(--primary);">
        ${tecOptions}
    </select>`;
        inputHtml = inputHtml.replace(toolbarTarget, toolbarReplacement);
      }

      // Inject interactive filtering script before </body>
      const scriptBlock = `
<!-- INJECTED_REPORTE_SCRIPT -->
<script>
function buscar() {
    var input = document.getElementById('buscar');
    var filter = input ? input.value.toLowerCase().trim() : '';
    var tecSelect = document.getElementById('filtroTecnico');
    var selectedTec = tecSelect ? tecSelect.value : 'todos';

    var table = document.getElementById('reportTable');
    if (!table) return;
    var tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    var trs = tbody.getElementsByTagName('tr');

    var totalProg = 0;
    var totalCursos = 0;
    var okCount = 0;
    var pendCount = 0;

    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var text = tr.textContent.toLowerCase();
        var rowTec = tr.getAttribute('data-tecnico') || '8639300';

        var matchesText = !filter || text.includes(filter);
        var matchesTec = (selectedTec === 'todos') || (rowTec === selectedTec);

        if (matchesText && matchesTec) {
            tr.style.display = '';
            totalProg++;
            var cursosInRow = tr.querySelectorAll('.curso').length;
            totalCursos += cursosInRow;
            var isOk = tr.getAttribute('data-ok') === '1';
            if (isOk) okCount++; else pendCount++;
        } else {
            tr.style.display = 'none';
        }
    }

    var cardValues = document.querySelectorAll('.card .value');
    if (cardValues.length >= 4) {
        cardValues[0].innerHTML = totalProg;
        cardValues[1].innerHTML = totalCursos;
        cardValues[2].innerHTML = okCount + '<span style="font-size:14px;color:var(--muted);font-weight:400"> / ' + totalProg + '</span>';
        cardValues[3].innerHTML = pendCount + '<span style="font-size:14px;color:var(--muted);font-weight:400"> / ' + totalProg + '</span>';
    }
}

function toggleCol(colName) {
    var elements = document.querySelectorAll('.toggle-' + colName);
    var btn = document.getElementById('btnCiclo');
    var isHidden = false;
    elements.forEach(function(el) {
        if (el.classList.contains('hidden-col')) {
            el.classList.remove('hidden-col');
        } else {
            el.classList.add('hidden-col');
            isHidden = true;
        }
    });
    if (btn) {
        if (isHidden) {
            btn.classList.remove('active');
            btn.textContent = 'Mostrar Ciclo';
        } else {
            btn.classList.add('active');
            btn.textContent = 'Ocultar Ciclo';
        }
    }
}

function toggleVerdes() {
    var btn = document.getElementById('btnVerdes');
    var table = document.getElementById('reportTable');
    if (!table) return;
    var trs = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    var hideVerdes = btn && !btn.classList.contains('active');

    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var isOk = tr.getAttribute('data-ok') === '1';
        if (hideVerdes && isOk) {
            tr.style.display = 'none';
        } else if (!hideVerdes && isOk) {
            tr.style.display = '';
        }
    }
    if (btn) {
        if (hideVerdes) {
            btn.classList.add('active');
            btn.textContent = 'Mostrar verdes';
        } else {
            btn.classList.remove('active');
            btn.textContent = 'Ocultar verdes';
        }
    }
}

function ordenarPorFacilitador() {
    var table = document.getElementById('reportTable');
    if (!table) return;
    var tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    var trs = Array.prototype.slice.call(tbody.getElementsByTagName('tr'));

    trs.sort(function(a, b) {
        var tdsA = a.getElementsByTagName('td');
        var tdsB = b.getElementsByTagName('td');
        var facA = (tdsA[2] ? (tdsA[2].getAttribute('title') || tdsA[2].textContent) : '').trim().toLowerCase();
        var facB = (tdsB[2] ? (tdsB[2].getAttribute('title') || tdsB[2].textContent) : '').trim().toLowerCase();
        return facA.localeCompare(facB, 'es', { sensitivity: 'base' });
    });

    for (var i = 0; i < trs.length; i++) {
        tbody.appendChild(trs[i]);
    }
}

function initReporte() {
    var params = new URLSearchParams(window.location.search);
    var tecParam = params.get('tecnico');
    if (tecParam) {
        var tecSelect = document.getElementById('filtroTecnico');
        if (tecSelect) {
            tecSelect.value = tecParam;
        }
    }
    ordenarPorFacilitador();
    buscar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReporte);
} else {
    setTimeout(initReporte, 100);
}
</script>
</body>
</html>
`;

      if (inputHtml.includes('</body>')) {
        inputHtml = inputHtml.replace('</body>', scriptBlock);
      } else {
        inputHtml = inputHtml + scriptBlock;
      }
    } catch (enrichError) {
      console.warn('Error durante el enriquecimiento del HTML:', enrichError);
    }

    // 1. Guardar plantilla enriquecida en Supabase DB (agenda_contactos)
    try {
      await supabase.from('agenda_contactos').upsert({
        id_contacto: 'CONFIG-REPORTE-PLANTILLA-HTML',
        tecnico_carnet: '8639300',
        nombre: 'PLANTILLA_REPORTE_DIARIO',
        descripcion: inputHtml,
        updated_at: new Date().toISOString(),
      });
    } catch (dbSaveErr) {
      console.warn('Advertencia al guardar plantilla en Supabase DB:', dbSaveErr);
    }

    // 2. Guardar en disco local si el entorno lo permite (ej: desarrollo local)
    try {
      const filePath = path.join(process.cwd(), 'public', 'reporte_diario_template.html');
      fs.writeFileSync(filePath, inputHtml, 'utf8');
    } catch (fileErr) {
      // Ignorar error de solo lectura en Vercel Serverless
    }

    return NextResponse.json({
      success: true,
      enrichedHtml: inputHtml,
      message: 'Plantilla de Reporte Diario guardada exitosamente en la base de datos',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Eliminar la plantilla personalizada en la base de datos de Supabase
    const { error } = await supabase
      .from('agenda_contactos')
      .delete()
      .eq('id_contacto', 'CONFIG-REPORTE-PLANTILLA-HTML');

    if (error) {
      console.warn('Error borrando CONFIG-REPORTE-PLANTILLA-HTML de Supabase:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla personalizada eliminada del servidor (Supabase)',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
