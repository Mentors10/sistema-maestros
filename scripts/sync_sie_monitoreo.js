const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Read environment credentials
const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

async function runSync() {
  console.log('=== Step 1: Executing Python SIE Scraper (monitoreo_v3.py) ===');
  const pyScript = 'C:\\Users\\CHAVARRIA\\Desktop\\Monitoreo SIE\\monitoreo_v3.py';
  
  if (!fs.existsSync(pyScript)) {
    throw new Error('Python script not found at ' + pyScript);
  }

  try {
    const envOptions = {
      ...process.env,
      SIE_USERNAME: process.env.SIE_USERNAME || 'gilmar.chavarria@unefco.edu.bo',
      SIE_PASSWORD: process.env.SIE_PASSWORD || 'GILMAR.chavarria24#',
    };
    const pyOutput = execSync(`python "${pyScript}"`, { env: envOptions, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    console.log(pyOutput);
  } catch (err) {
    console.error('Error running Python script:', err);
    throw err;
  }

  // Find generated HTML
  const desktopHtml = path.join(process.env.USERPROFILE || 'C:\\Users\\CHAVARRIA', 'Desktop', 'reporte_monitoreo_mayo_junio_julio.html');
  const localHtml = 'C:\\Users\\CHAVARRIA\\Desktop\\Monitoreo SIE\\reporte_monitoreo_mayo_junio_julio.html';
  
  let rawHtmlPath = fs.existsSync(desktopHtml) ? desktopHtml : (fs.existsSync(localHtml) ? localHtml : null);
  if (!rawHtmlPath) {
    throw new Error('Generated HTML report not found!');
  }

  let html = fs.readFileSync(rawHtmlPath, 'utf8');
  console.log('=== Step 2: Enriching generated HTML with Technician mappings ===');

  // Fetch course & technician mappings from Supabase
  const [{ data: cursos }, { data: facs }] = await Promise.all([
    supabase.from('cursos').select('id, tecnico_carnet, facilitador_carnet'),
    supabase.from('facilitadores').select('carnet, nombre'),
  ]);

  const courseMap = {};
  (cursos || []).forEach(c => {
    if (c.id && c.tecnico_carnet) courseMap[c.id] = c.tecnico_carnet;
  });

  const facToTecnico = {};
  (cursos || []).forEach(c => {
    if (c.facilitador_carnet && c.facilitador_carnet !== '9999999' && c.tecnico_carnet) {
      facToTecnico[c.facilitador_carnet] = c.tecnico_carnet;
    }
  });

  // Strip old injected script if present
  if (html.includes('<!-- INJECTED_REPORTE_SCRIPT -->')) {
    html = html.split('<!-- INJECTED_REPORTE_SCRIPT -->')[0] + '</body></html>';
  }

  // Parse rows and inject data-tecnico
  const trs = html.split('<tr');
  for (let i = 1; i < trs.length; i++) {
    const block = trs[i];
    if (block.includes('<th')) continue;

    let cleanBlock = block.replace(/\s*data-tecnico="[^"]*"/gi, '');

    const idMatch = cleanBlock.match(/ID\s*[:\-]?\s*(\d+)/i);
    const id = idMatch ? idMatch[1] : null;
    let tec = id && courseMap[id] ? courseMap[id] : null;

    if (!tec) {
      const rowTextClean = normalizeText(cleanBlock.replace(/<[^>]+>/g, ' '));
      const htmlWords = rowTextClean.split(/\s+/).filter(w => w.length >= 2);

      let bestMatch = null;
      let maxOverlap = 0;

      if (htmlWords.length > 0) {
        for (const f of (facs || [])) {
          const dbNorm = normalizeText(f.nombre);
          if (!dbNorm || dbNorm === 'por confirmar') continue;
          const dbWords = dbNorm.split(/\s+/).filter(w => w.length >= 2);
          const overlap = htmlWords.filter(hw => dbWords.includes(hw)).length;

          if (overlap >= 2 && overlap > maxOverlap) {
            maxOverlap = overlap;
            bestMatch = f;
          }
        }
      }

      if (bestMatch && facToTecnico[bestMatch.carnet]) {
        tec = facToTecnico[bestMatch.carnet];
      }
    }

    if (!tec) {
      tec = '8639300';
    }

    trs[i] = ` data-tecnico="${tec}"${cleanBlock}`;
  }

  html = trs.join('<tr');

  // Replace old toolbar buttons with filter group if present
  const filterButtonsHtml = `<div class="filter-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
    <button id="btnFiltroTodos" class="btn-filter active" onclick="setFiltroEstado('todos')">Todos</button>
    <button id="btnFiltroPrioritarios" class="btn-filter" onclick="setFiltroEstado('prioritarios')" style="color:#e11d48; font-weight:700;">⚡ Prioritarios</button>
    <button id="btnFiltroPendientes" class="btn-filter" onclick="setFiltroEstado('pendientes')">⚠️ Con Pendientes</button>
    <button id="btnFiltroOk" class="btn-filter" onclick="setFiltroEstado('ok')">✓ Todo OK</button>
</div>`;

  if (html.includes('id="btnCiclo"')) {
    html = html.replace(/<button id="btnCiclo"[\s\S]*?<\/button>\s*<button id="btnVerdes"[\s\S]*?<\/button>/gi, filterButtonsHtml);
  }

  // Inject priority CSS if missing
  if (!html.includes('.curso-prioritario')) {
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
    html = html.replace('</head>', prioCss);
  }

  // Add technician selector in toolbar if not present
  if (!html.includes('id="filtroTecnico"')) {
    const toolbarTarget = '<div class="toolbar">';
    const toolbarReplacement = `<div class="toolbar">
    <select id="filtroTecnico" onchange="buscar()" style="padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: #fff; font-weight: 600; color: var(--primary);">
        <option value="todos">Todos los técnicos</option>
        <option value="8639300">Gilmar Felix Chavarria Choque</option>
        <option value="7782629">Juan Pablo Alba Vaca</option>
        <option value="3355859">Claudia Lisett Olivares Rivero</option>
    </select>`;
    html = html.replace(toolbarTarget, toolbarReplacement);
  }

  // Append full JS script block before </body>
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

function initReporte() {
    var params = new URLSearchParams(window.location.search);
    var tecParam = params.get('tecnico');
    if (tecParam) {
        var tecSelect = document.getElementById('filtroTecnico');
        if (tecSelect) {
            tecSelect.value = tecParam;
        }
    }
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

  if (html.includes('</body>')) {
    html = html.replace('</body>', scriptBlock);
  } else {
    html = html + scriptBlock;
  }

  console.log('=== Step 3: Saving Enriched Report to Supabase DB (reportes_html table) ===');
  const { data: dbData, error: dbErr } = await supabase.from('reportes_html').upsert({
    id: 'REPORTE_DIARIO_ACTUAL',
    contenido: html,
    tecnico_carnet: '8639300',
    updated_at: new Date().toISOString()
  }).select('id, updated_at');

  if (dbErr) {
    console.error('Supabase DB error:', dbErr);
  } else {
    console.log('Supabase DB Save Success:', dbData);
  }

  console.log('=== Step 4: Pushing updated report to GitHub main branch ===');
  try {
    execSync('git add .', { cwd: path.join(__dirname, '..') });
    execSync('git commit -m "Auto-sync SIE UNEFCO real-time monitoring report"', { cwd: path.join(__dirname, '..') });
    execSync('git push origin main', { cwd: path.join(__dirname, '..') });
    console.log('GitHub main push successful!');
  } catch (gitErr) {
    console.warn('Git push warning:', gitErr.message);
  }

  console.log('=== ALL STEPS COMPLETED SUCCESSFULLY! ===');
}

runSync().catch(console.error);
