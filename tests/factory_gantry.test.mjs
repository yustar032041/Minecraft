import assert from 'node:assert/strict';
import {gantryStep,gantryState,setGantryMode,gantryAutoTick,armGantry} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_gantry.js';
const key=p=>`${p.x},${p.y},${p.z}`,P=(x,y,z)=>({x,y,z});
const perm=(typeId,states={})=>({typeId,states,getState:k=>states[k],withState:(k,v)=>perm(typeId,{...states,[k]:v})});
function fixture(name='gantry'){
 const cells=new Map(),entities=[];let calls=0,failAt=0;
 const d={id:'d',isChunkLoaded:p=>!d.unloaded?.has(key(p)),getEntities:()=>entities,getBlock:p=>{
  const k=key(p);if(!cells.has(k))cells.set(k,perm('minecraft:air'));
  return {...p,location:p,dimension:d,get typeId(){return cells.get(k).typeId;},get permutation(){return cells.get(k);},setPermutation(v){calls++;cells.set(k,v);if(calls===failAt)throw Error('after set');},setType(v){calls++;cells.set(k,perm(v));if(calls===failAt)throw Error('after set');}};
 }};
 const put=(p,id,states={})=>cells.set(key(p),perm(id,states)),get=p=>d.getBlock(p),ctrl=P(0,20,0);
 put(ctrl,'hakkai:'+name,{'hakkai:offset':0,'hakkai:motion':0});
 const net=()=>({status:'running',rpm:16}),step=n=>gantryStep(get(ctrl),n,{kineticNetwork:net});
 return {d,put,get,ctrl,step,net,entities,fail:n=>{calls=0;failAt=n;},snapshot:()=>[...cells.entries()].filter(([,v])=>v.typeId!=='minecraft:air').map(([k,v])=>[k,v.typeId,JSON.stringify(v.states)]).sort()};
}
for(const [name,v] of Object.entries({gantry:[1,0,0],gantry_west:[-1,0,0],gantry_north:[0,0,-1],gantry_south:[0,0,1],gantry_up:[0,1,0],gantry_down:[0,-1,0]})){
 const f=fixture(name),at=n=>P(v[0]*n,20+v[1]*n,v[2]*n);f.put(at(1),'hakkai:gantry_frame');f.put(at(2),'hakkai:gantry_panel');
 const a=f.step(1);assert.equal(a.ok,true,name);assert.equal(a.count,2);assert.equal(f.get(at(1)).typeId,'minecraft:air');assert.equal(f.get(at(2)).typeId,'hakkai:gantry_frame');assert.equal(f.get(at(3)).typeId,'hakkai:gantry_panel');assert.equal(gantryState(f.get(f.ctrl)).offset,1);
 assert.equal(f.step(-1).ok,true);assert.equal(f.get(at(1)).typeId,'hakkai:gantry_frame');assert.equal(f.get(at(2)).typeId,'hakkai:gantry_panel');assert.equal(f.step(-1).reason,'limit');
}
{
 const f=fixture();f.put(P(1,20,0),'hakkai:gantry_frame');f.put(P(1,21,0),'hakkai:gantry_panel');f.put(P(2,20,0),'minecraft:chest');const before=f.snapshot();assert.equal(f.step(1).reason,'blocked');assert.deepEqual(f.snapshot(),before);
 assert.equal(gantryStep(f.get(f.ctrl),1,{kineticNetwork:()=>({status:'no_source'})}).reason,'power');assert.deepEqual(f.snapshot(),before);
 f.put(P(2,20,0),'minecraft:air');f.entities.push({typeId:'minecraft:player',location:{x:2,y:21,z:0}});assert.equal(f.step(1).reason,'entity');f.entities.length=0;
 f.d.unloaded=new Set([key(P(1,21,1))]);assert.equal(f.step(1).reason,'unloaded');
}
{
 const f=fixture();f.put(P(1,20,0),'hakkai:gantry_frame');for(let z=1;z<=32;z++)f.put(P(1,20,z),'hakkai:gantry_panel');const before=f.snapshot();assert.equal(f.step(1).reason,'size');assert.deepEqual(f.snapshot(),before);
}
for(let fail=1;fail<=5;fail++){
 const f=fixture();f.put(P(1,20,0),'hakkai:gantry_frame');f.put(P(2,20,0),'hakkai:gantry_panel');const before=f.snapshot();f.fail(fail);const result=f.step(1);assert.equal(result.ok,false,`write ${fail}`);assert.deepEqual(f.snapshot(),before,`rollback ${fail}`);
}
{
 const f=fixture();f.put(P(1,20,0),'hakkai:gantry_frame');let b=f.get(f.ctrl),cycles=new Map();assert.ok(setGantryMode(b,1));armGantry(b,cycles,0);
 const tick=t=>gantryAutoTick(f.get(f.ctrl),{kineticNetwork:f.net,cycleAt:cycles,tick:t,report:()=>{}});
 tick(0);tick(79);assert.equal(gantryState(f.get(f.ctrl)).offset,0);tick(80);assert.equal(gantryState(f.get(f.ctrl)).offset,1);tick(100);assert.equal(gantryState(f.get(f.ctrl)).offset,1);tick(120);assert.equal(gantryState(f.get(f.ctrl)).offset,2);
 f.put(P(4,20,0),'minecraft:stone');tick(160);assert.deepEqual(gantryState(f.get(f.ctrl)),{offset:2,mode:0});
}
console.log('Six directional gantries, overlapping frames, bounds, protection, power, automatic stop and rollback OK (simulated)');
{
 const {kineticNetwork}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js');
 const f=fixture();f.put(P(1,20,0),'hakkai:gantry_frame');assert.equal(gantryStep(f.get(f.ctrl),1,{kineticNetwork}).reason,'power');
 // Waterwheel avoids the real wind-rotor height and sky requirements.
 f.put(P(0,21,0),'hakkai:water_wheel');f.put(P(-1,21,0),'minecraft:water');
 assert.equal(gantryStep(f.get(f.ctrl),1,{kineticNetwork}).ok,true);
}
{
 const f=fixture();f.put(P(1,20,0),'hakkai:gantry_frame');setGantryMode(f.get(f.ctrl),1);
 gantryAutoTick(f.get(f.ctrl),{kineticNetwork:f.net,cycleAt:new Map(),tick:500,report:()=>{}});
 assert.deepEqual(gantryState(f.get(f.ctrl)),{offset:0,mode:0},'script restart never resumes unarmed movement');
}
