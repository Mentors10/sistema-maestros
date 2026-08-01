const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function processHtml() {
  const { data: cursos } = await supabase.from('cursos').select('id, tecnico_carnet, facilitador_carnet');
  const { data: facs } = await supabase.from('facilitadores').select('carnet, nombre');

  const courseMap = {};
  (cursos || []).forEach(c => {
    courseMap[c.id] = c.tecnico_carnet;
  });

  const facToTecnico = {};
  (cursos || []).forEach(c => {
    if (c.facilitador_carnet && c.facilitador_carnet !== '9999999' && c.tecnico_carnet) {
      facToTecnico[c.facilitador_carnet] = c.tecnico_carnet;
    }
  });

  const templatePath = path.join(__dirname, '..', 'public', 'reporte_diario_template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Strip any old injected script block before parsing
  if (html.includes('<!-- INJECTED_REPORTE_SCRIPT -->')) {
    html = html.split('<!-- INJECTED_REPORTE_SCRIPT -->')[0] + '</body></html>';
  }

  // Parse table rows and annotate each tr tag
  const trs = html.split('<tr');
  for (let i = 1; i < trs.length; i++) {
    const block = trs[i];
    if (block.includes('<th')) continue;

    // Clean existing data-tecnico attribute
    let cleanBlock = block.replace(/\s*data-tecnico="[^"]*"/gi, '');

    // 1. Try matching by Course ID
    const idMatch = cleanBlock.match(/ID\s*[:\-]?\s*(\d+)/i);
    const id = idMatch ? idMatch[1] : null;
    let tec = id && courseMap[id] ? courseMap[id] : null;

    // 2. If no ID match, try token matching by Facilitator Name (Nombre Apellido vs Apellido Nombre)
    if (!tec) {
      const tds = cleanBlock.match(/<td[\s\S]*?<\/td>/gi) || [];
      const facTdText = tds[2] ? tds[2].replace(/<[^>]+>/g, '').trim() : '';
      const facNorm = normalizeText(facTdText);
      const htmlWords = facNorm.split(/\s+/).filter(w => w.length >= 2);

      let matchedFac = null;
      if (htmlWords.length > 0) {
        for (const f of (facs || [])) {
          const dbNorm = normalizeText(f.nombre);
          if (!dbNorm || dbNorm === 'por confirmar') continue;
          const dbWords = dbNorm.split(/\s+/).filter(w => w.length >= 2);
          const overlap = htmlWords.filter(hw => dbWords.includes(hw)).length;
          
          if (overlap >= 2 && overlap >= Math.min(htmlWords.length, dbWords.length) - 1) {
            matchedFac = f;
            break;
          }
        }
      }

      if (matchedFac && facToTecnico[matchedFac.carnet]) {
        tec = facToTecnico[matchedFac.carnet];
      }
    }

    // 3. Fallback to Gilmar (8639300) if still unassigned
    if (!tec) {
      tec = '8639300';
    }

    trs[i] = ' data-tecnico="' + tec + '"' + cleanBlock;
  }

  html = trs.join('<tr');

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

    // Update summary cards
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

  fs.writeFileSync(templatePath, html, 'utf8');
  console.log('Enriched HTML template with ID + Facilitador token matching!');
}

processHtml().catch(console.error);
