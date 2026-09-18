import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const result = await build({entryPoints:['src/main.js'], bundle:true, format:'iife', minify:true, write:false, legalComments:'inline', target:'es2020', loader:{'.webp':'dataurl','.jpg':'dataurl','.png':'dataurl','.glb':'binary'}});
const [template, style] = await Promise.all(['src/template.html','src/style.css'].map(p=>readFile(p,'utf8')));
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile('index.html', template.replace('/* INLINE_STYLE */',()=>style).replace('/* INLINE_SCRIPT */',()=>script));
console.log('Built self-contained index.html — no external requests required.');
