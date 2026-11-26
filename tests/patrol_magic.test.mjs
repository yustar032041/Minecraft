import assert from 'node:assert/strict';
import {EntityDamageCause} from '@minecraft/server';
import {patrolMagicHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/patrol_magic.js';
function fixture({result=true,damageThrows=false,effectThrows=false,animationThrows=false,particleThrows=false}={}){
 const damage=[],effects=[],animations=[],particles=[];
 const mage={isValid:true,typeId:'hakkai:village_mage',dimension:{spawnParticle:(...x)=>{if(particleThrows)throw Error();particles.push(x);}},playAnimation:(...x)=>{if(animationThrows)throw Error();animations.push(x);}};
 const foe={isValid:true,location:{x:1,y:2,z:3},applyDamage:(...x)=>{damage.push(x);if(damageThrows)throw Error();return result;},addEffect:(...x)=>{if(effectThrows)throw Error();effects.push(x);}};
 return {mage,foe,damage,effects,animations,particles};
}
{
 const f=fixture();assert.equal(patrolMagicHit(f.mage,f.foe),true);assert.deepEqual(f.damage,[[3,{cause:EntityDamageCause.magic,damagingEntity:f.mage}]]);
 assert.deepEqual(f.effects,[['slowness',55,{amplifier:1,showParticles:false}]]);assert.equal(f.animations[0][0],'animation.hakkai.patrol_cast');
 assert.deepEqual(f.particles,[['hakkai:climate_5',{x:1,y:2.7,z:3}]]);
}
for(const opt of [{result:false},{damageThrows:true}]){
 const f=fixture(opt);assert.equal(patrolMagicHit(f.mage,f.foe),false);assert.equal(f.effects.length,0);assert.equal(f.animations.length,0);assert.equal(f.particles.length,0);
}
for(const opt of [{effectThrows:true},{animationThrows:true},{particleThrows:true}]){
 const f=fixture(opt);assert.equal(patrolMagicHit(f.mage,f.foe),true);assert.equal(f.damage.length,1);
}
{
 const f=fixture();f.mage.typeId='hakkai:village_watch';assert.equal(patrolMagicHit(f.mage,f.foe),false);assert.equal(f.damage.length,0);
}
console.log('Village mage hit: accepted damage gates status and visuals; failure isolation (mocked)');
