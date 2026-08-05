const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = execSync('git show bfc66e8:public/reporte_diario_template.html', { maxBuffer: 15 * 1024 * 1024 }).toString();

let cssAdd = `
.bateria { display: flex; flex-direction: column; gap: 4px; }
.paso { display: flex; align-items: center; gap: 7px; font-size: 12px; padding: 5px 8px; border-radius: 7px; line-height: 1.2; border: 1.5px solid transparent; transition: all .15s; }
.paso .ico { width: 16px; font-size: 14px; font-weight: 700; flex-shrink: 0; text-align: center; }
.paso .lbl { flex: 1; min-width: 0; }
.paso .val { font-weight: 700; white-space: nowrap; }
.paso.ok { background: #ecfdf5; color: #15803d; border-color: #a7f3d0; }
.paso.ok .ico { color: #16a34a; }
.paso.bad { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.paso.bad .ico { color: #dc2626; }
.bateria .paso:hover { transform: scale(1.03); box-shadow: 0 3px 10px rgba(15,23,42,.18); z-index: 2; }
.paso.ok:hover { background: #d1fae5; border-color: #34d399; }
.paso.bad:hover { background: #fee2e2; border-color: #f87171; }
.conform-alert { background: #fff7ed !important; color: #c2410c !important; border: 1px solid #fdba74; font-weight: 700; margin-top: 5px; display: inline-block; }
`;

let newHtml = html;
if (!newHtml.includes('.bateria {')) {
  newHtml = newHtml.replace('.curso .nombre {', cssAdd + '\n.curso .nombre {');
}

newHtml = newHtml.replace(/<div class="curso">([\s\S]*?)<\/div>/gi, (match, inner) => {
  if (inner.includes('class="bateria"')) return match;

  const nombreMatch = inner.match(/<span class="nombre"[^>]*>([\s\S]*?)<\/span>/i);
  const nombreContent = nombreMatch ? nombreMatch[1].trim() : '';

  const planMatch = inner.match(/Plan\s+(SI|NO)/i);
  const planVal = planMatch ? planMatch[1] : 'NO';
  const planOk = planVal === 'SI';

  const evalMatch = inner.match(/%Eval:\s*([\d\.]+)%\s*\(([\d\/]+)\)/i);
  const evalPct = evalMatch ? evalMatch[1] : '0.0';
  const evalCount = evalMatch ? evalMatch[2] : '0/0';
  const evalOk = parseFloat(evalPct) > 0;

  const reportMatch = inner.match(/Report:\s*(SI|NO)/i);
  const reportVal = reportMatch ? reportMatch[1] : 'NO';
  const reportOk = reportVal === 'SI';

  const inicioMatch = inner.match(/Inicio:\s*([^\s<]+)/i);
  const inicioVal = inicioMatch ? inicioMatch[1] : '—';

  const socMatch = inner.match(/Socialización:\s*([^\s<]+)/i);
  const socVal = socMatch ? socMatch[1] : '—';

  const limiteMatch = inner.match(/Límite:\s*([^\s<]+)/i);
  const limiteVal = limiteMatch ? limiteMatch[1] : '—';

  const planFechaMatch = inner.match(/Planificación Fecha:\s*([^\s<]+)/i);
  const planFechaVal = planFechaMatch ? planFechaMatch[1] : (planOk ? 'OK' : '—');
  const planFechaOk = planOk;

  const reportFechaMatch = inner.match(/Informe Final:\s*([^\s<]+)/i);
  const reportFechaVal = reportFechaMatch ? reportFechaMatch[1] : (reportOk ? 'SI' : '—');

  const isCursoOk = planOk && evalOk && reportOk;

  const bateriaContent = `
        <span class="nombre" title="${nombreContent}">${nombreContent}</span>
        <div class="bateria">
          <div class="paso ${planOk ? 'ok' : 'bad'}" title="Planificación (plan de trabajo)"><span class="ico">${planOk ? '✓' : '✗'}</span><span class="lbl">Planificación</span><span class="val">${planVal}</span></div>
          <div class="paso ${planFechaOk ? 'ok' : 'bad'}" title="Fecha de planificación"><span class="ico">${planFechaOk ? '✓' : '✗'}</span><span class="lbl">Planificación Fecha</span><span class="val">${planFechaVal}</span></div>
          <div class="paso ok"><span class="ico">✓</span><span class="lbl">Fecha de inicio</span><span class="val">${inicioVal}</span></div>
          <div class="paso ok" title="Última fecha de socialización"><span class="ico">✓</span><span class="lbl">Socialización</span><span class="val">${socVal}</span></div>
          <div class="paso ${evalOk ? 'ok' : 'bad'}" title="Estudiantes que respondieron la valoración / total"><span class="ico">${evalOk ? '✓' : '✗'}</span><span class="lbl">Informe Evaluación</span><span class="val">${evalCount}</span></div>
          <div class="paso ${evalOk ? 'ok' : 'bad'}" title="Porcentaje de valoraciones completadas"><span class="ico">${evalOk ? '✓' : '✗'}</span><span class="lbl">Valoración</span><span class="val">${evalPct}%</span></div>
          <div class="paso ${reportOk ? 'ok' : 'bad'}" title="Informe Final"><span class="ico">${reportOk ? '✓' : '✗'}</span><span class="lbl">Informe Final</span><span class="val">${reportFechaVal}</span></div>
          <div class="paso ${isCursoOk ? 'ok' : 'bad'}" title="Fecha límite"><span class="ico">${isCursoOk ? '✓' : '✗'}</span><span class="lbl">Fecha límite</span><span class="val">${limiteVal}</span></div>
        </div>
  `;
  return `<div class="curso">${bateriaContent}</div>`;
});

const outPath = path.join(__dirname, '..', 'public', 'reporte_diario_template.html');
fs.writeFileSync(outPath, newHtml, 'utf8');
console.log('Successfully written FULL bateria HTML to public/reporte_diario_template.html! Length:', newHtml.length);
