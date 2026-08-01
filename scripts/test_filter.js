const fs = require('fs');
const html = fs.readFileSync('./public/reporte_diario_template.html', 'utf8');
const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

console.log('--- TESTING VISIBILITY FOR CLAUDIA (3355859) ---');
trs.forEach((tr, i) => {
  if (tr.includes('<th')) return;
  const tecMatch = tr.match(/data-tecnico="([^"]+)"/);
  const tec = tecMatch ? tecMatch[1] : 'sin-tecnico';
  const text = tr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
  
  if (tec === '3355859') {
    console.log(`[VISIBLE - CLAUDIA] Row ${i}: ${text}`);
  } else {
    console.log(`[OCULTO - OTRO TÉCNICO ${tec}] Row ${i}: ${text}`);
  }
});
