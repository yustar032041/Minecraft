import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {inventoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
import {awardCoopBoss,COOP_BOSS_REWARDS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/boss_rewards.js';
import {createGuardianMultiplayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_multiplayer.js';

const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class ItemStack{
 constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.maxAmount=64;}
 clone(){return new ItemStack(this.typeId,this.amount)}
 isStackableWith(other){return this.typeId===other.typeId}
}
class Inventory{
 constructor(items){this.items=items;this.size=items.length;this.writes=0;this.failAt=0;this.alwaysFail=false;}
 getItem(i){return this.items[i]?.clone()}
 setItem(i,item){this.items[i]=item?.clone();this.writes++;if(this.alwaysFail||this.writes===this.failAt)throw Error('failure after write');}
}
function fixture(){
 const reports=[],drops=[],messages=[],props=new Map();
 const dim={id:'realm',spawnItem:(item)=>drops.push(item.typeId),spawnParticle:()=>{}};
 const p={id:'player',typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=> 'survival',sendMessage:m=>messages.push(m),playSound:()=>{}};
 const ctx={inventoryTransaction,ItemStack,space:p=>p.inventory,report:(...x)=>reports.push(x)};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function giveStatus('),source.indexOf('function exchange(')),ctx);
 function guardianKill(){
  let handler;const guardianMultiplayer=createGuardianMultiplayer({spectator:'spectator'});
  Object.assign(ctx,{guardianMultiplayer,COOP_BOSS_REWARDS:{},system:{currentTick:10},ns:'hakkai:',safeSub:(_a,_b,_n,fn)=>handler=fn,
   num:(_p,k)=>props.get(k)??0,property:(_p,k,v)=>props.set(k,v),guardians:Array.from({length:8},(_,i)=>`guardian ${i}`),vanillaDrops:{}});
  const start=source.indexOf("safeSub('world','after','entityDie',({deadEntity,damageSource})=>{");
  const end=source.indexOf("safeSub('world','after','entityDie',e=>",start);
  vm.runInContext(source.slice(start,end),ctx);
  handler({deadEntity:{id:'g',typeId:'hakkai:guardian_0',dimension:dim,location:{x:0,y:0,z:0}},damageSource:{damagingEntity:p}});
 }
 return {p,ctx,props,drops,messages,reports,guardianKill};
}
test('actual transaction distinguishes success, known full, and mutation followed by throw',()=>{
 const f=fixture();f.p.inventory=new Inventory([undefined]);assert.equal(f.ctx.giveStatus(f.p,'core'), 'ok');assert.equal(f.p.inventory.items[0].typeId,'core');
 f.p.inventory=new Inventory([new ItemStack('stone',64)]);assert.equal(f.ctx.giveStatus(f.p,'core'),'full');assert.equal(f.p.inventory.writes,0);
 f.p.inventory=new Inventory([undefined]);f.p.inventory.failAt=1;assert.equal(f.ctx.giveStatus(f.p,'core'),'error');assert.equal(f.p.inventory.items[0],undefined);assert.ok(f.reports.length);
});
test('guardian does not spawn a fallback on uncertain write failure; its claim remains open',()=>{
 const f=fixture();f.p.inventory=new Inventory([undefined]);f.p.inventory.failAt=1;f.guardianKill();
 assert.deepEqual(f.drops,[]);assert.equal(f.p.inventory.items[0],undefined);assert.equal(f.props.get('guards'),1);assert.equal(f.props.get('guardian_core_claims'),undefined);assert.match(f.messages[0],/持ち物と記録を確認/);
});
test('failed restoration remains uncertain and is never retried as a ground item',()=>{
 const f=fixture();f.p.inventory=new Inventory([undefined]);f.p.inventory.alwaysFail=true;
 awardCoopBoss({typeId:'hakkai:ender_0'},[f.p],{property:()=>{},giveStatus:f.ctx.giveStatus,ItemStack,report:(...x)=>f.reports.push(x)});
 assert.deepEqual(f.drops,[]);assert.ok(f.reports.some(([message])=>message.includes('復旧失敗')));assert.match(f.messages[0],/持ち物と記録を確認/);
});
test('known full inventory still uses the existing shared drop behavior',()=>{
 const f=fixture();f.p.inventory=new Inventory([new ItemStack('stone',64)]);f.guardianKill();assert.deepEqual(f.drops,['hakkai:guardian_core_0']);assert.equal(f.props.get('guardian_core_claims'),1);
});
test('multi-item boss rewards stop subsequent inventory writes after uncertain failure',()=>{
 const f=fixture();f.p.inventory=new Inventory([undefined,undefined]);f.p.inventory.failAt=1;
 awardCoopBoss({typeId:'hakkai:time_warden'},[f.p],{property:(_p,k,v)=>f.props.set(k,v),giveStatus:f.ctx.giveStatus,ItemStack,report:(...x)=>f.reports.push(x)});
 assert.deepEqual(f.drops,[]);assert.equal(f.p.inventory.items[0],undefined);assert.equal(f.p.inventory.items[1],undefined);assert.equal(f.p.inventory.writes,2,'one failed write and one restoration, no second reward write');assert.equal(f.props.get('time_warden_clear'),1);assert.match(f.messages[0],/持ち物と記録を確認/);
});
test('a later failed reward leaves an earlier successful reward and completion record intact',()=>{
 const f=fixture();f.p.inventory=new Inventory([undefined,undefined]);f.p.inventory.failAt=2;
 awardCoopBoss({typeId:'hakkai:time_warden'},[f.p],{property:(_p,k,v)=>f.props.set(k,v),giveStatus:f.ctx.giveStatus,ItemStack,report:(...x)=>f.reports.push(x)});
 assert.equal(f.p.inventory.items[0].typeId,'hakkai:warden_core');assert.equal(f.p.inventory.items[1],undefined);assert.equal(f.props.get('time_warden_clear'),1);assert.deepEqual(f.drops,[]);assert.match(f.messages[0],/持ち物と記録を確認/);
});
