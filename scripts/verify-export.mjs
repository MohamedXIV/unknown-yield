import {readdir,readFile} from 'node:fs/promises';
const out=new URL('../apps/web/out/',import.meta.url);
const paths=await readdir(out,{recursive:true});
if(paths.some(path=>path.includes('studio')))throw new Error('Authoring route leaked into player export');
for(const path of paths.filter(p=>p.endsWith('.js'))){
  const source=await readFile(new URL(path.replaceAll('\\','/'),out),'utf8');
  if(source.includes('Material workbench')||source.includes('DEVELOPMENT ONLY / CONTENT STUDIO'))throw new Error('Studio component leaked into player bundle');
}
console.log('Verified static export: no Studio route or authoring component.');
