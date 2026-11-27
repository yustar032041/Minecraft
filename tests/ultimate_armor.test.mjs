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
 const start=src.indexOf('     if(isCreative(p)){s.s=max;s.m=max;}else{',src.indexOf('const guarding=shieldStance'));
 const end=src.indexOf('     // The trial arena',start);assert.ok(start>0&&end>start);
 const s={s:50,m:50,campResting:false},player={...p,isSwimming:false,isSprinting:false};const ctx={p:player,s,max:100,guarding:false,isCreative:()=>false,bounds:(n,a,b)=>Math.max(a,Math.min(b,n)),hasUltimateArmor,ultimateRegen};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,53);assert.ok(Math.abs(s.m-51.32)<1e-10);
 player.isSprinting=true;ctx.guarding=true;vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,53,'paid guard still blocks stamina regeneration');assert.ok(Math.abs(s.m-52.64)<1e-10);
 ctx.guarding=false;vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,56,'sprint regenerates with the final set');
 player.isSwimming=true;vm.runInContext(src.slice(start,end),ctx);assert.equal(s.s,54.6,'swimming drain remains unchanged');
 assert.ok(src.includes('if(parried)ultimateParryHeal(p);'),'warden parry hook');
 assert.match(src,/onSuccess:\(\{p,attacker,near,at\}\)=>\{\s*ultimateParryHeal\(p\);/,'deferred guard-release parry hook');
}
// Set buffs refresh independently, never overwrite stronger/longer effects,
// never strip other sources when the set is removed, and isolate API errors.
{
 const {applyUltimateArmorBonus,ULTIMATE_BUFFS,ULTIMATE_BUFF_DURATION}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_armor.js');
 const effects=new Map([['strength',{amplifier:4,duration:10}],['speed',{amplifier:1,duration:200}],['haste',{amplifier:0,duration:10}]]),calls=[];
 const player={isValid:true,getComponent:()=>({getEquipment:slot=>gear.get(slot)}),getEffect:id=>effects.get(id),addEffect(id,duration,opts){calls.push([id,duration,opts]);if(id==='regeneration')throw Error('unsupported');effects.set(id,{amplifier:opts.amplifier,duration});return {};}};
 gear.set(EquipmentSlot.Legs,{typeId:'hakkai:ult_leggings'});
 assert.equal(ULTIMATE_BUFFS.length,9);assert.equal(applyUltimateArmorBonus(player),6);assert.equal(effects.get('strength').amplifier,4);assert.equal(effects.get('speed').duration,200);assert.equal(effects.get('haste').amplifier,1);assert.equal(effects.get('resistance').amplifier,2);assert.equal(effects.get('health_boost').amplifier,2);
 assert.ok(calls.every(([,duration,opts])=>duration===ULTIMATE_BUFF_DURATION&&opts.showParticles===false));
 gear.delete(EquipmentSlot.Feet);const n=calls.length;assert.equal(applyUltimateArmorBonus(player),0);assert.equal(calls.length,n);assert.ok(effects.has('resistance'),'do not strip existing effects');
 assert.equal(applyUltimateArmorBonus({isValid:false}),0);gear.set(EquipmentSlot.Feet,{typeId:'hakkai:ult_boots'});
 const src=(await import('node:fs')).readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');assert.match(src,/if\(t%100===0\)\{[^\n]*applyUltimateArmorBonus\(p\)/);
}
{
 const {applyUltimateArmorBonus}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_armor.js');
 const player={isValid:true,getComponent:()=>({getEquipment:slot=>gear.get(slot)}),getEffect:()=>undefined,addEffect:()=>undefined};
 assert.equal(applyUltimateArmorBonus(player),9,'undefined returns count submitted non-throwing calls');
}
