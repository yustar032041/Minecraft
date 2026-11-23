// Run with: node --experimental-loader ./tests/minecraft_stub_loader.mjs --experimental-default-type=module tests/seeded_worlds_sim.test.mjs
// This simulates the minimal block API, not Bedrock import, rendering or physics.
import assert from 'node:assert/strict';
import { setupSeededWorlds } from '../Hakkai_v7.1.0/BehaviorPack/scripts/seeded_worlds.js';
const key=(x,y,z)=>`${x},${y},${z}`;
class FakeDimension{
 constructor(realm,cx,cz){this.id=`hakkai:realm_${realm}`;this.cx=cx;this.cz=cz;this.blocks=new Map();this.writes=[];this.inventories=new Map();this.spawned=[];}
 getEntities(){return [];}
 spawnEntity(type,at){this.spawned.push({type,at});}
 isChunkLoaded(p){return Math.floor(p.x/16)===this.cx&&Math.floor(p.z/16)===this.cz;}
 getPlayers(){return this.players??[];}
 getBlock(p){
  const k=key(p.x,p.y,p.z),type=this.blocks.get(k)??'minecraft:air';
  return {typeId:type,isAir:type==='minecraft:air',isSolid:type!=='minecraft:air'&&type!=='minecraft:water',isLiquid:type==='minecraft:water',
   getComponent:(name)=>{if(type!=='minecraft:barrel'||name!=='minecraft:inventory')return undefined;
    if(!this.inventories.has(k))this.inventories.set(k,new Map());const items=this.inventories.get(k);
    return {container:{setItem:(slot,item)=>items.set(slot,item)}};}};
 }

