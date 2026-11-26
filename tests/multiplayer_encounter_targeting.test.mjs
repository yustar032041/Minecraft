import {test} from 'node:test';import assert from 'node:assert/strict';import {Difficulty,GameMode,EntityDamageCause} from '@minecraft/server';
import {setupFushiSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
function fixture(chief){
 const effects=[],hits=[],messages=[],system={currentTick:0};let mob;
 const d={id:'realm',spawnParticle:()=>{},getEntities:()=>[mob],getPlayers:()=>[],isChunkLoaded:()=>true,getBlock:()=>({isAir:true})};
 function player(id,x){return {id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:0,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([id,m]),applyDamage:n=>{hits.push([id,n]);return true},addEffect:e=>effects.push([id,e])};}
 const a=player('a',0),b=player('b',1);mob={id:'mob',typeId:chief?'hakkai:fushi_chief':'hakkai:ender_0',isValid:true,dimension:d,location:{x:4,y:0,z:0}};
 const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[a,b]},ctrl=chief?setupFushiSystem({world,system,report:()=>{}}):setupRealmEnders({world,system,report:()=>{},safe:()=>false});
 const hit=p=>ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p,cause:EntityDamageCause.entityAttack}});
 const tick=t=>{system.currentTick=t;ctrl.tick(a,t);ctrl.tick(b,t)};return {a,b,hit,tick,system,hits,messages};
}
for(const chief of [true,false])test(`${chief?'chief':'realm ender'}: alternating attackers do not cancel the warned strike or switch its victim`,()=>{
 const f=fixture(chief);f.hit(f.a);
 for(let t=1;t<20;t++){f.system.currentTick=t;f.hit(t%2?f.b:f.a);}
 f.tick(20);assert.ok(f.messages.some(([id])=>id==='a'));assert.ok(!f.messages.some(([id])=>id==='b'));
 for(let t=21;t<60;t++){f.system.currentTick=t;f.hit(t%2?f.b:f.a);}
 f.tick(60);
 if(chief){assert.deepEqual(f.hits,[]);assert.equal(f.messages.at(-1)[0],'a');} // no scheduler in this fixture
 else{assert.equal(f.hits.length,1);assert.equal(f.hits[0][0],'a');}
});
for(const chief of [true,false])test(`${chief?'chief':'realm ender'}: a new attacker can take over if the old target disconnects`,()=>{
 const f=fixture(chief);f.hit(f.a);f.tick(20);f.a.isValid=false;f.system.currentTick=21;f.hit(f.b);f.tick(41);assert.ok(f.messages.some(([id])=>id==='b'));f.tick(81);
 // No scheduler/raycast APIs in this fixture: chief's moon projectile is
 // canceled; the next warned mist remains targeted at the new attacker.
 if(chief){assert.deepEqual(f.hits,[]);f.tick(121);f.tick(161);}
 assert.ok(f.hits.some(([id])=>id==='b'));assert.ok(!f.hits.some(([id])=>id==='a'));
});
