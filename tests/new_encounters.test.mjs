// Minimal Node simulation, not a Bedrock runtime test.
import assert from 'node:assert/strict';
import {setupRealmEnders,enderRealm,inEnderWarning,ENDER_ABILITIES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {setupFushiSystem,CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture(type){
 const effects=[],damage=[],messages=[],particles=[];
 const dim={id:'hakkai:realm_7',getEntities:()=>[mob],spawnParticle:(...x)=>particles.push(x)};
 function player(id,x=0){return {id,typeId:'minecraft:player',isValid:true,location:{x,y:90,z:0},dimension:dim,getGameMode:()=>GameMode.Survival,sendMessage:s=>messages.push({id,s}),applyDamage:(n)=>damage.push({id,n}),addEffect:(id,duration)=>effects.push({id,duration})};}
 const p=player('p'),q=player('q');const mob={id:'mob',isValid:true,typeId:type,location:{x:3,y:90,z:0},dimension:dim};
 const system={currentTick:0};const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty},getAllPlayers:()=>[p,q]};
 return {system,world,p,q,mob,dim,damage,effects,messages,particles};
}
for(let r=0;r<8;r++){
 const f=fixture(`hakkai:ender_${r}`),ctrl=setupRealmEnders({...f,report:()=>assert.fail('unexpected report')});
 ctrl.tick(f.p,0);assert.equal(f.particles.length,0,'neutral before attack');
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 f.system.currentTick=40;ctrl.tick(f.p,40);assert.equal(f.messages.length,1);assert.equal(f.particles.length,16);
 ctrl.tick(f.q,40);assert.equal(f.messages.length,1,'no duplicate multiplayer warning');
 f.system.currentTick=80;ctrl.tick(f.p,80);assert.equal(f.damage.length,1);assert.equal(f.damage[0].n,ENDER_ABILITIES[r].damage);
 assert.equal(f.effects[0].id,ENDER_ABILITIES[r].effect);
 ctrl.onDeath({deadEntity:f.mob});f.system.currentTick=240;ctrl.tick(f.p,240);assert.equal(f.messages.length,1);
}
{
 const f=fixture('hakkai:ender_0'),ctrl=setupRealmEnders({...f,report:()=>{}});
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});f.system.currentTick=40;ctrl.tick(f.p,40);
 f.p.location.x=7;f.system.currentTick=80;ctrl.tick(f.p,80);assert.equal(f.damage.length,0,'avoided the marked area');
}
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]]){
 const f=fixture(type),ctrl=setup({...f,report:()=>assert.fail('unexpected report')});
 // Retargeting before a marked strike must not damage an unwarned player.
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});f.system.currentTick=40;ctrl.tick(f.p,40);
 f.system.currentTick=41;ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.q}});
 f.system.currentTick=80;ctrl.tick(f.q,80);assert.equal(f.damage.length,0);
 assert.equal(f.messages.at(-1).id,'q');f.system.currentTick=120;ctrl.tick(f.q,120);assert.equal(f.damage[0].id,'q');
 const peaceful=fixture(type);peaceful.world.difficulty=Difficulty.Peaceful;const safe=setup({...peaceful,report:()=>{}});
 safe.onHurt({hurtEntity:peaceful.mob,damageSource:{damagingEntity:peaceful.p}});safe.tick(peaceful.p,40);safe.tick(peaceful.p,80);
 assert.equal(peaceful.damage.length,0);assert.equal(peaceful.messages.length,0);
}
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]]){
 const f=fixture(type),ctrl=setup({...f,report:()=>{}});
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});f.system.currentTick=40;ctrl.tick(f.p,40);
 f.world.difficulty=Difficulty.Peaceful;f.system.currentTick=80;ctrl.tick(f.p,80);assert.equal(f.damage.length,0,'difficulty change cancels pending attack');
 const g=fixture(type),safe=setup({...g,report:()=>{}});g.p.sendMessage=()=>{throw Error('unavailable')};
 safe.onHurt({hurtEntity:g.mob,damageSource:{damagingEntity:g.p}});g.system.currentTick=40;safe.tick(g.p,40);g.system.currentTick=80;safe.tick(g.p,80);
 assert.equal(g.damage.length,0,'no strike without a warning');
}
{
 const f=fixture('hakkai:fushi_chief'),ctrl=setupFushiSystem({...f,report:()=>{}});
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 for(let i=0;i<3;i++){
  let start=40+i*160;f.system.currentTick=start;ctrl.tick(f.p,start);
  f.system.currentTick=start+40;ctrl.tick(f.p,start+40);
 }
 assert.deepEqual(f.damage.map(d=>d.n),CHIEF_ATTACKS.map(a=>a.damage));
 assert.deepEqual(f.effects.map(e=>e.id),CHIEF_ATTACKS.map(a=>a.effect));
}
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]]){
 const f=fixture(type),ctrl=setup({...f,report:()=>{}});f.dim.spawnParticle=()=>{throw Error('marker missing')};
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 f.system.currentTick=40;ctrl.tick(f.p,40);f.system.currentTick=80;ctrl.tick(f.p,80);
 assert.equal(f.damage.length,0,'no attack without visible marker');
}
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]]){
 const f=fixture(type),ctrl=setup({...f,report:()=>{}});
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 f.system.currentTick=40;ctrl.tick(f.p,40);f.system.currentTick=160;ctrl.tick(f.p,160);
 assert.equal(f.damage.length,0,'unloaded or delayed attacker cannot strike after warning has expired');
}
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]]){
 const f=fixture(type),ctrl=setup({...f,report:()=>{},isEvading:p=>p.id==='p'});
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 f.system.currentTick=40;ctrl.tick(f.p,40);f.system.currentTick=80;ctrl.tick(f.p,80);
 assert.deepEqual(f.damage,[]);assert.deepEqual(f.effects,[],'roll avoids scripted damage and effect');
}
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]]){
 const f=fixture(type),calls=[],ctrl=setup({...f,report:()=>{},tryParry:(p,e)=>{calls.push([p.id,e.id]);return true;}});
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});f.system.currentTick=40;ctrl.tick(f.p,40);f.system.currentTick=80;ctrl.tick(f.p,80);
 assert.deepEqual(calls,[['p','mob']]);assert.deepEqual(f.damage,[]);assert.deepEqual(f.effects,[]);
 ctrl.stagger(f.mob,80);f.system.currentTick=110;ctrl.tick(f.p,110);assert.equal(f.messages.length,1,'stagger does not start a premature attack');
}
assert.equal(enderRealm('minecraft:enderman'),-1);assert.equal(enderRealm('hakkai:ender_8'),-1);
assert.equal(inEnderWarning({x:0,y:4,z:0},{x:0,y:0,z:0},3),false);
console.log('Realm endermen and neutral chief: 8 abilities, 3 warned boss patterns, dodge, multiplayer retargeting and peaceful checks OK (simulated)');
// No orphaned status effect if damage is refused (e.g. invulnerability or a
// death-prevention listener) or if the damage API throws.
for(const [type,setup] of [['hakkai:ender_0',setupRealmEnders],['hakkai:fushi_chief',setupFushiSystem]])for(const fail of [()=>false,()=>{throw Error('not available');}]){
 const f=fixture(type),ctrl=setup({...f,report:()=>{}});f.p.applyDamage=fail;
 ctrl.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});f.system.currentTick=40;ctrl.tick(f.p,40);f.system.currentTick=80;ctrl.tick(f.p,80);
 assert.deepEqual(f.effects,[],'refused damage must not apply an additional effect');
}
