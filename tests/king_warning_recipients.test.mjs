// Simulates changing query results; checks that only actual recipients can be
// damaged. Does not verify Bedrock delivery, timing or network behavior.
import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {Difficulty,GameMode} from '@minecraft/server';
function fixture({fail=false}={}){
 let tick=0,queries=0;const warnings=[],hits=[],markers=[],players=[];
 const d={id:'realm',getEntities:()=>[boss],getPlayers:({maxDistance})=>{
  if(maxDistance===84){queries++;return queries%2===1?[p,q]:[p];}
  return players;
 },spawnParticle:id=>{if(id==='hakkai:warning_marker')markers.push(tick);}};
 function player(id,x){return {id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:s=>{if(fail&&id==='q')throw Error('offline');warnings.push([id,s]);},applyDamage:()=>{hits.push(id);return true;},addEffect:()=>{},applyImpulse:()=>{}}}
 const p=player('p',2),q=player('q',2.5);players.push(p,q);
 const boss={id:'king',typeId:'hakkai:eclipse_colossus',isValid:true,dimension:d,location:{x:0,y:80,z:0},getComponent:()=>({currentValue:100,effectiveMax:100,setCurrentValue:()=>{}}),playAnimation:()=>{}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const c=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:(_,err)=>{throw err}});
 const go=t=>{system.currentTick=tick=t;c.tick(p,t)};go(0);go(100);
 return {warnings,hits,markers,players,go,player,get queries(){return queries}};
}
{
 const f=fixture();assert.equal(f.queries,1,'only the message-recipient snapshot is used');
 assert.deepEqual(f.warnings.filter(([,text])=>text.includes('八界断ち')).map(([id])=>id),['p','q']);
 const late=f.player('late',2.25);f.players.push(late);f.go(140);
 assert.deepEqual(f.hits.sort(),['p','q']);assert.ok(!f.hits.includes('late'),'late entrants are never retroactively notified');
}
{
 const f=fixture({fail:true});assert.equal(f.markers.length,0,'any message failure cancels before the ring');f.go(140);assert.deepEqual(f.hits,[]);
}
console.log('King warning recipients: one delivered-message snapshot, no late entrants, failed notification cancels (mocked)');
