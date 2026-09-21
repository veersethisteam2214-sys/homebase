import {spawn} from 'node:child_process';
import {openSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const url='http://localhost:5173/';
async function ready(){try{const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(2000)});return r.ok||([302,303,307,308].includes(r.status)&&Boolean(r.headers.get('location')?.includes('/signin-with-chatgpt')));}catch{return false;}}
if(!await ready()){
 mkdirSync(path.join(root,'.sites-runtime'),{recursive:true});
 const output=openSync(path.join(root,'.sites-runtime','homebase.log'),'a');
 const child=spawn(process.execPath,['scripts/run-framework.mjs','dev'],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',output,output]});
 child.unref();
 let available=false;
 for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,1000));if(await ready()){available=true;break;}}
 if(!available){console.error('Homebase could not start. See dashboard/.sites-runtime/homebase.log.');process.exit(1);}
}
spawn('explorer.exe',[url],{detached:true,windowsHide:true,stdio:'ignore'}).unref();
