const fs = require('fs');
const html = fs.readFileSync('./public/reporte_diario_template.html', 'utf8');
const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

console.log(`Total rows: ${trs.length}`);
trs.forEach((tr, i) => {
  if (tr.includes('<th')) return;
  const tds = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
  const sede = tds[1] ? tds[1].replace(/<[^>]+>/g, '').trim() : '';
  const fac = tds[2] ? tds[2].replace(/<[^>]+>/g, '').trim() : '';
  const tecMatch = tr.match(/data-tecnico="([^"]+)"/);
  const tec = tecMatch ? tecMatch[1] : 'sin-tec';
  console.log(`Row ${i} | Sede: ${sede} | Facilitador: ${fac} | Tec: ${tec}`);
});
