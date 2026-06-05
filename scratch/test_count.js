const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const url = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/)[1].trim().replace(/['\"#\r\n]/g, '');
const key = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim().replace(/['\"#\r\n]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function run() {
  const res = await supabase.from('cursos_enriquecidos').select('id, inscripcion_ciclo(count)').limit(5);
  console.log('Result:', JSON.stringify(res.data, null, 2));
  console.log('Error:', res.error);
}

run();
