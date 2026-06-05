const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\GERSSONCH\\.gemini\\antigravity-ide\\brain\\b4367c58-0368-4a8a-9d55-6094bfb9f21d\\.system_generated\\steps\\1159\\content.md';
const text = fs.readFileSync(contentPath, 'utf8');

console.log('Total characters:', text.length);

// Let's search for some strings
const keywords = ['9117e51c3676', 'unefco', 'afiche', 'gema', 'gem', 'prompt', 'instructions', 'og:description', 'og:title'];
for (const kw of keywords) {
  const index = text.toLowerCase().indexOf(kw.toLowerCase());
  console.log(`Keyword "${kw}":`, index !== -1 ? `Found at index ${index}` : 'Not found');
}

// Let's print some segments around interesting areas if found
const ogTitleIdx = text.toLowerCase().indexOf('og:title');
if (ogTitleIdx !== -1) {
  console.log('Around og:title:', text.substring(ogTitleIdx - 50, ogTitleIdx + 200));
}

const ogDescIdx = text.toLowerCase().indexOf('og:description');
if (ogDescIdx !== -1) {
  console.log('Around og:description:', text.substring(ogDescIdx - 50, ogDescIdx + 200));
}
