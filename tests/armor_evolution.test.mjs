import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {catalog,attrs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {seriesLegUpgrade} from '../Hakkai_v7.1.0/BehaviorPack/scripts/armor_series.js';
for(let i=0;i<11;i++){
 const id=`series_leggings_${String(i).padStart(2,'0')}`,e=seriesLegUpgrade(id,catalog);assert.equal(e.current.id,id);
 if(i<6){assert.equal(e.next.id,`series_leggings_${String(i+5).padStart(2,'0')}`);const nextChest=catalog.find(x=>x.id===`gear_${String(10+16*(i+5)).padStart(3,'0')}`);assert.equal(e.next.rank,nextChest.rank);assert.equal(e.next.modifier,nextChest.modifier);}
 else assert.equal(e.next,undefined);
}
assert.equal(seriesLegUpgrade('series_leggings_11',catalog),undefined);
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const code=src.slice(src.indexOf('async function enhanceHeldGear(p)'),src.indexOf('async function gearEvolutionChronicle'));
const inventory=new Map([[0,{typeId:'hakkai:series_leggings_00',amount:1}],[1,{typeId:'minecraft:diamond',amount:3}]]);
const c={setItem:(slot,item)=>inventory.set(slot,item)};const p={isValid:true,selectedSlotIndex:0,location:{},dimension:{spawnParticle:()=>{}},playSound:()=>{}};const notices=[],debits=[],props=[];let formAction=()=>0,creative=false,available=100;
class ItemStack{constructor(typeId,amount){this.typeId=typeId;this.amount=amount}}
const ctx={ns:'hakkai:',space:()=>c,selected:p=>inventory.get(p.selectedSlotIndex),gear:new Map(catalog.map(g=>['hakkai:'+g.id,g])),catalog,seriesLegUpgrade,notice:(_,s)=>notices.push(s),simple:()=>{},num:()=>0,realmRankUpdate:()=>7,realmRanks:Array.from({length:8},(_,i)=>[i,`rank ${i}`]),attrs,form:async()=>formAction(),isCreative:()=>creative,total:()=>available,debit:(_c,id,n)=>debits.push([id,n]),ItemStack,property:(_p,k,v)=>props.push([k,v])};
vm.createContext(ctx);vm.runInContext(code,ctx);
await ctx.enhanceHeldGear(p);assert.equal(inventory.get(0).typeId,'hakkai:series_leggings_05');assert.equal(debits.length,3);assert.deepEqual(debits[0],['hakkai:crystal_10',1]);assert.deepEqual(debits[1],['hakkai:shard_10',1]);assert.equal(props.length,2);
// Changing slots while the confirmation form is open must never overwrite the original slot.
inventory.set(0,{typeId:'hakkai:series_leggings_00',amount:1});inventory.set(1,{typeId:'hakkai:series_leggings_00',amount:1});p.selectedSlotIndex=0;debits.length=0;props.length=0;
formAction=()=>{p.selectedSlotIndex=1;return 0};await ctx.enhanceHeldGear(p);assert.equal(inventory.get(0).typeId,'hakkai:series_leggings_00');assert.equal(inventory.get(1).typeId,'hakkai:series_leggings_00');assert.equal(debits.length,0);assert.equal(props.length,0);
// Same-slot item change and insufficient materials both leave all state unchanged.
p.selectedSlotIndex=0;formAction=()=>{inventory.set(0,{typeId:'minecraft:diamond',amount:1});return 0};await ctx.enhanceHeldGear(p);assert.equal(inventory.get(0).typeId,'minecraft:diamond');assert.equal(debits.length,0);
inventory.set(0,{typeId:'hakkai:series_leggings_00',amount:1});formAction=()=>0;available=0;await ctx.enhanceHeldGear(p);assert.equal(inventory.get(0).typeId,'hakkai:series_leggings_00');assert.equal(debits.length,0);assert.ok(notices.some(s=>s.includes('素材が足りません')));
// The same guard also protects legacy gear, even when the new selected slot
// holds an item of exactly the same type as the original.
available=100;p.selectedSlotIndex=0;inventory.set(0,{typeId:'hakkai:gear_010',amount:1});inventory.set(1,{typeId:'hakkai:gear_010',amount:1});formAction=()=>{p.selectedSlotIndex=1;return 0};
await ctx.enhanceHeldGear(p);assert.equal(inventory.get(0).typeId,'hakkai:gear_010');assert.equal(inventory.get(1).typeId,'hakkai:gear_010');assert.equal(debits.length,0);
p.selectedSlotIndex=0;formAction=()=>0;await ctx.enhanceHeldGear(p);assert.equal(inventory.get(0).typeId,'hakkai:gear_090');assert.equal(debits.length,3);
console.log('Leg evolution chains, materials, legacy gear, slot changes and insufficient resources (mocked)');
