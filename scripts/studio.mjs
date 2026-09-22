import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const route=new URL('../apps/web/app/studio-entry/',import.meta.url);
await mkdir(route,{recursive:true});
await writeFile(new URL('page.tsx',route),'// GENERATED DEVELOPMENT STUDIO ENTRY\nimport Studio from "../../components/Studio";\nexport default Studio;\n');
console.log('Development Studio: http://127.0.0.1:3000/studio-entry/');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','apps/web','--hostname','127.0.0.1'],{stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code??1;});
