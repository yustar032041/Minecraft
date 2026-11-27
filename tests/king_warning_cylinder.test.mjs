// Actual king controller with a spherical query mock, not Bedrock multiplayer.
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';

const attacks=[
 ['八界断ち',3.5,true],['星骸落とし',4,true],['時環封じ',6,true],
 ['蝕光爆ぜ',9,false],['星蝕の収束',7,true],['影兵招来',7,false],
 ['時空裂波',18,false],['終焉咆哮',18,false],['逆刻再編',16,false]
];
for(let index=0;index<attacks.length;index++){
 if(index===5)continue; // Existing minion summon is checked in king_summon_warning.
 let now=0;const hits=[],effects=[],notices=[],parries=[],markers=[],players=[];
 const d={id:'realm',getEntities:q=>q.families?[]:[king],spawnEntity:()=>{},
  getPlayers:({location,maxDistance})=>players.filter(p=>p.isValid&&p.dimension.id==='realm'&&Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance),
  spawnParticle:(id,pos)=>{if(id==='hakkai:warning_marker')markers.push([now,{...pos}]);}};
 function make(id,x=2){return {id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>notices.push([now,id,m]),applyDamage:n=>{hits.push([id,n]);return true},addEffect:name=>effects.push([id,name]),applyImpulse:()=>{}}}
 const primary=make('primary');players.push(primary);
 const king={id:'king',typeId:'hakkai:eclipse_colossus',isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},addEffect:()=>{},getComponent:()=>({currentValue:20,effectiveMax:100,setCurrentValue:()=>{}})};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:(_,e)=>{throw e},tryParry:p=>{parries.push(p.id);return false}});
 const tick=t=>{now=system.currentTick=t;ctrl.tick(primary,t)};
 const start=100+index*70;
 for(let t=0;t<start;t+=10)tick(t);
 const upper=make('upper',2.1),lower=make('lower',2.2),outsideHeight=make('outsideHeight',2.3),outsideRadius=make('outsideRadius',2.4);
 players.push(upper,lower,outsideHeight,outsideRadius);hits.length=effects.length=parries.length=notices.length=markers.length=0;
 tick(start);
 const [label,radius,targetCentered]=attacks[index],center={x:targetCentered?2:0,y:80,z:0};
 assert.ok(notices.some(([t,id,m])=>t===start&&id==='upper'&&m.includes(label)&&m.includes('上下3ブロック')),label);
 const warning=markers.filter(([t])=>t===start);assert.ok(warning.length>=16);
 for(const [,loc] of warning)assert.ok(Math.abs(Math.hypot(loc.x-center.x,loc.z-center.z)-radius)<1e-8,label);
 upper.location={x:center.x+radius-.01,y:83,z:0};lower.location={x:center.x-radius+.01,y:77,z:0};
 outsideHeight.location={x:center.x,y:83.01,z:0};outsideRadius.location={x:center.x+radius+.01,y:80,z:0};
 const late=make('late');late.location={...center};players.push(late);
 tick(start+40);
 // Phase 3 raw amounts, taken from the running controller rather than a
 // duplicate-only balance spreadsheet. The summon is tested separately.
 const phase3=[57,54,24,45,48,null,36,30,33];
 assert.equal(hits.find(h=>h[0]==='primary')?.[1],phase3[index],label);
 for(const id of ['upper','lower']){
  assert.ok(parries.includes(id),`${label}/${id}: inside complete cylinder reached parry`);
  assert.ok(effects.some(e=>e[0]===id),`${label}/${id}: affected inside warning`);
  assert.equal(hits.some(h=>h[0]===id),!['終焉咆哮','逆刻再編'].includes(label),`${label}/${id}: outer status-only rule preserved`);
 }
 for(const id of ['outsideHeight','outsideRadius','late']){
  assert.ok(!parries.includes(id),`${label}/${id}: excluded before parry`);
  assert.ok(!hits.some(h=>h[0]===id)&&!effects.some(e=>e[0]===id),`${label}/${id}: no damage or status`);
 }
}
console.log('King eight existing damage/status attacks: warned cylinder, ±3 edges, no late entrants, outer status-only (mocked spherical API)');
