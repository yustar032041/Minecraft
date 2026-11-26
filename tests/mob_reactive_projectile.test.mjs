import {test} from 'node:test';import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {Difficulty} from '@minecraft/server';
const reactive=mobContentList.filter(p=>p.talent==='armor'||p.talent==='ward'||p.talent==='defend'&&p.temper!=='hostile');
test('all 26 reactive creatures recognize a player projectile owner without guessing',()=>{
 assert.equal(reactive.length,26);
 for(const profile of reactive){
  const effects=[];const mob={isValid:true,typeId:'hakkai:'+profile.id,addEffect:(...v)=>effects.push(v)};
  const player={isValid:true,typeId:'minecraft:player'},arrow=owner=>({getComponent:id=>id==='minecraft:projectile'?{owner}:undefined});
  const ctl=setupMobSystem({world:{getDifficulty:()=>Difficulty.Normal},system:{currentTick:0},num:()=>0,property:()=>{},report:()=>{}});
  const expected=profile.talent==='defend'?'speed':'resistance';
  for(const damageSource of [{damagingEntity:player},{damagingProjectile:arrow(player)}]){
   effects.length=0;ctl.onHurt({hurtEntity:mob,damageSource});assert.equal(effects.length,1,profile.id);assert.equal(effects[0][0],expected,profile.id);
  }
  for(const damageSource of [{damagingProjectile:arrow(undefined)},{damagingProjectile:arrow({isValid:true,typeId:'minecraft:skeleton'})},{damagingProjectile:arrow({isValid:false,typeId:'minecraft:player'})},{damagingProjectile:{getComponent(){throw Error('invalid')}}},{damagingEntity:{isValid:true,typeId:'minecraft:zombie'}}]){
   effects.length=0;ctl.onHurt({hurtEntity:mob,damageSource});assert.equal(effects.length,0,profile.id);
  }
 }
});