 containsBlock(volume){
  const {from:a,to:b}=volume;
  for(const [k,type] of this.blocks){
   if(type==='minecraft:air')continue;
   const [x,y,z]=k.split(',').map(Number);
   if(x>=a.x&&x<=b.x&&y>=a.y&&y<=b.y&&z>=a.z&&z<=b.z)return true;
  }
  return false;
 }
 setBlockType(p,type){
  assert.ok(p.x>=this.cx*16&&p.x<this.cx*16+16,`out of chunk x ${JSON.stringify(p)}`);
  assert.ok(p.z>=this.cz*16&&p.z<this.cz*16+16,`out of chunk z ${JSON.stringify(p)}`);
  assert.ok(p.y>=40&&p.y<=152,`out of envelope y ${JSON.stringify(p)}`);
  this.writes.push({x:p.x,y:p.y,z:p.z,type});this.blocks.set(key(p.x,p.y,p.z),type);
 }
 setBlockPermutation(p,perm){this.setBlockType(p,perm.type);}
 fillBlocks(v,type){
  for(let x=v.from.x;x<=v.to.x;x++)for(let y=v.from.y;y<=v.to.y;y++)for(let z=v.from.z;z<=v.to.z;z++)this.setBlockType({x,y,z},type);
 }
}
function fixture(realm,cx,cz,places=[],buildSite){
 const dimension=new FakeDimension(realm,cx,cz),props=new Map();
 const player={id:'player',dimension,location:{x:cx*16+8,y:210,z:cz*16+8},sendMessage(){}};
 const world={seed:731,gameRules:{doMobSpawning:true},getAllPlayers:()=>[player],getDynamicProperty:k=>props.get(k.replace(/^hakkai:/,''))};let job;
 const system={currentTick:20,runJob(generator){assert.equal(job,undefined);job=generator;}};
 const num=(entity,key,or=0)=>props.get(key)??or;
 const property=(entity,key,value)=>props.set(key,value);
 const reports=[];
 const generator=setupSeededWorlds({ns:'hakkai:',world,system,num,property,report:(...x)=>reports.push(x),places,biomes:{},families:{},buildSite});
 const run=()=>{while(job&&!job.next().done){}job=undefined;};
 const step=n=>{for(let i=0;i<n;i++){assert.ok(job);assert.equal(job.next().done,false);}};
 return {dimension,props,player,world,system,generator,reports,run,step,job:()=>job};
}
for(let realm=0;realm<8;realm++){
 const f=fixture(realm,100,100);f.generator.tick(f.player,20);assert.ok(f.job());f.run();
 assert.equal(f.props.get(`seed_land_${realm}_100_100_v1`),1);
 assert.equal(f.reports.length,0);
 if(realm!==6)assert.ok(f.dimension.writes.length>3000,`not enough ground in realm ${realm}`);
 const prev=f.dimension.writes.length;f.system.currentTick=41;f.generator.tick(f.player,41);
 assert.equal(f.job(),undefined);assert.equal(f.dimension.writes.length,prev);
}
// Pre-existing block at the start of a chunk stops the whole generation.
{
 const f=fixture(0,100,100);f.dimension.blocks.set(key(1605,80,1605),'minecraft:diamond_block');
 f.generator.tick(f.player,20);f.run();assert.equal(f.dimension.writes.length,0);
 assert.equal(f.dimension.getBlock({x:1605,y:80,z:1605}).typeId,'minecraft:diamond_block');
 assert.equal(f.props.get('seed_land_0_100_100_skip_v1'),1);
 assert.equal(f.props.has('seed_land_0_100_100_v1'),false);
}
// A player building after the initial scan is protected when its column is reached.
{
 const f=fixture(0,100,100);f.generator.tick(f.player,20);f.step(10);
 const pos={x:1602,y:88,z:1605};f.dimension.blocks.set(key(pos.x,pos.y,pos.z),'minecraft:diamond_block');
 f.run();assert.equal(f.dimension.getBlock(pos).typeId,'minecraft:diamond_block');
 assert.equal(f.props.get('seed_land_0_100_100_skip_v1'),1);
 assert.equal(f.props.has('seed_land_0_100_100_v1'),false);
 assert.equal(f.reports.length,0);
}
// The old deep landmark was centred on the chunk boundary; no write may
// touch the neighbouring chunk, even with a neighbouring player's build.
{
 const f=fixture(0,34,-10);const adjacent=key(543,100,-160);f.dimension.blocks.set(adjacent,'minecraft:diamond_block');
 f.generator.tick(f.player,20);f.run();assert.equal(f.dimension.blocks.get(adjacent),'minecraft:diamond_block');
 assert.equal(f.props.get('seed_land_0_34_-10_v1'),1);assert.equal(f.reports.length,0);
}
// Avoid generating solid rock around a player who enters the current column.
{
 const f=fixture(0,100,100);f.generator.tick(f.player,20);f.step(10);
 f.dimension.players=[{location:{x:1600.5,y:85,z:1610.5}}];
 f.run();assert.equal(f.props.get('seed_land_0_100_100_skip_v1'),1);
 assert.equal(f.props.has('seed_land_0_100_100_v1'),false);
 assert.equal(f.dimension.writes.some(w=>w.x===1600&&w.z===1610),false);
}
// Previously completed chunks are never rebuilt, even when their data differs.
{
 const f=fixture(0,100,100);f.props.set('seed_land_0_100_100_v1',1);
 f.dimension.blocks.set(key(1602,86,1602),'minecraft:diamond_block');
 f.generator.tick(f.player,20);assert.equal(f.job(),undefined);assert.equal(f.dimension.writes.length,0);
}
// An interrupted job must not overwrite its own partial chunk or mark it done
// on retry. A partial chunk is conservatively protected rather than resumed.
{
 const f=fixture(1,100,100);f.generator.tick(f.player,20);f.step(12);
 const original=f.dimension.setBlockType.bind(f.dimension);let fail=true;
 f.dimension.setBlockType=(p,type)=>{if(fail){fail=false;throw Error('simulated unload');}return original(p,type);};
 f.run();assert.equal(f.reports.length,1);assert.equal(f.props.has('seed_land_1_100_100_v1'),false);
 const partial=f.dimension.writes.length;assert.ok(partial>0);
 f.system.currentTick=241;f.generator.tick(f.player,241);assert.ok(f.job());f.run();
 assert.equal(f.dimension.writes.length,partial);assert.equal(f.props.get('seed_land_1_100_100_skip_v1'),1);
}
// The old central connection stays reserved. New frontier chunks can generate.
for(const [cx,cz] of [[2,0]]){
 const f=fixture(0,cx,cz);f.generator.tick(f.player,20);assert.equal(f.job(),undefined);
}
// Find a naturally planned pond, then check that the water is enclosed and
// that a late player placement cancels water rather than being replaced.
{
 let found;
 for(let cx=100;cx<160&&!found;cx++){
  const f=fixture(0,cx,100);f.generator.tick(f.player,20);f.run();
  const water=f.dimension.writes.filter(w=>w.type==='minecraft:water');
  if(water.length)found={f,water,cx};
 }
 assert.ok(found,'expected at least one bounded pond in sampled chunks');
 const {f,water,cx}=found;
 for(const cell of water){
  const below=f.dimension.getBlock({x:cell.x,y:cell.y-1,z:cell.z});
  assert.ok(below.isSolid||below.typeId==='minecraft:water','no unsupported water');
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const side=f.dimension.getBlock({x:cell.x+dx,y:cell.y,z:cell.z+dz});
   assert.ok(side.isSolid||side.typeId==='minecraft:water','pond wall contains fluid');
  }
 }
 const test=fixture(0,cx,100);test.generator.tick(test.player,20);test.step(256);
 const pos=water[0];test.dimension.blocks.set(key(pos.x,pos.y,pos.z),'minecraft:diamond_block');
 test.run();assert.equal(test.dimension.getBlock(pos).typeId,'minecraft:diamond_block');
 assert.equal(test.dimension.writes.filter(w=>w.type==='minecraft:water').length,0);
 assert.equal(test.props.get(`seed_land_0_${cx}_100_v1`),1);
}
// A naturally selected ruin can contain finite survival supplies. A player
// object placed at the same destination before decoration must not be replaced.
{
 let found;
 for(let cx=101;cx<145&&!found;cx++){
  const f=fixture(0,cx,110);f.generator.tick(f.player,20);f.run();
  const barrel=f.dimension.writes.find(w=>w.type==='minecraft:barrel');
  if(barrel)found={f,barrel,cx};
 }
 assert.ok(found,'expected a supply ruin in sampled chunks');
 const {f,barrel,cx}=found,items=f.dimension.inventories.get(key(barrel.x,barrel.y,barrel.z));
 assert.ok(items?.get(0)?.typeId.startsWith('hakkai:shard_'));assert.equal(items.get(1)?.typeId,'minecraft:bread');
 const test=fixture(0,cx,110);test.generator.tick(test.player,20);test.step(256);
 test.dimension.blocks.set(key(barrel.x,barrel.y,barrel.z),'minecraft:diamond_block');
 test.run();assert.equal(test.dimension.getBlock(barrel).typeId,'minecraft:diamond_block');
 assert.equal(test.dimension.writes.some(w=>w.type==='minecraft:barrel'),false);
}
// A fresh grove grows bamboo on its own grass; no late player block at a
// candidate position may be overwritten. This mock does not model block ticks.
{
 let found;
 for(let cx=100;cx<125&&!found;cx++){
  const f=fixture(7,cx,110);f.generator.tick(f.player,20);f.run();
  const bamboo=f.dimension.writes.filter(w=>w.type==='minecraft:bamboo');
  if(bamboo.length)found={f,bamboo,cx};
 }
 assert.ok(found,'expected a bamboo grove in sampled chunks');
 const {f,bamboo,cx}=found;
 // Old completed chunks do not gain a fictitious grove flag on upgrade.
 const old=fixture(7,cx,110);old.props.set(`seed_land_7_${cx}_110_v1`,1);
 assert.equal(old.generator.isMoonGrove(bamboo[0]),false);
 const plant=bamboo[0];assert.equal(f.dimension.getBlock({x:plant.x,y:plant.y-1,z:plant.z}).typeId,'minecraft:grass_block');
 assert.equal(f.generator.isMoonGrove(plant),true);
 const test=fixture(7,cx,110);test.generator.tick(test.player,20);test.step(256);
 test.dimension.blocks.set(key(plant.x,plant.y,plant.z),'minecraft:diamond_block');
 test.run();assert.equal(test.dimension.getBlock(plant).typeId,'minecraft:diamond_block');
 assert.ok(!test.dimension.writes.some(w=>w.x===plant.x&&w.y===plant.y&&w.z===plant.z&&w.type==='minecraft:bamboo'));
}
console.log('Simulated terrain jobs: 8 realms, pre-existing/mid-job protection, chunk bounds and completion markers OK');

