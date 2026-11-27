// Script-API mocks, not a Bedrock physics or multiplayer test.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
function fixture(){
 let tick=0;const hits=[],messages=[];let evading=false,parrying=false;
 const d={id:'realm',getEntities:()=>[boss],getPlayers:()=>players,spawnParticle:()=>{}};
 const make=(id,x)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push([tick,id,m]),applyDamage:n=>{hits.push([tick,id,n]);return true},addEffect:()=>{},applyImpulse:()=>{}});
 const p=make('p',2),players=[p],boss={id:'king',typeId:'hakkai:eclipse_colossus',isValid:true,dimension:d,location:{x:0,y:80,z:0},getComponent:()=>({currentValue:100,effectiveMax:100,setCurrentValue:()=>{}}),playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:(_,e)=>{throw e},isEvading:()=>evading,tryParry:()=>parrying});
 const go=t=>{tick=system.currentTick=t;ctrl.tickBosses(p,t)};
 for(let t=0;t<=190;t+=10)go(t);hits.length=0;
 return {p,boss,players,messages,hits,make,go,setEvading:v=>evading=v,setParrying:v=>parrying=v};
}
test('native unannounced melee removed and proximity strike has 2 second warning',()=>{
 const c=JSON.parse(readFileSync(new URL('../Hakkai_v7.1.0/BehaviorPack/entities/eclipse_colossus.json',import.meta.url)))['minecraft:entity'].components;
 assert.equal(c['minecraft:attack'],undefined);assert.equal(c['minecraft:behavior.melee_attack'],undefined);assert.ok(c['minecraft:behavior.move_towards_target']);
 const f=fixture();assert.ok(f.messages.some(([t,,m])=>t===190&&m.includes('近接攻撃')&&m.includes('2秒後')));
 f.go(220);assert.deepEqual(f.hits,[]);f.go(230);assert.deepEqual(f.hits,[[230,'p',9]]);
});
test('melee respects actual range, height, warning recipients, evasion and parry',()=>{
 for(const change of [f=>f.p.location.x=4,f=>f.p.location.y=84,f=>f.setEvading(true),f=>f.setParrying(true),f=>f.boss.location.x=6]){
  const f=fixture();change(f);f.go(230);assert.deepEqual(f.hits,[]);
 }
 const f=fixture();const late=f.make('late',2.5);f.players.push(late);f.go(230);assert.deepEqual(f.hits,[[230,'p',9]]);
});
