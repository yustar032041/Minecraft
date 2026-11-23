import assert from 'node:assert/strict';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
function fixture(){
 const dmg=[],knock=[];const d={id:'realm',getEntities:()=>[],spawnParticle:()=>{}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},getGameMode:()=> 'survival',playAnimation:()=>{},playSound:()=>{}};
 const enemy=(id,x=2,type='minecraft:zombie')=>({id,typeId:type,isValid:true,dimension:d,location:{x,y:0,z:0},getHeadLocation(){return this.location},applyDamage:n=>dmg.push([id,n]),applyKnockback:()=>knock.push(id),addEffect:()=>{},setOnFire:()=>{}});
 const s={s:20,m:20},system={currentTick:100},ctrl=setupCombatUltimate({system,notice:()=>{},visibleFrom:(_,pos)=>pos.x!==3});
 return {p,d,s,system,ctrl,enemy,dmg,knock};
}
{
 const f=fixture(),e=f.enemy('z'),boss=f.enemy('boss',4,'hakkai:time_warden'),hidden=f.enemy('hidden',3);f.d.getEntities=o=>o.type?[boss]:[e,hidden,boss];
 assert.equal(f.ctrl.cast(f.p,f.s),true);assert.equal(f.s.s,0);assert.equal(f.s.m,20);assert.deepEqual(f.dmg,[['z',20],['boss',20]]);assert.deepEqual(f.knock,['z']);
 assert.equal(f.ctrl.blocks(f.p,{cause:'fall'},100),true);assert.equal(f.ctrl.blocks(f.p,{cause:'entityAttack'},119),true);for(const cause of ['void','override','selfDestruct'])assert.equal(f.ctrl.blocks(f.p,{cause},105),false);
 assert.equal(f.ctrl.active(f.p,120),false);f.s.s=10;assert.equal(f.ctrl.cast(f.p,f.s),false,'cooldown');f.ctrl.invalidate(f.p.id);assert.equal(f.ctrl.cast(f.p,f.s),false,'dimension change preserves cooldown');
 f.system.currentTick=700;assert.equal(f.ctrl.cast(f.p,f.s),true);
}
for(const change of [f=>f.s.m=21,f=>f.s.s=21,f=>f.s.s=0,f=>f.s.menu=true,f=>f.p.getGameMode=()=> 'spectator']){
 const f=fixture();f.d.getEntities=()=>[f.enemy('z')];change(f);const s=f.s.s;assert.equal(f.ctrl.cast(f.p,f.s),false);assert.equal(f.s.s,s);
}
{
 const f=fixture();assert.equal(f.ctrl.cast(f.p,f.s),false,'no target, no cost');assert.equal(f.s.s,20);
}
{
 const f=fixture();f.d.getEntities=()=>[f.enemy('z')];f.p.getGameMode=()=> 'creative';f.s.s=100;f.s.m=100;
 assert.equal(f.ctrl.cast(f.p,f.s),true);assert.equal(f.s.s,100);assert.equal(f.s.m,100);assert.equal(f.dmg.length,1);
}
console.log('Ultimate: resource threshold, targets, boss anchoring, immunity and cooldown (mocked)');
