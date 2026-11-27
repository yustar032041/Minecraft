import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_spawn.js';
import {validWildlifeGround} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_ground.js';
import {pickRealmWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_selection.js';
import {wildlife,places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {Difficulty} from '@minecraft/server';
import {disallowHostileSpawn} from '../Hakkai_v7.1.0/BehaviorPack/scripts/hostile_spawn_rules.js';
function spawnFixture(){
 const spawned=[],players=[];
 const d={id:'hakkai:realm_0',getEntities:()=>[],getPlayers:()=>players,isChunkLoaded:()=>true,getLightLevel:()=>0,spawnEntity:(...x)=>spawned.push(x),getBiome:()=>({id:'minecraft:plains'}),getBlock:()=>({typeId:'minecraft:grass_block'})};
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
 const f=spawnFixture();f.args.safe=(_d,at)=>at.y===78;assert.equal(spawnWildlife(f.args),true);assert.equal(f.spawned[0][1].y,78,'deeper cave ledge can be searched');
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
 f.args.safe=()=>++calls<=396;assert.equal(spawnWildlife(f.args),false,'fallback rechecked before placement');assert.equal(f.spawned.length,0);
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
  Math:random,marked:()=>false,mark:(_p,k,i)=>marks.push([k,i]),pickRealmWildlife,spawnWildlife,validWildlifeGround:opts.confirm??(()=>true),safe:opts.safe??(()=>true),
  spawnRealmEnder:()=>false,spawnFushi:()=>false,isMoonlitNight:()=>false,fushiThresholds:()=>({chief:0,normal:0}),
  disallowHostileSpawn,travelSites:new Map(),FACTORY_VILLAGE_ID:59, Difficulty,places,aspect:s=>s.theme??s.dim,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),coords:s=>({x:s.x+.5,y:89,z:s.z+.5}),families:{}};
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
 assert.equal(f.spawned.length,0);assert.equal(state.wildAt,120,'failed terrain attempt is retried, not marked');
}
{
 const f=spawnFixture(),{ctx,world}=makeCtx(f);world.gameRules.doMobSpawning=false;ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0);
 const g=spawnFixture(),q=makeCtx(g,{quiet:true});q.ctx.wildlifeTick(g.p,undefined,undefined);assert.equal(g.spawned.length,0);
}
{
 const f=spawnFixture(),{ctx}=makeCtx(f);f.d.getEntities=()=>Array.from({length:14},()=>({typeId:'hakkai:other',location:{x:10,y:90,z:10}}));
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
// Direct sun / sky brightness must not suppress addon hostile candidates.
{
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};f.d.getLightLevel=()=>15;
 const {ctx}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,1,'sunlight alone is not a lamp');
}
{
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};f.d.getBlocks=(volume)=>({getBlockLocationIterator:()=>[{x:volume.from.x+7,y:volume.from.y+7,z:volume.from.z+7}][Symbol.iterator]()});
 f.d.getBlock=()=>({typeId:'minecraft:torch'});f.d.getBlockFromRay=()=>undefined;
 const {ctx}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0,'hostile rejected near torches');
}
{
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};
 const {ctx}=makeCtx(f,{seededWorlds:{biomeAt:()=>undefined,repeatSiteAt:()=>({id:59})}});
 ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0,'factory-copy candidates rejected');
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
assert.match(main,/if\(p.getGameMode\(\)!==GameMode.Spectator\)try\{wildlifeTick\(p,profile,site\);\}/,'creative may observe wildlife in all eligible dimensions');
assert.match(main,/try\{profile=survey\(p\);\}catch\{\}/,'survey errors are isolated');
console.log('Wildlife: 8 realms, reserved/no-biome sites, peaceful, realm creative inclusion, multiplayer cap, slopes, biome fallback and safe refusal (mocked/static)');
// The cap is checked at the actual candidate as well as around the player.
{
 const f=spawnFixture();let count=0;f.args.capacity=(_d,at)=>{count++;assert.notDeepEqual(at,f.p.location);return false;};
 assert.equal(spawnWildlife(f.args),false);assert.equal(count,4,'bounded checks in different candidate columns');assert.equal(f.spawned.length,0);
}
{
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};let candidateCheck=0;
 f.d.getEntities=opts=>{if(opts.closest===14){candidateCheck++;return Array.from({length:14},()=>({}));}return [];};
 const {ctx}=makeCtx(f);ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(candidateCheck,4);assert.equal(f.spawned.length,0);
}
// Integration: player vicinity may be below cap while one candidate's
// 32-block sphere is full and a different candidate's sphere is not.
{
 const f=spawnFixture();f.p.location={x:500,y:40,z:500};const checked=[];
 f.d.getEntities=opts=>{if(opts.closest===14){checked.push({...opts.location});return Array.from({length:checked.length===1?14:13},()=>({}));}return [];};
 const {ctx,marks}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);
 assert.equal(checked.length,2);assert.notDeepEqual([checked[0].x,checked[0].z],[checked[1].x,checked[1].z]);
 assert.equal(f.spawned.length,1);assert.deepEqual(f.spawned[0][1],checked[1]);assert.equal(marks[0][0],'wild_spawn_seen');
}
// These naturally occurring underground blocks are accepted for hostile
// candidates, while crafted blocks and hazard/air checks are still separate.
for(const floor of ['minecraft:granite','minecraft:diorite','minecraft:dripstone_block','minecraft:deepslate_diamond_ore','hakkai:ore_3','hakkai:windworn_sandstone','hakkai:frost_stone','hakkai:aether_stone']){
 const f=spawnFixture();f.p.location={x:500,y:40,z:500};f.d.getBlock=()=>({typeId:floor});
 const {ctx}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,1,floor);
}
{
 const f=spawnFixture();f.p.location={x:500,y:40,z:500};f.d.getBlock=()=>({typeId:'minecraft:stone_bricks'});
 const {ctx}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0,'constructed stone bricks do not qualify');
}
// Positions ruled out by a nearby player skip costly light scans entirely.
{
 const f=spawnFixture();let inspections=0;f.players.push({});f.args.avoid=()=>{inspections++;return false;};
 assert.equal(spawnWildlife(f.args),false);assert.equal(inspections,0);assert.equal(f.spawned.length,0);
}
// A candidate in a built-up realm floor is rejected before the 15-cube light
// search; valid natural floors still check light and all existing protections.
{
 const f=spawnFixture();f.p.location={x:500,y:40,z:500};f.d.getBlock=()=>({typeId:'minecraft:stone_bricks'});
 let lightScans=0;f.d.getBlocks=()=>{lightScans++;return {getBlockLocationIterator:()=>[][Symbol.iterator]()}};
 const {ctx}=makeCtx(f);ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,0);assert.equal(lightScans,0);
 f.d.getBlock=()=>({typeId:'minecraft:stone'});ctx.system.currentTick=200;ctx.wildlifeTick(f.p,undefined,undefined);
 assert.equal(f.spawned.length,1);assert.ok(lightScans>0);
}