// A real seeded grove candidate can produce the shrine without allowing bamboo
// in its 9x9 footprint. This checks integration, not engine block physics.
{
 const f=fixture(7,91,121);f.generator.tick(f.player,20);f.run();
 assert.equal(f.props.get('seed_land_7_91_121_v1'),1);
 assert.equal(f.dimension.spawned.filter(e=>e.type==='hakkai:fushi_chief').length,1);
 const centre=f.dimension.spawned[0].at;
 assert.equal(f.generator.isMoonGrove(centre),true);
 assert.ok(f.dimension.writes.some(w=>w.type==='hakkai:timeglass'&&Math.abs(w.x-centre.x)<5));
 assert.ok(f.dimension.writes.filter(w=>w.type==='minecraft:bamboo').every(w=>Math.abs(w.x-(91*16+8))>4||Math.abs(w.z-(121*16+8))>4));
 assert.equal(f.reports.length,0);
}
console.log('Seeded moon shrine: real seed candidate, chief, grove flag and bamboo exclusion (mocked)');

// Site 29 straddles this chunk: it must be generated before surrounding
// terrain, then existing structure columns must never be overwritten.
{
 const site={id:29,dim:0,x:224,z:128,size:51},keyDone='seed_land_0_12_6_v1';
 let f=fixture(0,12,6,[site]);f.generator.tick(f.player,20);assert.equal(f.job(),undefined,'unbuilt site keeps entire border chunk reserved');
 f=fixture(0,12,6,[site]);f.props.set('built_29',1);f.props.set('natural_join_29_v1',1);
 const existing=key(200,87,104);f.dimension.blocks.set(existing,'minecraft:diamond_block');f.generator.tick(f.player,20);assert.ok(f.job());f.run();
 assert.equal(f.props.get(keyDone),1);assert.equal(f.dimension.blocks.get(existing),'minecraft:diamond_block');
 assert.equal(f.dimension.writes.some(w=>w.x===200&&w.z===104),false,'entire occupied column preserved');
 assert.ok(f.dimension.writes.some(w=>w.x<199),'terrain reaches outside site');
 assert.ok(f.dimension.writes.some(w=>w.x>=199&&w.z>=103),'fresh site receives only empty connecting columns');
 assert.ok(f.dimension.writes.filter(w=>w.x===199&&w.z===103).some(w=>w.y===87),'site join meets nominal elevation');
 // Legacy structures have no join marker: even empty columns remain untouched.
 f=fixture(0,12,6,[site]);f.props.set('built_29',1);f.generator.tick(f.player,20);f.run();
 assert.ok(f.dimension.writes.length>0);assert.equal(f.dimension.writes.some(w=>w.x>=199&&w.z>=103),false,'old site remains unchanged');
 // Any exterior build aborts this whole chunk, including the site interior.
 f=fixture(0,12,6,[site]);f.props.set('built_29',1);f.props.set('natural_join_29_v1',1);f.dimension.blocks.set(key(194,90,98),'minecraft:diamond_block');
 f.generator.tick(f.player,20);f.run();assert.equal(f.dimension.writes.length,0);assert.equal(f.props.get('seed_land_0_12_6_skip_v1'),1);
 // A player may place a block after the initial scan: a site column is
 // skipped, while a late block outside the site aborts the rest of the chunk.
 f=fixture(0,12,6,[site]);f.props.set('built_29',1);f.props.set('natural_join_29_v1',1);f.generator.tick(f.player,20);f.step(1);
 const late=key(207,87,110);f.dimension.blocks.set(late,'minecraft:diamond_block');f.run();assert.equal(f.dimension.blocks.get(late),'minecraft:diamond_block');assert.equal(f.dimension.writes.some(w=>w.x===207&&w.z===110),false);
 f=fixture(0,12,6,[site]);f.props.set('built_29',1);f.props.set('natural_join_29_v1',1);f.generator.tick(f.player,20);f.step(1);
 const lateOuter=key(198,90,110);f.dimension.blocks.set(lateOuter,'minecraft:diamond_block');f.run();assert.equal(f.dimension.blocks.get(lateOuter),'minecraft:diamond_block');assert.equal(f.props.get('seed_land_0_12_6_skip_v1'),1);
 // Previous bulk frontier generation is reserved for compatibility.
 f=fixture(0,18,0);f.props.set('frontier_land_0_prepared_v1',1);f.generator.tick(f.player,20);assert.equal(f.job(),undefined);
 f=fixture(0,18,0);f.generator.tick(f.player,20);assert.ok(f.job(),'new frontier belongs to seed generator');f.run();assert.equal(f.props.get('seed_land_0_18_0_v1'),1);
}
console.log('Natural site chunk joins, protected old structures, collisions and frontier migration (mocked)');

