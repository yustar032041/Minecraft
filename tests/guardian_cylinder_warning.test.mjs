import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupGuardianBoss,GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';

// The Bedrock API mock deliberately filters using 3-D spherical distance.
// This checks selection math and notification, not particles or actual clients.
for(let realm=0;realm<8;realm++)for(let index=0;index<3;index++){
 let tick=0;const players=[],hits=[],messages=[],queries=[];
 const dimension={id:'realm',getEntities:()=>[guardian],getPlayers:({location,maxDistance})=>{
  queries.push({tick,maxDistance});return players.filter(p=>Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance);
 },spawnParticle:()=>{}};
 function make(id,fail=false){return {id,typeId:'minecraft:player',isValid:true,dimension,location:{x:1,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage(msg){if(fail)throw Error('not notified');messages.push([tick,id,msg]);},applyDamage(){hits.push(id);return true;},addEffect:()=>{}}}
 const primary=make('primary');players.push(primary);
 const guardian={id:'g',typeId:`hakkai:guardian_${realm}`,isValid:true,dimension,location:{x:0,y:80,z:0},playAnimation:()=>{}};
 const ctrl=setupGuardianBoss({world:{getDifficulty:()=>Difficulty.Normal}});
 const go=t=>{tick=t;ctrl.tick(primary,t)};
 go(0);for(let prev=0;prev<index;prev++){go(30+prev*80);go(70+prev*80);}
 hits.length=0;messages.length=0;
 const ids=['upper','lower','outsideRadius','outsideHeight','unnotified'];
 const [upper,lower,outsideRadius,outsideHeight,unnotified]=ids.map(id=>make(id,id==='unnotified'));players.push(...[upper,lower,outsideRadius,outsideHeight,unnotified]);
 const warning=30+80*index,impact=warning+40;go(warning);
 assert.ok(messages.some(([t,id,msg])=>t===warning&&id==='primary'&&msg.includes('上下3ブロック')));
 const center={x:index===2?0:1,y:80,z:0},r=GUARDIAN_TECHNIQUES[index].radius;
 upper.location={x:center.x+r,y:83,z:0};lower.location={x:center.x-r,y:77,z:0};
 outsideRadius.location={x:center.x+r+.001,y:80,z:0};outsideHeight.location={x:center.x,y:83.001,z:0};
 const late=make('late');late.location={...center};players.push(late);
 go(impact);
 assert.deepEqual(hits.sort(),['lower','primary','upper'],`${realm}/${index}: full circle at ±3; no late/unnotified/outside hits`);
 assert.ok(queries.some(q=>q.tick===impact&&q.maxDistance>=Math.hypot(r,3)),`sphere encloses cylinder ${realm}/${index}`);
}
console.log('8 guardians × 3 skills: complete warned cylinder, heights, boundaries and notification (mocked spherical query)');
