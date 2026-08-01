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

async function test() {
  const [{ data: cursos }, { data: facs }] = await Promise.all([
    supabase.from('cursos').select('id, tecnico_carnet, facilitador_carnet'),
    supabase.from('facilitadores').select('carnet, nombre')
  ]);

  const facToTecnico = {};
  (cursos || []).forEach(c => {
    if (c.facilitador_carnet && c.facilitador_carnet !== '9999999' && c.tecnico_carnet) {
      facToTecnico[c.facilitador_carnet] = c.tecnico_carnet;
    }
  });

  const testHtmlRow = '<tr><td>EDUCACIÓN ESPECIAL</td><td>CEE FASSIV - ID 10044</td><td>KAREN GABRIELA RIVERO VIANA</td></tr>';
  const textClean = normalizeText(testHtmlRow.replace(/<[^>]+>/g, ' '));
  const htmlWords = textClean.split(/\s+/).filter(w => w.length >= 2);

  let bestMatch = null;
  let maxOverlap = 0;

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

  const tec = bestMatch && facToTecnico[bestMatch.carnet] ? facToTecnico[bestMatch.carnet] : '8639300';
  console.log('Matched Facilitador:', bestMatch?.nombre, '| Carnet:', bestMatch?.carnet);
  console.log('Assigned tecnico_carnet:', tec, '(7782629 is Juan Pablo Alba Vaca)');
  console.log('Max Overlap Score:', maxOverlap);
}

test().catch(console.error);
