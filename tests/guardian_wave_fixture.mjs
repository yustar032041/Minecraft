// A deterministic tick scheduler and geometric dimension mock. Not Bedrock.
import {Difficulty,GameMode} from '@minecraft/server';
import {setupGuardianBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
export function fixture({realm=0,special=false,evade=()=>false,parry=()=>false,reject=false}={}){
 let now=0,wall=Infinity,loaded=true;const queue=[],hits=[],effects=[],particles=[],animations=[],players=[];
 const system={currentTick:0,runTimeout(fn,delay){queue.push({at:this.currentTick+delay,fn});}};
 const d={id:'realm',isChunkLoaded:()=>loaded,getBlock:()=>({isAir:true}),
  getBlockFromRay:(a,v,{maxDistance})=>{const k=(wall-a.x)/v.x;if(!Number.isFinite(k)||k<0||k>maxDistance)return;return {block:{location:{x:wall,y:a.y,z:a.z+v.z*k}},faceLocation:{x:0,y:0,z:0}};},
  getPlayers:({location,maxDistance})=>players.filter(p=>{try{return Math.hypot(p.location.x-location.x,p.location.y-location.y,p.location.z-location.z)<=maxDistance;}catch{return true;}}),
  getEntities:()=>[guardian],spawnParticle:(id,pos)=>particles.push([now,id,{...pos}])};
 const make=(id,x=4,y=80,z=0)=>({id,typeId:'minecraft:player',isValid:true,dimension:d,location:{x,y,z},getGameMode:()=>GameMode.Survival,sendMessage(){throw Error('unexpected marker');},applyDamage(n){hits.push([now,id,n]);return !reject;},addEffect(id){effects.push([now,this.id,id]);}});
 const primary=make('primary');players.push(primary);
 const guardian={id:'g',typeId:`hakkai:${special?'king_':''}guardian_${realm}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:id=>animations.push([now,id])};
 const world={difficulty:Difficulty.Normal,getDifficulty(){return this.difficulty;}};
 const ctrl=setupGuardianBoss({world,system,isEvading:evade,tryParry:parry});
 function tick(t){now=system.currentTick=t;ctrl.tick(primary,t);}
 tick(0);
 function advance(to){while(now<to){now++;system.currentTick=now;while(queue.some(q=>q.at===now)){const i=queue.findIndex(q=>q.at===now);queue.splice(i,1)[0].fn();}if(now%10===0)ctrl.tick(primary,now);}}
 return {system,d,primary,guardian,world,ctrl,players,make,tick,advance,queue,hits,effects,particles,animations,wall:v=>wall=v,loaded:v=>loaded=v};
}
