import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {EquipmentSlot} from '@minecraft/server';
import {refreshArmorEffect} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_effect_refresh.js';
import {equippedSeries} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_series.js';
import {applyGuardianArmorBonus,GUARDIAN_ARMOR_SETS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_armor_set.js';
import {applyEndgameArmorBonus,ENDGAME_ARMOR_SETS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/endgame_armor_set.js';
import {applyUltimateArmorBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_armor.js';
function player(){
 const equipment=new Map(),effects=new Map(),calls=[];
 const p={isValid:true,location:{x:0,y:80,z:0},dimension:{spawnParticle(){}},getComponent:()=>({getEquipment:s=>equipment.has(s)?{typeId:equipment.get(s)}:undefined}),getEffect:id=>effects.get(id),addEffect(id,duration,options){calls.push([id,duration,options]);effects.set(id,{amplifier:options.amplifier,duration});return undefined;}};
 return {p,equipment,effects,calls};
}
function loadMain(){
 const s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const slice=(a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i,[a,b].join(' '));return s.slice(i,j);};
 const ctx={EquipmentSlot,refreshArmorEffect,equippedSeries,ns:'hakkai:',system:{currentTick:200}};
 vm.createContext(ctx);
 vm.runInContext(slice('const armorSetDefs=[','const armorSeriesOrder=')+slice('function equippedSetParts(', 'function ownsArmorPiece(')+slice('function applyArmorSetBonuses(', '// v4.3.0')+slice('const guardianLegacyGear=[','async function guardianLegacyForge(')+slice('function applyGuardianLegacyEffects(', '// --- v5.0.0')+slice('const realmAscendedGear=[','async function realmAscensionBoard(')+slice('function applyRealmAwakenedEffects(', '// --- v4.6.0')+';this.series=armorSetBonusDefs;this.legacy=guardianLegacyGear;this.ascended=realmAscendedGear;this.applySeries=applyArmorSetBonuses;this.applyLegacy=applyGuardianLegacyEffects;this.applyAscended=applyRealmAwakenedEffects;',ctx);
 return ctx;
}
function setSeries(f,def){for(const [i,slot] of [EquipmentSlot.Chest,EquipmentSlot.Head,EquipmentSlot.Feet,EquipmentSlot.Legs].entries())f.equipment.set(slot,'hakkai:'+def[i+1]);}
test('refresh comparison avoids strong, long, unknown and failed effect reads',()=>{
 const f=player();
 for(const effect of [{amplifier:1,duration:1},{amplifier:0,duration:150},{amplifier:0,duration:-1},{amplifier:NaN,duration:10},{amplifier:0,duration:NaN}]){
  f.effects.set('speed',effect);assert.equal(refreshArmorEffect(f.p,'speed',150,0),false);
 }
 assert.equal(f.calls.length,0);
 f.effects.set('speed',{amplifier:0,duration:149});assert.equal(refreshArmorEffect(f.p,'speed',150,0),true);
 f.effects.set('speed',{amplifier:0,duration:1000});assert.equal(refreshArmorEffect(f.p,'speed',150,1),true,'stronger armor bonus may replace a weaker effect');
 f.p.getEffect=()=>{throw Error('unavailable')};assert.equal(refreshArmorEffect(f.p,'speed',150,0),false);
 f.p.getEffect=()=>undefined;f.p.addEffect=()=>{throw Error('unavailable')};assert.equal(refreshArmorEffect(f.p,'speed',150,0),false);
});
test('all eleven ordinary series require four exact slots and preserve existing effects',()=>{
 const m=loadMain();assert.equal(m.series.length,11);
 for(const def of m.series){
  const f=player();setSeries(f,def);f.effects.set(def[5],{amplifier:2,duration:20});m.applySeries(f.p);assert.equal(f.calls.length,0,def[0]);
  f.effects.set(def[5],{amplifier:0,duration:200});m.applySeries(f.p);assert.equal(f.calls.length,0);
  f.effects.set(def[5],{amplifier:0,duration:50});m.applySeries(f.p);assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],def[5]);assert.equal(f.calls[0][1],150);
  f.equipment.delete(EquipmentSlot.Legs);f.effects.clear();m.applySeries(f.p);assert.equal(f.calls.length,1,'removing a piece stops refresh');
 }
});
test('all awakening and legacy chests preserve stronger buffs without a full set',()=>{
 const m=loadMain();assert.equal(m.ascended.length,8);assert.equal(m.legacy.length,8);
 for(const def of m.ascended)for(const [id,level] of [[def[2],1],[def[3],0]]){
  const f=player();f.equipment.set(EquipmentSlot.Chest,'hakkai:'+id);
  f.effects.set(def[6],{amplifier:level+1,duration:20});m.applyAscended(f.p);assert.equal(f.calls.length,0,id);
  f.effects.clear();m.applyAscended(f.p);assert.equal(f.calls.length,1,id);assert.equal(f.calls[0][1],140);assert.equal(f.calls[0][2].amplifier,level);
 }
 for(const def of m.legacy){
  const f=player();f.equipment.set(EquipmentSlot.Chest,'hakkai:'+def[2]);f.effects.set(def[8],{amplifier:2,duration:10});m.applyLegacy(f.p);assert.equal(f.calls.length,0,def[2]);
  f.effects.clear();m.applyLegacy(f.p);assert.equal(f.calls.length,1);assert.equal(f.calls[0][2].amplifier,1);
 }
});
test('united chest refresh isolates individual failures and keeps totem visual',()=>{
 const m=loadMain();for(const [id,n] of [['gear_212',3],['gear_213',5]]){
  const f=player();f.equipment.set(EquipmentSlot.Chest,'hakkai:'+id);let particles=0;f.p.dimension.spawnParticle=()=>particles++;
  const add=f.p.addEffect;f.p.addEffect=(effect,...args)=>{if(effect==='strength')throw Error('unavailable');return add(effect,...args)};
  f.effects.set('resistance',{amplifier:3,duration:20});m.applyLegacy(f.p);
  assert.equal(f.calls.length,n-2);assert.ok(f.calls.every(c=>c[0]!=='strength'&&c[0]!=='resistance'));assert.equal(particles,id==='gear_213'?1:0);
 }
});
test('guardian, endgame and ultimate all preserve unreadable durations',()=>{
 const f=player();f.p.getEffect=()=>({amplifier:0,duration:-1});
 let d=GUARDIAN_ARMOR_SETS[0];f.equipment.set(EquipmentSlot.Chest,d.chests[0]);[EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet].forEach((s,i)=>f.equipment.set(s,'hakkai:'+d.companions[i]));assert.equal(applyGuardianArmorBonus(f.p),false);
 d=ENDGAME_ARMOR_SETS[0];f.equipment.set(EquipmentSlot.Chest,d.chests[0]);[EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet].forEach((s,i)=>f.equipment.set(s,`hakkai:${d.key}_armor_${['helmet','leggings','boots'][i]}`));assert.equal(applyEndgameArmorBonus(f.p),false);
 for(const [slot,id] of [[EquipmentSlot.Head,'ult_helmet'],[EquipmentSlot.Chest,'ult_chest'],[EquipmentSlot.Legs,'ult_leggings'],[EquipmentSlot.Feet,'ult_boots']])f.equipment.set(slot,'hakkai:'+id);
 assert.equal(applyUltimateArmorBonus(f.p),0);assert.equal(f.calls.length,0);
});
