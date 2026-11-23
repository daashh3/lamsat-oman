import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_RUNTIME = [
  'favicon.svg',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'assets/fonts/Tajawal-Regular.ttf',
  'assets/fonts/OFL.txt',
  'assets/textures/oman-flag-official.jpg',
];

/** Publish/cache only actual runtime assets, not unused audio and reference images. */
export function offlineAppPlugin() {
  let config;
  return {
    name: 'lamsat-offline-app',
    apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      const out = path.resolve(config.root, config.build.outDir);
      const files = ['index.html'];
      const scan = async (folder) => {
        for (const entry of await fs.readdir(path.join(out, folder), { withFileTypes: true })) {
          const name = path.posix.join(folder, entry.name);
          if (entry.isDirectory()) await scan(name);
          else if (/\.(?:js|css)$/.test(name)) files.push(name);
        }
      };
      await scan('assets');
      for (const name of PUBLIC_RUNTIME) {
        const destination = path.join(out, name);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(path.join(config.publicDir, name), destination);
        files.push(name);
      }
      // Digital Asset Links and custom domains are deployment data, never cached.
      for (const name of ['.well-known/assetlinks.json', 'CNAME']) {
        const source = path.join(config.publicDir, name);
        try {
          await fs.access(source);
          await fs.mkdir(path.dirname(path.join(out, name)), { recursive: true });
          await fs.copyFile(source, path.join(out, name));
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      await fs.writeFile(path.join(out, '.nojekyll'), '');
      files.sort();
      const template = await fs.readFile(new URL('./service-worker.template.js', import.meta.url), 'utf8');
      const digest = createHash('sha256').update(template);
      for (const file of files) digest.update(file).update(await fs.readFile(path.join(out, file)));
      const version = digest.digest('hex').slice(0, 20);
      await fs.writeFile(path.join(out, 'sw.js'), template
        .replace('__CACHE_VERSION__', JSON.stringify(version))
        .replace('__PRECACHE_FILES__', JSON.stringify(files)));
    },
  };
}
