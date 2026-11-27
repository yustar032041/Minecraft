import {GameMode} from '@minecraft/server';
import {prepareCombatRay} from './combat_wind_ray.js';
import {combatEnemies,applyCombatHit,isCombatTarget,combatEffectAllowed} from './combat_resonance.js';
const COOLDOWN=120,delta=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export const MAGIC={
 light:{cost:5,index:13,name:'光の矢'},bond:{cost:20,index:14,name:'絆の灯'},
 wind:{cost:8,index:15,name:'風の輪'},water:{cost:10,index:16,name:'水の縛り'},
 fire:{cost:12,index:17,name:'炎の環'},moon:{cost:15,index:18,name:'月のまどろみ'}
};
// Bosses do not lose knockback immunity and are never put to sleep/staggered.
function boss(e){return /^(?:hakkai:(?:time_warden|eclipse_colossus|fushi_chief|guardian_[0-7])|minecraft:(?:wither|ender_dragon|warden))$/.test(e.typeId??'');}
function ring(p,center,r,particle='hakkai:wind_burst'){
 for(let i=0;i<12;i++){const a=i*Math.PI/6;try{p.dimension.spawnParticle(particle,{x:center.x+Math.cos(a)*r,y:center.y+.5,z:center.z+Math.sin(a)*r});}catch{}}
}
function lightProjectile(p,system,initial,stagger){
 const dimension=p.dimension,dimId=dimension.id,direction=initial.direction;
 let from=initial.origin,remaining=12;
 function advance(){
  try{
   if(!p.isValid||p.dimension.id!==dimId||remaining<=0)return;
   const step=Math.min(2,remaining),segment=prepareCombatRay(p,step,e=>isCombatTarget(e,p),from,direction);
   if(!segment)return; // Chunk/raycast failure: never hit through it.
   for(let i=0;i<=4;i++){const n=segment.distance*i/4;try{dimension.spawnParticle('hakkai:wind_burst',{x:from.x+direction.x*n,y:from.y+direction.y*n,z:from.z+direction.z*n});}catch{}}
   if(segment.target){
    const target=segment.target,landed=applyCombatHit(p,target,5,5,-1,.2);
    if(landed&&combatEffectAllowed(p,target)&&!boss(target)){try{target.addEffect('slowness',30,{amplifier:1,showParticles:false});}catch{}try{stagger?.(target,30);}catch{}}
    return;
   }
   if(segment.blocked)return; // wall or friendly entity, even at the endpoint
   from={x:from.x+direction.x*step,y:from.y+direction.y*step,z:from.z+direction.z*step};remaining-=step;
   if(remaining>0)system.runTimeout(advance,1);
  }catch{}
 }
 system.runTimeout(advance,1);
}
export function castNewMagic({p,s,system,kind,notice,mark,visibleFrom,stagger,hasTotem}){
 const spell=MAGIC[kind],t=system.currentTick;
 try{
  if(!p?.isValid||p.typeId!=='minecraft:player'||![GameMode.Survival,GameMode.Adventure,GameMode.Creative].includes(p.getGameMode())||!spell)return false;
  const creative=p.getGameMode()===GameMode.Creative;
  if(kind==='moon'&&(!hasTotem||!hasTotem())){notice(p,'§eFUSHIのトーテムを手に持って使ってください');return false;}
  if(kind==='moon'&&(s.cd.get('fushi_moon')??0)>t){notice(p,'§e月のまどろみはまだ再使用できない');return false;}
  if(!creative&&s.m<spell.cost){notice(p,'§e魔力が足りない');return false;}
  let beam,participants=[],targets=[],health;
  if(kind==='light'){
   // Check the launch segment before spending. The rest is checked each tick.
   beam=prepareCombatRay(p,2,e=>isCombatTarget(e,p));
   if(!beam){notice(p,'§e光の進路を確認できません');return false;}
  }else if(kind==='bond'){
   const found=[p,...p.dimension.getPlayers({location:p.location,maxDistance:8})],unique=new Map();
   for(const person of found){
    if(!person?.isValid||person.typeId!=='minecraft:player'||!([GameMode.Survival,GameMode.Adventure].includes(person.getGameMode())||(person.id===p.id&&creative))||person.dimension.id!==p.dimension.id||delta(p.location,person.location)>8)continue;
    const h=person.getComponent('minecraft:health');
    if(h&&Number.isFinite(h.currentValue)&&Number.isFinite(h.effectiveMax))unique.set(person.id,{person,health:h});
   }
   participants=[...unique.values()].sort((a,b)=>delta(p.location,a.person.location)-delta(p.location,b.person.location)).slice(0,8);
   if(!participants.some(({person})=>person.id===p.id)){notice(p,'§e自分の体力を確認できません');return false;}
  }else if(kind==='moon'){
   health=p.getComponent('minecraft:health');
   if(!health||!Number.isFinite(health.currentValue)||!Number.isFinite(health.effectiveMax)){notice(p,'§e体力を確認できません');return false;}
  }
  if(kind!=='light'){
   const range=kind==='bond'?8:kind==='moon'?6:5;
   targets=combatEnemies(p,range,8,{players:kind!=='bond'}).filter(e=>{try{return visibleFrom(p,e.getHeadLocation());}catch{return false;}}).slice(0,kind==='bond'?4:6);
  }
  // Casting moon magic never consumes the held totem. Its cooldown is
  // separate from the ordinary tome spells; revival remains a separate use.
  if(!creative)s.m-=spell.cost;
  if(kind==='moon')s.cd.set('fushi_moon',t+COOLDOWN);
  if(kind==='light'){
   try{lightProjectile(p,system,beam,stagger);}catch{}
  }else if(kind==='bond'){
   for(const {person,health:h} of participants){try{h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+4));}catch{}ring(person,person.location,.7);}
   for(const e of targets)applyCombatHit(p,e,5,0,-1,.35);
  }else if(kind==='moon'){
   try{health.setCurrentValue(Math.min(health.effectiveMax,health.currentValue+8));}catch{}
   for(const e of targets)if(!boss(e)){
    try{e.addEffect('slowness',60,{amplifier:255,showParticles:true});}catch{}
    try{e.addEffect('weakness',60,{amplifier:255,showParticles:false});}catch{}
    try{stagger?.(e,60);}catch{}
   }
   ring(p,p.location,2);
  }else{
   for(const e of targets){
    if(kind==='wind')applyCombatHit(p,e,3,0,-1,1.5);
    if(kind==='water'){
     if(applyCombatHit(p,e,3,1,-1,.1)&&combatEffectAllowed(p,e))try{e.addEffect('slowness',80,{amplifier:4,showParticles:true});}catch{}
    }
    if(kind==='fire')applyCombatHit(p,e,4,2,-1,.2);
   }
   ring(p,p.location,2,kind==='wind'?'hakkai:wind_trace':'hakkai:wind_burst');
  }
  try{p.playAnimation('animation.hakkai.magic_cast',{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}
  try{p.playSound('random.orb',{volume:.35,pitch:kind==='light'?1.65:1.15});}catch{}
  try{mark(p,'learned_spells',spell.index);}catch{}
  try{notice(p,`§b${spell.name}${kind==='moon'?'・FUSHIが応援！':''}`);}catch{}
  return true;
 }catch{return false;}
}
