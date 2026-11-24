import assert from 'node:assert/strict';
import {bearingState,setBearingMode,bearingStep,bearingAutoTick,armBearing} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_bearing.js';
import {gantryStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_gantry.js';
import {PAYLOAD} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_motion.js';
const key=p=>`${p.x},${p.y},${p.z}`,P=(x,y,z)=>({x,y,z});
const perm=(typeId,states={})=>({typeId,type:{id:typeId},states,getState:k=>states[k],withState:(k,v)=>perm(typeId,{...states,[k]:v})});
function fixture(type='bearing'){
 const cells=new Map(),entities=[];let calls=0,failAt=0;
 const d={id:'d',isChunkLoaded:p=>!d.unloaded?.has(key(p)),getEntities:()=>entities,getBlock:p=>{
  const k=key(p);if(!cells.has(k))cells.set(k,perm('minecraft:air'));
  return {...p,location:p,dimension:d,get typeId(){return cells.get(k).typeId;},get permutation(){return cells.get(k);},setPermutation(v){calls++;cells.set(k,v);if(calls===failAt)throw Error('after set');},setType(v){calls++;cells.set(k,perm(v));if(calls===failAt)throw Error('after set');}};
 }};
 const put=(p,id,states={})=>cells.set(key(p),perm(id,states)),get=p=>d.getBlock(p),ctrl=P(0,20,0);
 put(ctrl,'hakkai:'+type,type==='bearing'?{'hakkai:angle':0,'hakkai:motion':0}:{'hakkai:offset':0,'hakkai:motion':0});
 const net=()=>({status:'running',rpm:16}),step=n=>bearingStep(get(ctrl),n,{kineticNetwork:net,resolve:id=>perm(id)});
 return {d,put,get,ctrl,step,net,entities,fail:n=>{calls=0;failAt=n;},snapshot:()=>[...cells.entries()].filter(([,v])=>v.typeId!=='minecraft:air').map(([k,v])=>[k,v.typeId,JSON.stringify(v.states)]).sort()};
}
{
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_frame');f.put(P(1,21,0),'hakkai:gantry_joint');f.put(P(2,21,0),'hakkai:fluid_tank',{'hakkai:fluid':2,'hakkai:level':7});const before=f.snapshot();
 assert.equal(f.step(1).ok,true);assert.equal(f.get(P(0,21,1)).typeId,'hakkai:gantry_joint_south');assert.equal(f.get(P(0,21,2)).typeId,'hakkai:fluid_tank');assert.equal(f.get(P(0,21,2)).permutation.getState('hakkai:level'),7);
 for(let i=0;i<3;i++)assert.equal(f.step(1).ok,true);assert.deepEqual(f.snapshot(),before,'four rotations restore all states and orientation');
 assert.equal(f.step(-1).ok,true);assert.equal(f.get(P(0,21,-1)).typeId,'hakkai:gantry_joint_north');assert.equal(f.get(P(0,21,-2)).typeId,'hakkai:fluid_tank');assert.equal(f.step(1).ok,true);assert.deepEqual(f.snapshot(),before);
}
{
 const f=fixture('gantry');f.put(P(1,20,0),'hakkai:gantry_joint_up');f.put(P(1,21,0),'minecraft:red_concrete');
 let result=gantryStep(f.get(f.ctrl),1,{kineticNetwork:f.net});assert.equal(result.ok,true);assert.equal(result.count,2);assert.equal(f.get(P(2,21,0)).typeId,'minecraft:red_concrete');
 assert.ok(gantryStep(f.get(f.ctrl),-1,{kineticNetwork:f.net}).ok);assert.equal(f.get(P(1,21,0)).typeId,'minecraft:red_concrete');
}
{
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_joint');f.put(P(1,21,0),'minecraft:chest');const snapshot=f.snapshot();assert.equal(f.step(1).reason,'unsupported');assert.deepEqual(f.snapshot(),snapshot);
 f.put(P(1,21,0),'minecraft:stone');f.put(P(0,21,1),'minecraft:chest');assert.equal(f.step(1).reason,'blocked');assert.equal(f.get(P(0,21,1)).typeId,'minecraft:chest');
}
for(let n=1;n<=5;n++){
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_frame');f.put(P(1,21,0),'hakkai:gantry_panel');const snapshot=f.snapshot();f.fail(n);assert.equal(f.step(1).ok,false);assert.deepEqual(f.snapshot(),snapshot,'failed write restored '+n);
}
{
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_frame');f.put(P(1,21,0),'hakkai:gantry_panel');f.entities.push({typeId:'minecraft:player',location:{x:1,y:22,z:0}});assert.equal(f.step(1).reason,'entity');f.entities.length=0;f.d.unloaded=new Set([key(P(0,21,1))]);assert.equal(f.step(1).reason,'unloaded');
}
{
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_frame');f.put(P(1,21,0),'hakkai:gantry_panel');const cycles=new Map(),deps={kineticNetwork:f.net,resolve:id=>perm(id),report:()=>{},cycleAt:cycles};setBearingMode(f.get(f.ctrl),1);armBearing(f.get(f.ctrl),cycles,0);
 bearingAutoTick(f.get(f.ctrl),{...deps,tick:79});assert.equal(bearingState(f.get(f.ctrl)).angle,0);bearingAutoTick(f.get(f.ctrl),{...deps,tick:80});assert.equal(bearingState(f.get(f.ctrl)).angle,1);bearingAutoTick(f.get(f.ctrl),{...deps,cycleAt:new Map(),tick:200});assert.deepEqual(bearingState(f.get(f.ctrl)),{angle:1,mode:0});
}
assert.ok(PAYLOAD.has('minecraft:red_concrete')&&PAYLOAD.has('hakkai:fluid_tank'));assert.ok(!PAYLOAD.has('minecraft:chest')&&!PAYLOAD.has('hakkai:crusher'));
console.log('Bearing rotation, joint direction, payload/tank state, abort, rollback and restart OK (simulated)');
{
 const {kineticNetwork}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js');
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_frame');f.put(P(1,21,0),'hakkai:gantry_panel');
 assert.equal(bearingStep(f.get(f.ctrl),1,{kineticNetwork,resolve:id=>perm(id)}).reason,'power');
 f.put(P(-1,20,0),'hakkai:water_wheel');f.put(P(-2,20,0),'minecraft:water');
 assert.equal(bearingStep(f.get(f.ctrl),1,{kineticNetwork,resolve:id=>perm(id)}).ok,true);
}
for(const id of ['minecraft:deepslate','minecraft:quartz_block']){
 const f=fixture();f.put(P(0,21,0),'hakkai:gantry_joint');f.put(P(1,21,0),id,{pillar_axis:'x'});assert.equal(f.step(1).ok,true);assert.equal(f.get(P(0,21,1)).permutation.getState('pillar_axis'),'z');assert.equal(f.step(-1).ok,true);assert.equal(f.get(P(1,21,0)).permutation.getState('pillar_axis'),'x');
}
