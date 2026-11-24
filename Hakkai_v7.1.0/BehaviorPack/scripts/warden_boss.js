import { EntityDamageCause, GameMode, Difficulty, EquipmentSlot } from '@minecraft/server';
import { WARDEN_DIMENSION } from './warden_arena.js';
import { rescueWarden,isOutsideWardenArena } from './warden_rescue.js';
import { updateWardenAppearance,cancelWardenFlight } from './warden_appearance.js';
import { steerWarden } from './warden_movement.js';
import { WARDEN_ADVANCED } from './warden_advanced_attacks.js';
import { WARDEN_MOVING,startMoving,advanceMoving } from './warden_moving_attacks.js';
import { wardenTransition,wardenCharge,wardenImpact,wardenParried,wardenStrikePose,wardenFlightAura } from './warden_visuals.js';

export const WARDEN_PHASES=[
 {name:'§b第一形態・時の番人',attack:'時の斬撃',radius:3,damage:9,effect:'slowness'},
 {name:'§c第二形態・空の支配者',attack:'空の弾幕',radius:4,damage:10,effect:'weakness'},
 {name:'§a第三形態・地の崩壊者',attack:'大地の震撃',radius:5,damage:12,effect:'slowness'},
 {name:'§d第四形態・雷の裁き手',attack:'雷の裁き',radius:3.5,damage:14,effect:'weakness'},
 {name:'§6第五形態・真',attack:'終刻の光',radius:5,damage:16,effect:'blindness'}
];
// A second, differently shaped attack per phase. The marker is fixed at
// cast time; no environmental blocks are changed in the arena.
export const WARDEN_ALTERNATES=[
 {name:'§b第一形態・時の番人',attack:'時の十字斬り',shape:'cross',radius:5,width:1.25,damage:8,effect:'slowness'},
 {name:'§c第二形態・空の支配者',attack:'空の波紋',shape:'annulus',radius:6,inner:2,damage:9,effect:'slow_falling'},
 {name:'§a第三形態・地の崩壊者',attack:'地割れの十字',shape:'cross',radius:6,width:1.5,damage:11,effect:'slowness'},
 {name:'§d第四形態・雷の裁き手',attack:'雷の波紋',shape:'annulus',radius:6,inner:2,damage:13,effect:'weakness'},
 {name:'§6第五形態・真',attack:'終刻の十字光',shape:'cross',radius:7,width:1.5,damage:15,effect:'blindness'}
];
// Three extra patterns for each phase. The shapes have explicit, matching
// warning outlines; none alter terrain or summon uncontrolled entities.
export const WARDEN_EXTRA=[
 [
  {attack:'時の三連撃',shape:'circle',radius:2.7,damage:6,effect:'slowness',strikes:3},
  {attack:'時環の双撃',shape:'twin',radius:2.1,offset:3,damage:9,effect:'weakness'},
  {attack:'時計盤の封鎖',shape:'square',radius:3.2,damage:10,effect:'slowness'}
 ],[
  {attack:'空の狙撃路',shape:'line',radius:7,width:1.2,damage:11,effect:'slow_falling'},
  {attack:'双翼の弾幕',shape:'twin',radius:2.6,offset:3.5,damage:10,effect:'weakness'},
  {attack:'落雷前の気流',shape:'square',radius:3.5,damage:12,effect:'slowness'}
 ],[
  {attack:'大地の圧壊',shape:'square',radius:4,damage:13,effect:'slowness'},
  {attack:'岩脈の双撃',shape:'twin',radius:3,offset:4,damage:12,effect:'weakness'},
  {attack:'地震の三連波',shape:'circle',radius:3,damage:8,effect:'slowness',strikes:3}
 ],[
  {attack:'雷の直線裁き',shape:'line',radius:8,width:1,damage:15,effect:'weakness'},
  {attack:'雷雲の双閃',shape:'twin',radius:3,offset:4,damage:14,effect:'blindness'},
  {attack:'閃光の三連撃',shape:'circle',radius:3,damage:9,effect:'weakness',strikes:3}
 ],[
  {attack:'月光の審判',shape:'circle',radius:6,damage:20,effect:'blindness',totemWard:true},
  {attack:'終刻の裂線',shape:'line',radius:9,width:1.4,damage:18,effect:'weakness'},
  {attack:'真・時間の三連撃',shape:'circle',radius:3.5,damage:11,effect:'slowness',strikes:3}
 ]
];
export function inWardenWarning(player,aim,attack){
 const x=player.x-aim.x,z=player.z-aim.z;
 if(Math.abs(player.y-aim.y)>3)return false;
 if(attack.shape==='cross')return (Math.abs(x)<=attack.radius&&Math.abs(z)<=attack.width)||(Math.abs(z)<=attack.radius&&Math.abs(x)<=attack.width);
 if(attack.shape==='line')return attack.axis==='x'?Math.abs(z)<=attack.width&&Math.abs(x)<=attack.radius:Math.abs(x)<=attack.width&&Math.abs(z)<=attack.radius;
 if(attack.shape==='lanes'){const along=attack.axis==='x'?x:z,side=attack.axis==='x'?z:x;return Math.abs(along)<=attack.radius&&[-attack.offset,0,attack.offset].some(lane=>Math.abs(side-lane)<=attack.width);}
 if(attack.shape==='zones')return [-attack.offset,0,attack.offset].some(lane=>Math.hypot(x-lane,z)<=attack.radius);
 if(attack.shape==='square')return Math.abs(x)<=attack.radius&&Math.abs(z)<=attack.radius;
 if(attack.shape==='twin')return Math.hypot(x-attack.offset,z)<=attack.radius||Math.hypot(x+attack.offset,z)<=attack.radius;
 const d=Math.hypot(x,z);
 return d<=attack.radius&&(attack.shape!=='annulus'||d>=attack.inner);
}
export function wardenPhase(hp,max=5000){
 const ratio=max>0?Math.max(0,Math.min(1,hp/max)):1;
 if(ratio<=.2)return 4;
 if(ratio<=.4)return 3;
 if(ratio<=.6)return 2;
 if(ratio<=.8)return 1;
 return 0;
}
export const WARDEN_HEAL_PER_SECOND=12;
// Increase all 100 scripted patterns without changing their warning geometry.
export const WARDEN_DAMAGE_MULTIPLIER=2.4;
export const WARDEN_RECOVERY_TICKS=40;
// Every fifth selection belongs to the same source form. Final starts with its
// own attack, then alternates through forms 1–4 before repeating that order.
export function wardenPatterns(phase){
 const form=i=>[WARDEN_PHASES[i],WARDEN_ALTERNATES[i],...WARDEN_EXTRA[i],...WARDEN_MOVING[i],...WARDEN_ADVANCED[i]];
 if(phase!==4)return form(phase);
 const groups=[4,0,1,2,3].map(form),all=[];
 for(let i=0;i<20;i++)for(const group of groups)all.push(group[i]);
 return all;
}
const MUSIC_TICKS=[937,1372,613,1325,747];
export function setupWardenBoss({world,system,property,report,isEvading=()=>false,tryParry=()=>false,spendParry=()=>false,musicMuted=()=>false}){
 const states=new Map(),music=new Map();
 function clearMusic(id){const m=music.get(id);if(!m)return;try{m.sound?.stop();}catch{}music.delete(id);}
 function musicActive(id){return music.has(id);}
 function updateMusic(p,e,t){
  let muted=true;try{muted=musicMuted(p);}catch{}
  let alive=true;try{const h=p.getComponent('minecraft:health');if(h&&h.currentValue<=0)alive=false;}catch{}
  if(!e||!valid(p)||!alive||muted||world.getDifficulty()===Difficulty.Peaceful){clearMusic(p.id);return;}
  const phase=states.get(e.id)?.phase;
  if(!(phase>=0&&phase<5)){clearMusic(p.id);return;}
  let m=music.get(p.id);
  if(!m||m.boss!==e.id||m.phase!==phase){clearMusic(p.id);m={boss:e.id,phase,nextAt:t};music.set(p.id,m);}
  if(t>=m.nextAt){
   try{m.sound?.stop();}catch{}
   m.sound=undefined;
   try{m.sound=p.playSound(`hakkai.warden_phase_${phase+1}`,{volume:.8,pitch:1});m.nextAt=t+MUSIC_TICKS[phase];}
   catch{m.nextAt=t+100;}
  }
 }
 const valid=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 function telegraph(d,aim,attack){
  let ok=true;const dot=(x,z)=>{try{d.spawnParticle('hakkai:warning_marker',{x:aim.x+x,y:aim.y+.15,z:aim.z+z});}catch{ok=false;}};
  const circle=radius=>{for(let i=0;i<20;i++){const a=i*Math.PI/10;dot(Math.cos(a)*radius,Math.sin(a)*radius);}};
  if(attack.shape==='cross'){
   const w=attack.width,r=attack.radius;
   // Outline all 12 edges of the cross, including the ends.
   const corners=[[-w,-r],[w,-r],[w,-w],[r,-w],[r,w],[w,w],[w,r],[-w,r],[-w,w],[-r,w],[-r,-w],[-w,-w]];
   for(let i=0;i<corners.length;i++){
    const a=corners[i],b=corners[(i+1)%corners.length];
    const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));
    for(let j=0;j<steps;j++)dot(a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps);
   }
  }else if(attack.shape==='line'||attack.shape==='square'||attack.shape==='lanes'){
   const x=attack.shape==='square'?attack.radius:attack.width,z=attack.radius;
   const nx=Math.max(1,Math.ceil(2*x/.75)),nz=Math.max(1,Math.ceil(2*z/.75));
   const mark=(side,along)=>attack.axis==='x'?dot(along,side):dot(side,along);
   for(const lane of attack.shape==='lanes'?[-attack.offset,0,attack.offset]:[0]){
    for(let i=0;i<=nx;i++){const v=lane-x+2*x*i/nx;mark(v,-z);mark(v,z);}
    for(let i=0;i<=nz;i++){const v=-z+2*z*i/nz;mark(lane-x,v);mark(lane+x,v);}
   }
  }else if(attack.shape==='twin'||attack.shape==='zones'){
   for(const x of attack.shape==='zones'?[-attack.offset,0,attack.offset]:[-attack.offset,attack.offset])for(let i=0;i<20;i++){const a=i*Math.PI/10;dot(x+Math.cos(a)*attack.radius,Math.sin(a)*attack.radius);}
  }else{circle(attack.radius);if(attack.shape==='annulus')circle(attack.inner);}
  return ok;
 }
 function hasFushiTotem(p){
  try{
   if(p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Offhand)?.typeId==='hakkai:fushi_totem')return true;
   const c=p.getComponent('minecraft:inventory')?.container;
   if(c)for(let i=0;i<c.size;i++)if(c.getItem(i)?.typeId==='hakkai:fushi_totem')return true;
  }catch{}return false;
 }
 function followUp(e,s,pending,t){
  if(!(pending.remaining>1))return false;
  const warned=[];
  for(const p of world.getAllPlayers())if(pending.warned.includes(p.id)&&valid(p)&&p.dimension.id===WARDEN_DIMENSION)try{
   p.sendMessage(`§c${pending.attack.attack}：次の一撃！ 光の範囲から離れよう（約1秒）`);warned.push(p.id);
   try{p.playSound('random.orb',{volume:.35,pitch:1.4});}catch{}
  }catch{}
  if(!warned.length||!telegraph(e.dimension,pending.aim,pending.attack))return false;
  s.pending={...pending,warned,at:t+20,remaining:pending.remaining-1};return true;
 }
 function tickEntity(e,t){
  let s=states.get(e.id);
  if(!s){
   let saved=-1;
   for(const read of [()=>e.getDynamicProperty('hakkai:warden_phase'),()=>e.getProperty('hakkai:form')])try{const v=read();if(Number.isInteger(v)&&v>=0&&v<5)saved=Math.max(saved,v);}catch{}
   s={lastTick:-1,lastHeal:t,nextAt:t+80,phase:saved,phaseDirty:saved>=0,index:0,stopHealUntil:0};states.set(e.id,s);
  }
  if(s.lastTick===t)return;s.lastTick=t;
  if(isOutsideWardenArena(e)){
   // Never resolve or begin a damaging attack while the boss is out of bounds,
   // even when safe relocation fails. No catch-up healing on eventual return.
   s.pending=undefined;s.active=undefined;s.nextAt=t+100;s.lastHeal=t;
   cancelWardenFlight(e,s,t);rescueWarden(e);return;
  }
  if(world.getDifficulty()===Difficulty.Peaceful){s.pending=undefined;s.active=undefined;s.lastHeal=t;cancelWardenFlight(e,s,t);updateWardenAppearance(e,s,Math.max(0,s.phase),t,{peaceful:true});return;}
  const h=e.getComponent('minecraft:health');if(!h)return;
  const phase=Math.max(s.phase,wardenPhase(h.currentValue,h.effectiveMax));
  if(phase!==s.phase){
   const previous=s.phase;s.phase=phase;s.index=0;s.phaseDirty=true;
   if(previous>=0)wardenTransition(e,phase);
   for(const p of e.dimension.getPlayers({location:e.location,maxDistance:45}))try{p.sendMessage(`§d時空の管理者：${WARDEN_PHASES[phase].name}`);}catch{}
  }
  // Retry a failed write rather than losing an irreversible transition on reload.
  if(s.phaseDirty&&t>=(s.phaseSaveRetry??0)){try{e.setDynamicProperty('hakkai:warden_phase',phase);s.phaseDirty=false;}catch{s.phaseSaveRetry=t+20;}}
  const flightBusy=updateWardenAppearance(e,s,phase,t,{idle:!s.pending&&!s.active});
  if(s.takeoffAt===t&&(phase===1||phase===4))s.nextAt=Math.min(s.nextAt,t+20);
  try{if(s.takeoffAt!==undefined&&e.isOnGround===false&&(t-s.takeoffAt)%12===0)wardenFlightAura(e,phase);}catch{}
  // If a flight begun attack goes too high for a close counter, stop it rather
  // than resolving a warning that the player could not reasonably parry.
  if(s.flightUnsafe&&(s.pending?.airborne||s.active?.airborne)){
   s.pending=undefined;s.active=undefined;s.nextAt=t+100;
  }
  steerWarden(e,s,phase,t,{idle:!s.pending&&!s.active});
  // Tick-driven healing stops when no player is loading the boss; never grant
  // a large burst when a chunk reloads after a long absence.
  const seconds=Math.min(2,Math.floor((t-Math.max(s.lastHeal,s.stopHealUntil))/20));
  if(t<s.stopHealUntil)s.lastHeal=t;
  else if(seconds>0){try{h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+seconds*WARDEN_HEAL_PER_SECOND));}catch{}s.lastHeal=t;}
  if(s.active){
   const m=s.active;
   const people=world.getAllPlayers().filter(p=>m.warned.includes(p.id)&&valid(p)&&p.dimension.id===WARDEN_DIMENSION&&!isEvading(p));
   const result=advanceMoving(e.dimension,m,t,people);
   for(const p of result.targets){
    m.hit.add(p.id); // One hit or parry per player, not one per visual frame.
    if(tryParry(p,e))continue;
    let hit=false;try{hit=Boolean(p.applyDamage(m.attack.damage*WARDEN_DAMAGE_MULTIPLIER,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
    if(hit)try{p.addEffect(m.attack.effect,60,{amplifier:0,showParticles:false});}catch{}
   }
   if(result.done){s.active=undefined;s.nextAt=t+WARDEN_RECOVERY_TICKS;}
   return;
  }
  if(s.pending&&t>=s.pending.at){
   const pending=s.pending,{warned,aim,attack,at}=pending;s.pending=undefined;
   if(t>at){s.nextAt=t+100;return;} // A stale marker is no longer visible.
   if(attack.motion){
    // Refresh warning through the full moving sequence, not just its launch.
    if(!telegraph(e.dimension,aim,attack)){s.nextAt=t+100;return;}
    s.active=startMoving(aim,attack,pending.phase,warned,t);s.active.airborne=pending.airborne;
    wardenStrikePose(e,pending.phase);
    for(const p of world.getAllPlayers())if(warned.includes(p.id)&&valid(p)&&p.dimension.id===WARDEN_DIMENSION)try{p.playSound('random.explode',{volume:.35,pitch:1.15});}catch{}
    return;
   }
   wardenImpact(e,aim,attack,pending.phase,inWardenWarning);
   for(const p of world.getAllPlayers())if(warned.includes(p.id)&&valid(p)&&p.dimension.id===WARDEN_DIMENSION)try{p.playSound('random.explode',{volume:.4,pitch:.9+pending.phase*.1});}catch{}
   // Only people explicitly warned at cast time can be hit. Others entering
   // the area later are spared, including on message/API failure.
   for(const p of world.getAllPlayers())if(warned.includes(p.id)&&valid(p)&&p.dimension.id===WARDEN_DIMENSION&&inWardenWarning(p.location,aim,attack)&&!isEvading(p)){
    if(tryParry(p,e))continue;
    const warded=attack.totemWard&&hasFushiTotem(p);
    let hit=false;try{hit=Boolean(p.applyDamage((warded?attack.damage/2:attack.damage)*WARDEN_DAMAGE_MULTIPLIER,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
    if(hit&&warded)try{p.sendMessage('§dFUSHIのトーテムが月光の審判を和らげた！');}catch{}
    if(hit)try{p.addEffect(attack.effect,60,{amplifier:0,showParticles:false});}catch{}
   }
   if(!followUp(e,s,pending,t))s.nextAt=t+WARDEN_RECOVERY_TICKS;
   return;
  }
  if(s.pending&&(t===s.pending.at-20||t===s.pending.at-10))wardenCharge(e,s.pending.phase,t===s.pending.at-20?1:2);
  if(!s.pending&&!flightBusy&&t>=s.nextAt){
   const targets=e.dimension.getPlayers({location:e.location,maxDistance:45}).filter(valid);
   targets.sort((a,b)=>Math.hypot(a.location.x-e.location.x,a.location.z-e.location.z)-Math.hypot(b.location.x-e.location.x,b.location.z-e.location.z));
   const p=targets[0];if(!p){s.nextAt=t+40;return;}
   const patterns=wardenPatterns(phase);
   const attack=patterns[s.index++%patterns.length],aim={...p.location};
   const instruction=attack.motion==='wave'?(attack.reverse?'光の輪が外から中心へ収束する':'光の輪が中心から外へ広がる'):
    attack.motion==='twinwave'?'二つの輪から光が広がる':
    attack.motion==='cross'?(attack.reverse?'十字の光が外から中心へ収束する':'十字の光が中心から広がる'):
    attack.motion==='sweep'?(attack.reverse?'光の刃が反時計回りに回転する':'光の刃が時計回りに回転する'):
    attack.motion==='zones'?(attack.reverse?'三つの輪が東から西へ順に光る':'三つの輪が西から東へ順に光る'):
    attack.motion==='barrage'?`三本の道を弾が${attack.axis==='x'?(attack.reverse?'西':'東'):(attack.reverse?'北':'南')}へ流れる`:
    attack.motion==='bolt'?`光の道を弾が${attack.axis==='x'?(attack.reverse?'西':'東'):(attack.reverse?'北':'南')}へ流れる`:
    attack.shape==='cross'?'十字の光から離れよう':attack.shape==='annulus'?'二重の輪の間から離れよう（中央も安全）':attack.shape==='line'?'光の直線から離れよう':attack.shape==='square'?'光の四角から離れよう':attack.shape==='twin'?'二つの輪から離れよう':'光の輪から離れよう';
   const warned=[];
   for(const player of targets)try{
    player.sendMessage(`§c${attack.attack}：${instruction}（約2秒）。直前にしゃがみ近接攻撃でパリィ（スタミナ15）`);warned.push(player.id);
    try{player.playSound('random.orb',{volume:.35,pitch:1});}catch{}
   }catch{}
   if(!warned.includes(p.id)){s.nextAt=t+100;return;}
   if(!telegraph(e.dimension,aim,attack)){s.nextAt=t+100;return;}
   wardenCharge(e,phase,0);
   s.pending={warned,aim,attack,phase,airborne:(phase===1||phase===4)&&s.takeoffAt!==undefined,at:t+40,remaining:attack.strikes??1};
  }
 }
 function tick(p,t){
  if(p.dimension.id!==WARDEN_DIMENSION){clearMusic(p.id);return;}
  try{
   const bosses=p.dimension.getEntities({type:'hakkai:time_warden',location:p.location,maxDistance:60,closest:1});
   const e=bosses[0];if(e)tickEntity(e,t);
   const near=e&&e.isValid&&Math.hypot(e.location.x-p.location.x,e.location.y-p.location.y,e.location.z-p.location.z)<=45?e:undefined;
   updateMusic(p,near,t);
  }catch(err){clearMusic(p.id);if(t%200===0)report('時空の管理者',err);}
  for(const [id,s] of states)if(t-s.lastTick>2400)states.delete(id);
 }
 // A close-range counter, not a generic damage cancel: only the warned,
 // endangered player can parry the scripted attack during its last 8 ticks.
 function onMeleeParry({damagingEntity:p,hitEntity:e}){
  if(!valid(p)||!p.isSneaking||!e?.isValid||e.typeId!=='hakkai:time_warden'||p.dimension.id!==WARDEN_DIMENSION||e.dimension.id!==WARDEN_DIMENSION)return false;
  if(world.getDifficulty()===Difficulty.Peaceful)return false;
  const s=states.get(e.id),pending=s?.pending,t=system.currentTick;
  if(!pending||t<pending.at-8||t>=pending.at||!pending.warned.includes(p.id))return false;
  if(Math.hypot(p.location.x-e.location.x,p.location.z-e.location.z)>5||Math.abs(p.location.y-e.location.y)>3||!inWardenWarning(p.location,pending.aim,pending.attack))return false;
  try{if(!spendParry(p,15))return false;}catch{return false;}
  s.pending=undefined;s.nextAt=t+40;s.stopHealUntil=t+200;s.lastHeal=t;cancelWardenFlight(e,s,t);
  for(const player of e.dimension.getPlayers({location:e.location,maxDistance:45}))try{player.sendMessage('§bパリィ成功！ 攻撃を中断し、回復を10秒止めた。');}catch{}
  wardenParried(e,s.phase);
  return true;
 }
 function stagger(e,t){
  const s=states.get(e?.id);if(!s||e.typeId!=='hakkai:time_warden')return;
  s.pending=undefined;s.active=undefined;s.nextAt=Math.max(s.nextAt,t+40);s.stopHealUntil=Math.max(s.stopHealUntil,t+200);s.lastHeal=t;cancelWardenFlight(e,s,t);
 }
 function onDeath({deadEntity,damageSource}){
  if(deadEntity?.typeId!=='hakkai:time_warden')return;
  states.delete(deadEntity.id);for(const [id,m] of music)if(m.boss===deadEntity.id)clearMusic(id);const p=damageSource?.damagingEntity;
  if(valid(p))try{property(p,'time_warden_clear',1);p.sendMessage('§6時空の管理者を討伐。挑戦印かガイドから再戦できます。');}catch{}
 }
 return {tick,onDeath,onMeleeParry,stagger,clearMusic,musicActive};
}