// Execute the actual terrain precheck and final ground check together through
// wildlifeTick; this synthetic level cave is not a Bedrock terrain simulation.
for(const waterlogged of [false,true]){
 const f=spawnFixture();f.p.location={x:500,y:40,z:500};
 f.d.getBlock=pos=>pos.y===39?{typeId:'minecraft:deepslate',isAir:false,isLiquid:false,isWaterlogged:waterlogged,isLiquidBlocking:()=>true,location:{...pos}}:
  {typeId:'minecraft:air',isAir:true,isLiquid:false,isWaterlogged:false};
 f.d.getBlocks=()=>({getBlockLocationIterator:()=>[][Symbol.iterator]()});
 f.d.getBlockFromRay=from=>({block:{location:{x:Math.floor(from.x),y:39,z:Math.floor(from.z)}},face:'Up',faceLocation:{y:1}});
 const {ctx}=makeCtx(f,{confirm:validWildlifeGround});ctx.LiquidType={Water:'water'};
 const floorStart=main.indexOf('function safeFloor('),floorEnd=main.indexOf('function campfireNearby(',floorStart);
 const safeStart=main.indexOf('function safe(d,l){'),safeEnd=main.indexOf('function safeNear(',safeStart);
 vm.runInContext(main.slice(floorStart,floorEnd)+main.slice(safeStart,safeEnd),ctx);
 ctx.pickRealmWildlife=(entries,realm)=>entries.find(m=>m.dim===realm&&m.temper==='hostile');
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,waterlogged?0:1,`waterlogged=${waterlogged}`);
 if(!waterlogged)assert.equal(f.spawned[0][1].y,40);
}

