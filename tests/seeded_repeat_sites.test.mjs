import assert from 'node:assert/strict';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {repeatSitePlan,placeRepeatSite,repeatKey,REPEAT_SITE_IDS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/seeded_repeat_sites.js';
import {siteBounds,siteIntersects} from '../Hakkai_v7.1.0/BehaviorPack/scripts/natural_sites.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
import {BlockVolume} from '@minecraft/server';
for(const seed of ['731','another','-88'])for(let realm=0;realm<8;realm++){
 const {hash}=seedFunctions(seed),seen=new Set();let count=0;
 for(let gx=-12;gx<=12;gx++)for(let gz=-12;gz<=12;gz++){
  const p=repeatSitePlan(places,realm,gx,gz,hash);assert.deepEqual(p,repeatSitePlan(places,realm,gx,gz,hash));if(!p)continue;
  count++;seen.add(p.templateId);const b=siteBounds(p);
  assert.ok(b.x0>gx*256&&b.x1<(gx+1)*256&&b.z0>gz*256&&b.z1<(gz+1)*256,'bounded in cell');
  assert.equal(p.repeatKey,repeatKey(realm,gx,gz));
  for(const original of places.filter(s=>s.dim===realm))assert.equal(siteIntersects(original,b.x0-32,b.z0-32,b.x1+32,b.z1+32),false);
 }
 assert.ok(count>450,`${seed}/${realm}: ${count}`);
 for(const id of REPEAT_SITE_IDS[realm])assert.ok(seen.has(id),`unselected template ${id}`);
}
const first=seedFunctions('731').hash,second=seedFunctions('other').hash;
assert.notDeepEqual(repeatSitePlan(places,0,9,9,first),repeatSitePlan(places,0,9,9,second),'seed changes selection');
const sample=repeatSitePlan(places,0,9,9,first)??repeatSitePlan(places,0,10,9,first);assert.ok(sample);
function fixture(){
 const marks=new Map(),placed=[],world={structureManager:{place:(...args)=>placed.push(args)}},dim={getEntities:()=>[],getPlayers:()=>[],containsBlock:()=>false};
 const num=(_w,k)=>marks.get(k)??0,property=(_w,k,v)=>marks.set(k,v),loaded=async(_d,_a,_b,fn)=>fn();
 return {marks,placed,world,dim,num,property,loaded,run:()=>placeRepeatSite({site:sample,world,dimension:dim,num,property,loaded,BlockVolume})};
}
{
 const f=fixture();assert.equal(await f.run(),'built');assert.equal(f.placed.length,1);assert.equal(f.placed[0][0],sample.templateId===59?`hakkai:site_59_village_${sample.factoryVariant}`:`hakkai:site_${sample.templateId}`);assert.equal(f.marks.get(sample.repeatKey),1);assert.equal(await f.run(),'finished');assert.equal(f.placed.length,1);
}
for(const reason of ['generated','skipped','block','player','entity','load-failure','placement-failure']){
 const f=fixture(),b=siteBounds(sample),cx=Math.floor(b.x0/16),cz=Math.floor(b.z0/16);
 if(reason==='generated'||reason==='skipped')f.marks.set(`seed_land_${sample.dim}_${cx}_${cz}_${reason==='skipped'?'skip_':''}v1`,1);
 if(reason==='block')f.dim.containsBlock=()=>true;
 if(reason==='player')f.dim.getPlayers=()=>[{location:{x:sample.x,y:88,z:sample.z}}];
 if(reason==='entity')f.dim.getEntities=()=>[{isValid:true,location:{x:sample.x,y:88,z:sample.z}}];
 if(reason==='load-failure')f.loaded=async()=>{throw Error('unloaded')};
 if(reason==='placement-failure')f.world.structureManager.place=()=>{throw Error('partial')};
 const result=await placeRepeatSite({site:sample,world:f.world,dimension:f.dim,num:f.num,property:f.property,loaded:f.loaded,BlockVolume});
 assert.equal(result,['generated','skipped','block'].includes(reason)?'blocked':'retry',reason);assert.equal(f.placed.length,0);
 if(['generated','skipped','block','placement-failure'].includes(reason))assert.equal(f.marks.get(sample.repeatKey),2,reason);
 else assert.equal(f.marks.has(sample.repeatKey),false,reason);
}
console.log('Repeat sites: seeded distribution, actual templates, conflicts, per-cell state and safe preflight (mocked)');
// Exercise the actual viewport scheduler and reservation, not only the planner.
{
 const {setupSeededWorlds}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/seeded_worlds.js');
 const plan=sample,b=siteBounds(plan),marks=new Map(),jobs=[],calls=[];
 const dim={id:`hakkai:realm_${plan.dim}`,isChunkLoaded:at=>at.x>=b.x0&&at.x<=b.x1&&at.z>=b.z0&&at.z<=b.z1,getPlayers:()=>[player]};
 const player={id:'p',dimension:dim,location:{x:b.x0-10,y:88,z:plan.z},sendMessage:()=>{}};
 const world={seed:731,getAllPlayers:()=>[player],getDynamicProperty:k=>marks.get(k.replace('hakkai:',''))};
 const num=(_e,k,or=0)=>marks.get(k)??or,property=(_e,k,v)=>marks.set(k,v);
 const system={currentTick:20,runJob:job=>jobs.push(job)};let finish;
 const generator=setupSeededWorlds({ns:'hakkai:',world,system,num,property,report:()=>assert.fail('unexpected report'),places,buildRepeatSite:p=>{calls.push(p);return new Promise(r=>finish=r);}});
 generator.tick(player,20);await Promise.resolve();assert.equal(calls.length,1);assert.equal(calls[0].repeatKey,plan.repeatKey);
 assert.equal(jobs.length,0,'terrain cannot race the in-flight site');
 system.currentTick=41;generator.tick(player,41);await Promise.resolve();assert.equal(calls.length,1,'in-flight copy is deduplicated');
 marks.set(plan.repeatKey,2);finish();await new Promise(r=>setTimeout(r,0));
 system.currentTick=241;generator.tick(player,241);assert.ok(jobs.length>0,'blocked site releases reservation for terrain safety checks');
}
console.log('Repeat-site real scanner schedules once and reserves the footprint (mocked)');
