import assert from 'node:assert/strict';
import {EquipmentSlot} from '@minecraft/server';
import {hasUltimateArmor,ultimateRegen,ultimateParryHeal} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_armor.js';
const gear=new Map([[EquipmentSlot.Head,{typeId:'hakkai:ult_helmet'}],[EquipmentSlot.Chest,{typeId:'hakkai:ult_chest'}],[EquipmentSlot.Legs,{typeId:'hakkai:ult_leggings'}],[EquipmentSlot.Feet,{typeId:'hakkai:ult_boots'}]]);
const hp={currentValue:17,effectiveMax:20,setCurrentValue(v){this.currentValue=v}},p={getComponent:id=>id==='minecraft:equippable'?{getEquipment:slot=>gear.get(slot)}:hp};
assert.equal(hasUltimateArmor(p),true);assert.equal(ultimateRegen(2.5,true),3);assert.equal(ultimateRegen(2.5,false),2.5);assert.equal(ultimateRegen(-1.4,true),-1.4);
assert.equal(ultimateParryHeal(p),true);assert.equal(hp.currentValue,19);ultimateParryHeal(p);assert.equal(hp.currentValue,20);assert.equal(ultimateParryHeal(p),false);
gear.set(EquipmentSlot.Legs,{typeId:'minecraft:netherite_leggings'});hp.currentValue=10;assert.equal(hasUltimateArmor(p),false);assert.equal(ultimateParryHeal(p),false);assert.equal(hp.currentValue,10);
gear.set(EquipmentSlot.Legs,{typeId:'hakkai:ult_leggings'});hp.currentValue=0;assert.equal(ultimateParryHeal(p),false,'cannot resurrect');
assert.equal(hasUltimateArmor({getComponent:()=>{throw Error('unsupported')}}),false);
console.log('Final armor: exact slots, positive recovery bonus, parry healing cap and missing equipment (mocked)');
// Exercise the real regeneration block copied verbatim from main.js.
{
 const fs=await import('node:fs'),vm=await import('node:vm');const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const start=src.indexOf('     if(isCreative(p)){s.s=max;s.m=max;}else{',src.indexOf('const guarding=combatGuard?.tick'));
 const end=src.indexOf('     // The trial dimension',start);assert.ok(start>0&&end>start);
 const s={s:50,m:50,campResting:false},player={...p,isSwimming:false,isSprinting:false};const ctx={p:player,s,max:100,guarding:false,isCreative:()=>false,bounds:(n,a,b)=>Math.max(a,Math.min(b,n)),hasUltimateArmor,ultimateRegen};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,53);assert.ok(Math.abs(s.m-51.32)<1e-10);
 player.isSprinting=true;ctx.guarding=true;vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,53,'paid guard still blocks stamina regeneration');assert.ok(Math.abs(s.m-52.64)<1e-10);
 ctx.guarding=false;vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,51.6,'sprint drain remains unchanged');
 assert.ok(src.includes('if(parried)ultimateParryHeal(p);'),'warden parry hook');
 assert.match(src,/onSuccess:\(\{p,attacker,near,at\}\)=>\{\s*ultimateParryHeal\(p\);/,'deferred guard-release parry hook');
}
