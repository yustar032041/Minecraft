// Deterministic fake inputs, events and rays; not a gamepad or Bedrock test.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {weaponDirection,resolveSwingStyle,styleGeometry,styleFacing,linkedTechnique} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_style.js';
import {setupWeaponTrace} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {weaponMotionId} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_motion.js';
const g={id:'gear_008',kind:'剣',damage:10},base={id:'p',selectedSlotIndex:0,dimension:{id:'d'}};
test('inputs have a dead zone; unavailable/invalid inputs preserve neutral behaviour',()=>{
 for(const [v,out] of [[{x:0,y:0},'neutral'],[{x:.44,y:0},'neutral'],[{x:0,y:.7},'forward'],[{x:0,y:-.8},'back'],[{x:-.8,y:.1},'left'],[{x:.8,y:.1},'right']])assert.equal(weaponDirection({inputInfo:{getMovementVector:()=>v}}),out);
 assert.equal(weaponDirection({}), 'neutral');assert.equal(weaponDirection({inputInfo:{getMovementVector(){throw Error()}}}),'neutral');assert.equal(weaponDirection({inputInfo:{getMovementVector:()=>({x:NaN,y:1})}}),'neutral');
});
test('timing, identity and neutral inputs bound combo windows and geometry',()=>{
 let p={...base,inputInfo:{getMovementVector:()=>({x:0,y:1})}},a=resolveSwingStyle(undefined,p,g,0);
 for(const delta of [0,5,13,100])assert.equal(resolveSwingStyle(a,p,g,delta).linked,false);
 for(const delta of [6,8,12])assert.equal(resolveSwingStyle(a,p,g,delta).linked,true);
 assert.equal(resolveSwingStyle(a,{...p,selectedSlotIndex:1},g,8).linked,false);
 assert.equal(resolveSwingStyle(a,{...p,dimension:{id:'other'}},g,8).linked,false);
 assert.equal(resolveSwingStyle(a,p,{...g,id:'gear_009'},8).linked,false);
 assert.equal(resolveSwingStyle(a,base,g,8).linked,false);
 assert.deepEqual(styleGeometry('neutral',4,.5),{range:4,cone:.5});assert.ok(styleGeometry('forward',4,.5).range>4);assert.ok(styleGeometry('left',4,.5).cone<.5);assert.ok(styleGeometry('back',4,.5).range<4);
 const second=resolveSwingStyle(a,p,g,8),third=resolveSwingStyle(second,p,g,16),reset=resolveSwingStyle(third,p,g,24);
 assert.equal(second.stage,2);assert.equal(third.stage,3);assert.equal(reset.stage,1);assert.equal(reset.linked,false);
 const left=styleFacing({x:1,z:0},'left'),right=styleFacing({x:1,z:0},'right');assert.ok(left.z<0&&right.z>0);assert.ok(Math.abs(Math.hypot(left.x,left.z)-1)<1e-9);
});
test('linked technique uses rank, role and chain rather than native attack',()=>{
 const style={stage:2},sword={...g,rank:2};assert.equal(linkedTechnique(sword,style),20);
 assert.equal(linkedTechnique({...sword,damage:999},style),20);
 assert.ok(linkedTechnique({...sword,kind:'斧'},style)>20);assert.equal(linkedTechnique(sword,{stage:3}),22);
 assert.equal(linkedTechnique({...sword,rank:999},{stage:999}),26);
});
test('real swing dispatch uses movement and timing, and link can be consumed once',()=>{
 const animations=[],jobs=[],damage=[],d={id:'d',spawnParticle(){},isChunkLoaded:()=>true,getEntitiesFromRay:()=>[],getEntities:()=>[e]};
 const e={id:'enemy',typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),getComponent:()=>({hasTypeFamily:()=>true}),applyDamage:n=>damage.push(n)};
 const p={...base,typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},getGameMode:()=> 'survival',getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),inputInfo:{getMovementVector:()=>({x:0,y:1})},playAnimation:id=>animations.push(id)};
 const sys={currentTick:10,runTimeout:f=>jobs.push(f)},id='hakkai:'+g.id,c=setupWeaponTrace({system:sys,gear:new Map([[id,g]]),selected:()=>({typeId:id}),state:()=>({s:50}),visibleFrom:()=>true});
 const event={player:p,heldItemStack:{typeId:id},swingSource:'Attack'};assert.equal(c.swing(event),true);jobs.shift()();assert.equal(damage[0],10);assert.equal(animations[0],weaponMotionId(g,'attack',0,'forward'));
 sys.currentTick=18;assert.equal(c.swing(event),true);jobs.shift()();assert.equal(damage[1],linkedTechnique(g,{stage:2}));assert.deepEqual(c.takeLink(p,g,18),{direction:'forward',stage:2});assert.equal(c.takeLink(p,g,18),false);
 sys.currentTick=26;c.swing(event);jobs.shift()();p.selectedSlotIndex=1;assert.equal(c.takeLink(p,g,26),false);p.selectedSlotIndex=0;assert.equal(c.takeLink(p,g,39),false);c.clear(p.id);
});
