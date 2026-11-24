import fs from 'node:fs';
import assert from 'node:assert/strict';
import {places as data} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {seededSitePlans,initializeNaturalSitePlans,isNaturalSite,siteBounds,siteIntersects} from '../Hakkai_v7.1.0/BehaviorPack/scripts/natural_sites.js';
const fresh=()=>data.map(s=>({...s}));
for(const seed of ['0','123','-123','9223372036854775807','another seed']){
 const sites=fresh(),p=seededSitePlans(sites,seed);assert.equal(p.size,42);
 assert.deepEqual(p,seededSitePlans(sites,seed));
 for(const s of sites.filter(isNaturalSite))Object.assign(s,p.get(s.id));
 for(const a of sites.filter(isNaturalSite))for(const b of sites.filter(s=>s.dim===a.dim&&s.id!==a.id)){
  const box=siteBounds(b);assert.ok(!siteIntersects(a,box.x0-32,box.z0-32,box.x1+32,box.z1+32),`${seed}: ${a.id}/${b.id}`);
 }
}
assert.notDeepEqual(seededSitePlans(data,'1'),seededSitePlans(data,'2'));
const props=new Map(),world={getDynamicProperty:k=>props.get(k)};
const num=(_e,k)=>props.get('hakkai:'+k)??0,property=(_e,k,v)=>props.set('hakkai:'+k,v);
props.set('hakkai:built_21',1);const a=fresh(),old=a[21].x;
initializeNaturalSitePlans({places:a,seed:'42',world,num,property,ns:'hakkai:'});assert.equal(a[21].x,old,'legacy built site remains in place');
const saved={x:a[29].x,z:a[29].z};props.set('hakkai:built_29',1);
const b=fresh();initializeNaturalSitePlans({places:b,seed:'different',world,num,property,ns:'hakkai:'});assert.deepEqual({x:b[29].x,z:b[29].z},saved,'saved plan retained across reload');assert.equal(b[21].x,old);
props.set('hakkai:natural_site_plan_30_v2','broken');assert.throws(()=>initializeNaturalSitePlans({places:fresh(),seed:'42',world,num,property,ns:'hakkai:'}),/Invalid site plan/);
console.log('seeded location determinism, realm spacing, saved plans and legacy sites (mocked)');

const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const startup=main.slice(main.indexOf("safeSub('world','after','worldLoad'"));
assert.ok(startup.indexOf('initializeNaturalSitePlans(')<startup.indexOf('setupSeededWorlds('));
assert.ok(!main.includes('seededWorlds=setupSeededWorlds({ns,world,system,num,property,report,places,biomes,families});'),'no early-execution seeded startup');
// New plans may use spare cells when their first candidate intersects known
// completed or skipped terrain; previously saved plans are never moved.
{
 const seed='blocked-world',base=fresh(),original=seededSitePlans(base,seed).get(29),initial={...base.find(s=>s.id===29),...original},bounds=siteBounds(initial);
 const prop=new Map(),world={getDynamicProperty:k=>prop.get(k)};
 const num=(_e,k)=>prop.get('hakkai:'+k)??0,property=(_e,k,v)=>prop.set('hakkai:'+k,v);
 const cx=Math.floor(bounds.x0/16),cz=Math.floor(bounds.z0/16),key=`hakkai:seed_land_0_${cx}_${cz}_v1`;
 prop.set(key,1);initializeNaturalSitePlans({places:base,seed,world,num,property,ns:'hakkai:'});
 const selected=base.find(s=>s.id===29);assert.notDeepEqual({x:selected.x,z:selected.z},original,'choose ungenerated spare cell');
 for(const other of base.filter(s=>s.dim===0&&s.id!==29)){
  const b=siteBounds(other);assert.equal(siteIntersects(selected,b.x0-32,b.z0-32,b.x1+32,b.z1+32),false);
 }
 const before={x:selected.x,z:selected.z},b=siteBounds(selected);
 prop.set(`hakkai:seed_land_0_${Math.floor(b.x0/16)}_${Math.floor(b.z0/16)}_v1`,1);
 const reload=fresh();initializeNaturalSitePlans({places:reload,seed,world,num,property,ns:'hakkai:'});
 assert.deepEqual({x:reload[29].x,z:reload[29].z},before,'saved candidate never moves after blending can begin');
}
