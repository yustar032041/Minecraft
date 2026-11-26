import assert from 'node:assert/strict';
import {spawnRareEncounter,fushiThresholds} from '../Hakkai_v7.1.0/BehaviorPack/scripts/rare_encounters.js';
function fixture(){
 const spawned=[],checks=[];
 const d={getEntities:()=>[],isChunkLoaded:()=>true,getPlayers:()=>[],getBlock:()=>({isAir:true}),spawnEntity:(id,at,opt)=>spawned.push({id,at,opt})};
 const p={dimension:d,location:{x:0,y:90,z:0}};
 const safe=(dim,pos)=>{checks.push(pos);return true};
 return {d,p,spawned,checks,safe};
}
{
 const f=fixture();assert.equal(spawnRareEncounter(f.p,'hakkai:ender_2',0,f.safe,{family:'hakkai_realm_ender'}),true);
 assert.equal(f.spawned.length,1);assert.equal(f.spawned[0].id,'hakkai:ender_2');
 assert.equal(f.spawned[0].opt.spawnEvent,'hakkai:wild');
 assert.ok(Math.hypot(f.spawned[0].at.x,f.spawned[0].at.z)>=11);
}
{
 const f=fixture();assert.equal(spawnRareEncounter(f.p,'hakkai:fushi_chief',0,f.safe,{chief:true}),true);
 assert.ok(f.checks.length>=10,'whole footprint checked');
}
for(const disable of [
 f=>f.d.getEntities=()=>[{}],
 f=>f.d.isChunkLoaded=()=>false,
 f=>f.d.getPlayers=()=>[{}],
 f=>f.d.getBlock=()=>({isAir:false}),
 f=>f.safe=()=>false,
 f=>f.d.spawnEntity=()=>{throw Error('unloaded')}
]){
 const f=fixture();disable(f);assert.equal(spawnRareEncounter(f.p,'hakkai:ender_0',0,f.safe,{family:'hakkai_realm_ender'}),false);assert.equal(f.spawned.length,0);
}
{
 const f=fixture();f.safe=(d,p)=>p.x%1===.5&&Math.floor(p.x)!==17;
 assert.equal(spawnRareEncounter(f.p,'hakkai:fushi_chief',0,f.safe,{chief:true}),true);
 assert.ok(f.spawned[0].at.x!==18.5,'blocked footprint retried elsewhere');
}
console.log('Rare encounter spawn: local cap, unloaded/occupied space, 3-block headroom and chief footprint OK (simulated)');

const outside=fushiThresholds(false,false),grove=fushiThresholds(true,false),night=fushiThresholds(true,true);
assert.ok(outside.chief<grove.chief&&grove.chief<night.chief);
assert.ok(outside.normal<grove.normal&&grove.normal<night.normal&&night.normal<1);
{
 const f=fixture();let calls=0;f.d.getEntities=opts=>{calls++;return opts.location===f.p.location?[]:[{}]};
 assert.equal(spawnRareEncounter(f.p,'hakkai:ender_0',0,f.safe,{family:'hakkai_realm_ender'}),false);
 assert.equal(calls,2);assert.equal(f.spawned.length,0,'candidate local cap blocks overlap with other players encounters');
}
