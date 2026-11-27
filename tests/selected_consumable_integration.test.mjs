import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {useSelectedConsumable} from '../Hakkai_v7.1.0/BehaviorPack/scripts/selected_consumable.js';
import {castNewMagic} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_magic.js';
import {isRecoveryFood} from '../Hakkai_v7.1.0/BehaviorPack/scripts/food_recovery.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class Item{
 constructor(typeId,amount=1,tag=''){Object.assign(this,{typeId,amount,tag})}
 clone(){return new Item(this.typeId,this.amount,this.tag)}
}
class Inventory{
 constructor(items){this.items=items;this.size=items.length;this.writes=0;this.failAt=0;this.alwaysFail=false}
 getItem(i){return this.items[i]?.clone()}
 setItem(i,item){this.items[i]=item?.clone();this.writes++;if(this.alwaysFail||this.writes===this.failAt)throw Error('after mutation')}
}
function fixture(id,count=1){
 const inv=new Inventory([new Item(id,1,'other'),new Item(id,count,'selected')]),notices=[],reports=[],effects=[];
 const h={currentValue:10,effectiveMax:20,setCurrentValue(v){this.currentValue=v}};
 const dim={id:'realm',getEntities:()=>[],spawnParticle:()=>{}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,selectedSlotIndex:1,dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=> 'survival',getComponent:c=>c==='minecraft:inventory'?{container:inv}:c==='minecraft:health'?h:undefined,
  addEffect:(...args)=>{effects.push(args);return {}},playAnimation:()=>{},playSound:()=>{}};
 const st={s:50,m:10,cd:new Map(),useTick:0},system={currentTick:100};
 const ctx={useSelectedConsumable,isRecoveryFood,selected:p=>inv.getItem(p.selectedSlotIndex),ns:'hakkai:',GameMode:{Spectator:'spectator'},gear:new Map(),state:()=>st,system,isCreative:p=>p.getGameMode()==='creative',max:100,
  bounds:(x,a,b)=>Math.min(b,Math.max(a,x)),notice:(_p,msg)=>notices.push(msg),report:(...x)=>reports.push(x),castNewMagic,mark:()=>{},visibleFrom:()=>true,combatParry:undefined,mobSystem:undefined,realmEnders:undefined};
 vm.createContext(ctx);
 const start=source.indexOf('function use(e){'),end=source.indexOf('system.runInterval(()=>{',start);vm.runInContext(source.slice(start,end),ctx);
 const a=source.indexOf('function castMagic(p,kind){'),b=source.indexOf('async function totemMagicMenu(',a);vm.runInContext(source.slice(a,b),ctx);
 return {p,inv,st,ctx,h,effects,notices,reports,use:id=>ctx.use({source:p,itemStack:{typeId:id}})};
}
test('selected-only payment preserves a matching earlier tagged stack and decrements exact held stack',()=>{
 const f=fixture('hakkai:bandage',3);f.use('hakkai:bandage');assert.equal(f.inv.items[0].tag,'other');assert.equal(f.inv.items[0].amount,1);assert.equal(f.inv.items[1].tag,'selected');assert.equal(f.inv.items[1].amount,2);
 assert.deepEqual(f.effects.map(x=>x[0]),['instant_health']);assert.match(f.notices.at(-1),/使いました/);
});
test('mana tonic restores up to 45, observes cap and does not take another inventory slot',()=>{
 const f=fixture('hakkai:mana_tonic');f.st.m=80;f.use('hakkai:mana_tonic');assert.equal(f.st.m,100);assert.equal(f.inv.items[0].tag,'other');assert.equal(f.inv.items[1],undefined);
 f.st.useTick=0;f.p.selectedSlotIndex=0;f.use('hakkai:mana_tonic');assert.equal(f.inv.items[0].tag,'other');assert.match(f.notices.at(-1),/満タン/);
});
test('held slot change and missing health prevent consumption, including creative',()=>{
 const f=fixture('hakkai:mana_tonic');f.inv.items[1]=new Item('minecraft:stone');f.p.getGameMode=()=> 'creative';f.use('hakkai:mana_tonic');assert.equal(f.st.m,10);assert.equal(f.inv.items[0].tag,'other');assert.equal(f.inv.writes,0);
 const g=fixture('hakkai:bandage');g.h.currentValue=g.h.effectiveMax;g.use('hakkai:bandage');assert.equal(g.inv.writes,0);assert.equal(g.effects.length,0);
});
test('creative uses medicine without changing the selected item',()=>{
 const f=fixture('hakkai:bandage',2);f.p.getGameMode=()=> 'creative';f.use('hakkai:bandage');assert.equal(f.inv.writes,0);assert.equal(f.inv.items[1].amount,2);assert.equal(f.effects.length,1);
});
test('post-mutation write error and effect exception restore selected stack',()=>{
 const f=fixture('hakkai:mana_tonic');f.inv.failAt=1;f.use('hakkai:mana_tonic');assert.equal(f.st.m,10);assert.equal(f.inv.items[1].tag,'selected');assert.match(f.notices.at(-1),/使えません/);
 for(const outcome of [()=>{throw Error('effect')}]){
  const g=fixture('hakkai:bandage',2);g.p.addEffect=outcome;g.use('hakkai:bandage');assert.equal(g.inv.items[0].tag,'other');assert.equal(g.inv.items[1].tag,'selected');assert.equal(g.inv.items[1].amount,2);assert.match(g.notices.at(-1),/使えません/);
 }
});
test('restoration failure is reported rather than silently claiming success',()=>{
 const f=fixture('hakkai:bandage');f.inv.alwaysFail=true;f.use('hakkai:bandage');assert.ok(f.reports.some(([key])=>key==='旅の包帯'));assert.equal(f.effects.length,0);assert.match(f.notices.at(-1),/使えません/);
});
test('actual moon magic keeps the held totem and starts an independent cooldown',()=>{
 const f=fixture('hakkai:fushi_totem');f.st.m=50;assert.equal(f.ctx.castMagic(f.p,'moon'),true);
 assert.equal(f.inv.items[0].tag,'other');assert.equal(f.inv.items[1].tag,'selected');assert.equal(f.inv.writes,0);assert.equal(f.st.m,35);assert.equal(f.h.currentValue,18);
 assert.equal(f.ctx.castMagic(f.p,'moon'),false);assert.equal(f.st.m,35);assert.equal(f.st.cd.get('fushi_moon'),220);
 f.ctx.system.currentTick=220;assert.equal(f.ctx.castMagic(f.p,'moon'),true);assert.equal(f.inv.items[1].tag,'selected');assert.equal(f.st.m,20);
});
test('moon requires the totem in the selected hand even if another is in inventory',()=>{
 const f=fixture('hakkai:fushi_totem');f.inv.items[1]=new Item('minecraft:stone');f.st.m=50;
 assert.equal(f.ctx.castMagic(f.p,'moon'),false);assert.equal(f.inv.items[0].tag,'other');assert.equal(f.st.m,50);assert.equal(f.st.cd.size,0);assert.equal(f.h.currentValue,10);
});
test('invalid slots and post-consume callback failure fail closed with selected item intact',()=>{
 const f=fixture('hakkai:bandage',2);f.p.selectedSlotIndex=99;assert.equal(useSelectedConsumable(f.p,'hakkai:bandage',false),'changed');f.p.selectedSlotIndex=1;
 assert.equal(useSelectedConsumable(f.p,'hakkai:bandage',false,()=>false),'failed');assert.equal(f.inv.items[1].amount,2);
 f.p.isValid=false;assert.equal(useSelectedConsumable(f.p,'hakkai:bandage',false),'invalid');
});

test('instant-health call returning undefined is not treated as failure',()=>{
 const f=fixture('hakkai:bandage',2);let calls=0;f.p.addEffect=()=>{calls++;return undefined};f.use('hakkai:bandage');assert.equal(calls,1);assert.equal(f.inv.items[1].amount,1);assert.match(f.notices.at(-1),/使いました/);
});
