import assert from 'node:assert/strict';
import {setupCombatGuard} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_guard.js';
import {GameMode,EntityDamageCause} from '@minecraft/server';
function fixture(){
 const particles=[],notices=[],sounds=[],animations=[];
 const d={id:'hakkai:realm_0',spawnParticle:(...v)=>particles.push(v)};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isSwimming:false,selectedSlotIndex:0,location:{x:0,y:80,z:0},dimension:d,getGameMode:()=>GameMode.Survival,getViewDirection:()=>({x:1,y:0,z:0}),playAnimation:(...v)=>animations.push(v),playSound:(...v)=>sounds.push(v)};
 const enemy={isValid:true,location:{x:4,y:80,z:0},dimension:d},g={id:'gear_001',kind:'剣'},s={s:12};
 return {p,enemy,g,s,particles,notices,sounds,animations,guard:setupCombatGuard({notice:(...v)=>notices.push(v)})};
}
{
 const {p,enemy,g,s,particles,animations,guard}=fixture(),source={cause:EntityDamageCause.entityAttack,damagingEntity:enemy};
 assert.equal(guard.scale(p,g,source,0,20),20,'no free guard before paid tick');
 assert.equal(guard.tick(p,g,s,0),true);assert.equal(s.s,7);assert.equal(particles.length,8);assert.equal(animations.length,1);
 assert.equal(guard.scale(p,g,source,1,20),6);assert.ok(guard.status(p,g,1).includes('防御中'));
 guard.tick(p,g,s,10);assert.equal(s.s,7,'charged only once a second');
 assert.equal(guard.scale(p,g,source,20,20),20,'no free guard beyond paid time');
 guard.tick(p,g,s,20);assert.equal(s.s,2);assert.equal(guard.scale(p,g,source,21,20),6);
 guard.tick(p,g,s,40);assert.equal(s.s,2);assert.equal(guard.scale(p,g,source,41,20),20);
 assert.ok(guard.status(p,g,41).includes('防御疲れ'));p.selectedSlotIndex=1;guard.invalidate(p.id);s.s=10;guard.tick(p,g,s,50);assert.equal(s.s,10,'exhaustion survives a slot change');
 p.selectedSlotIndex=0;s.s=2;
 p.isSneaking=false;assert.equal(guard.tick(p,g,s,60),false);s.s=10;p.isSneaking=true;guard.tick(p,g,s,70);assert.equal(s.s,5);
}
{
 const {p,enemy,g,s,guard}=fixture();guard.tick(p,g,s,0);
 const front={cause:EntityDamageCause.entityAttack,damagingEntity:enemy};
 assert.ok(guard.blocks(p,g,front,1));
 enemy.location.x=-4;assert.equal(guard.blocks(p,g,front,1),false,'cannot block from behind');enemy.location.x=4;
 assert.equal(guard.blocks(p,g,{cause:EntityDamageCause.fall,damagingEntity:enemy},1),false);
 assert.equal(guard.blocks(p,g,{cause:EntityDamageCause.projectile},1),false,'unknown projectile direction fails closed');
 assert.equal(guard.blocks(p,g,{cause:EntityDamageCause.projectile,damagingProjectile:enemy},1),true);
 const rear={...enemy,location:{x:-2,y:80,z:0}};
 assert.equal(guard.blocks(p,g,{cause:EntityDamageCause.projectile,damagingProjectile:rear,damagingEntity:enemy},1),false,'projectile position determines direction, not distant shooter');
 enemy.dimension={id:'elsewhere'};assert.equal(guard.blocks(p,g,front,1),false);enemy.dimension=p.dimension;
 p.isSneaking=false;assert.equal(guard.blocks(p,g,front,1),false,'release takes effect immediately');
 p.isSneaking=true;p.selectedSlotIndex=1;assert.equal(guard.blocks(p,g,front,1),false,'changing slot invalidates');
}
{
 const {p,enemy,g,s,guard}=fixture();guard.tick(p,g,s,0);const source={cause:EntityDamageCause.entityAttack,damagingEntity:enemy};
 p.isSwimming=true;assert.equal(guard.blocks(p,g,source,1),false);p.isSwimming=false;
 p.getGameMode=()=>GameMode.Spectator;assert.equal(guard.blocks(p,g,source,1),false);assert.equal(guard.tick(p,g,s,10),false);
}
{
 const {p,enemy,g,s,guard}=fixture();guard.tick(p,g,s,0);const other={...p,id:'other'},otherState={s:10};
 assert.equal(guard.blocks(other,g,{cause:EntityDamageCause.entityAttack,damagingEntity:enemy},1),false);
 guard.tick(other,g,otherState,1);guard.clear(p.id);assert.equal(guard.blocks(other,g,{cause:EntityDamageCause.entityAttack,damagingEntity:enemy},2),true);
}
for(const kind of ['剣','斧','槍','盾']){
 const {p,g,s,guard}=fixture();g.kind=kind;assert.equal(guard.tick(p,g,s,0),true);
}
{
 const {p,g,s,guard}=fixture();g.kind='杖';assert.equal(guard.tick(p,g,s,0),false);assert.equal(s.s,12);
}
{
 const {p,g,s,animations,guard}=fixture();p.getGameMode=()=>GameMode.Creative;s.s=0;
 assert.equal(guard.tick(p,g,s,0),true);assert.equal(s.s,0);assert.equal(animations.length,1,'creative previews guard without stamina');
}
console.log('Guard: stamina billing, exhaustion, direction, projectile, causes and multiplayer isolation OK (mocked)');
