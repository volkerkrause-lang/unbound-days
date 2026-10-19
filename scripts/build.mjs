import {build} from 'esbuild';
import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('_site',{recursive:true});
await build({entryPoints:['sdk.js'],outfile:'_site/supabase-client.js',bundle:true,format:'esm',platform:'browser',minify:true});
const files=['google-session.js','google-tasks.js','tasks.js','task-view.js','index.html','app.js','idea-workspace.js','planning-builder.js','gym.js','pack-go.js','matrix.js','calendar.js','google.js','storage.js','sync.js','dropbox.js','cloud-config.js','styles.css','sw.js','manifest.webmanifest','accounts.js','account-config.js','account-ui.js','account-sync.js','_headers'];
await Promise.all(files.map(file=>copyFile(file,'_site/'+file)));
await cp('assets','_site/assets',{recursive:true});
