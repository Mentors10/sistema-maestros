const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data_dump.json', 'utf8'));

const match = data.find(c => {
  const cost = c.costo || 50;
  const count = c.inscritos_formulario || 0;
  return count * cost === 1450 || c.total_bs === 1450;
});

if (match) {
  console.log('Found course:', JSON.stringify(match, null, 2));
} else {
  console.log('No course with 1450 Bs total found.');
}
