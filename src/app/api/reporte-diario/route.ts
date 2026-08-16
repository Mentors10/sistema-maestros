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

    // Helper to dynamically inject technician options, priority filter buttons, CSS, and script
    const processHtmlForResponse = async (htmlStr: string) => {
      let finalHtml = htmlStr;
      try {
        const { data: tecnicosDB } = await supabase.from('tecnicos').select('carnet, nombre');
        let tecOptions = `<option value="todos">Todos los técnicos</option>`;
        if (tecnicosDB && tecnicosDB.length > 0) {
          tecOptions += tecnicosDB.map((t: any) => `<option value="${t.carnet}">${t.nombre}</option>`).join('');
        } else {
          tecOptions += `<option value="GARAY001">GARAY FLORES VIOLETA ANGELA</option>`;
        }

        const dynamicSelectHtml = `<select id="filtroTecnico" onchange="buscar()" style="padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: #fff; font-weight: 600; color: var(--primary);">
    ${tecOptions}
</select>`;

        if (finalHtml.includes('id="filtroTecnico"')) {
          finalHtml = finalHtml.replace(/<select id="filtroTecnico"[\s\S]*?<\/select>/gi, dynamicSelectHtml);
        }

        const filterButtonsHtml = `<div class="filter-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
    <button id="btnFiltroTodos" class="btn-filter active" onclick="setFiltroEstado('todos')">Todos</button>
    <button id="btnFiltroPrioritarios" class="btn-filter" onclick="setFiltroEstado('prioritarios')" style="color:#e11d48; font-weight:700;">⚡ Prioritarios</button>
    <button id="btnFiltroPendientes" class="btn-filter" onclick="setFiltroEstado('pendientes')">⚠️ Con Pendientes</button>
    <button id="btnFiltroOk" class="btn-filter" onclick="setFiltroEstado('ok')">✓ Todo OK</button>
</div>`;

        finalHtml = finalHtml.replace(/<button[^>]*\bid=["']?btnCiclo["']?[^>]*>[\s\S]*?<\/button>/gi, '');
        finalHtml = finalHtml.replace(/<button[^>]*\bid=["']?btnVerdes["']?[^>]*>[\s\S]*?<\/button>/gi, '');
        finalHtml = finalHtml.replace(/<button[^>]*toggleCol\(['"]ciclo['"]\)[\s\S]*?<\/button>/gi, '');
        finalHtml = finalHtml.replace(/<button[^>]*toggleVerdes\(\)[\s\S]*?<\/button>/gi, '');

        if (!finalHtml.includes('btnFiltroPrioritarios')) {
          if (finalHtml.includes('id="buscar"')) {
            finalHtml = finalHtml.replace(/(<input[^>]*id="buscar"[^>]*>)/gi, `$1\n    ${filterButtonsHtml}`);
          } else if (finalHtml.includes('class="toolbar"')) {
            finalHtml = finalHtml.replace(/(<div[^>]*class="toolbar"[^>]*>)/gi, `$1\n    ${filterButtonsHtml}`);
          }
        }

        if (!finalHtml.includes('.curso-prioritario')) {
          const prioCss = `<style>
.curso.curso-prioritario {
    border: 2.5px solid #e11d48 !important;
    box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25) !important;
    border-radius: 10px !important;
    padding: 6px !important;
    background: #ffffff !important;
}
.badge-prioridad {
    background: #ffe4e6 !important;
    color: #be123c !important;
    border: 1px solid #f43f5e !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    margin-bottom: 4px;
    display: inline-block;
    width: 100%;
    text-align: center;
}
.paso-prioritario-plan {
    border: 2px solid #d97706 !important;
    background: #fffbe3 !important;
    color: #92400e !important;
    font-weight: 700 !important;
}
.paso-prioritario-informe {
    border: 2px solid #dc2626 !important;
    background: #fee2e2 !important;
    color: #991b1b !important;
    font-weight: 700 !important;
}
.btn-filter {
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: #fff;
    color: var(--text);
    cursor: pointer;
    transition: all .15s;
}
.btn-filter:hover { background: #f1f5f9; }
.btn-filter.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn-filter.active-prio { background: #e11d48 !important; color: #fff !important; border-color: #e11d48 !important; box-shadow: 0 2px 8px rgba(225, 29, 72, 0.3); }
</style></head>`;
          finalHtml = finalHtml.replace('</head>', prioCss);
        }

        if (!finalHtml.includes('marcarPrioritarios')) {
          const scriptBlock = `<script>
var currentFiltroEstado = 'todos';

function setFiltroEstado(estado) {
    currentFiltroEstado = estado;
    var btnMap = {
        'todos': 'btnFiltroTodos',
        'prioritarios': 'btnFiltroPrioritarios',
        'pendientes': 'btnFiltroPendientes',
        'ok': 'btnFiltroOk'
    };
    for (var k in btnMap) {
        var btn = document.getElementById(btnMap[k]);
        if (btn) {
            if (k === estado) {
                btn.className = (k === 'prioritarios') ? 'btn-filter active-prio' : 'btn-filter active';
            } else {
                btn.className = 'btn-filter';
            }
        }
    }
    buscar();
}

function parseFechaStr(dateStr, defaultYear) {
    if (!dateStr || dateStr === '—' || dateStr === 'OK' || dateStr === 'SI' || dateStr === 'NO') return null;
    var year = defaultYear || 2026;
    var str = dateStr.trim();
    var parts = str.split('/');
    if (parts.length === 3) {
        var d = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10) - 1;
        var y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
    }
    if (parts.length === 2) {
        var d = parseInt(parts[0], 10);
        var mNum = parseInt(parts[1], 10);
        if (!isNaN(mNum)) return new Date(year, mNum - 1, d);
        var monthsMap = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, oct:9, nov:10, dic:11 };
        var mKey = parts[1].toLowerCase().substring(0, 3);
        if (monthsMap[mKey] !== undefined) return new Date(year, monthsMap[mKey], d);
    }
    return null;
}

function marcarPrioritarios() {
    var cursos = document.querySelectorAll('.curso');
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    cursos.forEach(function(curso) {
        var pasos = curso.querySelectorAll('.paso');
        if (!pasos || pasos.length === 0) return;

        var pasoPlan = null, pasoPlanFecha = null, pasoInicio = null;
        var pasoSoc = null, pasoInforme = null, pasoLimite = null;

        pasos.forEach(function(p) {
            var lblEl = p.querySelector('.lbl');
            if (!lblEl) return;
            var txt = lblEl.textContent.trim().toLowerCase();
            if (txt === 'planificación') pasoPlan = p;
            else if (txt === 'planificación fecha') pasoPlanFecha = p;
            else if (txt === 'fecha de inicio') pasoInicio = p;
            else if (txt === 'socialización') pasoSoc = p;
            else if (txt === 'informe final') pasoInforme = p;
            else if (txt === 'fecha límite') pasoLimite = p;
        });

        var isPlanOk = pasoPlan && pasoPlan.classList.contains('ok');
        var isInformeOk = pasoInforme && pasoInforme.classList.contains('ok');

        var inicioVal = pasoInicio ? pasoInicio.querySelector('.val').textContent.trim() : '';
        var socVal = pasoSoc ? pasoSoc.querySelector('.val').textContent.trim() : '';

        var inicioDate = parseFechaStr(inicioVal, 2026);
        var socDate = parseFechaStr(socVal, 2026);

        var isPrioPlan = false;
        if (!isPlanOk && inicioDate) {
            var diffDaysPlan = Math.ceil((inicioDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDaysPlan <= 5) {
                isPrioPlan = true;
                if (pasoPlan) pasoPlan.classList.add('paso-prioritario-plan');
                if (pasoPlanFecha) pasoPlanFecha.classList.add('paso-prioritario-plan');
            }
        }

        var isPrioInforme = false;
        if (!isInformeOk && socDate) {
            var diffDaysSoc = Math.ceil((today.getTime() - socDate.getTime()) / (1000 * 3600 * 24));
            if (diffDaysSoc >= 0) {
                isPrioInforme = true;
                if (pasoInforme) pasoInforme.classList.add('paso-prioritario-informe');
                if (pasoLimite) pasoLimite.classList.add('paso-prioritario-informe');
            }
        }

        if (isPrioPlan || isPrioInforme) {
            curso.classList.add('curso-prioritario');
            var tr = curso.closest('tr');
            if (tr) tr.setAttribute('data-prioritario', '1');

            if (!curso.querySelector('.badge-prioridad')) {
                var badge = document.createElement('span');
                badge.className = 'badge badge-prioridad';
                if (isPrioPlan && isPrioInforme) {
                    badge.innerHTML = '⚡ Planificación & Final Pendiente';
                } else if (isPrioPlan) {
                    badge.innerHTML = '⚡ Planificación URGENTE (≤5d)';
                } else {
                    badge.innerHTML = '🚨 Informe Final URGENTE';
                }
                curso.insertBefore(badge, curso.firstChild);
            }
        }
    });
}
</script></body>`;
          finalHtml = finalHtml.replace('</body>', scriptBlock);
        }
      } catch (e) {
        console.warn('Error al procesar HTML de reporte:', e);
      }
      return finalHtml;
    };

    // 1. Obtener plantilla guardada exclusivamente en la tabla reportes_html de Supabase
    try {
      const { data, error } = await supabase
        .from('reportes_html')
        .select('contenido')
        .eq('id', 'REPORTE_DIARIO_ACTUAL')
        .maybeSingle();

      if (!error && data?.contenido && data.contenido.trim().length > 0) {
        let outputHtml = await processHtmlForResponse(data.contenido);
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
      console.warn('Error leyendo desde la tabla reportes_html en Supabase:', dbErr);
    }

    // Sin backups locales ni plantillas estáticas de respaldo por mandato explícito del usuario
    return new NextResponse(
      '<div style="font-family:sans-serif;padding:40px;text-align:center;color:#64748b;"><h2>No hay ningún reporte almacenado en la base de datos</h2><p>Conecta al SIE o sube un reporte para almacenar y visualizar la información.</p></div>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
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

        // 0. Match directly by explicit Technician name or surname from DB tecnicos table
        for (const t of (tecnicosDB || [])) {
          const tNorm = normalizeText(t.nombre);
          if (!tNorm) continue;
          const tWords = tNorm.split(/\s+/).filter((w) => w.length >= 3);
          if (tWords.length > 0 && tWords.some((w) => rowTextClean.includes(w))) {
            tec = t.carnet;
            break;
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

        // 3. Fallback to first technician in DB (e.g. GARAY FLORES VIOLETA ANGELA for Mentors10)
        if (!tec) {
          if (tecnicosDB && tecnicosDB.length > 0) {
            tec = tecnicosDB[0].carnet;
          } else {
            tec = 'GARAY001';
          }
        }

        trs[i] = ` data-tecnico="${tec}"${cleanBlock}`;
      }

      inputHtml = trs.join('<tr');

      // Build dynamic technician filter dropdown in toolbar from DB tecnicos table
      let tecOptions = `<option value="todos">Todos los técnicos</option>`;
      if (tecnicosDB && tecnicosDB.length > 0) {
        tecOptions += tecnicosDB.map((t: any) => `<option value="${t.carnet}">${t.nombre}</option>`).join('');
      } else {
        tecOptions += `<option value="GARAY001">GARAY FLORES VIOLETA ANGELA</option>`;
      }

      const dynamicSelectHtml = `<select id="filtroTecnico" onchange="buscar()" style="padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: #fff; font-weight: 600; color: var(--primary);">
    ${tecOptions}
</select>`;

      const filterButtonsHtml = `<div class="filter-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
    <button id="btnFiltroTodos" class="btn-filter active" onclick="setFiltroEstado('todos')">Todos</button>
    <button id="btnFiltroPrioritarios" class="btn-filter" onclick="setFiltroEstado('prioritarios')" style="color:#e11d48; font-weight:700;">⚡ Prioritarios</button>
    <button id="btnFiltroPendientes" class="btn-filter" onclick="setFiltroEstado('pendientes')">⚠️ Con Pendientes</button>
    <button id="btnFiltroOk" class="btn-filter" onclick="setFiltroEstado('ok')">✓ Todo OK</button>
</div>`;

      inputHtml = inputHtml.replace(/<button[^>]*\bid=["']?btnCiclo["']?[^>]*>[\s\S]*?<\/button>/gi, '');
      inputHtml = inputHtml.replace(/<button[^>]*\bid=["']?btnVerdes["']?[^>]*>[\s\S]*?<\/button>/gi, '');
      inputHtml = inputHtml.replace(/<button[^>]*toggleCol\(['"]ciclo['"]\)[\s\S]*?<\/button>/gi, '');
      inputHtml = inputHtml.replace(/<button[^>]*toggleVerdes\(\)[\s\S]*?<\/button>/gi, '');

      if (!inputHtml.includes('btnFiltroPrioritarios')) {
        if (inputHtml.includes('id="buscar"')) {
          inputHtml = inputHtml.replace(/(<input[^>]*id="buscar"[^>]*>)/gi, `$1\n    ${filterButtonsHtml}`);
        } else if (inputHtml.includes('class="toolbar"')) {
          inputHtml = inputHtml.replace(/(<div[^>]*class="toolbar"[^>]*>)/gi, `$1\n    ${filterButtonsHtml}`);
        }
      }

      // Inject priority CSS if not present
      if (!inputHtml.includes('.curso-prioritario')) {
        const prioCss = `<style>
.curso.curso-prioritario {
    border: 2.5px solid #e11d48 !important;
    box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25) !important;
    border-radius: 10px !important;
    padding: 6px !important;
    background: #ffffff !important;
}
.badge-prioridad {
    background: #ffe4e6 !important;
    color: #be123c !important;
    border: 1px solid #f43f5e !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    margin-bottom: 4px;
    display: inline-block;
    width: 100%;
    text-align: center;
}
.paso-prioritario-plan {
    border: 2px solid #d97706 !important;
    background: #fffbe3 !important;
    color: #92400e !important;
    font-weight: 700 !important;
}
.paso-prioritario-informe {
    border: 2px solid #dc2626 !important;
    background: #fee2e2 !important;
    color: #991b1b !important;
    font-weight: 700 !important;
}
.btn-filter {
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: #fff;
    color: var(--text);
    cursor: pointer;
    transition: all .15s;
}
.btn-filter:hover { background: #f1f5f9; }
.btn-filter.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn-filter.active-prio { background: #e11d48 !important; color: #fff !important; border-color: #e11d48 !important; box-shadow: 0 2px 8px rgba(225, 29, 72, 0.3); }
</style></head>`;
        inputHtml = inputHtml.replace('</head>', prioCss);
      }

      // Inject interactive filtering script before </body>
      const scriptBlock = `
<!-- INJECTED_REPORTE_SCRIPT -->
<script>
var currentFiltroEstado = 'todos';

function setFiltroEstado(estado) {
    currentFiltroEstado = estado;
    var btnMap = {
        'todos': 'btnFiltroTodos',
        'prioritarios': 'btnFiltroPrioritarios',
        'pendientes': 'btnFiltroPendientes',
        'ok': 'btnFiltroOk'
    };
    for (var k in btnMap) {
        var btn = document.getElementById(btnMap[k]);
        if (btn) {
            if (k === estado) {
                btn.className = (k === 'prioritarios') ? 'btn-filter active-prio' : 'btn-filter active';
            } else {
                btn.className = 'btn-filter';
            }
        }
    }
    buscar();
}

function parseFechaStr(dateStr, defaultYear) {
    if (!dateStr || dateStr === '—' || dateStr === 'OK' || dateStr === 'SI' || dateStr === 'NO') return null;
    var year = defaultYear || 2026;
    var str = dateStr.trim();
    var parts = str.split('/');
    if (parts.length === 3) {
        var d = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10) - 1;
        var y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
    }
    if (parts.length === 2) {
        var d = parseInt(parts[0], 10);
        var mNum = parseInt(parts[1], 10);
        if (!isNaN(mNum)) return new Date(year, mNum - 1, d);
        var monthsMap = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, oct:9, nov:10, dic:11 };
        var mKey = parts[1].toLowerCase().substring(0, 3);
        if (monthsMap[mKey] !== undefined) return new Date(year, monthsMap[mKey], d);
    }
    return null;
}

function marcarPrioritarios() {
    var cursos = document.querySelectorAll('.curso');
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    cursos.forEach(function(curso) {
        var pasos = curso.querySelectorAll('.paso');
        if (!pasos || pasos.length === 0) return;

        var pasoPlan = null, pasoPlanFecha = null, pasoInicio = null;
        var pasoSoc = null, pasoInforme = null, pasoLimite = null;

        pasos.forEach(function(p) {
            var lblEl = p.querySelector('.lbl');
            if (!lblEl) return;
            var txt = lblEl.textContent.trim().toLowerCase();
            if (txt === 'planificación') pasoPlan = p;
            else if (txt === 'planificación fecha') pasoPlanFecha = p;
            else if (txt === 'fecha de inicio') pasoInicio = p;
            else if (txt === 'socialización') pasoSoc = p;
            else if (txt === 'informe final') pasoInforme = p;
            else if (txt === 'fecha límite') pasoLimite = p;
        });

        var isPlanOk = pasoPlan && pasoPlan.classList.contains('ok');
        var isInformeOk = pasoInforme && pasoInforme.classList.contains('ok');

        var inicioVal = pasoInicio ? pasoInicio.querySelector('.val').textContent.trim() : '';
        var socVal = pasoSoc ? pasoSoc.querySelector('.val').textContent.trim() : '';

        var inicioDate = parseFechaStr(inicioVal, 2026);
        var socDate = parseFechaStr(socVal, 2026);

        var isPrioPlan = false;
        if (!isPlanOk && inicioDate) {
            var diffDaysPlan = Math.ceil((inicioDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDaysPlan <= 5) {
                isPrioPlan = true;
                if (pasoPlan) pasoPlan.classList.add('paso-prioritario-plan');
                if (pasoPlanFecha) pasoPlanFecha.classList.add('paso-prioritario-plan');
            }
        }

        var isPrioInforme = false;
        if (!isInformeOk && socDate) {
            var diffDaysSoc = Math.ceil((today.getTime() - socDate.getTime()) / (1000 * 3600 * 24));
            if (diffDaysSoc >= 0) {
                isPrioInforme = true;
                if (pasoInforme) pasoInforme.classList.add('paso-prioritario-informe');
                if (pasoLimite) pasoLimite.classList.add('paso-prioritario-informe');
            }
        }

        if (isPrioPlan || isPrioInforme) {
            curso.classList.add('curso-prioritario');
            var tr = curso.closest('tr');
            if (tr) tr.setAttribute('data-prioritario', '1');

            if (!curso.querySelector('.badge-prioridad')) {
                var badge = document.createElement('span');
                badge.className = 'badge badge-prioridad';
                if (isPrioPlan && isPrioInforme) {
                    badge.innerHTML = '⚡ Planificación & Final Pendiente';
                } else if (isPrioPlan) {
                    badge.innerHTML = '⚡ Planificación URGENTE (≤5d)';
                } else {
                    badge.innerHTML = '🚨 Informe Final URGENTE';
                }
                curso.insertBefore(badge, curso.firstChild);
            }
        }
    });
}

function buscar() {
    marcarPrioritarios();

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
        var isOk = tr.getAttribute('data-ok') === '1';
        var isPrio = tr.getAttribute('data-prioritario') === '1';

        var matchesText = !filter || text.includes(filter);
        var matchesTec = (selectedTec === 'todos') || (rowTec === selectedTec);

        var matchesEstado = true;
        if (currentFiltroEstado === 'prioritarios') {
            matchesEstado = isPrio;
        } else if (currentFiltroEstado === 'pendientes') {
            matchesEstado = !isOk;
        } else if (currentFiltroEstado === 'ok') {
            matchesEstado = isOk;
        }

        if (matchesText && matchesTec && matchesEstado) {
            tr.style.display = '';
            totalProg++;
            var cursosInRow = tr.querySelectorAll('.curso').length;
            totalCursos += cursosInRow;
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

    // 1. Guardar plantilla enriquecida exclusivamente en la tabla reportes_html de Supabase
    try {
      await supabase.from('reportes_html').upsert({
        id: 'REPORTE_DIARIO_ACTUAL',
        contenido: inputHtml,
        tecnico_carnet: '8639300',
        updated_at: new Date().toISOString(),
      });
    } catch (dbSaveErr) {
      console.warn('Advertencia al guardar plantilla en reportes_html en Supabase DB:', dbSaveErr);
    }

    return NextResponse.json({
      success: true,
      enrichedHtml: inputHtml,
      message: 'Plantilla de Reporte Diario guardada exclusivamente en la tabla reportes_html',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Eliminar el reporte almacenado en la tabla reportes_html de Supabase
    const { error } = await supabase
      .from('reportes_html')
      .delete()
      .eq('id', 'REPORTE_DIARIO_ACTUAL');

    if (error) {
      console.warn('Error borrando reporte de la tabla reportes_html:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Reporte eliminado de la base de datos (reportes_html)',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
