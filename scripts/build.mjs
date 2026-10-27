import {build} from 'esbuild';
import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('_site',{recursive:true});
await build({entryPoints:['sdk.js'],outfile:'_site/supabase-client.js',bundle:true,format:'esm',platform:'browser',minify:true});
const files=['cover-library.js','cover-gallery.js','dictation.js','task-widget.js','google-session.js','google-tasks.js','tasks.js','task-view.js','index.html','desk-background.js','app.js','idea-workspace.js','planning-builder.js','note-media.js','voice-recorder.js','form-templates.js','event-colours.js','gym.js','pack-go.js','matrix.js','calendar.js','google.js','storage.js','sync.js','dropbox.js','cloud-config.js','styles.css','sw.js','manifest.webmanifest','accounts.js','account-config.js','account-ui.js','account-sync.js','_headers'];
await Promise.all(files.map(file=>copyFile(file,'_site/'+file)));
await cp('assets','_site/assets',{recursive:true});
// The built-in wooden desk photograph is stored at repository root.
// Cloudflare serves _site, so explicitly include this binary asset.
await copyFile('a_clean_warmly_lit_top_down_angled_overhead_stil.png','_site/a_clean_warmly_lit_top_down_angled_overhead_stil.png');
