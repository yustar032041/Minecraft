import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupGuardianBoss,GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {setupWardenBoss,WARDEN_DAMAGE_MULTIPLIER,WARDEN_NEW,wardenPatterns} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {WARDEN_MOVING,startMoving,advanceMoving} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_moving_attacks.js';
assert.equal(WARDEN_DAMAGE_MULTIPLIER,2.4*7,'seven times the previous scripted raw damage');
for(let i=0;i<5;i++)for(const a of WARDEN_NEW[i])assert.ok(wardenPatterns(i).includes(a));
// After a parry, the ten-second healing lock must not suppress either attack
// slot or a three-hit follow-up. The next warning still has a full windup.
{
 const hits=[],messages=[],players=[];let now=0;
 const d={id:'hakkai:warden_arena',getPlayers:()=>players,getEntities:()=>[boss],spawnParticle:()=>{}};
 const player=(id,x)=>({id,typeId:'minecraft:player',isValid:true,isSneaking:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([now,id,m]),playSound:()=>{},applyDamage:n=>{hits.push([now,id,n]);return true;},addEffect:()=>{}});
 const p=player('p',0),q=player('q',10);players.push(p,q);
 const health={currentValue:4800,effectiveMax:5000,setCurrentValue(v){this.currentValue=v;}};
 const boss={id:'boss',typeId:'hakkai:time_warden',isValid:true,dimension:d,location:{x:0,y:80,z:1},getComponent:()=>health,getDynamicProperty:()=>undefined,setDynamicProperty:()=>{},playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const c=setupWardenBoss({world,system,property:()=>{},report:(_,e)=>{throw e;},spendParry:()=>true});
 const tick=t=>{now=system.currentTick=t;c.tick(p,t);};
 for(let t=0;t<=111;t++)tick(t);now=system.currentTick=112;assert.equal(c.onMeleeParry({damagingEntity:p,hitEntity:boss}),true);const pausedHp=health.currentValue;
 for(let t=113;t<=232;t++){if(t===153)q.location.x=13;tick(t);}
 assert.ok(messages.some(([t,id,m])=>t===152&&id==='p'&&m.includes('時の三連撃')));
 assert.deepEqual(hits.filter(([,id])=>id==='p').map(([t])=>t),[192,212,232],'all three strikes during heal lock');
 assert.deepEqual(hits.filter(([,id])=>id==='q').map(([t])=>t),[192],'independent slot resolves during heal lock');
 assert.equal(health.currentValue,pausedHp,'healing stopped after parry');
}
// A wall clipping one side should not erase the whole front; the obscured
// side stays harmless. The unobstructed player must see and receive a hit.
{
 const parts=[],d={isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:(_from,dir)=>dir.x>.1?{block:{}}:undefined,spawnParticle:(_id,p)=>parts.push(p)};
 const aim={x:0,y:80,z:0},attack=WARDEN_MOVING[0][0],m=startMoving(aim,attack,0,['open','blocked'],0);
 const open={id:'open',location:{x:-3,y:80,z:0}},blocked={id:'blocked',location:{x:3,y:80,z:0}},hits=[];
 for(let t=1;t<=16;t++){const r=advanceMoving(d,m,t,[open,blocked]);for(const p of r.targets){hits.push(p.id);m.hit.add(p.id);}}
 assert.deepEqual(hits,['open']);assert.ok(parts.some(p=>p.x<0));assert.ok(!parts.some(p=>p.x>.1));
}
// Every guardian uses all three specials with warning, a deduplicated timer,
// refusal to hurt late arrivals, and cancellation on stagger or peaceful.
for(let realm=0;realm<8;realm++){
 let t=0,peaceful=false,players=[];const hits=[],messages=[],particles=[];
 const d={id:'realm',getPlayers:({location,maxDistance})=>players.filter(p=>Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance),getEntities:()=>[guardian],spawnParticle:(...x)=>particles.push(x)};
 const make=id=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x:1,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([t,id,m]),applyDamage:n=>{hits.push([t,id,n]);return true;},addEffect:()=>{}});
 const p=make('p');players=[p];const guardian={id:'guardian',typeId:`hakkai:guardian_${realm}`,isValid:true,dimension:d,location:{x:0,y:80,z:0}};
 const world={getDifficulty:()=>peaceful?Difficulty.Peaceful:Difficulty.Normal};const c=setupGuardianBoss({world});
 for(t=0;t<=230;t+=10){c.tick(p,t);c.tick(p,t);}
 assert.deepEqual(hits.map(h=>h[2]),GUARDIAN_TECHNIQUES.map(a=>a.damage));
 assert.deepEqual(hits.map(h=>h[0]),[70,150,230]);assert.equal(particles.length,48);
 assert.ok(GUARDIAN_TECHNIQUES.every(a=>messages.some(([,id,m])=>id==='p'&&m.includes(a.name))));
 t=270;c.tick(p,t);players.push(make('late'));t=310;c.tick(p,t);assert.equal(hits.some(([,id])=>id==='late'),false);
 t=350;c.tick(p,t);c.stagger(guardian,355);t=390;c.tick(p,t);assert.equal(hits.filter(([at])=>at===390).length,0);
 t=430;c.tick(p,t);peaceful=true;t=470;c.tick(p,t);assert.equal(hits.filter(([at])=>at===470).length,0);
}
console.log('Boss upgrade: sevenfold warden damage, post-parry slots and combos, clipped fronts, all eight guardian cycles (mocked)');
