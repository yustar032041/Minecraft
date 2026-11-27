import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {WARDEN_BLADES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
import {isTraceWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {ultimateSignature,ultimateDamage,ultimateShow} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate_signature.js';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
const weapons=[...catalog,...ULTIMATE_WEAPONS,...WARDEN_BLADES].filter(isTraceWeapon);
test('105 unique deterministic signatures, valid particles and damage independent of normal attack value',()=>{
 assert.equal(weapons.length,105);const serials=new Set(),forms=new Set(),pictures=new Set();
 for(const g of weapons){
  const profile=ultimateSignature(g);assert.deepEqual(ultimateSignature({...g,damage:9999}),profile,g.id);serials.add(profile.serial);forms.add(profile.form);
  assert.ok(profile.damage>=20&&profile.damage<=40);assert.ok(fs.existsSync(`Hakkai_v7.1.0/ResourcePack/particles/${profile.particle.split(':')[1]}.json`));
  const out=[],p={location:{x:0,y:0,z:0},getViewDirection:()=>({x:1,y:0,z:0}),dimension:{spawnParticle:(id,pos)=>out.push([id,pos])}};ultimateShow(p,profile);
  assert.equal(out.length,48);assert.ok(out.every(([id,pos])=>id.startsWith('hakkai:')&&Object.values(pos).every(Number.isFinite)));pictures.add(JSON.stringify(out));
 }
 assert.equal(serials.size,105);assert.equal(pictures.size,105);assert.deepEqual([...forms].sort(),[0,1,2,3]);assert.equal(new Set(WARDEN_BLADES.map(g=>ultimateSignature(g).self)).size,8);
});
test('ultimate class spacing rewards have clear boundaries and ignore native attack',()=>{
 const origin={x:0,y:0,z:0};
 for(const [kind,near,far] of [['剣',4,0],['斧',4,0],['ハンマー',4,0],['槍',0,5],['弓',0,5],['杖',0,5],['盾',0,0],['扇',0,0]]){
  const profile=ultimateSignature({id:'gear_008',kind,rank:2,damage:999}),base=profile.damage;
  assert.equal(ultimateDamage(profile,origin,{x:2,y:0,z:0}),base+near,kind);
  assert.equal(ultimateDamage(profile,origin,{x:8,y:0,z:0}),base+far,kind);
  assert.equal(ultimateDamage(profile,origin,{x:NaN,y:0,z:0}),base,kind);
 }
});
test('real cast uses bounded class damage, costs, boss protection and only applies status after accepted hit',()=>{
 for(const g of [weapons.find(x=>x.kind==='斧'),weapons.find(x=>x.kind==='盾'),...WARDEN_BLADES]){
  const calls=[],particles=[],effects=[],d={id:'realm',isChunkLoaded:()=>true,getEntitiesFromRay:()=>[],spawnParticle:(...v)=>particles.push(v)};
  const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',getEffect:()=>undefined,addEffect:id=>effects.push(id),playAnimation(){},playSound(){}};
  const e=(id,type,accept)=>({id,typeId:type,isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),getComponent:()=>({hasTypeFamily:()=>true}),getEffect:()=>undefined,applyDamage:n=>(calls.push([id,n]),accept),addEffect:effect=>effects.push(`${id}:${effect}`),applyKnockback(){}});
  d.getEntities=()=>[e('ok','minecraft:zombie',true),e('fail','minecraft:zombie',false),e('boss','hakkai:time_warden',true)];
  const notices=[],s={s:20,m:10},ctrl=setupCombatUltimate({system:{currentTick:10},notice:(_p,msg)=>notices.push(msg),visibleFrom:()=>true});
  assert.equal(ctrl.cast(p,s,g),true);assert.equal(s.s,0);assert.equal(s.m,0);assert.equal(calls.length,3);assert.ok(calls.every(x=>x[1]===ultimateDamage(ultimateSignature(g),p.location,{x:2,y:0,z:0})));
  assert.ok(!effects.some(x=>x.startsWith('boss:')||x.startsWith('fail:')));assert.equal(particles.filter(([id])=>id===ultimateSignature(g).particle).length>0,true);assert.match(notices.at(-1),/極式/);
 }
});
