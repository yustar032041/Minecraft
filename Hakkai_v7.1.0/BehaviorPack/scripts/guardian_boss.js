import { talentImpact } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import {Difficulty,EntityDamageCause,GameMode} from '@minecraft/server';
import {insideWarning,warningSearchRadius} from './attack_warning.js';

// The old guardians only had a weak vanilla melee attack. Give all eight
// warned specials, while keeping target and state independent per guardian.
export const GUARDIAN_TECHNIQUES=[
 {name:'守護の衝撃',radius:3.5,damage:10,effect:'slowness',visual:'brace'},
 {name:'守護の追撃',radius:4.5,damage:14,effect:'weakness',visual:'lunge'},
 {name:'守護の波動',radius:6,damage:9,effect:'slowness',visual:'cast'}
];
// Cosmetic only: all eight guardians share three attacks, but the winged
// sixth realm uses its wings while the others use their four legs.
export function guardianVisualAnimation(entity,attack,phase){
 const match=/^hakkai:guardian_([0-7])$/.exec(entity?.typeId??'');
 return match?`animation.hakkai.guardian_${match[1]}_${attack.visual}_${phase}`:`animation.hakkai.creature_${phase}`;
}
export function setupGuardianBoss({world,isEvading=()=>false,tryParry=()=>false,report=()=>{}}){
 const states=new Map(),valid=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 function tickEntity(e,t){
  if(!e?.isValid||!/^hakkai:guardian_[0-7]$/.test(e.typeId))return;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(e.id);return;}
  let s=states.get(e.id);if(!s){s={lastTick:-1,nextAt:t+30,index:0};states.set(e.id,s);}
  if(s.lastTick===t)return;s.lastTick=t;
  if(s.pending&&t>=s.pending.at){
   const p=s.pending;s.pending=undefined;s.nextAt=t+40;
   if(t!==p.at||!p.dimensionId||e.dimension.id!==p.dimensionId)return; // stale or different dimension: no visible warning
   creatureStrike(e,guardianVisualAnimation(e,p.attack,'strike'));
   const realm=Number(e.typeId.slice(-1));
   talentImpact(e,{talent:'burst',realm},{aim:p.aim,radius:p.attack.radius});
   // The API distance query is spherical. Enclose the full warned horizontal
   // circle and ±3 height first, then apply the exact cylindrical hit test.
   // Candidates must still have received the warning before the attack.
   for(const target of e.dimension.getPlayers({location:p.aim,maxDistance:warningSearchRadius(p.attack.radius)}))try{
    if(!valid(target)||!p.warned.includes(target.id)||!insideWarning(target.location,p.aim,p.attack.radius)||isEvading(target)||tryParry(target,e))continue;
    let hit=false;try{hit=Boolean(target.applyDamage(p.attack.damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
    if(hit)try{target.addEffect(p.attack.effect,50,{amplifier:0,showParticles:false});}catch{}
   }catch{} // One disconnected/unreadable target must not block other warned players.
   return;
  }
  if(s.pending||t<s.nextAt)return;
  const origin=e.location,targets=[];
  if(!origin||![origin.x,origin.y,origin.z].every(Number.isFinite)){s.nextAt=t+40;return;}
  for(const p of e.dimension.getPlayers({location:origin,maxDistance:22}))try{
   if(!valid(p))continue;
   const l=p.location,id=p.id;if(!id||!l||![l.x,l.y,l.z].every(Number.isFinite))continue;
   targets.push({p,id,location:{x:l.x,y:l.y,z:l.z}});
  }catch{} // Disconnecting one player must not block the others' warnings.
  targets.sort((a,b)=>Math.hypot(a.location.x-origin.x,a.location.z-origin.z)-Math.hypot(b.location.x-origin.x,b.location.z-origin.z));
  if(!targets.length){s.nextAt=t+40;return;}
  const attack=GUARDIAN_TECHNIQUES[s.index++%GUARDIAN_TECHNIQUES.length];
  const aim={...(s.index%3===0?origin:targets[0].location)},warned=[];
  for(const target of targets)try{target.p.sendMessage(`§c${attack.name}：光の輪の範囲と上下3ブロックから離れよう（2秒）`);warned.push(target.id);}catch{}
  if(!warned.includes(targets[0].id)){s.nextAt=t+40;return;}
  try{for(let i=0;i<16;i++){const a=i*Math.PI/8;e.dimension.spawnParticle('hakkai:warning_marker',{x:aim.x+Math.cos(a)*attack.radius,y:aim.y+.15,z:aim.z+Math.sin(a)*attack.radius});}}catch{s.nextAt=t+40;return;}
  creatureWindup(e,guardianVisualAnimation(e,attack,'windup'));s.pending={at:t+40,aim,attack,warned,dimensionId:e.dimension.id};
 }
 function tick(player,t){
  if(!player?.isValid)return;
  try{for(const e of player.dimension.getEntities({families:['hakkai_guardian'],location:player.location,maxDistance:28,closest:8})){
   try{tickEntity(e,t);}catch(err){if(t%200===0)report('守護獣個体の行動',err);}
  }}
  catch(err){if(t%200===0)report('守護獣の行動',err);}
  for(const [id,s] of states)if(t-s.lastTick>2400)states.delete(id);
 }
 function stagger(e,t){const s=states.get(e?.id);if(s){s.pending=undefined;s.nextAt=Math.max(s.nextAt,t+40);}}
 function onDeath(e){states.delete(e?.id);}
 return {tick,stagger,onDeath};
}
