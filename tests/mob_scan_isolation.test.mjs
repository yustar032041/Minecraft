// Real controller with query-aware Bedrock mocks, not an engine or load test.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameMode,Difficulty} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';

function fixture(){
 const hits=[],messages=[],queries=[],reports=[];const system={currentTick:0};
 let entities=[],failWild=false;
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:()=>({isSolid:false}),getBlockFromRay:()=>undefined,spawnParticle:()=>{},getPlayers:()=>[p],
  getEntities(q){
   queries.push(q);if(failWild&&q.families)throw Error('wildlife search unavailable');
   const matching=entities.filter(e=>q.type?e.kind===q.type:q.families?e.family==='hakkai_wildlife':true);
   return matching.slice(0,q.closest??matching.length);
  }};
 const p={id:'p',typeId:'minecraft:player',isValid:true,location:{x:2,y:80,z:0},dimension:d,getGameMode:()=>GameMode.Survival,
  sendMessage:m=>messages.push(m),applyDamage:n=>{hits.push(n);return true},applyImpulse:()=>{},addEffect:()=>{}};
 const makeMob=(id,kind='hakkai:wild_0_2')=>({id,kind,family:'hakkai_wildlife',typeId:kind,isValid:true,location:{x:0,y:80,z:0},dimension:d,
  applyImpulse:()=>{},addEffect:()=>{},playAnimation:()=>{},getComponent:()=>({effectiveMax:1000,currentValue:1000,setCurrentValue:()=>{}})});
 const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const controller=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:(...a)=>reports.push(a)});
 return {p,d,hits,messages,queries,reports,controller,makeMob,setEntities:e=>{entities=e},setFailWild:v=>{failWild=v},tick:t=>{system.currentTick=t;controller.tick(p,t)}};
}
test('every scripted wildlife profile has the queried entity family',()=>{
 assert.equal(mobContentList.length,120);
 for(const profile of mobContentList){
  const entity=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/${profile.id}.json`,'utf8'))['minecraft:entity'];
  assert.ok(entity.components['minecraft:type_family'].family.includes('hakkai_wildlife'),profile.id);
 }
});
test('nearby unrelated entities cannot consume the wildlife query limit',()=>{
 const f=fixture(),mob=f.makeMob('hostile');
 f.setEntities([...Array.from({length:50},(_,i)=>({id:`item${i}`,kind:'minecraft:item',family:'item'})),mob]);
 for(const t of [0,120,160])f.tick(t);
 assert.ok(f.messages.length>0,'hostile receives its warning opportunity');assert.ok(f.hits.length>0,'warned attack resolves');
 assert.ok(f.queries.some(q=>q.families?.includes('hakkai_wildlife')&&q.closest===40));
});
test('an invalid creature does not prevent later valid ones from acting',()=>{
 const f=fixture(),bad={id:'stale',family:'hakkai_wildlife',get typeId(){throw Error('unloaded')}},mob=f.makeMob('hostile');
 f.setEntities([bad,mob]);for(const t of [0,120,160])f.tick(t);
 assert.ok(f.reports.length>0);assert.ok(f.messages.length>0);assert.ok(f.hits.length>0);
});
test('one stale boss reference cannot block a later valid boss',()=>{
 const f=fixture(),bad={kind:'hakkai:eclipse_colossus',get typeId(){throw Error('unloaded')}},boss=f.makeMob('king','hakkai:eclipse_colossus');boss.family='hakkai_boss';
 f.setEntities([bad,boss]);for(const t of [0,120,160])f.tick(t);
 assert.ok(f.reports.length>0);assert.ok(f.messages.some(m=>m.includes('八界断ち')));assert.ok(f.hits.length>0);
});
test('king remains independently scanned when wildlife search fails',()=>{
 const f=fixture(),boss=f.makeMob('king','hakkai:eclipse_colossus');boss.family='hakkai_boss';
 f.setEntities([boss]);f.setFailWild(true);for(const t of [0,120,160])f.tick(t);
 assert.ok(f.queries.some(q=>q.type==='hakkai:eclipse_colossus'));assert.ok(f.messages.some(m=>m.includes('八界断ち')));assert.ok(f.hits.length>0);
});
