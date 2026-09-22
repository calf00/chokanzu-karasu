import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const result = await build({entryPoints:['src/main.js'], bundle:true, format:'iife', minify:true, write:false, legalComments:'inline', target:'es2020', loader:{'.webp':'dataurl','.jpg':'dataurl','.png':'dataurl','.glb':'binary'}});
const [template, style] = await Promise.all(['src/template.html','src/style.css'].map(p=>readFile(p,'utf8')));
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = template.replace('/* INLINE_STYLE */',()=>style).replace('/* INLINE_SCRIPT */',()=>script);
const bytes = Buffer.byteLength(html, 'utf8');
if (bytes >= 25_000_000) throw new Error(`index.html is ${(bytes / 1_000_000).toFixed(2)} MB. Keep the upload file below 25 MB by optimizing embedded assets.`);
await writeFile('index.html', html);
console.log(`Built self-contained index.html (${(bytes / 1_000_000).toFixed(2)} MB, below 25 MB) — no external requests required.`);
