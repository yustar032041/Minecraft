import assert from 'node:assert/strict';
import {setupCombatGuard} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_guard.js';
import {setupCombatParry} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_parry.js';
import {EntityDamageCause as Cause,GameMode} from '@minecraft/server';
function fixture(){
 const events=[];const dimension={id:'realm',spawnParticle:()=>{}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isSwimming:false,selectedSlotIndex:0,dimension,location:{x:0,y:80,z:0},getGameMode:()=>GameMode.Survival,getViewDirection:()=>({x:1,y:0,z:0}),playAnimation:()=>{},playSound:()=>{}};
 const enemy={id:'e',typeId:'minecraft:zombie',isValid:true,dimension,location:{x:3,y:80,z:0},getComponent:()=>({hasTypeFamily:k=>k==='monster'})};
 const gear={id:'gear_1',kind:'剣'},s={s:40},guard=setupCombatGuard({notice:()=>{}}),parry=setupCombatParry({guard,onSuccess:x=>events.push(x)});
 const source={cause:Cause.entityAttack,damagingEntity:enemy};
 return {p,enemy,gear,s,guard,parry,source,events};
}
function ready(f,t=0){f.guard.tick(f.p,f.gear,f.s,t);f.parry.tick(f.p,f.gear,f.s,t);f.p.isSneaking=false;f.parry.tick(f.p,f.gear,f.s,t+1);}
{
 const f=fixture();ready(f);assert.equal(f.s.s,35);assert.ok(f.parry.status(f.p,1));
 assert.equal(f.parry.tryHit(f.p,f.gear,f.s,f.source,1),true);assert.equal(f.s.s,20);
 assert.equal(f.events.length,0,'no world operations in before-event');
 assert.equal(f.parry.tryHit(f.p,f.gear,f.s,f.source,1),false,'only one hit');
 assert.equal(f.parry.isStaggered(f.enemy,1),false,'same-tick AoE can still hit other players');
 assert.equal(f.parry.isStaggered(f.enemy,2),true);assert.equal(f.parry.isStaggered(f.enemy,41),true);assert.equal(f.parry.isStaggered(f.enemy,42),false);
 f.parry.flush(2);assert.equal(f.events.length,1);assert.equal(f.events[0].near,true);f.parry.flush(3);assert.equal(f.events.length,1);
}
{
 const f=fixture();f.parry.tick(f.p,f.gear,f.s,0);f.p.isSneaking=false;f.parry.tick(f.p,f.gear,f.s,1);
 assert.equal(f.parry.tryHit(f.p,f.gear,f.s,f.source,1),false,'guard must have been paid');
}
for(const change of [f=>f.s.s=14,f=>f.enemy.location.x=-3,f=>f.enemy.dimension={id:'elsewhere'},f=>f.enemy.typeId='minecraft:player',f=>f.p.selectedSlotIndex=1,f=>f.p.isSneaking=true,f=>f.s.menu=true]){
 const f=fixture();ready(f);change(f);const before=f.s.s;assert.equal(f.parry.tryHit(f.p,f.gear,f.s,f.source,2),false);assert.equal(f.s.s,before);assert.equal(f.events.length,0);
}
{
 const f=fixture();ready(f);assert.equal(f.parry.tryHit(f.p,f.gear,f.s,{cause:Cause.fall,damagingEntity:f.enemy},2),false);assert.equal(f.parry.tryHit(f.p,f.gear,f.s,f.source,7),false,'window ends after six ticks');
}
{
 const f=fixture();ready(f);const rear={isValid:true,dimension:f.p.dimension,location:{x:-2,y:80,z:0}};
 assert.equal(f.parry.tryHit(f.p,f.gear,f.s,{cause:Cause.projectile,damagingEntity:f.enemy,damagingProjectile:rear},2),false,'projectile direction, not shooter');
 f.enemy.location.x=20;const front={...rear,location:{x:1,y:80,z:0}};
 assert.equal(f.parry.tryHit(f.p,f.gear,f.s,{cause:Cause.projectile,damagingEntity:f.enemy,damagingProjectile:front},3),true);
 assert.equal(f.parry.isStaggered(f.enemy,4),false,'a far-away shooter is not staggered');f.parry.flush(4);assert.equal(f.events[0].near,false);
}
{
 const f=fixture();ready(f);const other={...f.p,id:'other'};
 assert.equal(f.parry.tryHit(other,f.gear,f.s,f.source,2),false);f.parry.clear(f.p.id);
 assert.equal(f.parry.tryHit(f.p,f.gear,f.s,f.source,2),false);
}
console.log('Parry: paid guard release, facing, cost, window, range, isolation and deferred effects OK (mocked)');
// Non-boss magic reuses the bounded, next-tick melee suppression state.
{
 const guard={isActive:()=>true},parry=setupCombatParry({guard,onSuccess:()=>{}});
 const d={id:'realm'},e={id:'magic-target',isValid:true,dimension:d};
 assert.equal(parry.staggerTarget(e,10,60),true);
 assert.equal(parry.isStaggered(e,10),false);
 assert.equal(parry.isStaggered(e,11),true);
 assert.equal(parry.isStaggered(e,70),true);
 assert.equal(parry.isStaggered(e,71),false);
 parry.flush(71);assert.equal(parry.isStaggered(e,72),false);
}
