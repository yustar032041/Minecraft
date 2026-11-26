import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {inventoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
// Production after-interact callback and planner; event delivery is mocked.
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return this.typeId===x.typeId}}
class Inventory{constructor(items){this.items=items;this.size=items.length;this.writes=0}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone();if(++this.writes===this.failAt){this.failAt=0;throw Error('slot mutated')}}}
function setup(type='sheep'){
 const s=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=s.indexOf('const ranchFood='),b=s.indexOf('const nativeMobStrikes=',a);assert.ok(a>0&&b>a);
 let handler,day=4;const notes=[],reports=[],props=new Map();
 const target={isValid:true,typeId:'minecraft:'+type,getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);if(this.fail){this.fail=false;throw Error('property mutated')}}};
 const player=(items=[undefined])=>({mode:'survival',getGameMode(){return this.mode},inv:new Inventory(items)});
 const ctx={ns:'hakkai:',safeSub:(_a,_b,_c,fn)=>handler=fn,GameMode:{Survival:'survival'},seasonDay:()=>day,num:(e,k,f)=>e.getDynamicProperty('hakkai:'+k)??f,property:(e,k,v)=>e.setDynamicProperty('hakkai:'+k,v),inventoryTransaction,ItemStack:Item,space:p=>p.inv,notice:(_p,v)=>notes.push(v),report:(...x)=>reports.push(x)};
 vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
 const feed=(p,id='minecraft:wheat',before=2,after=1)=>handler({player:p,target,beforeItemStack:{typeId:id,amount:before},itemStack:after===null?undefined:{typeId:id,amount:after}});
 return {player,target,feed,props,notes,reports,day:n=>day=n};
}
test('feeding pays one bone meal per animal/day; full inventory permits later retry',()=>{
 const f=setup(),p=f.player();f.feed(p,'minecraft:wheat',2,2);assert.equal(p.inv.items[0],undefined);
 f.feed(p);assert.equal(p.inv.items[0].typeId,'minecraft:bone_meal');assert.equal(f.props.get('hakkai:ranch_day'),4);f.feed(p);assert.equal(p.inv.items[0].amount,1);
 f.day(5);p.inv.items[0]=new Item('stone',64);f.feed(p);assert.equal(f.props.get('hakkai:ranch_day'),4);
 p.inv.items[0]=undefined;f.feed(p,'minecraft:wheat',1,null);assert.equal(p.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:ranch_day'),5);
});
test('slot and animal-property failure after mutation restore the reward and daily marker',()=>{
 for(const fault of ['slot','property']){const f=setup(),p=f.player();if(fault==='slot')p.inv.failAt=1;else f.target.fail=true;f.feed(p);assert.equal(p.inv.items[0],undefined);assert.equal(f.props.has('hakkai:ranch_day'),false);assert.ok(f.reports.length);f.feed(p);assert.equal(p.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:ranch_day'),4)}
});
test('players share an animal daily marker, while different animals remain independent',()=>{
 const f=setup(),g=setup(),a=f.player(),b=f.player();f.feed(a);f.feed(b);assert.equal(a.inv.items[0].amount,1);assert.equal(b.inv.items[0],undefined);g.feed(b);assert.equal(b.inv.items[0].amount,1);
});
test('only accepted vanilla feeding items and survival consumption qualify',()=>{
 for(const [animal,id] of [['cow','minecraft:wheat'],['sheep','minecraft:wheat'],['pig','minecraft:carrot'],['pig','minecraft:potato'],['pig','minecraft:beetroot'],...['wheat_seeds','beetroot_seeds','pumpkin_seeds','melon_seeds','torchflower_seeds','pitcher_pod'].map(x=>['chicken','minecraft:'+x])]){const f=setup(animal),p=f.player();f.feed(p,id);assert.equal(p.inv.items[0].typeId,'minecraft:bone_meal',`${animal}:${id}`)}
 const f=setup('pig'),p=f.player();f.feed(p,'minecraft:wheat');p.mode='creative';f.feed(p,'minecraft:carrot');assert.equal(p.inv.items[0],undefined);assert.equal(f.props.size,0);
});
