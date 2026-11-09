import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname, ART = `${ROOT}artifact`, A = process.env.BUILD_DIR ? `${ROOT}${process.env.BUILD_DIR}` : ART, SRC = process.env.SRC ? `${ROOT}${process.env.SRC}` : `${ROOT}src`;
import { symlinkSync, lstatSync } from 'node:fs';
if (A !== ART) { mkdirSync(A, { recursive: true }); for (const f of ['data', 'tex', 'sites', 'audio', 'content.md']) { try { lstatSync(`${A}/${f}`); } catch { try { symlinkSync(`${ART}/${f}`, `${A}/${f}`); } catch {} } } }
import { existsSync as ex } from 'node:fs';
const stub = `${ROOT}build/interior-stub.js`; writeFileSync(stub, 'export const PERSPECTIVES_STUB = 1; export function buildInterior() { return null; }\n');
const plugins = ex(`${SRC}/interior.js`) ? [] : [{ name: 'stub', setup(b) { b.onResolve({ filter: /interior\.js$/ }, () => ({ path: stub })); } }];
await build({ plugins, entryPoints: [`${SRC}/app.js`], bundle: true, minify: !process.env.NOMIN, keepNames: !!process.env.NOMIN, format: 'esm', target: 'es2021', outfile: `${A}/app.js`, nodePaths: [`${ROOT}build/node_modules`], legalComments: 'none' });
copyFileSync(`${SRC}/index.html`, `${A}/index.html`);
console.log('app.js', (readFileSync(`${A}/app.js`).length / 1024 | 0) + 'KB');
