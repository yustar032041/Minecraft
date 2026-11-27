import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {useDodgeScroll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/dodge_scroll.js';
function fixture(count=2){
 const stack=(id,n)=>({typeId:id,get amount(){return n},set amount(v){if(v<1)throw Error('invalid amount');n=v},clone(){return stack(this.typeId,this.amount)}});
 let item=stack('hakkai:dodge_scroll',count),effect,applied=[],fail=false;
 const container={getItem:i=>i===2?item:undefined,setItem:(i,v)=>{assert.equal(i,2);item=v;}};
 const p={isValid:true,selectedSlotIndex:2,getComponent:()=>({container}),getEffect:()=>effect,addEffect:(...args)=>{applied.push(args);if(fail)throw Error('unavailable');return {}}};
 return {p,get item(){return item},applied,setEffect:v=>effect=v,fail:()=>fail=true};
}
test('scroll applies an eight-second speed aid, consuming the held stack only',()=>{
 const f=fixture();assert.equal(useDodgeScroll(f.p),'used');assert.equal(f.item.amount,1);
 assert.deepEqual(f.applied,[['speed',160,{amplifier:0,showParticles:true}]]);
 assert.equal(useDodgeScroll(f.p),'used');assert.equal(f.item,undefined);
});
test('does not waste a scroll on stronger or longer speed and refuses a changed slot',()=>{
 const f=fixture();for(const e of [{amplifier:1,duration:2},{amplifier:0,duration:160}]){f.setEffect(e);assert.equal(useDodgeScroll(f.p),'already');assert.equal(f.item.amount,2);}
 f.setEffect({amplifier:0,duration:159});assert.equal(useDodgeScroll(f.p),'used');assert.equal(f.item.amount,1);
 f.p.selectedSlotIndex=0;assert.equal(useDodgeScroll(f.p),'changed');assert.equal(f.item.amount,1);
});
test('creative keeps item, and failure restores the original stack',()=>{
 const f=fixture();assert.equal(useDodgeScroll(f.p,true),'used');assert.equal(f.item.amount,2);
 f.fail();assert.equal(useDodgeScroll(f.p),'failed');assert.equal(f.item.amount,2);
 const g=fixture(1);g.p.addEffect=()=>undefined;assert.equal(useDodgeScroll(g.p),'used');assert.equal(g.item,undefined);
 g.p.isValid=false;assert.equal(useDodgeScroll(g.p),'invalid');
});
test('item and real use handler register the scroll',()=>{
 const item=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/items/dodge_scroll.json','utf8'))['minecraft:item'].components;
 assert.ok(item['hakkai:use']);assert.ok(item['minecraft:interact_button']);
 const s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 assert.ok(s.includes("if(id===ns+'dodge_scroll')"));assert.ok(s.includes('useDodgeScroll(p,isCreative(p))'));assert.ok(fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/combat_guide.js','utf8').includes('無敵や攻撃回避ではありません'));
});
test('a slot write that mutates then throws still attempts to restore the scroll',()=>{
 const f=fixture(1),container=f.p.getComponent().container,write=container.setItem;let fail=true;
 container.setItem=(i,v)=>{write(i,v);if(fail){fail=false;throw Error('failed after mutation')}};
 // Retain the same container for every getComponent call.
 f.p.getComponent=()=>({container});assert.equal(useDodgeScroll(f.p),'failed');assert.equal(f.item.typeId,'hakkai:dodge_scroll');assert.equal(f.item.amount,1);assert.equal(f.applied.length,0);
});
