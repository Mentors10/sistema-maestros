const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

async function updateDb() {
  const templatePath = path.join(__dirname, '..', 'public', 'reporte_diario_template.html');
  const html = fs.readFileSync(templatePath, 'utf8');

  console.log('Template length:', html.length);
  console.log('Template includes btnCiclo:', html.includes('btnCiclo'));
  console.log('Template includes btnFiltroPrioritarios:', html.includes('btnFiltroPrioritarios'));

  const { data, error } = await supabase.from('agenda_contactos').upsert({
    id_contacto: 'CONFIG-REPORTE-PLANTILLA-HTML',
    tecnico_carnet: '8639300',
    nombre: 'PLANTILLA_REPORTE_DIARIO',
    descripcion: html,
    updated_at: new Date().toISOString()
  }).select('id_contacto, updated_at');

  if (error) {
    console.error('Supabase DB Update Error:', error);
  } else {
    console.log('Supabase DB Update SUCCESS:', data);
  }
}

updateDb().catch(console.error);
