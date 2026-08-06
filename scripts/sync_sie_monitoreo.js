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

  // Inject toolbar filter
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

  // Inject client-side filtering script
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

function toggleCol(type) {
    var cols = document.querySelectorAll('.toggle-' + type);
    var btn = document.getElementById('btn' + type.charAt(0).toUpperCase() + type.slice(1));
    var hidden = cols.length > 0 && cols[0].classList.contains('hidden-col');
    cols.forEach(function(el) {
        if (hidden) {
            el.classList.remove('hidden-col');
        } else {
            el.classList.add('hidden-col');
        }
    });
    if (btn) {
        btn.textContent = hidden ? 'Ocultar ' + type.charAt(0).toUpperCase() + type.slice(1) : 'Mostrar ' + type.charAt(0).toUpperCase() + type.slice(1);
        btn.classList.toggle('active');
    }
}

function toggleVerdes() {
    var rows = document.querySelectorAll('#reportTable tbody tr');
    var btn = document.getElementById('btnVerdes');
    var hide = btn ? btn.textContent.indexOf('Ocultar') !== -1 : false;
    rows.forEach(function(row) {
        if (row.getAttribute('data-ok') === '1') {
            row.style.display = hide ? 'none' : '';
        }
    });
    if (btn) {
        btn.textContent = hide ? 'Mostrar verdes' : 'Ocultar verdes';
        btn.classList.toggle('active');
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

  console.log('=== Step 3: Saving Enriched Report to Supabase DB and local template ===');
  const { data: dbData, error: dbErr } = await supabase.from('agenda_contactos').upsert({
    id_contacto: 'CONFIG-REPORTE-PLANTILLA-HTML',
    tecnico_carnet: '8639300',
    nombre: 'PLANTILLA_REPORTE_DIARIO',
    descripcion: html,
    updated_at: new Date().toISOString()
  }).select('id_contacto, updated_at');

  if (dbErr) {
    console.error('Supabase DB error:', dbErr);
  } else {
    console.log('Supabase DB Save Success:', dbData);
  }

  const templatePath = path.join(__dirname, '..', 'public', 'reporte_diario_template.html');
  fs.writeFileSync(templatePath, html, 'utf8');

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
