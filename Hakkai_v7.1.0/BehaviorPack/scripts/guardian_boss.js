import {Difficulty,EntityDamageCause,GameMode} from '@minecraft/server';
import {insideWarning} from './attack_warning.js';

// The old guardians only had a weak vanilla melee attack. Give all eight
// warned specials, while keeping target and state independent per guardian.
export const GUARDIAN_TECHNIQUES=[
 {name:'守護の衝撃',radius:3.5,damage:10,effect:'slowness'},
 {name:'守護の追撃',radius:4.5,damage:12,effect:'weakness'},
 {name:'守護の波動',radius:6,damage:9,effect:'slowness'}
];
export function setupGuardianBoss({world,isEvading=()=>false,tryParry=()=>false,report=()=>{}}){
 const states=new Map(),valid=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 function tickEntity(e,t){
  if(!e?.isValid||!/^hakkai:guardian_[0-7]$/.test(e.typeId))return;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(e.id);return;}
  let s=states.get(e.id);if(!s){s={lastTick:-1,nextAt:t+30,index:0};states.set(e.id,s);}
  if(s.lastTick===t)return;s.lastTick=t;
  if(s.pending&&t>=s.pending.at){
   const p=s.pending;s.pending=undefined;s.nextAt=t+40;
   if(t!==p.at)return; // never deliver a stale invisible hit
   for(const target of e.dimension.getPlayers({location:p.aim,maxDistance:p.attack.radius})){
    if(!valid(target)||!p.warned.includes(target.id)||!insideWarning(target.location,p.aim,p.attack.radius)||isEvading(target)||tryParry(target,e))continue;
    let hit=false;try{hit=Boolean(target.applyDamage(p.attack.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
    if(hit)try{target.addEffect(p.attack.effect,50,{amplifier:0,showParticles:false});}catch{}
   }
   return;
  }
  if(s.pending||t<s.nextAt)return;
  const targets=e.dimension.getPlayers({location:e.location,maxDistance:22}).filter(valid);
  targets.sort((a,b)=>Math.hypot(a.location.x-e.location.x,a.location.z-e.location.z)-Math.hypot(b.location.x-e.location.x,b.location.z-e.location.z));
  if(!targets.length){s.nextAt=t+40;return;}
  const attack=GUARDIAN_TECHNIQUES[s.index++%GUARDIAN_TECHNIQUES.length];
  const aim={...(s.index%3===0?e.location:targets[0].location)},warned=[];
  for(const p of targets)try{p.sendMessage(`§c${attack.name}：光の輪から離れよう（2秒）`);warned.push(p.id);}catch{}
  if(!warned.includes(targets[0].id)){s.nextAt=t+40;return;}
  try{for(let i=0;i<16;i++){const a=i*Math.PI/8;e.dimension.spawnParticle('hakkai:warning_marker',{x:aim.x+Math.cos(a)*attack.radius,y:aim.y+.15,z:aim.z+Math.sin(a)*attack.radius});}}catch{s.nextAt=t+40;return;}
  s.pending={at:t+40,aim,attack,warned};
 }
 function tick(player,t){
  if(!player?.isValid)return;
  try{for(const e of player.dimension.getEntities({families:['hakkai_guardian'],location:player.location,maxDistance:28,closest:8}))tickEntity(e,t);}
  catch(err){if(t%200===0)report('守護獣の行動',err);}
  for(const [id,s] of states)if(t-s.lastTick>2400)states.delete(id);
 }
 function stagger(e,t){const s=states.get(e?.id);if(s){s.pending=undefined;s.nextAt=Math.max(s.nextAt,t+40);}}
 function onDeath(e){states.delete(e?.id);}
 return {tick,stagger,onDeath};
}
