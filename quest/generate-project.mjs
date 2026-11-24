// Generates the official Meta Quest PWA wrapper, without CLI setup prompts.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const toolRequire = createRequire(path.join(root, '.tools/quest/package.json'));
const cliRequire = createRequire(toolRequire.resolve('@meta-quest/bubblewrap-cli/package.json'));
const { TwaManifest } = cliRequire('@meta-quest/bubblewrap-core/dist/lib/TwaManifest.js');
const { TwaGenerator } = cliRequire('@meta-quest/bubblewrap-core/dist/lib/TwaGenerator.js');
const { ConsoleLog } = cliRequire('@meta-quest/bubblewrap-core/dist/lib/Log.js');
const out = path.join(root, 'quest/build');
const manifestURL = 'https://daashh3.github.io/lamsat-oman/manifest.webmanifest';
await fs.mkdir(out, { recursive: true });
const unsigned = process.env.LAMSAT_UNSIGNED_BUILD === '1';
const publicLinks = JSON.parse(await fs.readFile(path.join(root, 'quest/assetlinks.json'), 'utf8'));
const fingerprint = unsigned
  ? publicLinks.find(link => link.target.package_name === 'om.lamsat.quest')?.target.sha256_cert_fingerprints[0]
  : (await fs.readFile(path.join(out, 'certificate-sha256.txt'), 'utf8')).trim();
if (!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint)) throw new Error('Invalid signing certificate fingerprint.');
if (!unsigned) await fs.access(path.join(root, 'quest/signing/release.keystore'));
const manifest = await TwaManifest.fromWebManifest(manifestURL);
if (manifest.host !== 'daashh3.github.io' || manifest.startUrl !== '/lamsat-oman/?launch=quest') {
  throw new Error('The hosted manifest no longer points to the expected application.');
}
Object.assign(manifest, {
  packageId: 'om.lamsat.quest',
  name: 'لمسة عُمان',
  launcherName: 'لمسة عُمان',
  appVersionCode: Number(process.env.LAMSAT_VERSION_CODE || 1),
  appVersionName: process.env.LAMSAT_VERSION_NAME || '1.0.0',
  isMetaQuest: true,
  horizonOSAppMode: 'immersive',
  display: 'standalone',
  minSdkVersion: 26,
  enableNotifications: false,
  enableMicrophone: false,
  enableXRScene: false,
  enableSiteSettingsShortcut: false,
  signingKey: { path: path.join(root, 'quest/signing/release.keystore'), alias: 'lamsat-oman' },
  fingerprints: [{ name: 'Lamsat Oman release', value: fingerprint }],
  features: {},
  generatorApp: '@meta-quest/bubblewrap-cli@1.24.1',
});
await manifest.saveToFile(path.join(out, 'twa-manifest.json'));
await new TwaGenerator().createTwaProject(out, manifest, new ConsoleLog('lamsat-quest'));

// Compile against the installed Android API; retain Meta's runtime target SDK 32.
const gradleFile = path.join(out, 'app/build.gradle');
let gradle = await fs.readFile(gradleFile, 'utf8');
gradle = gradle.replace(/compileSdkVersion\s+32/, 'compileSdkVersion 34\n    buildToolsVersion "36.0.0"');
await fs.writeFile(gradleFile, gradle);
const topGradle = path.join(out, 'build.gradle');
await fs.writeFile(topGradle, (await fs.readFile(topGradle, 'utf8')).replaceAll('jcenter()', 'mavenCentral()'));
const links = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: manifest.packageId, sha256_cert_fingerprints: [fingerprint] },
}];
await fs.writeFile(path.join(root, 'quest/assetlinks.json'), JSON.stringify(links, null, 2) + '\n');
console.log('Generated immersive Quest project: om.lamsat.quest');
