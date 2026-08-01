const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

async function processHtml() {
  const { data: cursos } = await supabase.from('cursos').select('id, tecnico_carnet');
  const map = {};
  (cursos || []).forEach(c => {
    map[c.id] = c.tecnico_carnet;
  });

  const templatePath = path.join(__dirname, '..', 'public', 'reporte_diario_template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Parse table rows and annotate each tr tag
  const trs = html.split('<tr');
  for (let i = 1; i < trs.length; i++) {
    const block = trs[i];
    if (block.includes('<th')) continue;

    // Check if data-tecnico already exists
    if (block.includes('data-tecnico')) continue;

    const idMatch = block.match(/ID\s*[:\-]?\s*(\d+)/i);
    const id = idMatch ? idMatch[1] : null;
    const tec = id && map[id] ? map[id] : '8639300'; // Default to Gilmar if no match / no ID

    trs[i] = ' data-tecnico="' + tec + '"' + block;
  }

  html = trs.join('<tr');

  // Insert script before </body> if not present
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

  if (!html.includes('function buscar()')) {
    const scriptBlock = `
<script>
function buscar() {
    var input = document.getElementById('buscar');
    var filter = input ? input.value.toLowerCase().trim() : '';
    var tecSelect = document.getElementById('filtroTecnico');
    var selectedTec = tecSelect ? tecSelect.value : 'todos';

    var table = document.getElementById('reportTable');
    if (!table) return;
    var trs = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

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
    var table = document.getElementById('reportTable');
    if (!table) return;
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

// Auto filter on URL parameter if present
window.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    var tecParam = params.get('tecnico');
    if (tecParam) {
        var tecSelect = document.getElementById('filtroTecnico');
        if (tecSelect) {
            tecSelect.value = tecParam;
        }
    }
    buscar();
});
</script>
</body>
`;
    html = html.replace('</body>', scriptBlock);
  }

  fs.writeFileSync(templatePath, html, 'utf8');
  console.log('Enriched HTML template successfully!');
}

processHtml().catch(console.error);
