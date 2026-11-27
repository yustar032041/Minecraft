// Mock event execution and static resource checks. Not a Bedrock animation renderer.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {WARDEN_BLADES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
import {weaponMotionId,playWeaponMotion} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_motion.js';
import {isTraceWeapon,setupWeaponTrace} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
const weapons=[...catalog,...ULTIMATE_WEAPONS,...WARDEN_BLADES].filter(isTraceWeapon);
const common=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/animations/weapon_player.animation.json','utf8')).animations;
const individual=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/animations/weapon_individual.animation.json','utf8')).animations;
const animations={...common,...individual};
const skills=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/animations/cast_skills.animation.json','utf8')).animations;
test('all 105 addon weapons resolve normal, charged, ultimate and per-weapon skill animations',()=>{
 assert.equal(weapons.length,105);assert.equal(Object.keys(common).length,40);assert.equal(Object.keys(individual).length,840);
 const authored=new Set();
 for(const g of weapons){
  for(const [phase,variant,direction] of [['attack',0,'neutral'],['attack',1,'neutral'],['attack',0,'forward'],['attack',0,'back'],['attack',0,'left'],['attack',0,'right'],['charged',0,'neutral'],['ultimate',0,'neutral']])assert.ok(animations[weaponMotionId(g,phase,variant,direction)],`${g.id} ${phase}/${direction}`);
  authored.add(JSON.stringify(individual[weaponMotionId(g,'attack',0)].bones));
  const skill=Number.isInteger(g.wardenBlade)?`animation.hakkai.warden_blade_skill_${g.wardenBlade}`:`animation.hakkai.cast.${g.visualId??g.id}`;
  assert.ok(animations[skill]||skills[skill],`${g.id} skill`);
 }
 assert.equal(authored.size,105,'every weapon has a different neutral strike');
 for(const [id,a] of Object.entries(animations)){
  assert.equal(a.loop,false,id);assert.ok(a.animation_length>0&&a.animation_length<=1,id);
  assert.deepEqual(Object.keys(a.bones).sort(),['body','leftarm','leftleg','rightarm','rightleg']);
  for(const bone of Object.values(a.bones)){
   const keys=Object.keys(bone.rotation).map(Number).sort((a,b)=>a-b);assert.equal(keys[0],0);assert.equal(keys.at(-1),a.animation_length);
   const end=Object.entries(bone.rotation).find(([key])=>Number(key)===a.animation_length)[1];assert.deepEqual(end,[0,0,0]);
  }
 }
});
test('real swing alternates, refuses duplicate/non-attack events and ignores missing animation APIs',()=>{
 const g=weapons[0],ids=[],jobs=[],system={currentTick:10,runTimeout:f=>jobs.push(f)},dim={id:'d',spawnParticle(){}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:0,y:0,z:0},selectedSlotIndex:0,getGameMode:()=> 'survival',getViewDirection:()=>({x:1,y:0,z:0}),getHeadLocation:()=>({x:0,y:1,z:0}),playAnimation:id=>ids.push(id)};
 const id='hakkai:'+g.id,ctrl=setupWeaponTrace({system,gear:new Map([[id,g]]),selected:()=>({typeId:id}),state:()=>({s:50}),visibleFrom:()=>true});
 const e={player:p,heldItemStack:{typeId:id},swingSource:'Attack'};
 assert.equal(ctrl.swing({...e,swingSource:'UseItem'}),false);assert.deepEqual(ids,[]);
 assert.equal(ctrl.swing(e),true);assert.equal(ids[0],weaponMotionId(g,'attack',0));assert.equal(ctrl.swing(e),false);
 system.currentTick+=4;assert.equal(ctrl.swing(e),true);assert.equal(ids[1],weaponMotionId(g,'attack',1));
 ctrl.clear(p.id);system.currentTick+=4;p.playAnimation=()=>{throw Error('unsupported')};assert.equal(ctrl.swing(e),true);assert.equal(jobs.length,3);
});
test('successful weapon ultimates play kind-specific motions, failed casts do not',()=>{
 for(const g of weapons){
  const ids=[],dim={id:'d',spawnParticle(){},isChunkLoaded:()=>true,getEntitiesFromRay:()=>[]};
  const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',playAnimation:id=>ids.push(id),playSound(){}};
  const enemy={id:'z',typeId:'minecraft:zombie',isValid:true,dimension:dim,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),getComponent:()=>({hasTypeFamily:()=>true}),applyDamage:()=>true,applyKnockback(){},setOnFire(){},addEffect(){}};dim.getEntities=()=>[enemy];
  const c=setupCombatUltimate({system:{currentTick:10},notice(){},visibleFrom:()=>true});
  assert.equal(c.cast(p,{s:19,m:100},g),false);assert.deepEqual(ids,[]);
  assert.equal(c.cast(p,{s:20,m:100},g),true,g.id);
  const expected=['ult_sword','ult_axe'].includes(g.id)||/^warden_blade_[0-7]$/.test(g.id)?`animation.hakkai.action_finisher_${g.id.replace('warden_blade_','warden_')}`:weaponMotionId(g,'ultimate');
  assert.deepEqual(ids,[expected],g.id);
 }
 assert.equal(playWeaponMotion({playAnimation(){throw Error('unavailable')}},weapons[0],'attack'),false);
 assert.equal(weaponMotionId({kind:'鎧'},'attack'),undefined);
});
