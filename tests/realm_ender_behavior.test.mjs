// Simulated APIs: these checks do not verify Bedrock rendering or AI.
import assert from 'node:assert/strict';
import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {Difficulty,GameMode,EntityDamageCause} from '@minecraft/server';
function fixture(){
 let helmet,blocked=false,allowed=true,occupied=false,loaded=true,upperAir=true;
 const teleports=[],messages=[],particles=[];
 const dim={id:'realm',isChunkLoaded:()=>loaded,getBlock:pos=>pos.y<0?{isSolid:true,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:upperAir},
  getBlockFromRay:pos=>({face:'Up',block:{location:{y:Math.floor(pos.y)-1}},faceLocation:{y:1}}),
  getPlayers:()=>occupied?[{}]:[],getEntities:opts=>opts.families?[mob]:[],spawnParticle:(...args)=>particles.push(args)};
 const p={id:'p',isValid:true,typeId:'minecraft:player',dimension:dim,location:{x:0,y:0,z:0},getGameMode:()=>GameMode.Survival,getHeadLocation:()=>({x:0,y:2,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getComponent:()=>({getEquipment:()=>helmet?{typeId:helmet}:undefined}),getEntitiesFromViewDirection:()=>blocked?[]:[{entity:mob,distance:8}],sendMessage:m=>messages.push(m),applyDamage:()=>true,addEffect:()=>{}};
 const mob={id:'m',isValid:true,typeId:'hakkai:ender_0',dimension:dim,location:{x:8,y:0,z:0},getHeadLocation:()=>({x:8,y:2,z:0}),teleport:(at,opts)=>teleports.push({at,opts})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupRealmEnders({world,system,report:e=>{throw Error(e)},safe:()=>allowed});
 return {p,mob,system,ctrl,teleports,messages,particles,setHelmet:x=>helmet=x,setBlocked:x=>blocked=x,setAllowed:x=>allowed=x,setOccupied:x=>occupied=x,setLoaded:x=>loaded=x,setUpperAir:x=>upperAir=x};
}
{
 const f=fixture();f.ctrl.tick(f.p,0);assert.equal(f.messages.length,1,'look detected');
 f.ctrl.tick(f.p,40);assert.equal(f.messages.length,2);assert.equal(f.particles.length,16,'warn before counterattack');
}
{
 // Ray results can be unsorted. An intervening entity, a tie, or malformed
 // distance must not provoke a traveler behind it.
 for(const hits of [
  f=>[{entity:f.mob,distance:8},{entity:{id:'blocker',isValid:true},distance:4}],
  f=>[{entity:f.mob,distance:8},{entity:{id:'blocker',isValid:true},distance:8}],
  f=>[{entity:f.mob,distance:NaN}],
  f=>[{entity:f.mob,distance:8},{entity:{id:'unknown',isValid:true}}],
 ]){
  const f=fixture();f.p.getEntitiesFromViewDirection=()=>hits(f);f.ctrl.tick(f.p,0);assert.equal(f.messages.length,0);
 }
 const f=fixture();f.p.getEntitiesFromViewDirection=()=>[{entity:{id:'behind',isValid:true},distance:10},{entity:f.mob,distance:8}];
 f.ctrl.tick(f.p,0);assert.equal(f.messages.length,1,'entity behind traveler does not block gaze');
}
for(const mode of ['helmet','wall','off-axis','creative','missing-equipment']){
 const f=fixture();if(mode==='helmet')f.setHelmet('minecraft:carved_pumpkin');if(mode==='wall')f.setBlocked(true);
 if(mode==='off-axis')f.p.getViewDirection=()=>({x:0,y:0,z:1});if(mode==='creative')f.p.getGameMode=()=>GameMode.Creative;
 if(mode==='missing-equipment')f.p.getComponent=()=>undefined;
 f.ctrl.tick(f.p,0);f.ctrl.tick(f.p,40);assert.equal(f.messages.length,0,mode);
}
{
 const f=fixture();f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.projectile}});f.ctrl.tick(f.p,0);
 assert.equal(f.teleports.length,1);assert.equal(f.teleports[0].opts.checkForBlocks,true);
 f.ctrl.tick(f.p,1);assert.equal(f.teleports.length,1,'one retreat per hit');
}
for(const condition of ['unsafe','occupied','unloaded','low-ceiling']){
 const f=fixture();if(condition==='unsafe')f.setAllowed(false);if(condition==='occupied')f.setOccupied(true);if(condition==='unloaded')f.setLoaded(false);if(condition==='low-ceiling')f.setUpperAir(false);
 f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.projectile}});f.ctrl.tick(f.p,0);
 assert.equal(f.teleports.length,0,condition);
}
{
 const f=fixture();f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.entityAttack}});f.ctrl.tick(f.p,0);assert.equal(f.teleports.length,0,'melee does not retreat');
}
// Each realm's on-time warning resolves with a bounded realm-colored effect.
// Cosmetic failure must never cancel the counterattack.
for(let realm=0;realm<8;realm++){
 const f=fixture();f.mob.typeId=`hakkai:ender_${realm}`;let hits=0;f.p.applyDamage=()=>{hits++;return true};
 for(const t of [0,40,80])f.ctrl.tick(f.p,t);
 assert.equal(hits,1);assert.equal(f.particles.filter(([id])=>id.startsWith('hakkai:mob_')).length,3);
}
{
 const f=fixture();let hits=0;f.p.applyDamage=()=>{hits++;return true};
 f.p.dimension.spawnParticle=id=>{if(id.startsWith('hakkai:mob_'))throw Error('no visuals');};
 for(const t of [0,40,80])f.ctrl.tick(f.p,t);assert.equal(hits,1);
}
{
 const f=fixture();for(const t of [0,40,90])f.ctrl.tick(f.p,t);
 assert.equal(f.particles.filter(([id])=>id.startsWith('hakkai:mob_')).length,0,'late attack has no strike effect');
}
console.log('Realm ender: gaze, pumpkin, occlusion, creative and safe projectile retreat OK (simulated)');
