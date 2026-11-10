import {build} from 'esbuild';
import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('_site',{recursive:true});
await build({entryPoints:['sdk.js'],outfile:'_site/supabase-client.js',bundle:true,format:'esm',platform:'browser',minify:true});
await build({entryPoints:['travel-document-extractor.js'],outfile:'_site/travel-extractor.js',bundle:true,format:'esm',platform:'browser',minify:true});
await mkdir('_site/ocr/lang',{recursive:true});
await mkdir('_site/ocr',{recursive:true});
await Promise.all([
 copyFile('node_modules/tesseract.js/dist/worker.min.js','_site/ocr/worker.min.js'),
 copyFile('node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js','_site/ocr/tesseract-core-lstm.wasm.js'),
 copyFile('node_modules/tesseract.js-core/tesseract-core-lstm.wasm','_site/ocr/tesseract-core-lstm.wasm'),
 copyFile('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz','_site/ocr/lang/eng.traineddata.gz'),
 copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','_site/pdf.worker.min.mjs'),
 copyFile('node_modules/tesseract.js/LICENSE.md','_site/ocr/TESSERACT-LICENSE.md'),
 copyFile('node_modules/tesseract.js-core/LICENSE','_site/ocr/TESSERACT-CORE-LICENSE'),
 copyFile('node_modules/pdfjs-dist/LICENSE','_site/PDFJS-LICENSE'),
 copyFile('docs/THIRD_PARTY_TRAVEL_DOCUMENT_EXTRACTION.md','_site/THIRD_PARTY_TRAVEL_DOCUMENT_EXTRACTION.md')
]);
const files=['cover-library.js','cover-gallery.js','dictation.js','quick-capture.js','link-preview.js','quick-capture.html','quick-capture.webmanifest','task-widget.js','google-session.js','google-tasks.js','tasks.js','task-view.js','index.html','desk-background.js','app.js','idea-workspace.js','planning-builder.js','note-media.js','voice-recorder.js','form-templates.js','event-colours.js','gym.js','pack-go.js','travel-planner.js','box.js','matrix.js','calendar.js','rituals.js','google.js','storage.js','sync.js','dropbox.js','cloud-config.js','styles.css','packing-design.css','task-completion.css','sw.js','manifest.webmanifest','accounts.js','account-config.js','account-ui.js','account-sync.js','_headers'];
await Promise.all(files.map(file=>copyFile(file,'_site/'+file)));
await cp('assets','_site/assets',{recursive:true});
// The built-in wooden desk photograph is stored at repository root.
// Cloudflare serves _site, so explicitly include this binary asset.
await copyFile('a_clean_warmly_lit_top_down_angled_overhead_stil.png','_site/a_clean_warmly_lit_top_down_angled_overhead_stil.png');

