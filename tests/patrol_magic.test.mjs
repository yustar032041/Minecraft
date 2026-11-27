// Simulated tick/ray behavior, not Bedrock collision or multiplayer QA.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {EntityDamageCause,Difficulty} from '@minecraft/server';
import {patrolMagicHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/patrol_magic.js';
let counter=0;
function fixture({result=true,damageThrows=false,effectThrows=false,animationThrows=false,particleThrows=false}={}){
 let wall=Infinity,loaded=true,others=[];const damage=[],effects=[],animations=[],particles=[],queue=[];
 const system={currentTick:0,runTimeout:(fn,delay)=>queue.push({at:system.currentTick+delay,fn})};
 const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty;}};
 const d={id:'village',isChunkLoaded:()=>loaded,getBlock:()=>({isAir:true}),
  getBlockFromRay:(a,v,{maxDistance})=>{const k=(wall-a.x)/v.x;if(!Number.isFinite(k)||k<0||k>maxDistance)return;return {block:{location:{x:wall,y:a.y+v.y*k,z:a.z+v.z*k}},faceLocation:{x:0,y:0,z:0}};},
  getEntitiesFromRay:(a,v,{maxDistance})=>[foe,...others].filter(e=>e.isValid).map(e=>{
   const x=e.location.x-a.x,y=e.location.y+.8-a.y,z=e.location.z-a.z,k=x*v.x+y*v.y+z*v.z;
   return {entity:e,distance:Math.max(0,k-.2),along:k,radial:Math.hypot(x-k*v.x,y-k*v.y,z-k*v.z)};
  }).filter(x=>x.along>=0&&x.radial<.3&&x.distance<=maxDistance),
  spawnParticle:(...x)=>{if(particleThrows)throw Error('visual');particles.push(x);}};
 const mage={id:'mage'+counter++,isValid:true,typeId:'hakkai:village_mage',dimension:d,location:{x:0,y:2,z:0},playAnimation:(...x)=>{if(animationThrows)throw Error();animations.push(x);}};
 const foe={id:'enemy',typeId:'minecraft:zombie',dimension:d,isValid:true,location:{x:5,y:2,z:0},applyDamage:(...x)=>{damage.push(x);if(damageThrows)throw Error();return result;},addEffect:(...x)=>{if(effectThrows)throw Error();effects.push(x);}};
 const advance=t=>{while(system.currentTick<t){system.currentTick++;while(queue.some(q=>q.at===system.currentTick)){const i=queue.findIndex(q=>q.at===system.currentTick);queue.splice(i,1)[0].fn();}}};
 return {mage,foe,d,world,system,damage,effects,animations,particles,queue,advance,wall:v=>wall=v,loaded:v=>loaded=v,others:v=>others=v};
}
test('mage animates at launch, bolt travels and applies magic only on contact',()=>{
 const f=fixture();assert.equal(patrolMagicHit(f.mage,f.foe,f.system,f.world),true);assert.deepEqual(f.damage,[]);assert.equal(f.animations[0][0],'animation.hakkai.patrol_cast');
 f.advance(10);assert.deepEqual(f.damage,[[3,{cause:EntityDamageCause.magic,damagingEntity:f.mage}]]);
 assert.deepEqual(f.effects,[['slowness',55,{amplifier:1,showParticles:false}]]);
 assert.ok(f.particles.some(([id])=>id==='hakkai:shot_shadow'));assert.ok(f.particles.some(([id])=>id==='hakkai:climate_5'));
});
test('rejected damage and failures cannot apply effects; visual failures are cosmetic',()=>{
 for(const opt of [{result:false},{damageThrows:true},{effectThrows:true},{animationThrows:true},{particleThrows:true}]){
  const f=fixture(opt);assert.ok(patrolMagicHit(f.mage,f.foe,f.system,f.world));f.advance(10);assert.equal(f.damage.length,1);
  if(opt.result===false||opt.damageThrows)assert.equal(f.effects.length,0);
 }
});
test('obstacles, dodge, wrong target and invalid or delayed flight stop damage',()=>{
 for(const mode of ['wall','other','unloaded','dodge','peaceful','dimension','dead','late','wrong']){
  const f=fixture();if(mode==='wrong'){f.foe.typeId='minecraft:player';assert.equal(patrolMagicHit(f.mage,f.foe,f.system,f.world),false);continue;}
  assert.ok(patrolMagicHit(f.mage,f.foe,f.system,f.world));
  if(mode==='wall')f.wall(2);if(mode==='unloaded')f.loaded(false);if(mode==='dodge')f.foe.location.z=4;
  if(mode==='other')f.others([{id:'villager',isValid:true,location:{x:2,y:2,z:0}}]);
  if(mode==='peaceful')f.world.difficulty=Difficulty.Peaceful;if(mode==='dimension')f.foe.dimension={id:'other'};if(mode==='dead')f.mage.isValid=false;
  if(mode==='late'){const task=f.queue.shift();f.system.currentTick=5;task.fn();}
  f.advance(12);assert.deepEqual(f.damage,[],mode);
 }
});
test('renderer cannot move target and authorize a stale hit; a mage cannot launch twice',()=>{
 const f=fixture();assert.ok(patrolMagicHit(f.mage,f.foe,f.system,f.world));assert.equal(patrolMagicHit(f.mage,f.foe,f.system,f.world),false);
 const spawn=f.d.spawnParticle;f.d.spawnParticle=(id,pos)=>{spawn(id,pos);if(id==='hakkai:shot_shadow'&&pos.x>4)f.foe.location.z=4;};
 f.advance(12);assert.deepEqual(f.damage,[]);
});
