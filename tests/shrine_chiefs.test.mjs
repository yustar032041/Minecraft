import assert from 'node:assert/strict';
import {setupShrineChiefs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/shrine_chiefs.js';
const home={cx:3,cz:-2,y:80},stateKey='hakkai:shrine_chief_v1_3_-2';
function fixture(){
 const data=new Map(),reports=[],spawned=[],players=[];let now=100,loaded=true,blocked=false,existing=[],failSpawn=false,seq=0;
 const dimension={id:'hakkai:realm_7',getPlayers:()=>players,getEntities:()=>existing,isChunkLoaded:()=>loaded,
  getBlock:p=>({typeId:p.y===80?'minecraft:grass_block':blocked?'minecraft:stone':'minecraft:air',isLiquid:false,isAir:p.y!==80&&!blocked}),
  spawnEntity:(type,at,options)=>{if(failSpawn)throw Error('spawn failed');const e=entity(`spawn-${++seq}`);spawned.push({e,type,at,options});return e;}};
 const p={id:'p',isValid:true,dimension,location:{x:88,y:81,z:-24}};
 const world={gameRules:{doMobSpawning:true},getAbsoluteTime:()=>now,getDynamicProperty:k=>data.get(k),setDynamicProperty:(k,v)=>data.set(k,v)};
 const ctrl=()=>setupShrineChiefs({world,report:(...e)=>reports.push(e)});
 return {data,reports,spawned,players,dimension,p,world,ctrl,setNow:v=>now=v,setLoaded:v=>loaded=v,setBlocked:v=>blocked=v,setExisting:v=>existing=v,setFailSpawn:v=>failSpawn=v};
}
function entity(id){const data=new Map();return {id,isValid:true,typeId:'hakkai:fushi_chief',setDynamicProperty:(k,v)=>data.set(k,v),getDynamicProperty:k=>data.get(k)};}
{
 const f=fixture(),a=entity('a'),c=f.ctrl();assert.equal(c.created(a,home),true);assert.equal(c.created(entity('other'),home),false);
 assert.equal(JSON.parse(f.data.get(stateKey)).status,'alive');
 c.onDeath(entity('unknown'));assert.equal(JSON.parse(f.data.get(stateKey)).status,'alive');
 c.onDeath(a);assert.equal(JSON.parse(f.data.get(stateKey)).status,'dead');
 f.setNow(24099);c.tick(f.p,100);assert.equal(f.spawned.length,0);
 f.setNow(24100);c.tick(f.p,200);assert.equal(f.spawned.length,1);
 assert.deepEqual(f.spawned[0].options,{initialPersistence:true});assert.equal(JSON.parse(f.data.get(stateKey)).status,'alive');
 c.tick({...f.p,id:'q'},200);assert.equal(f.spawned.length,1,'multiplayer never doubles spawn');
}
// Reload while alive: only a correctly identified loaded entity can report death.
{
 const f=fixture(),a=entity('a');f.ctrl().created(a,home);
 const reloaded=f.ctrl();reloaded.onDeath(a);assert.equal(JSON.parse(f.data.get(stateKey)).status,'alive');
 reloaded.onLoad(a);reloaded.onDeath(a);assert.equal(JSON.parse(f.data.get(stateKey)).status,'dead');
 f.setNow(24100);reloaded.tick(f.p,100);assert.equal(f.spawned.length,1);
}
for(const fail of [f=>f.setLoaded(false),f=>f.setBlocked(true),f=>f.setExisting([{}]),f=>f.players.push({}),f=>f.world.gameRules.doMobSpawning=false]){
 const f=fixture(),a=entity('a'),c=f.ctrl();c.created(a,home);c.onDeath(a);f.setNow(24100);fail(f);c.tick(f.p,100);
 assert.equal(f.spawned.length,0);assert.equal(JSON.parse(f.data.get(stateKey)).status,'dead');
}
// A failed spawn leaves an explicit reservation, never an unbounded retry.
{
 const f=fixture(),a=entity('a'),c=f.ctrl();c.created(a,home);c.onDeath(a);f.setNow(24100);f.setFailSpawn(true);c.tick(f.p,100);
 assert.equal(JSON.parse(f.data.get(stateKey)).status,'reserved');f.setFailSpawn(false);c.tick(f.p,200);assert.equal(f.spawned.length,0);
}
console.log('Shrine chief: recorded deaths, cooldown, reload, multiplayer, obstruction and fail-closed spawning (mocked)');

// Unload is not a death; reloading the same persistent entity restores tracking.
{
 const f=fixture(),a=entity('a'),c=f.ctrl();c.created(a,home);c.onRemove(a.id);c.onDeath(a);
 assert.equal(JSON.parse(f.data.get(stateKey)).status,'alive');
 c.onLoad(a);c.onDeath(a);assert.equal(JSON.parse(f.data.get(stateKey)).status,'dead');
}
