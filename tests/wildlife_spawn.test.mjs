import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_spawn.js';
import {pickRealmWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_selection.js';
import {wildlife,places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {Difficulty} from '@minecraft/server';
function spawnFixture(){
 const spawned=[],players=[];
 const d={id:'hakkai:realm_0',getEntities:()=>[],getPlayers:()=>players,isChunkLoaded:()=>true,spawnEntity:(...x)=>spawned.push(x),getBiome:()=>({id:'minecraft:plains'}),getBlock:()=>({typeId:'minecraft:grass_block'})};
 const p={id:'p',dimension:d,location:{x:0,y:90,z:0}};
 const args={player:p,type:'hakkai:wild_0_0',tick:40,safe:()=>true};
 return {args,d,p,players,spawned};
}
{
 const f=spawnFixture();assert.equal(spawnWildlife(f.args),true);assert.equal(f.spawned.length,1);
 assert.deepEqual(f.spawned[0][2],{spawnEvent:'hakkai:wild',initialPersistence:false});
 assert.ok(Math.hypot(f.spawned[0][1].x,f.spawned[0][1].z)>=7);
}
for(const change of [f=>f.d.isChunkLoaded=()=>false,f=>f.args.safe=()=>false,f=>f.players.push({}),f=>f.args.avoid=()=>true,f=>f.d.getPlayers=()=>{throw Error('fail')},f=>f.d.spawnEntity=()=>{throw Error('fail')}]){
 const f=spawnFixture();change(f);assert.equal(spawnWildlife(f.args),false);assert.equal(f.spawned.length,0);
}
{
 const f=spawnFixture();f.args.safe=(_d,at)=>at.y===84;assert.equal(spawnWildlife(f.args),true);assert.equal(f.spawned[0][1].y,84,'uneven terrain can be searched');
}
{
 const f=spawnFixture();f.args.preferred=()=>false;assert.equal(spawnWildlife(f.args),false,'vanilla biome borders remain strict');
 f.args.allowNearbyBiome=true;assert.equal(spawnWildlife(f.args),true,'realm can fall back at a biome boundary');
}
{
 const f=spawnFixture();let checks=0;f.args.preferred=()=>{checks++;return checks===2};f.args.allowNearbyBiome=true;
 assert.equal(spawnWildlife(f.args),true);assert.equal(checks,2,'prefer matching biome before a fallback');
}
{
 const f=spawnFixture();let calls=0;f.args.preferred=()=>false;f.args.allowNearbyBiome=true;
 f.args.safe=()=>++calls<=156;assert.equal(spawnWildlife(f.args),false,'fallback rechecked before placement');assert.equal(f.spawned.length,0);
}
// Execute the real integration function for each realm, using Bedrock stubs.
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=main.slice(main.indexOf('const wildlifeNaturalFloors='),main.indexOf("safeSub('world','after','entityHurt'",main.indexOf('function wildlifeTick(')));
const random=Object.create(Math);random.random=()=>.99;
function makeCtx(f,opts={}){
 const world={gameRules:{doMobSpawning:true},getTimeOfDay:()=>6000,getDifficulty:()=>opts.peaceful?Difficulty.Peaceful:Difficulty.Normal};
 const state={};const marks=[];
 const ctx={ns:'hakkai:',state:()=>state,system:{currentTick:40},num:()=>opts.quiet?1:0,world,
  seededWorlds:opts.seededWorlds,wildlife,wildlifeById:new Map(wildlife.map(x=>['hakkai:'+x.id,x])),wildlifeIndex:new Map(wildlife.map((x,i)=>[x.id,i])),
  Math:random,marked:()=>false,mark:(_p,k,i)=>marks.push([k,i]),pickRealmWildlife,spawnWildlife,safe:opts.safe??(()=>true),
  spawnRealmEnder:()=>false,spawnFushi:()=>false,isMoonlitNight:()=>false,fushiThresholds:()=>({chief:0,normal:0}),
  Difficulty,places,aspect:s=>s.theme??s.dim,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),coords:s=>({x:s.x+.5,y:89,z:s.z+.5}),families:{}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,world,state,marks};
}
for(let realm=0;realm<8;realm++){
 for(const peaceful of [false,true])for(const site of [undefined,places.find(s=>s.id===realm+1)]){
  const f=spawnFixture();f.p.location={x:500,y:90,z:500};f.d.id=`hakkai:realm_${realm}`;const {ctx,marks}=makeCtx(f,{peaceful});ctx.wildlifeTick(f.p,undefined,site);
  assert.equal(f.spawned.length,1,`realm ${realm}, peaceful ${peaceful}, site ${site?.id}`);
  const id=f.spawned[0][0].replace('hakkai:',''),mob=wildlife.find(x=>x.id===id);assert.equal(mob.dim,realm);
  if(peaceful)assert.notEqual(mob.temper,'hostile');assert.equal(marks[0][0],'wild_spawn_seen');
 }
}
{
 const f=spawnFixture(),{ctx,state}=makeCtx(f,{safe:()=>false});ctx.wildlifeTick(f.p,undefined,undefined);
 assert.equal(f.spawned.length,0);assert.equal(state.wildAt,200,'failed terrain attempt is retried, not marked');
}
{
 const f=spawnFixture(),{ctx,world}=makeCtx(f);world.gameRules.doMobSpawning=false;ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0);
 const g=spawnFixture(),q=makeCtx(g,{quiet:true});q.ctx.wildlifeTick(g.p,undefined,undefined);assert.equal(g.spawned.length,0);
}
{
 const f=spawnFixture(),{ctx}=makeCtx(f);f.d.getEntities=()=>Array.from({length:5},()=>({typeId:'hakkai:other',location:{x:10,y:90,z:10}}));
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0,'local cap');
}
{
 const f=spawnFixture();f.d.id='minecraft:overworld';const {ctx}=makeCtx(f);ctx.wildlifeTick(f.p,undefined,undefined);
 assert.equal(f.spawned.length,0,'no fallback alters vanilla worlds');
}
// Near arrival, prefer a non-hostile encounter instead of wasting a hostile
// draw on positions that the protection rules necessarily reject.
{
 const f=spawnFixture(),{ctx}=makeCtx(f);
 ctx.pickRealmWildlife=(entries,realm,seen,peaceful)=>entries.find(m=>m.dim===realm&&(peaceful?m.temper!=='hostile':m.temper==='hostile'));
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,1);
 const species=wildlife.find(m=>'hakkai:'+m.id===f.spawned[0][0]);assert.notEqual(species.temper,'hostile');
}
{
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};f.d.getBlock=()=>({typeId:'minecraft:oak_planks'});
 const {ctx}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0,'hostiles avoid non-natural floors');
}
{
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};const mob=wildlife.find(m=>m.dim===0&&m.temper==='passive');
 f.d.getEntities=()=>[{typeId:'hakkai:'+mob.id,location:{x:500,y:90,z:500}}];
 const {ctx}=makeCtx(f,{peaceful:true});ctx.pickRealmWildlife=(entries,realm,seen,peaceful)=>entries.find(m=>m.dim===realm&&(!peaceful||m.temper!=='hostile'));
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,1);assert.notEqual(f.spawned[0][0],'hakkai:'+mob.id,'choose another species if nearby duplicate');
}
assert.match(main,/if\(!isCreative\(p\)\|\|\/\^hakkai:realm_\[0-7\]\$\/.test\(p.dimension.id\)\)try\{wildlifeTick\(p,profile,site\);\}/,'creative may observe wildlife in the eight realms');
assert.match(main,/try\{profile=survey\(p\);\}catch\{\}/,'survey errors are isolated');
console.log('Wildlife: 8 realms, reserved/no-biome sites, peaceful, realm creative inclusion, multiplayer cap, slopes, biome fallback and safe refusal (mocked/static)');
