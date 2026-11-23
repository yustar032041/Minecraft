import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupCustomShield} from '../Hakkai_v7.1.0/BehaviorPack/scripts/custom_shield.js';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {EntityDamageCause as Cause,EquipmentSlot as Slot,GameMode} from '@minecraft/server';
const shields=catalog.filter(g=>g.kind==='盾');assert.equal(shields.length,12);
const d={id:'hakkai:realm_0'},items={};
const p={id:'player',typeId:'minecraft:player',isValid:true,isSneaking:true,isSwimming:false,selectedSlotIndex:0,dimension:d,location:{x:0,y:80,z:0},getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=>GameMode.Survival,getComponent:()=>({getEquipment:s=>items[s]})};
const enemy={isValid:true,dimension:d,location:{x:3,y:80,z:0}},source={cause:Cause.entityAttack,damagingEntity:enemy};
for(const shield of shields){
 const file=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/items/${shield.id}.json`));assert.equal(file['minecraft:item'].components['minecraft:allow_off_hand'],true);
 for(const slot of [Slot.Offhand,Slot.Mainhand]){
  delete items[Slot.Offhand];delete items[Slot.Mainhand];items[slot]={typeId:'hakkai:'+shield.id};
  const ctrl=setupCustomShield({catalog});ctrl.tick(p,0);assert.equal(ctrl.blocks(p,source,4),false);assert.equal(ctrl.blocks(p,source,5),true,`${shield.id} ${slot}`);
  const rear={...enemy,location:{x:-4,y:80,z:0}};assert.equal(ctrl.blocks(p,{...source,damagingEntity:rear},6),false);
  assert.equal(ctrl.blocks(p,{cause:Cause.projectile,damagingProjectile:enemy},6),true);assert.equal(ctrl.blocks(p,{cause:Cause.fall,damagingEntity:enemy},6),false);
  p.isSneaking=false;assert.equal(ctrl.blocks(p,source,6),false);p.isSneaking=true;
  delete items[slot];assert.equal(ctrl.blocks(p,source,6),false,'equipment changes take effect before next tick');
 }
}
{
 items[Slot.Offhand]={typeId:'hakkai:gear_006'};const ctrl=setupCustomShield({catalog});ctrl.tick(p,0);
 const q={...p,id:'second'};assert.equal(ctrl.blocks(q,source,5),false,'per player');
 p.isSwimming=true;assert.equal(ctrl.blocks(p,source,5),false);p.isSwimming=false;
 p.getGameMode=()=>GameMode.Spectator;assert.equal(ctrl.blocks(p,source,5),false);p.getGameMode=()=>GameMode.Survival;
 assert.equal(ctrl.blocks(p,{cause:Cause.projectile},5),false,'unknown source is never blocked');
 ctrl.clear(p.id);assert.equal(ctrl.blocks(p,source,5),false);
}
// A confirmed axe block starts a player-wide cooldown, unaffected by swapping.
for(const axe of ['minecraft:iron_axe','hakkai:gear_001','hakkai:ult_axe']){
 items[Slot.Offhand]={typeId:'hakkai:gear_006'};items[Slot.Mainhand]=undefined;
 const ctrl=setupCustomShield({catalog}),attacker={...enemy,getComponent:()=>({getEquipment:()=>({typeId:axe})})};
 const strike={cause:Cause.entityAttack,damagingEntity:attacker};ctrl.tick(p,0);
 assert.equal(ctrl.blocks(p,strike,5),true);assert.equal(ctrl.recordBlock(p,strike,5),true);
 assert.equal(ctrl.blocks(p,source,6),false);assert.equal(ctrl.cooldown(p,6),99);
 items[Slot.Offhand]={typeId:'hakkai:gear_022'};p.isSneaking=false;ctrl.tick(p,10);p.isSneaking=true;ctrl.tick(p,11);
 assert.equal(ctrl.blocks(p,source,104),false);assert.equal(ctrl.blocks(p,source,105),true);
 ctrl.clear(p.id);assert.equal(ctrl.cooldown(p,105),0);
}
{
 items[Slot.Offhand]={typeId:'hakkai:gear_006'};const ctrl=setupCustomShield({catalog});ctrl.tick(p,0);
 const attacker={...enemy,getComponent:()=>({getEquipment:()=>({typeId:'minecraft:diamond_sword'})})};
 assert.equal(ctrl.recordBlock(p,{cause:Cause.entityAttack,damagingEntity:attacker},5),false);
 assert.equal(ctrl.recordBlock(p,{cause:Cause.projectile,damagingEntity:attacker},5),false);
 assert.equal(ctrl.blocks(p,source,6),true);
}
// Real hook: shield cancellation precedes damage, stamina guard and totem.
{
 const text=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const start=text.indexOf("safeSub('world','before','entityHurt',e=>{");
 const end=text.indexOf("const _melee=",start);let handler,totem=0,guard=0;
 items[Slot.Offhand]={typeId:'hakkai:gear_006'};const ctrl=setupCustomShield({catalog});ctrl.tick(p,0);
 const ctx={shieldWear:{reserve:()=>true},deferShieldArrow:()=>false,safeSub:(_a,_b,_c,fn)=>handler=fn,customShield:ctrl,system:{currentTick:5},EntityDamageCause:Cause,combatRoll:undefined,combatUltimate:undefined,combatParry:undefined,combatGuard:{scale:()=>{guard++;}},fushiTotem:{before:()=>totem++},isCreative:()=>false,armorItems:()=>[],gear:new Map(),selected:()=>undefined,num:()=>0};
 vm.createContext(ctx);vm.runInContext(text.slice(start,end),ctx);const e={cancel:false,hurtEntity:p,damageSource:source,damage:20};handler(e);
 assert.equal(e.cancel,true);assert.equal(totem,0);assert.equal(guard,0);
}
console.log('Custom shields: 12 IDs, both hands, direction, raise delay, stale equipment, source and hurt-hook precedence (simulated)');
