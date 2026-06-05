const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\GERSSONCH\\.gemini\\antigravity-ide\\brain\\b4367c58-0368-4a8a-9d55-6094bfb9f21d\\.system_generated\\steps\\1197\\content.md';
const text = fs.readFileSync(contentPath, 'utf8');

console.log('Total characters:', text.length);

// Let's search for some strings
const keywords = ['1x3Klhr_QT0-eO3iHI3Eg6fnTs9OhAmrp', 'unefco', 'afiche', 'gema', 'gem', 'prompt', 'instructions', 'og:description', 'og:title'];
for (const kw of keywords) {
  const index = text.toLowerCase().indexOf(kw.toLowerCase());
  console.log(`Keyword "${kw}":`, index !== -1 ? `Found at index ${index}` : 'Not found');
}
