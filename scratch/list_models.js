const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const geminiApiKeyMatch = content.match(/GEMINI_API_KEY\s*=\s*(.*)/);

const apiKey = geminiApiKeyMatch ? geminiApiKeyMatch[1].trim().replace(/['\"#\r\n]/g, '') : null;

if (!apiKey) {
  console.log('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('Using API key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

async function run() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => {
        console.log(`- ${m.name} (displayName: ${m.displayName}, supportedMethods: ${m.supportedGenerationMethods})`);
      });
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

run();
