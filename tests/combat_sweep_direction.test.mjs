import {test} from 'node:test';import assert from 'node:assert/strict';
import {setupWeaponTrace} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
function fixture(side){
 const hits=[],jobs=[],particles=[],d={id:'d',isChunkLoaded:()=>true,getEntitiesFromRay:()=>[],spawnParticle:(id,pos)=>particles.push([id,pos])};
 const p={id:'p',typeId:'minecraft:player',isValid:true,selectedSlotIndex:0,dimension:d,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',inputInfo:{getMovementVector:()=>({x:side,y:0})},playAnimation(){}};
 const enemy=(id,x,z)=>({id,typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x,y:0,z},getHeadLocation:()=>({x,y:1,z}),getComponent:()=>({hasTypeFamily:()=>true}),applyDamage:()=>{hits.push(id);return true;}});
 const left=enemy('left',2,-3.45),right=enemy('right',2,3.45),g={id:'gear_008',kind:'剣',damage:6,rank:1};d.getEntities=()=>[left,right];
 const ctrl=setupWeaponTrace({system:{currentTick:1,runTimeout:f=>jobs.push(f)},gear:new Map([['hakkai:gear_008',g]]),selected:()=>({typeId:'hakkai:gear_008'}),state:()=>({s:50}),visibleFrom:()=>true});
 return {p,g,d,left,right,ctrl,jobs,hits,particles,run(){assert.equal(ctrl.swing({player:p,heldItemStack:{typeId:'hakkai:gear_008'},swingSource:'Attack'}),true);jobs.shift()();}};
}
test('left and right movement actually produce mirrored attack sectors',()=>{
 const l=fixture(-1),r=fixture(1);l.run();r.run();assert.deepEqual(l.hits,['left']);assert.deepEqual(r.hits,['right']);
 assert.notDeepEqual(l.particles.slice(0,13),r.particles.slice(0,13));
});
test('sweep follows bounded movement during windup, but teleport is cancelled',()=>{
 for(const [move,expected] of [[1.2,['left']],[2,[]]]){
  const f=fixture(0);f.left.location={x:5,y:0,z:0};f.left.getHeadLocation=()=>({x:5,y:1,z:0});f.right.isValid=false;
  f.p.getHeadLocation=()=>({...f.p.location,y:1});
  assert.equal(f.ctrl.swing({player:f.p,heldItemStack:{typeId:'hakkai:gear_008'},swingSource:'Attack'}),true);
  f.p.location={x:move,y:0,z:0};f.jobs.shift()();assert.deepEqual(f.hits,expected);
 }
});
test('synchronous callbacks that move or disarm attacker cancel remaining hits',()=>{
 for(const change of [f=>{f.p.location.x=2;},f=>{f.p.selectedSlotIndex=1;}]){
  const f=fixture(0),second=f.right;f.left.location.z=0;second.location.z=0;
  f.left.applyDamage=()=>{f.hits.push('left');change(f);return true;};f.run();assert.deepEqual(f.hits,['left']);
 }
});
test('an unknown or tied friendly blocker distance fails closed for a sweep',()=>{
 for(const distance of [NaN,-1,2]){
  const f=fixture(0);f.left.location.z=0;f.right.isValid=false;
  const cow={id:'cow',typeId:'minecraft:cow',isValid:true,getComponent:()=>({hasTypeFamily:()=>false})};
  f.d.getEntitiesFromRay=()=>[{entity:cow,distance}];f.run();assert.deepEqual(f.hits,[]);
 }
});
test('synchronous callbacks cannot make a stale target friendly and still hurt it',()=>{
 const f=fixture(0),second=f.right;f.left.location.z=0;second.location.z=0;
 let hostile=true;second.getComponent=()=>({hasTypeFamily:()=>hostile});f.left.applyDamage=()=>{f.hits.push('left');hostile=false;return true;};f.run();assert.deepEqual(f.hits,['left']);
});
