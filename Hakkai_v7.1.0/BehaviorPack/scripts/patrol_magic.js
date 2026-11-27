import {EntityDamageCause,Difficulty} from '@minecraft/server';
import {patrolCast} from './mob_attack_visuals.js';
import {startChiefMoon,advanceChiefMoon} from './fushi_moon_projectile.js';

// The patrol mage targets only the village system's known hostile species.
// It casts a visible, non-homing bolt; walls and other entities intercept it.
const HOSTILES=new Set(['minecraft:zombie','minecraft:husk','minecraft:drowned','minecraft:pillager','minecraft:vindicator','minecraft:witch','minecraft:ravager','minecraft:skeleton']);
const flights=new Map();
const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
export function patrolMagicHit(mage,foe,system,world){
 try{
  if(!mage?.isValid||!foe?.isValid||mage.typeId!=='hakkai:village_mage'||!mage.id||!foe.id||!HOSTILES.has(foe.typeId)||!system?.runTimeout||!world||world.getDifficulty()===Difficulty.Peaceful||flights.has(mage.id))return false;
  const dimensionId=mage.dimension.id;if(!dimensionId||foe.dimension.id!==dimensionId)return false;
  const from=mage.location,to=foe.location;
  if(!from||!to||Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z)>9)return false;
  const flight=startChiefMoon({x:from.x,y:from.y+1,z:from.z},{x:to.x,y:to.y+.8,z:to.z},system.currentTick);
  if(!flight)return false;
  const id=mage.id,targetId=foe.id;flights.set(id,flight);
  function finish(){if(flights.get(id)===flight)flights.delete(id);}
  function schedule(){try{system.runTimeout(step,1);}catch{finish();}}
  function step(){
   try{
    if(flights.get(id)!==flight)return;
    if(!mage.isValid||!foe.isValid||mage.dimension.id!==dimensionId||foe.dimension.id!==dimensionId||foe.id!==targetId||!HOSTILES.has(foe.typeId)||world.getDifficulty()===Difficulty.Peaceful){finish();return;}
    const source={...mage.location},result=advanceChiefMoon(mage.dimension,flight,system.currentTick,id,targetId,'hakkai:shot_shadow',.75);
    if(result.hit&&same(foe.location,result.contact)&&same(mage.location,source)&&mage.isValid&&foe.isValid&&mage.dimension.id===dimensionId&&foe.dimension.id===dimensionId&&HOSTILES.has(foe.typeId)&&world.getDifficulty()!==Difficulty.Peaceful){
     let accepted=false;try{accepted=Boolean(foe.applyDamage(3,{cause:EntityDamageCause.magic,damagingEntity:mage}));}catch{}
     if(accepted){
      try{foe.addEffect('slowness',55,{amplifier:1,showParticles:false});}catch{}
      try{mage.dimension.spawnParticle('hakkai:climate_5',{x:result.contact.x,y:result.contact.y+.7,z:result.contact.z});}catch{}
     }
    }
    if(result.done)finish();else schedule();
   }catch{finish();}
  }
  patrolCast(mage);schedule();return flights.get(id)===flight;
 }catch{return false;}
}
