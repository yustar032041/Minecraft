// Cosmetic vanilla-weapon hooks, evaluated with mock event objects.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {vanillaWeaponKind,vanillaSwingMotion} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_motion.js';
import {setupBowTrail} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_bow_trail.js';

test('vanilla combat items use cosmetic motions but tools and addon IDs do not',()=>{
 for(const tier of ['wooden','stone','iron','golden','diamond','netherite']){
  assert.equal(vanillaWeaponKind(`minecraft:${tier}_sword`),'剣');assert.equal(vanillaWeaponKind(`minecraft:${tier}_axe`),'斧');
 }
 for(const [id,kind] of [['bow','弓'],['crossbow','弓'],['trident','槍'],['mace','ハンマー'],['shield','盾']])assert.equal(vanillaWeaponKind(`minecraft:${id}`),kind);
 for(const id of ['minecraft:diamond_pickaxe','minecraft:stick','hakkai:warden_blade_0',undefined])assert.equal(vanillaWeaponKind(id),undefined);
 const calls=[],p={typeId:'minecraft:player',isValid:true,getGameMode:()=> 'survival',playAnimation:id=>calls.push(id)};
 const e={player:p,heldItemStack:{typeId:'minecraft:diamond_sword'},swingSource:'Attack'},sel=()=>({typeId:'minecraft:diamond_sword'}),state=()=>({});
 assert.equal(vanillaSwingMotion(e,sel,state),true);assert.equal(calls[0],'animation.hakkai.weapon_sword_attack_a');
 assert.equal(vanillaSwingMotion({...e,swingSource:'UseItem'},sel,state),false);assert.equal(vanillaSwingMotion(e,()=>({typeId:'minecraft:stick'}),state),false);assert.equal(vanillaSwingMotion(e,sel,()=>({menu:true})),false);
 p.getGameMode=()=> 'spectator';assert.equal(vanillaSwingMotion(e,sel,state),false);assert.equal(calls.length,1);
});
test('native bow projectile triggers a pose without trail or added damage',()=>{
 const calls=[],jobs=[],d={id:'d',spawnParticle:()=>assert.fail('no addon trail')},p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,getGameMode:()=> 'survival',playAnimation:id=>calls.push(id)},arrow={typeId:'minecraft:arrow',isValid:true,dimension:d,getComponent:()=>({owner:p})};
 const ctrl=setupBowTrail({system:{runTimeout:f=>jobs.push(f)},gear:new Map(),selected:()=>({typeId:'minecraft:bow'}),state:()=>({})});
 ctrl.spawned(arrow);jobs.shift()();assert.deepEqual(calls,['animation.hakkai.weapon_bow_attack_a']);assert.equal(jobs.length,0);
});
