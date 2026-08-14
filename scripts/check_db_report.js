const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

async function checkDb() {
  const { data, error } = await supabase
    .from('agenda_contactos')
    .select('id_contacto, descripcion, updated_at')
    .eq('id_contacto', 'CONFIG-REPORTE-PLANTILLA-HTML')
    .maybeSingle();

  if (error) {
    console.error('Error fetching DB row:', error);
    return;
  }

  if (!data) {
    console.log('No DB row found for CONFIG-REPORTE-PLANTILLA-HTML');
    return;
  }

  console.log('Row updated_at:', data.updated_at);
  console.log('Description length:', data.descripcion ? data.descripcion.length : 0);

  const desc = data.descripcion || '';
  console.log('Includes btnCiclo:', desc.includes('btnCiclo'));
  console.log('Includes btnVerdes:', desc.includes('btnVerdes'));
  console.log('Includes Ocultar Ciclo:', desc.includes('Ocultar Ciclo'));
  console.log('Includes Ocultar verdes:', desc.includes('Ocultar verdes'));
  console.log('Includes btnFiltroPrioritarios:', desc.includes('btnFiltroPrioritarios'));

  const toolbarMatch = desc.match(/<div class="toolbar">[\s\S]*?<\/div>/i);
  if (toolbarMatch) {
    console.log('\n--- TOOLBAR HTML IN DB ---');
    console.log(toolbarMatch[0]);
  } else {
    console.log('\nNo <div class="toolbar"> found in DB HTML!');
  }
}

checkDb().catch(console.error);
