import assert from 'node:assert/strict';import {EquipmentSlot} from '@minecraft/server';
import {legacyMantle,equippedSeries,ownsSeriesPiece} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_series.js';
for(let i=0;i<11;i++){
 const ids=[`gear_${String(10+16*i).padStart(3,'0')}`,`gear_${String(11+16*i).padStart(3,'0')}`,`gear_${String(12+16*i).padStart(3,'0')}`,`series_leggings_${String(i).padStart(2,'0')}`],slots=[EquipmentSlot.Chest,EquipmentSlot.Head,EquipmentSlot.Feet,EquipmentSlot.Legs];
 const gear=new Map(slots.map((slot,n)=>[slot,{typeId:'hakkai:'+ids[n]}]));const owns=new Set(),p={getComponent:()=>({getEquipment:s=>gear.get(s)})};
 const check=()=>equippedSeries(p,ids,id=>owns.has(id));assert.equal(check().active,true,`4 worn ${i}`);assert.equal(check().equipped,4);
 gear.delete(EquipmentSlot.Legs);assert.equal(check().active,false,'missing legs');owns.add(legacyMantle(ids[3]));assert.equal(check().active,true,'old cloak compatibility');
 assert.equal(ownsSeriesPiece(ids[3],id=>owns.has(id)),true,'collection compatibility');
 gear.set(EquipmentSlot.Legs,{typeId:'hakkai:'+ids[3]});gear.set(EquipmentSlot.Head,{typeId:'hakkai:wrong'});assert.equal(check().active,false,'wrong head even with old cloak');
 gear.set(EquipmentSlot.Head,{typeId:'hakkai:'+ids[0]});gear.set(EquipmentSlot.Chest,{typeId:'hakkai:'+ids[1]});assert.equal(check().active,false,'must use correct slots');
}
assert.equal(legacyMantle('series_leggings_11'),undefined);assert.equal(equippedSeries({getComponent:()=>{throw Error();}},[],()=>false).active,false);
console.log('11 armor series: four correct slots, old cloak compatibility and collection (mocked)');
const {trialRewardSlot}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/armor_series.js');
const emerald={amount:8,maxAmount:64}, stack=amount=>({amount,maxAmount:64,isStackableWith:()=>true}),other={amount:1,maxAmount:64,isStackableWith:()=>false};
const container=items=>({size:items.length,getItem:i=>items[i]});
assert.equal(trialRewardSlot(container([undefined,other]),emerald),-1,'last slot is reserved for armor');
assert.equal(trialRewardSlot(container([undefined,stack(56)]),emerald),0,'stack has sufficient capacity');
assert.equal(trialRewardSlot(container([undefined,stack(57)]),emerald),-1,'stack has insufficient capacity');
assert.equal(trialRewardSlot(container([undefined,undefined]),emerald),0);
assert.equal(trialRewardSlot(container([other,other]),emerald),-1);
console.log('armor trial reward reserves room for both items (mocked)');
