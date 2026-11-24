import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {CULTURE_SITES,CULTURE_PEOPLE,cultureResidentIdentity,foundCultureResident,factoryResidentRole,factoryResidentBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_culture.js';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {isNaturalSite} from '../Hakkai_v7.1.0/BehaviorPack/scripts/natural_sites.js';
assert.equal(CULTURE_SITES.length,8);
for(let i=0;i<8;i++){
 const site=CULTURE_SITES[i];assert.equal(site.id,61+i);assert.equal(site.dim,i);assert.equal(site.size,65);
 assert.ok(site.story.length>80);assert.equal(places.find(p=>p.id===site.id),site);assert.ok(isNaturalSite(site));
 assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/structures/hakkai/site_${site.id}.mcstructure`));
}
assert.equal(new Set(CULTURE_SITES.map(s=>s.name)).size,8);
const entity=(n,baby=false)=>({isValid:true,nameTag:`風車村の住人 ${n}`,getComponent:id=>id==='minecraft:is_baby'&&baby?{}:undefined});
assert.equal(factoryResidentRole(entity(1)),'crusher');assert.equal(factoryResidentRole({nameTag:'風車村の住人 2｜製材係'}),'saw');
assert.equal(factoryResidentRole(entity(3)),'grower');assert.equal(factoryResidentRole(entity(4)),'keeper');
assert.equal(factoryResidentRole(entity(25)),undefined);assert.equal(factoryResidentRole({nameTag:'普通の村人'}),undefined);
let workers=[];const b={typeId:'hakkai:crusher',x:0,y:88,z:0,dimension:{getEntities:()=>workers}};
const town={factoryVillage:true};
assert.equal(factoryResidentBonus(town,b,6000),0);
workers=[entity(2)];assert.equal(factoryResidentBonus(town,b,6000),0,'wrong role');
workers=[entity(1,true)];assert.equal(factoryResidentBonus(town,b,6000),0,'baby is not a worker');
workers=[entity(1)];assert.equal(factoryResidentBonus(town,b,6000),1);
assert.equal(factoryResidentBonus(town,b,7100),0,'outside work hours');assert.equal(factoryResidentBonus({},b,6000),0,'not this village');
b.typeId='hakkai:saw';assert.equal(factoryResidentBonus(town,b,6000),0);workers=[entity(2)];assert.equal(factoryResidentBonus(town,b,6000),1);
b.dimension.getEntities=()=>{throw Error('unloaded')};assert.equal(factoryResidentBonus(town,b,6000),0,'fail closed');
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
assert.ok(main.includes("places.length+(env")===false,'old per-biome reward indices are not shifted');
assert.ok(main.includes('site.id>=59&&site.id<=68?4096+site.id-59:site.id'));
assert.ok(main.includes('CULTURE_SITES.map(s=>'));assert.ok(main.includes('factoryResidentRole(e)'));
assert.ok(main.includes("const expected=site.kind==='atlas'?"));
console.log('Eight fictional heritage records, legacy IDs and genuine nearby resident work bonus (mocked/static)');

// The real founding routine reserves each slot once, and obeys mob-spawning
// and occupancy; a save/restart cannot recreate residents who have died.
{
 const properties=new Map(), spawned=[];let blocked=false;
 const w={gameRules:{doMobSpawning:true}};
 const dim={id:'hakkai:realm_1',getPlayers:()=>blocked?[{}]:[],getEntities:()=>[],spawnEntity:(id,at)=>{const e={id,at};spawned.push(e);return e;}};
 const site=CULTURE_SITES[1], args={site,world:w,dimension:dim,num:(_,k)=>properties.get(k)??0,property:(_,k,v)=>properties.set(k,v),findFloor:(_d,at)=>at,report:()=>{}};
 w.gameRules.doMobSpawning=false;assert.equal(foundCultureResident(args),false);w.gameRules.doMobSpawning=true;
 assert.equal(foundCultureResident(args),false,'unbuilt');properties.set(`built_${site.id}`,1);
 blocked=true;assert.equal(foundCultureResident(args),false);blocked=false;
 assert.equal(foundCultureResident(args),true);assert.equal(foundCultureResident(args),true);assert.equal(foundCultureResident(args),false);
 assert.equal(spawned.length,2);assert.deepEqual(cultureResidentIdentity(spawned[0]),{realm:1,index:0});
 assert.ok(spawned[0].nameTag.includes(CULTURE_PEOPLE[1][0].name));
 spawned.pop();assert.equal(foundCultureResident(args),false,'death is not automatic replacement');
 properties.delete(`culture_residents_${site.id}_v1`);dim.spawnEntity=()=>{throw Error('uncertain spawn')};
 assert.equal(foundCultureResident(args),false);assert.equal(properties.get(`culture_residents_${site.id}_v1`),1,'reservation before uncertain spawn');
 assert.equal(cultureResidentIdentity({nameTag:'別の村人'}),undefined);
 assert.ok(main.includes('foundCultureResident({site,world,dimension:p.dimension'));
 assert.ok(main.includes('const identity=cultureResidentIdentity(e.target)'));
}
