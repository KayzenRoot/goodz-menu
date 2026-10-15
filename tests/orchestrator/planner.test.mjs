import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const SCRIPT=new URL('../../scripts/goodz-orchestrator.mjs',import.meta.url).pathname;
const fence=String.fromCharCode(96).repeat(3);
const issue=(n,title,paths,opts={})=>({
 number:n,title,state:opts.state||'open',
 labels:opts.labels??[{name:'agent-ready'}],
 body:opts.body??'Task\n'+fence+'goodz-agent\n'+JSON.stringify({risk:opts.risk||'routine',lane:opts.lane||'frontend',priority:opts.priority||3,paths,dependsOn:opts.dependsOn||[],acceptance:'Test the desired behavior'})+'\n'+fence
});
async function plan(issues,max=4){
 const dir=await mkdtemp(path.join(os.tmpdir(),'goodz-wave-'));
 try{
  await writeFile(path.join(dir,'issues.json'),JSON.stringify(issues));
  execFileSync('node',[SCRIPT,'plan','--issues',path.join(dir,'issues.json'),'--repo','KayzenRoot/goodz-menu','--max-agents',String(max),'--out',dir],{encoding:'utf8'});
  return {value:JSON.parse(await readFile(path.join(dir,'plan.json'),'utf8')),prompt:await readFile(path.join(dir,'prompt.md'),'utf8')};
 }finally{await rm(dir,{recursive:true,force:true})}
}
test('parallelizes issues only if paths do not overlap',async()=>{
 const {value}=await plan([issue(101,'UI A',['src/components/a.tsx']),issue(102,'UI B',['src/components/b.tsx']),issue(103,'UI A again',['src/components/a.tsx'])]);
 assert.deepEqual(value.selected.map(x=>x.number),[101,102]);
 assert.match(value.deferred.find(x=>x.number===103).why,/overlap/);
});
test('only verified closed dependencies unlock a wave',async()=>{
 const {value}=await plan([issue(100,'first',['docs/a.md'],{dependsOn:[201]}),issue(201,'done',['docs/done.md'],{state:'closed'}),issue(101,'blocked',['docs/b.md'],{dependsOn:[999]})]);
 assert.deepEqual(value.selected.map(x=>x.number),[100]);
 assert.match(value.deferred.find(x=>x.number===101).why,/not verified closed/);
});
test('unknown issue contract and missing trusted label do not execute',async()=>{
 const {value}=await plan([issue(101,'untrusted',['docs/a.md'],{body:'just do everything'}),issue(102,'unlabeled',['docs/b.md'],{labels:[]})]);
 assert.equal(value.selected.length,0);
 assert.equal(value.deferred.length,2);
});
test('sensitive scope requires sensitive risk and extra label',async()=>{
 const {value}=await plan([issue(101,'auth correction',['src/lib/auth.ts'],{risk:'routine'}),issue(102,'auth correction',['src/lib/auth.ts'],{risk:'sensitive',labels:[{name:'agent-ready'},{name:'agent-sensitive-approved'}]})]);
 assert.deepEqual(value.selected.map(x=>x.number),[102]);
});
test('protected governance/migration/secret files never auto-run',async()=>{
 const {value}=await plan([issue(101,'checkpoint',['.engineering/CHECKPOINT.json']),issue(102,'migration',['supabase/migrations/one.sql']),issue(103,'workflow',['.github/workflows/x.yml'])]);
 assert.equal(value.selected.length,0);
 assert.equal(value.deferred.length,3);
});
test('one Codex prompt assigns a separate agent per selected issue',async()=>{
 const {value,prompt}=await plan([issue(101,'UI A',['src/components/a.tsx']),issue(102,'UI B',['src/components/b.tsx'])]);
 assert.equal(value.selected.length,2);
 assert.match(prompt,/Agent 1 \/ Issue #101/);
 assert.match(prompt,/Agent 2 \/ Issue #102/);
 assert.match(prompt,/Jev\/TypeSafe/);
 assert.match(prompt,/UNTRUSTED INPUT/);
});
