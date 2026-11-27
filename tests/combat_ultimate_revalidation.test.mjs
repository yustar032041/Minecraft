import {test} from 'node:test';import assert from 'node:assert/strict';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
const weapon={id:'gear_008',kind:'剣',damage:8,rank:1,a:0,skill:'test'};
function setup(){
 let blocker=false,visible=true;const hits=[],status=[],d={id:'d',isChunkLoaded:()=>true,getEntitiesFromRay:()=>blocker?[{entity:{id:'ally',isValid:true,typeId:'minecraft:cow',getComponent:()=>({hasTypeFamily:()=>false})},distance:1}]:[],spawnParticle(){}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',getEffect:()=>undefined,addEffect(){},playAnimation(){},playSound(){}};
 const enemy=id=>({id,typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),getComponent:()=>({hasTypeFamily:()=>true}),getEffect:()=>undefined,applyDamage:()=>{hits.push(id);if(id==='one')blocker=true;return true;},applyKnockback(){},addEffect:()=>status.push(id)});
 d.getEntities=()=>[enemy('one'),enemy('two')];const s={s:20,m:10},ctrl=setupCombatUltimate({system:{currentTick:10},notice(){},visibleFrom:()=>visible});
 return {p,s,ctrl,hits,status,setVisible:x=>visible=x,setBlocker:x=>blocker=x};
}
test('synchronous hit can create a friendly obstruction; following targets are revalidated',()=>{
 const f=setup();assert.equal(f.ctrl.cast(f.p,f.s,weapon),true);assert.deepEqual(f.hits,['one']);assert.deepEqual(f.status,[],'a new friendly obstruction suppresses post-hit status');
});
test('unknown or tied blocker distance fails closed without paying for an ultimate',()=>{
 for(const distance of [NaN,-1,2]){
  const f=setup();f.p.dimension.getEntitiesFromRay=()=>[{entity:{id:'ally',isValid:true,typeId:'minecraft:cow',getComponent:()=>({hasTypeFamily:()=>false})},distance}];
  assert.equal(f.ctrl.cast(f.p,f.s,weapon),false);assert.deepEqual(f.s,{s:20,m:10});assert.deepEqual(f.hits,[]);
 }
});
test('target moved out of range by first hit is not hit later',()=>{
 const f=setup(),targets=f.p.dimension.getEntities();f.p.dimension.getEntities=()=>targets;
 targets[0].applyDamage=()=>{f.hits.push('one');targets[1].location.x=50;return true;};
 targets[1].getHeadLocation=()=>({...targets[1].location,y:1});
 assert.equal(f.ctrl.cast(f.p,f.s,weapon),true);assert.deepEqual(f.hits,['one']);
});
test('existing obstruction or invisible target prevents payment and particles',()=>{
 for(const change of [f=>f.setVisible(false),f=>f.setBlocker(true)]){const f=setup();change(f);assert.equal(f.ctrl.cast(f.p,f.s,weapon),false);assert.deepEqual(f.s,{s:20,m:10});assert.deepEqual(f.hits,[]);}
});
