import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {inventoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class Item{
 constructor(typeId,amount=1,{name='sword',damage=0,lore=[],props={},enchants=[]}={}){Object.assign(this,{typeId,amount,maxAmount:typeId.endsWith('_sword')?1:64,nameTag:name,damage,lore:[...lore],props:{...props},enchants:[...enchants]})}
 clone(){return new Item(this.typeId,this.amount,{name:this.nameTag,damage:this.damage,lore:this.lore,props:this.props,enchants:this.enchants})}
 getDynamicPropertyIds(){return Object.keys(this.props)}getDynamicProperty(k){return this.props[k]}setDynamicProperty(k,v){this.props[k]=v}
 getLore(){return [...this.lore]}setLore(v){this.lore=[...v]}getCanDestroy(){return []}getCanPlaceOn(){return []}
 getComponent(k){return k==='minecraft:durability'?{damage:this.damage}:k==='minecraft:enchantable'?{getEnchantments:()=>this.enchants.map(([id,level])=>({type:{id},level}))}:undefined}
 isStackableWith(x){return this.typeId===x.typeId&&this.maxAmount>1}
}
class Inventory{constructor(items){this.items=items;this.size=items.length;this.writes=0;this.failAt=0}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone();if(++this.writes===this.failAt)throw Error('write after mutation')}}
function fixture(){
 const c=new Inventory([new Item('minecraft:diamond_sword',1,{name:'named',damage:12,lore:['old'],props:{custom:7},enchants:[['sharpness',4]]}),new Item('hakkai:crystal_0',2),new Item('hakkai:rune_book_0')]),pending=[],notes=[],p={isValid:true,selectedSlotIndex:0,location:{x:0,y:0,z:0},dimension:{id:'test',getBlock:()=>({typeId:'minecraft:enchanting_table'})},getGameMode:()=> 'survival'};
 const ctx={inventoryTransaction,ns:'hakkai:',space:()=>c,selected:()=>c.getItem(p.selectedSlotIndex),villagerNear:()=>true,num:()=>5,GameMode:{Spectator:'spectator'},dist:()=>0,isCreative:()=>false,report:()=>{},notice:(_p,x)=>notes.push(x),simple:()=>{},form:()=>new Promise(r=>pending.push(r)),paged:()=>new Promise(r=>pending.push(r))};
 const a=src.indexOf('const runes=['),b=src.indexOf('async function villageWatch(',a);vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);return {c,p,ctx,pending,notes};
}
test('direct engraving preserves sword metadata, consumes payment and rejects repeat',async()=>{
 const f=fixture(),task=f.ctx.runeForge(f.p,{dim:'test'});f.pending.shift()(0);await task;const x=f.c.items[0];assert.equal(x.props['hakkai:rune'],0);assert.equal(x.props.custom,7);assert.equal(x.nameTag,'named');assert.equal(x.damage,12);assert.deepEqual(x.enchants,[['sharpness',4]]);assert.deepEqual(x.lore,['old','§7風記：風の刻印']);assert.equal(f.c.items[1],undefined);
 await f.ctx.runeForge(f.p,{dim:'test'});assert.equal(f.c.items[0].props['hakkai:rune'],0);
});
test('write failure restores both sword and payment',async()=>{
 for(const failAt of [1,2]){const f=fixture();f.c.failAt=failAt;const task=f.ctx.runeForge(f.p,{dim:'test'});f.pending.shift()(0);await task;assert.equal(f.c.items[0].props['hakkai:rune'],undefined);assert.equal(f.c.items[1].amount,2);assert.match(f.notes.at(-1),/失敗/)}
});
test('stale changed metadata or selected slot does not charge or modify another sword',async()=>{
 for(const change of ['name','enchant','slot']){const f=fixture(),task=f.ctx.runeForge(f.p,{dim:'test'});if(change==='name')f.c.items[0].nameTag='different';else if(change==='enchant')f.c.items[0].enchants=[['sharpness',5]];else f.p.selectedSlotIndex=2;f.pending.shift()(0);await task;assert.equal(f.c.items[0].props['hakkai:rune'],undefined);assert.equal(f.c.items[1].amount,2);assert.match(f.notes.at(-1),/持ち替え/)}
});
test('book transfer updates chosen sword and consumes only one book, rejecting stale sword',async()=>{
 const f=fixture();f.p.selectedSlotIndex=2;let task=f.ctx.transferRuneBook(f.p,{dim:'test'},0);f.c.items[0].damage=13;f.pending.shift()(0);await task;assert.equal(f.c.items[2].amount,1);assert.equal(f.c.items[0].props['hakkai:rune'],undefined);
 task=f.ctx.transferRuneBook(f.p,{dim:'test'},0);f.pending.shift()(0);await task;assert.equal(f.c.items[2],undefined);assert.equal(f.c.items[0].props['hakkai:rune'],0);assert.equal(f.c.items[0].damage,13);
});
test('missing cost or invalid selection cannot grant a free inscription',async()=>{
 const f=fixture();f.c.items[1]=undefined;let task=f.ctx.runeForge(f.p,{dim:'test'});f.pending.shift()(0);await task;assert.equal(f.c.items[0].props['hakkai:rune'],undefined);assert.match(f.notes.at(-1),/足りません/);
 task=f.ctx.runeForge(f.p,{dim:'test'});f.pending.shift()(999);await task;assert.equal(f.c.items[0].props['hakkai:rune'],undefined);
});
