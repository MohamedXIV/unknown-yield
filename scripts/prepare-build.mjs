import {readdir,readFile,rm} from 'node:fs/promises';
const dir=new URL('../apps/web/app/studio-entry/',import.meta.url);
const MARK='// GENERATED DEVELOPMENT STUDIO ENTRY';
try{
  // Only generated files may be removed; anything else in the folder is authored code.
  for(const entry of await readdir(dir,{recursive:true,withFileTypes:true})){
    if(!entry.isFile())continue;
    const source=await readFile(`${entry.parentPath}/${entry.name}`,'utf8');
    if(!source.startsWith(MARK))throw new Error('Unexpected Studio entry; refusing to remove authored code.');
  }
  await rm(dir,{recursive:true});
}catch(error){if(error.code!=='ENOENT')throw error;}
// Dev-server type stubs still name the removed Studio routes and would fail the build's type check.
await rm(new URL('../apps/web/.next/dev/',import.meta.url),{recursive:true,force:true});
