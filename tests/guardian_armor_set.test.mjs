import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {EquipmentSlot} from '@minecraft/server';
import {GUARDIAN_ARMOR_SETS,guardianArmorStatus,applyGuardianArmorBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_armor_set.js';
import {armorRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';
import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';
function fixture(i=0){
 const def=GUARDIAN_ARMOR_SETS[i],items=new Map([[EquipmentSlot.Chest,def.chests[0]],[EquipmentSlot.Head,'hakkai:'+def.companions[0]],[EquipmentSlot.Legs,'hakkai:'+def.companions[1]],[EquipmentSlot.Feet,'hakkai:'+def.companions[2]]]);let effect,fail=false;const calls=[];
 const p={isValid:true,getComponent:()=>({getEquipment:slot=>items.has(slot)?{typeId:items.get(slot)}:undefined}),getEffect:()=>effect,addEffect:(...args)=>{if(fail)throw Error();calls.push(args);return {}}};
 return {p,items,calls,effect:e=>effect=e,fail:()=>fail=true};
}
test('eight families and all three chest stages require their own three matching pieces',()=>{
 assert.equal(GUARDIAN_ARMOR_SETS.length,8);
 for(let i=0;i<8;i++){
  const f=fixture(i),def=GUARDIAN_ARMOR_SETS[i];
  for(const chest of def.chests){f.items.set(EquipmentSlot.Chest,chest);assert.equal(guardianArmorStatus(f.p,i).active,true);assert.equal(applyGuardianArmorBonus(f.p),true);}
  assert.deepEqual(f.calls[0],[def.bonus,150,{amplifier:0,showParticles:false}]);
  for(const slot of [EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet]){const old=f.items.get(slot);f.items.delete(slot);assert.equal(guardianArmorStatus(f.p,i).active,false);assert.equal(applyGuardianArmorBonus(f.p),false);f.items.set(slot,old);}
  for(let j=0;j<8;j++)if(i!==j){f.items.set(EquipmentSlot.Chest,GUARDIAN_ARMOR_SETS[j].chests[0]);assert.equal(guardianArmorStatus(f.p,i).active,false);assert.equal(applyGuardianArmorBonus(f.p),false);}
  f.items.set(EquipmentSlot.Chest,def.chests[0]);f.items.set(EquipmentSlot.Head,'hakkai:'+def.companions[2]);assert.equal(guardianArmorStatus(f.p,i).active,false,'wrong slots');
 }
});
test('bonus never overwrites stronger or longer effects, and safely handles rejected APIs',()=>{
 for(let i=0;i<8;i++){
  const f=fixture(i);for(const e of [{amplifier:1,duration:5},{amplifier:0,duration:151}]){f.effect(e);assert.equal(applyGuardianArmorBonus(f.p),false);}
  assert.equal(f.calls.length,0);f.effect({amplifier:0,duration:149});assert.equal(applyGuardianArmorBonus(f.p),true);
  f.fail();assert.equal(applyGuardianArmorBonus(f.p),false);f.p.isValid=false;assert.equal(applyGuardianArmorBonus(f.p),false);
 }
 assert.equal(guardianArmorStatus({getComponent:()=>{throw Error()}},0).active,false);
 assert.equal(guardianArmorStatus(fixture().p,8).active,false);
});
test('real guardian armor guide connects all eight families to their chest source and recipes',async()=>{
 const s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=s.indexOf('async function guardianArmorMenu('),b=s.indexOf('async function ultimateArmorPage(',a);assert.ok(a>0&&b>a);
 let picks=[];const calls=[];const ctx={GUARDIAN_ARMOR_SETS,guardianArmorStatus,armorRecipe,RECIPE_INDEX,form:async(_p,title,body)=>{calls.push([title,body]);return picks.shift()},simple:async(_p,title,body)=>calls.push([title,body])};
 const defsStart=s.indexOf('const realmAwakenedGear=['),defsEnd=s.indexOf('async function realmAwakeningBoard(',defsStart);
 vm.createContext(ctx);vm.runInContext(s.slice(defsStart,defsEnd)+';this.realmAwakenedGear=realmAwakenedGear;',ctx);ctx.realmRanks=Array.from({length:8},(_,i)=>[0,'rank'+i]);ctx.guardians=Array.from({length:8},(_,i)=>'guardian'+i);
 const f=fixture();vm.runInContext(s.slice(a,b)+';this.open=guardianArmorMenu;',ctx);
 for(let i=0;i<8;i++){
  f.items.set(EquipmentSlot.Chest,GUARDIAN_ARMOR_SETS[i].chests[0]);[EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet].forEach((slot,j)=>f.items.set(slot,'hakkai:'+GUARDIAN_ARMOR_SETS[i].companions[j]));
  picks=[i,0,1,2,3,4,8];await ctx.open(f.p);assert.equal(picks.length,0);
  const def=GUARDIAN_ARMOR_SETS[i];assert.ok(calls.some(([title,body])=>title===`${def.name}の覚醒装`&&body.includes(def.bonusName+'I')&&body.includes('満たしています')));
  assert.ok(calls.some(([title,body])=>title===`${def.name}の覚醒鎧`&&body.includes(def.realm)&&body.includes('rank'+ctx.realmAwakenedGear[i][4])&&body.includes(def.material+'の結晶×4')));
  for(const id of def.companions)assert.ok(calls.some(([,body])=>body.includes(`hakkai:${id}`)&&body.includes('並べ方は自由')),id);
 }
 assert.ok(s.includes('applyArmorSetBonuses(p);applyGuardianArmorBonus(p);applyEndgameArmorBonus(p);'));
});
test('non-throwing undefined effect result is not a failed submission',()=>{
 const f=fixture(0);f.p.addEffect=()=>undefined;assert.equal(applyGuardianArmorBonus(f.p),true);
});
