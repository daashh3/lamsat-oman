import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Export exact source text, not a shortened example, for the requested code blocks.
const root = fileURLToPath(new URL('../', import.meta.url));
async function sourceFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    if (entry.name === 'tests') continue;
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(relative));
    else if (/\.(js|css)$/.test(entry.name)) files.push(relative);
  }
  return files.sort();
}

const files = ['index.html', 'package.json', 'vite.config.js', ...await sourceFiles('src'), 'scripts/generate-music.mjs'];
let output = '# Lamsat Oman — complete updated code blocks\n\n';
output += 'هذه نسخة كاملة من HTML وCSS وجميع وحدات JavaScript الخاصة بالتطبيق، دون اختصار. احفظ الملفات بمساراتها داخل المشروع؛ الصور والخط موجودان في مجلد public. المؤثرات التفاعلية مولّدة برمجياً، ولا تُشغّل موسيقى أو تعليقات صوتية.\n\n';
output += 'Run `npm install` and `npm run dev`. This is the existing modular Vite project. Edit written Arabic challenge messages in `src/audio/ArabicScripts.js`. See [README](../README.md) and [current update report](GAMIFICATION_UPDATE.md) for controls, HTTPS/Quest instructions, verification and equivalent CDN links. Music and speech are removed. Only short Web Audio interaction effects play; historical WAV files are unused. Side keepsakes are removed and door tracing needs no tool. See docs/EFFECTS_AND_DOOR_UPDATE.md for the current revision.\n\n';
for (const file of files) {
  const language = file.endsWith('.html') ? 'html' : file.endsWith('.css') ? 'css' : file.endsWith('.json') ? 'json' : 'javascript';
  const code = await fs.readFile(path.join(root, file), 'utf8');
  output += `## ${file}\n\n\`\`\`${language}\n${code.trimEnd()}\n\`\`\`\n\n`;
}
await fs.writeFile(path.join(root, 'docs/UPDATED_CODE.md'), output, 'utf8');
console.log(`Exported ${files.length} complete files to docs/UPDATED_CODE.md.`);

