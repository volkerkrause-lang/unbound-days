import {writeFile} from 'node:fs/promises';
import {newCovers,artwork} from '../cover-library.js';
for(const c of newCovers)await writeFile(new URL('../'+c.file.split('?')[0],import.meta.url),artwork(c));
console.log(`Generated ${newCovers.length} individual cover designs.`);
