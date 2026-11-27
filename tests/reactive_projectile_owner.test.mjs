// Attribution and attack timing use API mocks, not Bedrock projectile physics.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,EntityDamageCause,GameMode} from '@minecraft/server';
import {combatPlayerAttacker} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_player_attacker.js';
import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {setupFushiSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';

const player=(id,dim)=>({id,typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:3,y:70,z:0},getGameMode:()=>GameMode.Survival,sendMessage(){this.messages++;},messages:0,hits:0,applyDamage(){this.hits++;return true;},addEffect:()=>{}});
const projectile=owner=>({getComponent:id=>id==='minecraft:projectile'?{owner}:undefined});
test('direct player wins; only an accessible valid player owner is a fallback',()=>{
 const p=player('p',{}),q=player('q',{}),bad={typeId:'minecraft:skeleton',isValid:true};
 assert.equal(combatPlayerAttacker({damagingEntity:p,damagingProjectile:projectile(q)}),p);
 assert.equal(combatPlayerAttacker({damagingProjectile:projectile(p)}),p);
 assert.equal(combatPlayerAttacker({damagingEntity:bad,damagingProjectile:projectile(p)}),p);
 assert.equal(combatPlayerAttacker({damagingProjectile:projectile(bad)}),undefined);
 assert.equal(combatPlayerAttacker({damagingProjectile:projectile({...p,isValid:false})}),undefined);
 assert.equal(combatPlayerAttacker({damagingProjectile:{getComponent(){throw Error('gone')}}}),undefined);
 assert.equal(combatPlayerAttacker(undefined),undefined);
});
function encounter(type,sourceBuilder){
 const d={id:'r',isChunkLoaded:()=>true,getBlock:p=>p.y===69?{isSolid:true,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:true},
  getBlockFromRay:()=>({face:'Up',block:{location:{y:69}},faceLocation:{y:1}}),getPlayers:()=>[],
  getEntities:o=>o.families?[mob]:[],spawnParticle:()=>{}};
 const p=player('p',d),q=player('q',d),mob={id:'m',typeId:type,isValid:true,dimension:d,location:{x:0,y:70,z:0},animations:[],playAnimation(id){this.animations.push(id);},teleport(){this.moves++;},moves:0};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p,q].filter(p=>p.isValid)};
 const ctrl=type==='hakkai:fushi_chief'?setupFushiSystem({world,system,report:()=>{}}):setupRealmEnders({world,system,report:()=>{},safe:()=>true});
 ctrl.onHurt({hurtEntity:mob,damageSource:sourceBuilder(p,q)});
 const tick=n=>{system.currentTick=n;ctrl.tick(p,n);};
 return {p,q,mob,ctrl,tick};
}
for(const type of ['hakkai:ender_0','hakkai:fushi_chief']){
 test(`${type}: projectile-only owner provokes warning and remains the notified target`,()=>{
  const f=encounter(type,p=>({cause:EntityDamageCause.projectile,damagingProjectile:projectile(p)}));
  f.tick(0);
  assert.equal(f.mob.moves,type==='hakkai:ender_0'?1:0,'projectile retreat');
  f.tick(20);
  assert.equal(f.p.messages,0);assert.equal(f.q.messages,0);assert.equal(f.mob.animations.length,1);
  assert.equal(f.mob.moves,type==='hakkai:ender_0'?2:0,'later attack approach is a separate warp');
 });
 for(const mode of ['missing','invalid','nonplayer','creative','spectator','throws'])test(`${type}: ${mode} projectile owner cannot start retaliation`,()=>{
  const f=encounter(type,p=>{
   let owner=p;
   if(mode==='invalid')owner={...p,isValid:false};
   if(mode==='nonplayer')owner={id:'s',typeId:'minecraft:skeleton',isValid:true};
   if(mode==='creative')p.getGameMode=()=>GameMode.Creative;
   if(mode==='spectator')p.getGameMode=()=>GameMode.Spectator;
   return {cause:EntityDamageCause.projectile,damagingProjectile:mode==='missing'?undefined:mode==='throws'?{getComponent(){throw Error('unloaded')}}:projectile(owner)};
  });
  f.tick(0);f.tick(20);assert.equal(f.p.messages,0);assert.equal(f.q.messages,0);assert.equal(f.mob.moves,0);assert.equal(f.mob.animations.length,0);
 });
 test(`${type}: another shooter's projectile does not redirect an active warning`,()=>{
  const f=encounter(type,p=>({cause:EntityDamageCause.entityAttack,damagingEntity:p}));
  f.tick(0);f.tick(20);assert.equal(f.p.messages,0);assert.equal(f.mob.animations.length,1);
  f.ctrl.onHurt({hurtEntity:f.mob,damageSource:{cause:EntityDamageCause.projectile,damagingProjectile:projectile(f.q)}});
  f.tick(60);assert.equal(f.q.messages,0);assert.equal(f.q.hits,0);
  assert.equal(f.p.hits,0,'no scheduler in this fixture');
 });
}