// Neighbor-biome fallback: a failed footprint on the first ledge must not
// permanently mask a second ledge in the same column. No extra ground/density
// probes beyond the existing per-attempt limits.
{
 const f=spawnFixture();const checks=[];let caps=0;
 f.args.allowNearbyBiome=true;f.args.preferred=()=>false;
 f.args.safe=(_d,at)=>at.y===90||at.y===89;
 f.args.confirm=(_d,at)=>{checks.push({...at});return at.y===89;};
 f.args.capacity=()=>{caps++;return true};
 assert.equal(spawnWildlife(f.args),true);assert.equal(f.spawned[0][1].y,89);
 assert.ok(checks.length<=24);assert.equal(caps,1);
 assert.ok(checks.slice(0,12).every(at=>at.y===90),'first try different columns');
}
// Connected highway and atlas get a bounded local fallback in either mode;
// the outer main loop includes survival/adventure/creative, not spectator.
for(const realm of [8,9])for(const peaceful of [false,true]){
 const f=spawnFixture();f.p.location={x:500,y:90,z:500};f.d.id=`hakkai:realm_${realm}`;
 const {ctx}=makeCtx(f,{peaceful});ctx.wildlifeTick(f.p,undefined,undefined);
 assert.equal(f.spawned.length,1,`extra realm ${realm}, peaceful ${peaceful}`);
 const mob=wildlife.find(x=>'hakkai:'+x.id===f.spawned[0][0]);assert.equal(mob.dim,0);if(peaceful)assert.notEqual(mob.temper,'hostile');
}

{
 const f=spawnFixture();f.d.id='hakkai:realm_8';f.p.location={x:500,y:90,z:500};
 const {ctx}=makeCtx(f);ctx.families={ocean:{mode:'water',species:'wild_6_0'}};
 ctx.wildlifeTick(f.p,undefined,{id:200,kind:'atlas',family:'ocean',theme:6,x:700,z:700,dim:8});
 assert.equal(f.spawned.length,1,'water-themed atlas is not unconditionally excluded; spawn still needs a valid land floor');
 assert.equal(f.spawned[0][0],'hakkai:wild_6_0');
}
{
 const f=spawnFixture();f.d.id='hakkai:realm_9';f.p.location={x:500,y:90,z:500};
 const {ctx}=makeCtx(f);ctx.wildlifeTick(f.p,undefined,{id:512,kind:'linked',theme:4,x:700,z:700,dim:9});
 const mob=wildlife.find(m=>'hakkai:'+m.id===f.spawned[0]?.[0]);assert.equal(mob?.dim,4,'connected highway uses local realm theme');
}
{
 const f=spawnFixture();f.d.id='hakkai:warden_arena';f.p.location={x:0,y:90,z:0};const {ctx}=makeCtx(f);
 ctx.wildlifeTick(f.p,undefined,undefined);assert.equal(f.spawned.length,1);
 const m=wildlife.find(x=>'hakkai:'+x.id===f.spawned[0][0]);assert.equal(m.dim,7);assert.notEqual(m.temper,'hostile');
 assert.match(main,/if\(!p.dimension.getEntities\(\{type:ns\+'time_warden',closest:1\}\).length\)wildlifeTick\(p,undefined,undefined\)/,'arena scan is skipped while the warden is present');
}
