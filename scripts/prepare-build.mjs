import {readFile,unlink,rmdir} from 'node:fs/promises';
const route=new URL('../apps/web/app/studio-entry/page.tsx',import.meta.url);
try{
  const source=await readFile(route,'utf8');
  if(!source.startsWith('// GENERATED DEVELOPMENT STUDIO ENTRY'))throw new Error('Unexpected Studio entry; refusing to remove authored code.');
  await unlink(route);await rmdir(new URL('.',route));
}catch(error){if(error.code!=='ENOENT')throw error;}
