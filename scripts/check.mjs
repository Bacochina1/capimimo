import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const files=readdirSync(new URL('../dist/',import.meta.url)).filter(file=>file.endsWith('.js'));
for(const file of files){const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL('../dist/'+file,import.meta.url))],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr||'Syntax check failed: '+file+'\n');process.exit(1);}}
console.log(files.length+' frontend modules parsed. VERDICT: PASS');
