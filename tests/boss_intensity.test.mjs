import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {setupFushiSystem,CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {GameMode,Difficulty} from '@minecraft/server';
function fixture(type){
 let now=0;const hits=[],messages=[];
 const entity={id:'boss',typeId:type,isValid:true,location:{x:0,y:80,z:0},getComponent:()=>({currentValue:100,effectiveMax:100})};
 const dim={id:'hakkai:realm_7',getEntities:()=>[entity],getPlayers:()=>players,spawnParticle:()=>{}};entity.dimension=dim;
 const player=id=>({id,typeId:'minecraft:player',isValid:true,dimension:dim,location:{x:1,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([now,id,m]),applyDamage:n=>{hits.push([now,id,n]);return true;},applyImpulse:()=>{},addEffect:()=>{}});
 const p=player('p'),q=player('q'),players=[p,q],system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 return {p,q,entity,system,world,hits,messages,step(t){system.currentTick=now=t;}};
}
{
 const f=fixture('hakkai:eclipse_colossus');const c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{},report:(_,e)=>{throw e;}});
 for(let t=0;t<=260;t+=10){f.step(t);c.tickBosses(f.p,t);c.tickBosses(f.q,t);}
 assert.deepEqual(f.hits.map(v=>[v[0],v[1],v[2]]),[[140,'p',13*3],[140,'q',13*3],[230,'p',12*3],[230,'q',12*3]],'rebalanced damage and phase 1 cadence once per warned hit');
 const warnings=f.messages.filter(([t,id,m])=>id==='p'&&m.includes('秒後')).map(([t])=>t);
 assert.deepEqual(warnings,[100,190]); // 40-tick warning, 50-tick recovery
}
{
 const f=fixture('hakkai:fushi_chief'),c=setupFushiSystem({...f,report:(_,e)=>{throw e;}});
 c.onHurt({hurtEntity:f.entity,damageSource:{damagingEntity:f.p}});
 for(let t=0;t<=280;t+=10){f.step(t);c.tickChiefs(f.p,t);c.tickChiefs(f.q,t);}
 // No scheduler or raycasts: the charge and moon shot fail closed; each has
 // a dedicated movement/collision integration suite. Only the mist hits here.
 assert.deepEqual(f.hits.map(v=>v[0]),[220]);
 assert.deepEqual(f.hits.map(v=>v[2]),[CHIEF_ATTACKS[2].damage]);
 assert.deepEqual(f.messages,[]);
}
console.log('Boss cadence and rebalanced damage with two players (mocked, no Bedrock combat test)');
// A player entering after the warning cannot be damaged by the enlarged attack.
{
 const f=fixture('hakkai:eclipse_colossus'),players=f.world.getAllPlayers();
 const c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{},report:(_,e)=>{throw e;}});
 for(let t=0;t<=100;t+=10){f.step(t);c.tickBosses(f.p,t);}
 const late={...f.q,id:'late',applyDamage:n=>{f.hits.push([f.system.currentTick,'late',n]);return true;}};players.push(late);
 for(let t=110;t<=140;t+=10){f.step(t);c.tickBosses(f.p,t);}
 assert.deepEqual(f.hits.map(v=>v[1]),['p','q']);
}
