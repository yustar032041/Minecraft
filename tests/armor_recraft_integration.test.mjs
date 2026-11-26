// Production board handlers plus the production progress/inventory transaction.
// Bedrock inventory, properties and forms are mocked; engine atomicity is not assumed.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {progressReward} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class Item {
 constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.maxAmount=/hakkai:gear_\d+$/.test(typeId)?1:64}
 clone(){return new Item(this.typeId,this.amount)}
 isStackableWith(x){return this.maxAmount>1&&this.typeId===x.typeId}
}
class Inventory {
 constructor(){this.size=100;this.items=Array(this.size).fill(undefined);this.writes=0}
 getItem(i){return this.items[i]?.clone()}
 setItem(i,x){this.items[i]=x?.clone();if(++this.writes===this.failAt){this.failAt=0;throw Error('inventory changed then failed')}}
 add(id,n=1){while(n){let i=this.items.findIndex(x=>x?.typeId===id&&x.amount<x.maxAmount);if(i<0)i=this.items.findIndex(x=>!x);assert.ok(i>=0);const x=this.items[i]??new Item(id,0);const amount=Math.min(n,x.maxAmount-x.amount);x.amount+=amount;this.items[i]=x;n-=amount}}
 count(id){return this.items.reduce((n,x)=>n+(x?.typeId===id?x.amount:0),0)}
 remove(id,n=1){for(let i=0;i<this.size&&n;i++){const x=this.items[i];if(x?.typeId!==id)continue;let k=Math.min(n,x.amount);n-=k;x.amount-=k;if(!x.amount)this.items[i]=undefined}assert.equal(n,0)}
 snapshot(){return this.items.map(x=>x&&[x.typeId,x.amount])}
}
function fixture(){
 const pending=[],notices=[],reports=[],messages=[];let rank=7;
 const ctx={ns:'hakkai:',ItemStack:Item,progressReward,space:p=>p.inv,report:(...x)=>reports.push(x),notice:(_p,m)=>notices.push(m),num:(p,k,d=0)=>p.props.get('hakkai:'+k)??d,
  realmRankIndex:()=>rank,realmRanks:Array.from({length:8},(_,i)=>[i,'rank'+i]),guardians:Array.from({length:8},(_,i)=>'guardian'+i),guardianCoreNames:Array.from({length:8},(_,i)=>'core'+i),
  total:(c,id)=>c.count(id),form:(_p,title,body)=>new Promise(resolve=>pending.push({resolve,title,body})),system:{currentTick:100},simple:()=>{}};
 vm.createContext(ctx);
 function load(start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert.ok(a>=0&&b>a,start);vm.runInContext(src.slice(a,b),ctx)}
 load('function deliverTrial(', 'function persist(');
 load('const guardianLegacyGear=[','function applyGuardianLegacyEffects(');
 load('async function finalAwakeningTrial(', 'async function finalChronicle(');
 load('const realmAscendedGear=[','function applyRealmAwakenedEffects(');
 load('const realmAwakenedGear=[','function applyRealmAwakenedVisual(');
 load('async function nightwalkerAwakeningTrial(', 'function applyNightwalkerAwakeningVisual(');
 function player(){let inv=new Inventory(),props=new Map();return {inv,props,isValid:true,location:{x:0,y:0,z:0},dimension:{spawnParticle(){}},playSound(){},sendMessage:m=>messages.push(m),getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);if(this.failKey===k){this.failKey=undefined;throw Error('property changed then failed')}}}}
 async function submit(name,p,pick=0){const task=ctx[name](p),form=pending.shift();assert.ok(form);form.resolve(pick);await task;return form}
 return {ctx,pending,notices,reports,messages,player,submit,setRank:v=>rank=v};
}
const add=(p,id,n=1)=>p.inv.add(id.includes(':')?id:'hakkai:'+id,n);
const count=(p,id)=>p.inv.count(id.includes(':')?id:'hakkai:'+id);
const prop=(p,k)=>p.props.get('hakkai:'+k);
function resources(p,i){add(p,`crystal_${i}`,14);add(p,`shard_${i}`,20);add(p,`guardian_core_${i}`);add(p,'minecraft:emerald',72);add(p,'minecraft:diamond',2);add(p,'minecraft:ancient_debris')}
function finalResources(p){for(let i=0;i<8;i++)add(p,`guardian_core_${i}`);add(p,'minecraft:emerald',128);add(p,'minecraft:netherite_ingot')}
test('all eight chains can be remade after loss through the final chest; first-only rewards stay first-only',async()=>{
 const f=fixture(),p=f.player();p.props.set('hakkai:guards',255);
 for(let round=0;round<2;round++){
  for(let i=0;i<8;i++){
   resources(p,i);await f.submit('realmAwakeningBoard',p,i);assert.equal(count(p,`gear_${188+i}`),1);
   await f.submit('realmAscensionBoard',p,i);assert.equal(count(p,`gear_${196+i}`),1);
   await f.submit('guardianLegacyForge',p,i);assert.equal(count(p,`gear_${204+i}`),1);
  }
  await f.submit('guardianLegacyForge',p,8);assert.equal(count(p,'gear_212'),1);
  finalResources(p);await f.submit('finalAwakeningTrial',p);assert.equal(count(p,'gear_213'),1);assert.equal(count(p,'wind_legacy_memorial'),1);
  if(!round)p.inv.remove('hakkai:gear_213'); // lost the first armor, not the achievement
 }
 assert.equal(prop(p,'realm_awakened_claims'),255);assert.equal(prop(p,'realm_ascended_claims'),255);assert.equal(prop(p,'guardian_legacy_claims'),255);assert.equal(prop(p,'final_title_unlocked'),1);
 assert.equal(f.messages.filter(m=>m.includes('称号獲得')).length,1);
});
test('already owned armor can be crafted again only by paying the same costs; rank and records are checked',async()=>{
 const f=fixture(),p=f.player();resources(p,0);resources(p,0);
 await f.submit('realmAwakeningBoard',p);assert.equal(count(p,'gear_188'),0);
 p.props.set('hakkai:guards',1);await f.submit('realmAwakeningBoard',p);await f.submit('realmAwakeningBoard',p);assert.equal(count(p,'gear_188'),2);assert.equal(count(p,'crystal_0'),20);assert.equal(count(p,'minecraft:diamond'),2);
 f.setRank(0);add(p,'gear_196');add(p,'guardian_core_0');add(p,'crystal_0',4);add(p,'minecraft:emerald',32);add(p,'minecraft:ancient_debris');await f.submit('guardianLegacyForge',p);assert.equal(count(p,'gear_204'),0);assert.equal(count(p,'gear_196'),1);
});
test('nightwalker re-craft retains the original completion time and checks rank and guard records',async()=>{
 const f=fixture(),p=f.player();p.props.set('hakkai:guards',255);
 function nightCosts(){add(p,'gear_186');add(p,'crystal_6',8);add(p,'shard_18',8);add(p,'chronicle_fragment',4);add(p,'minecraft:emerald',32);add(p,'minecraft:netherite_scrap',2)}
 nightCosts();await f.submit('nightwalkerAwakeningTrial',p);assert.equal(count(p,'gear_187'),1);assert.equal(prop(p,'nightwalker_awakened_at'),100);
 p.inv.remove('hakkai:gear_187');nightCosts();f.ctx.system.currentTick=300;p.props.set('hakkai:guards',1);await f.submit('nightwalkerAwakeningTrial',p);assert.equal(count(p,'gear_186'),1);
 p.props.set('hakkai:guards',255);await f.submit('nightwalkerAwakeningTrial',p);assert.equal(count(p,'gear_187'),1);assert.equal(prop(p,'nightwalker_awakened_at'),100);
});
test('overlapping final forms recheck costs and first-only reward after each form resolves',async()=>{
 const f=fixture(),p=f.player();p.props.set('hakkai:guards',255);for(let i=0;i<2;i++){add(p,'gear_212');finalResources(p)}
 const a=f.ctx.finalAwakeningTrial(p),b=f.ctx.finalAwakeningTrial(p);f.pending.shift().resolve(0);await a;f.pending.shift().resolve(0);await b;
 assert.equal(count(p,'gear_213'),2);assert.equal(count(p,'wind_legacy_memorial'),1);assert.equal(f.messages.filter(m=>m.includes('称号獲得')).length,1);assert.equal(count(p,'gear_212'),0);
});
test('write failures roll back first and repeated crafts; other players remain independent',async()=>{
 const f=fixture(),p=f.player(),other=f.player();for(const x of [p,other]){x.props.set('hakkai:guards',1);resources(x,0)}
 const original=p.inv.snapshot();p.failKey='hakkai:realm_awakened_claims';await f.submit('realmAwakeningBoard',p);assert.deepEqual(p.inv.snapshot(),original);assert.equal(prop(p,'realm_awakened_claims'),undefined);
 await f.submit('realmAwakeningBoard',other);assert.equal(count(other,'gear_188'),1);assert.equal(count(p,'gear_188'),0);
 p.inv.failAt=p.inv.writes+1;await f.submit('realmAwakeningBoard',p);assert.deepEqual(p.inv.snapshot(),original);assert.equal(prop(p,'realm_awakened_claims'),undefined);
 await f.submit('realmAwakeningBoard',p);resources(p,0);const before=p.inv.snapshot();p.failKey='hakkai:realm_awakened_claims';await f.submit('realmAwakeningBoard',p);assert.deepEqual(p.inv.snapshot(),before);assert.equal(prop(p,'realm_awakened_claims'),1);
});
test('full inventory and final title write failure do not consume materials or award first-only items',async()=>{
 const f=fixture(),p=f.player();p.props.set('hakkai:guards',255);resources(p,0);
 // Every cost remains in a partly consumed stack, so no slot becomes free.
 add(p,'minecraft:diamond');
 for(let i=0;i<p.inv.size;i++)if(!p.inv.items[i])p.inv.items[i]=new Item('minecraft:stone',64);
 let before=p.inv.snapshot();await f.submit('realmAwakeningBoard',p);assert.deepEqual(p.inv.snapshot(),before);assert.equal(prop(p,'realm_awakened_claims'),undefined);assert.match(f.notices.at(-1),/空き/);
 const q=f.player();q.props.set('hakkai:guards',255);add(q,'gear_212');finalResources(q);before=q.inv.snapshot();q.failKey='hakkai:final_title_unlocked';await f.submit('finalAwakeningTrial',q);
 assert.deepEqual(q.inv.snapshot(),before);assert.equal(prop(q,'final_awakening_complete'),undefined);assert.equal(prop(q,'final_title_unlocked'),undefined);assert.equal(count(q,'wind_legacy_memorial'),0);
 await f.submit('finalAwakeningTrial',q);assert.equal(count(q,'gear_213'),1);assert.equal(count(q,'wind_legacy_memorial'),1);
});
