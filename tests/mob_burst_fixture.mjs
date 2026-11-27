// Tick scheduler and dimension mock for creature moving-wave tests.
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
export function fixture(profile,{reject=false,parry=()=>false,evade=()=>false}={}){
 let now=0,wall=Infinity,loaded=true,failVisual=false;const queue=[],players=[],hits=[],particles=[],impulses=[];
 const system={currentTick:0,runTimeout(fn,delay){queue.push({at:this.currentTick+delay,fn});}};
 const d={id:'r',isChunkLoaded:()=>loaded,getBlock:()=>({isAir:true}),
  getBlockFromRay:(a,v,{maxDistance})=>{const k=(wall-a.x)/v.x;if(!Number.isFinite(k)||k<0||k>maxDistance)return;return {block:{location:{x:wall,y:a.y,z:a.z+v.z*k}},faceLocation:{x:0,y:0,z:0}};},
  getEntities:()=>[mob],getPlayers:({location,maxDistance})=>players.filter(p=>Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance),
  spawnParticle:(id,at)=>{if(failVisual)throw Error('visual unavailable');particles.push([now,id,{...at}]);}};
 const make=(id,x=4,z=0)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y:80,z},getGameMode:()=>GameMode.Survival,
  applyDamage:n=>{hits.push([now,id,n]);return !reject},addEffect:()=>{},applyImpulse:v=>impulses.push([id,v]),sendMessage:()=>{throw Error('floor marker');}});
 const p=make('primary');players.push(p);
 const mob={id:'mob',typeId:`hakkai:${profile.id}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},applyImpulse:()=>{},addEffect:()=>{},getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:()=>{}})};
 const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty;},getAllPlayers:()=>players};
 const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>{},tryParry:parry,isEvading:evade});
 const tick=t=>{now=system.currentTick=t;ctrl.tick(p,t)};
 tick(0);tick(120);
 function advance(t){while(now<t){now++;system.currentTick=now;while(queue.some(q=>q.at===now)){const i=queue.findIndex(q=>q.at===now);queue.splice(i,1)[0].fn();}if(now%10===0)ctrl.tick(p,now);}}
 return {p,mob,make,players,hits,particles,impulses,world,system,queue,ctrl,tick,advance,wall:v=>wall=v,loaded:v=>loaded=v,failVisual:v=>failVisual=v};
}
