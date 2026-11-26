import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {EquipmentSlot} from '@minecraft/server';
import {ENDGAME_ARMOR_SETS,endgameArmorStatus,applyEndgameArmorBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/endgame_armor_set.js';
import {armorRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_guide.js';
import {RECIPE_INDEX} from '../Hakkai_v7.1.0/BehaviorPack/scripts/recipe_index.js';
function fixture(i){const def=ENDGAME_ARMOR_SETS[i],items=new Map([[EquipmentSlot.Chest,def.chests[0]],...[EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet].map((slot,j)=>[slot,`hakkai:${def.key}_armor_${['helmet','leggings','boots'][j]}`])]);let effect,throws=false;const calls=[];const p={isValid:true,getComponent:()=>({getEquipment:slot=>items.has(slot)?{typeId:items.get(slot)}:undefined}),getEffect:()=>effect,addEffect:(...args)=>{if(throws)throw Error();calls.push(args);return {}}};return {p,items,calls,setEffect:e=>effect=e,throwOnAdd:()=>throws=true};}
test('two families: both chest stages and exact slots; no mixed, missing, or invalid gear',()=>{
 assert.equal(ENDGAME_ARMOR_SETS.length,2);
 for(let i=0;i<2;i++){
  const d=ENDGAME_ARMOR_SETS[i],f=fixture(i);
  for(const chest of d.chests){f.items.set(EquipmentSlot.Chest,chest);assert.equal(endgameArmorStatus(f.p,i).active,true);assert.equal(applyEndgameArmorBonus(f.p),true);}
  assert.deepEqual(f.calls[0],[d.bonus,150,{amplifier:0,showParticles:false}]);
  for(const slot of [EquipmentSlot.Head,EquipmentSlot.Legs,EquipmentSlot.Feet]){const old=f.items.get(slot);f.items.delete(slot);assert.equal(applyEndgameArmorBonus(f.p),false);f.items.set(slot,old);}
  f.items.set(EquipmentSlot.Head,`hakkai:${ENDGAME_ARMOR_SETS[1-i].key}_armor_helmet`);assert.equal(applyEndgameArmorBonus(f.p),false);
  f.items.set(EquipmentSlot.Head,`hakkai:${d.key}_armor_boots`);assert.equal(applyEndgameArmorBonus(f.p),false);
  f.p.isValid=false;assert.equal(applyEndgameArmorBonus(f.p),false);
 }
 assert.equal(endgameArmorStatus({getComponent:()=>{throw Error()}},0).active,false);
});
test('stronger or sufficiently long effects are not replaced; errors do not propagate',()=>{
 for(let i=0;i<2;i++){const f=fixture(i);for(const e of [{amplifier:1,duration:1},{amplifier:0,duration:150}]){f.setEffect(e);assert.equal(applyEndgameArmorBonus(f.p),false)}assert.equal(f.calls.length,0);f.setEffect({amplifier:0,duration:149});assert.equal(applyEndgameArmorBonus(f.p),true);f.throwOnAdd();assert.equal(applyEndgameArmorBonus(f.p),false);}
});
test('actual guide lists both sets, chest routes and all recipes',async()=>{
 const s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=s.indexOf('async function endgameArmorMenu('),b=s.indexOf('async function ultimateArmorPage(',a);assert.ok(a>0&&b>a);
 let picks=[],calls=[];const ctx={ENDGAME_ARMOR_SETS,endgameArmorStatus,armorRecipe,RECIPE_INDEX,form:async(_p,title,body,rows)=>{calls.push({title,body,rows});return picks.shift()},simple:async(_p,title,body)=>calls.push({title,body})};vm.createContext(ctx);vm.runInContext(s.slice(a,b)+';this.open=endgameArmorMenu;',ctx);
 for(let i=0;i<2;i++){const d=ENDGAME_ARMOR_SETS[i],f=fixture(i);picks=[i,0,1,2,3,4,2];await ctx.open(f.p);assert.equal(picks.length,0);assert.ok(calls.some(x=>x.title===d.name&&x.body.includes(d.bonusName+'I')&&x.body.includes('満たしています')));assert.ok(calls.some(x=>x.title===d.name+'の胴鎧'&&x.body.includes('再製作')));for(const part of ['helmet','leggings','boots'])assert.ok(calls.some(x=>x.body.includes(`hakkai:${d.key}_armor_${part}`)&&x.body.includes('並べ方は自由')));}
 assert.ok(s.includes('applyEndgameArmorBonus(p);'));
});
test('non-throwing undefined effect result is not a failed submission',()=>{
 const f=fixture(0);f.p.addEffect=()=>undefined;assert.equal(applyEndgameArmorBonus(f.p),true);
});
