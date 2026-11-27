// Shared simulated clock, raycasts and entities for moving attack tests.
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
export function fixture(profile,{ender=false,onParry=()=>{},reject=false}={}){
 let now=0,wall=Infinity,loaded=true,particlesFail=false,other=[],difficulty=Difficulty.Normal;
 const queue=[],hits=[],effects=[],selfEffects=[],heals=[],impulses=[],particles=[],messages=[],anim=[];
 const d={id:'r',isChunkLoaded:()=>loaded,getBlock:()=>({isAir:true}),
  getBlockFromRay:(a,v,{maxDistance})=>{const x=(wall-a.x)/v.x;return Number.isFinite(x)&&x>=0&&x<=maxDistance?{block:{location:{x:wall,y:a.y,z:a.z}},faceLocation:{x:0,y:0,z:0}}:undefined},
  getEntitiesFromRay:(a,v,{maxDistance})=>[p,...other].filter(e=>e.isValid).map(e=>{
   const dx=e.location.x-a.x,dy=e.location.y+.8-a.y,dz=e.location.z-a.z;
   const along=dx*v.x+dy*v.y+dz*v.z,radial=Math.hypot(dx-along*v.x,dy-along*v.y,dz-along*v.z);
   return {entity:e,distance:Math.max(0,along-.35),along,radial};
  }).filter(x=>x.along>=0&&x.radial<=.35&&x.distance<=maxDistance),
  getEntities:opts=>opts?.families?[mob]:[],getPlayers:()=>[p],
  spawnParticle:(id,pos)=>{if(particlesFail)throw Error('no particles');particles.push([now,id,{...pos}]);}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:5,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:m=>messages.push(m),
  applyDamage:n=>{hits.push([now,n]);return !reject},addEffect:e=>effects.push(e),applyImpulse:()=>{}};
 const mob={id:'m',typeId:ender?`hakkai:ender_${profile.realm}`:`hakkai:${profile.id}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},
  playAnimation:id=>anim.push([now,id]),applyImpulse:v=>impulses.push(v),addEffect:id=>selfEffects.push(id),getComponent:()=>({currentValue:10,effectiveMax:20,setCurrentValue:n=>heals.push(n)})};
 const system={currentTick:0,runTimeout(fn,delay){queue.push({at:this.currentTick+delay,fn});}},world={getDifficulty:()=>difficulty,getAllPlayers:()=>[p]};
 const common={world,system,report:(_,e)=>{throw e},tryParry:(p,e)=>!!onParry(p,e)};
 const ctrl=ender?setupRealmEnders({...common,safe:()=>false}):setupMobSystem({...common,ns:'hakkai:',num:()=>0,property:()=>{}});
 if(ender)ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p}});
 function tick(t){now=system.currentTick=t;ctrl.tick(p,t);}
 function advance(to){while(now<to){now++;system.currentTick=now;while(queue.some(x=>x.at===now)){const i=queue.findIndex(x=>x.at===now);queue.splice(i,1)[0].fn();}if(now%10===0)ctrl.tick(p,now);}}
 return {p,mob,d,ctrl,system,world,tick,advance,queue,hits,effects,selfEffects,heals,impulses,particles,messages,anim,
  wall:v=>wall=v,loaded:v=>loaded=v,particlesFail:v=>particlesFail=v,other:v=>other=v,difficulty:v=>difficulty=v};
}
export function start(profile,options={}){const f=fixture(profile,options);if(options.ender){f.tick(20);f.advance(60);}else{f.tick(0);f.tick(120);f.advance(160);}return f;}