// Viewport scanning schedules a site before any of its reserved terrain chunks,
// deduplicates in-flight jobs, and never places a structure around a player.
{
 let resolveSite,calls=0;
 const site={id:29,dim:0,x:200,z:168,size:45};
 const f=fixture(0,10,10,[site],()=>{calls++;return new Promise(resolve=>{resolveSite=resolve;});});
 f.dimension.players=[f.player];f.generator.tick(f.player,20);await Promise.resolve();assert.equal(calls,1);
 f.system.currentTick=41;f.generator.tick(f.player,41);await Promise.resolve();assert.equal(calls,1);
 if(f.job())f.run();resolveSite();await new Promise(resolve=>setTimeout(resolve,0));
 f.system.currentTick=1300;f.player.location.x=200;f.generator.tick(f.player,1300);await Promise.resolve();assert.equal(calls,1,'player in footprint defers placement');
}
console.log('seeded viewport site scheduling and player/in-flight protection (mocked)');

// Legacy central connection remains reserved, but a relocated site must not
// prevent the new chunk generator from filling the old connection forever.
{
 let f=fixture(1,2,0);f.generator.tick(f.player,20);assert.ok(f.job());f.run();
 f=fixture(1,2,0);f.props.set('built_20',1);f.generator.tick(f.player,20);assert.equal(f.job(),undefined);
 f=fixture(1,2,0);f.props.set('built_20',1);f.props.set('natural_site_plan_20_v2','{"x":-400,"z":600}');f.generator.tick(f.player,20);assert.ok(f.job());f.run();
 f=fixture(1,2,0);f.props.set('forest_terrain_v1',1);f.generator.tick(f.player,20);assert.equal(f.job(),undefined);
}
console.log('legacy central terrain and relocated-site migration (mocked)');
// A new sky-site branch produces a walkable-width strip in an otherwise
// normal chunk. The same chunk still refuses to touch existing builds.
{
 const site={id:43,dim:6,x:350,z:120,size:51};
 let f=fixture(6,25,7,[site]);f.props.set('built_43',1);f.props.set('natural_join_43_v1',1);
 f.generator.tick(f.player,20);assert.ok(f.job());f.run();
 for(let z=118;z<=122;z++){
  const road=f.dimension.writes.filter(w=>w.x===400&&w.z===z&&w.type==='minecraft:grass_block');
  // Top palette varies by biome; the topmost solid column itself is decisive.
  const column=f.dimension.writes.filter(w=>w.x===400&&w.z===z);assert.ok(column.length,`cloud-route gap at z=${z}`);
  const top=Math.max(...column.map(w=>w.y));assert.ok(top>=87);void road;
  for(let y=top+1;y<=top+3;y++)assert.equal(f.dimension.getBlock({x:400,y,z}).isAir,true,'no decoration in road headroom');
 }
 f=fixture(6,25,7,[site]);f.props.set('built_43',1);f.props.set('natural_join_43_v1',1);
 f.dimension.blocks.set(key(400,90,120),'minecraft:diamond_block');f.generator.tick(f.player,20);f.run();
 assert.equal(f.dimension.writes.length,0);assert.equal(f.dimension.blocks.get(key(400,90,120)),'minecraft:diamond_block');
}
console.log('Sky site route generation and pre-existing block protection (mocked)');
// Find a real seeded candidate among the new larger buildings, then place a
// player block after the 256 terrain columns but before decorations. The
// entire building must be abandoned rather than overwriting that block.
{
 let seedHash=2166136261;for(const c of '731')seedHash=Math.imul(seedHash^c.charCodeAt(0),16777619)>>>0;
 function hash(x,z,r,salt=0){
  let h=(seedHash^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca6b)^Math.imul(r+1,0xc2b2ae35)^salt)>>>0;
  h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;return ((h^(h>>>16))>>>0)/4294967295;
 }
 let found;
 for(let cx=100;cx<260&&!found;cx++){
  const cz=110,r=0,variant=Math.min(9,Math.floor(hash(cx,cz,r,733)*10));
  if(hash(cx,cz,r,701)>=.32||variant<6)continue;
  const f=fixture(r,cx,cz);f.generator.tick(f.player,20);f.run();
  const barrel=f.dimension.writes.find(w=>w.type==='minecraft:barrel');if(barrel)found={cx,cz,barrel};
 }
 assert.ok(found,'a new building can be placed on a real seeded chunk');
 const {cx,cz,barrel}=found,f=fixture(0,cx,cz);f.generator.tick(f.player,20);f.step(256);
 f.dimension.blocks.set(key(barrel.x,barrel.y,barrel.z),'minecraft:diamond_block');f.run();
 assert.equal(f.dimension.getBlock(barrel).typeId,'minecraft:diamond_block');
 assert.equal(f.dimension.writes.some(w=>w.type==='minecraft:barrel'),false);
 assert.equal(f.reports.length,0);
}
console.log('New seeded building placement and late player block protection (mocked)');
