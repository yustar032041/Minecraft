import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {setupCustomShield} from '../Hakkai_v7.1.0/BehaviorPack/scripts/custom_shield.js';
import {setupShieldWear} from '../Hakkai_v7.1.0/BehaviorPack/scripts/shield_wear.js';
import {deferShieldArrow} from '../Hakkai_v7.1.0/BehaviorPack/scripts/shield_reflect.js';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {EquipmentSlot as Slot,GameMode,EntityDamageCause as Cause} from '@minecraft/server';
function item(props={},damage=0){const d={damage,maxDurability:40,unbreakable:false};return {typeId:'hakkai:gear_006',getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>props[k]=v,getComponent:()=>d,copy:()=>item({...props},d.damage)};}
const slots={[Slot.Offhand]:item()},queue=[],dim={id:'realm'},eq={getEquipment:s=>slots[s]?.copy(),setEquipment:(s,i)=>{slots[s]=i?.copy();return true}};
const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isSwimming:false,selectedSlotIndex:0,dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=>GameMode.Survival,getComponent:()=>eq,getViewDirection:()=>({x:1,y:0,z:0}),playSound:()=>{}};
let shot=0;const comp={shoot:()=>shot++},arrow={typeId:'minecraft:arrow',isValid:true,dimension:dim,location:{x:1,y:0,z:0},getVelocity:()=>({x:-1,y:0,z:0}),getComponent:()=>comp,clearVelocity:()=>{}};
const system={currentTick:0,run:f=>queue.push(f)},wear=setupShieldWear({system}),shield=setupCustomShield({catalog,prepare:wear.prepare});shield.tick(p,0);system.currentTick=5;
let hook;const context={safeSub:(_a,_b,_c,fn)=>hook=fn,customShield:shield,shieldWear:wear,deferShieldArrow,system,EntityDamageCause:Cause,combatRoll:undefined,combatUltimate:undefined,combatParry:undefined,combatGuard:undefined,fushiTotem:undefined,isCreative:()=>false,armorItems:()=>[],gear:new Map(),selected:()=>undefined,num:()=>0,notice:()=>{}};
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),start=main.indexOf("safeSub('world','before','entityHurt',e=>{"),end=main.indexOf('const _melee=',start);vm.createContext(context);vm.runInContext(main.slice(start,end),context);
const e={cancel:false,hurtEntity:p,damage:5,damageSource:{cause:Cause.projectile,damagingProjectile:arrow}};hook(e);
assert.equal(e.cancel,true);assert.equal(slots[Slot.Offhand].getComponent().damage,0);assert.equal(shot,0);
while(queue.length)queue.shift()();assert.equal(slots[Slot.Offhand].getComponent().damage,6);assert.equal(shot,1);
console.log('Actual hurt-hook: shield cancellation, deferred durability and arrow reflection integrated (simulated)');
