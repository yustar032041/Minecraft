import { safeWildlifeEscape } from './wildlife_escape.js';
import { combatPlayerAttacker } from './combat_player_attacker.js';
import { createMobTargetMarks } from './mob_target_mark.js';
import { findCombatPlayer } from './combat_find_player.js';
import { talentImpact, talentContact, drainLink } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import { setupGuardianBoss } from './guardian_boss.js';
import { KING_SHADOW_SUMMONS, findKingShadowSpawn } from './king_summon_positions.js';
import { EntityDamageCause, GameMode, Difficulty } from '@minecraft/server';
import { mobContent, mobContentList } from './mob_content.js';
import { insideWarning, warningSearchRadius, kingWarningMarkerCount, isInstantMarkedTalent, isInstantAreaTalent } from './attack_warning.js';
import { clearRushLine, RUSH_REACH } from './mob_rush_line.js';
import { clearColossusSpawnGround } from './colossus_spawn_ground.js';
import { home, attrs } from './data.js';
import { recycledAttribute } from './drop_recycling.js';

const BOSS='hakkai:eclipse_colossus';
const PHASES=['§b第一相・星喰い','§d第二相・時蝕','§c第三相・終焉'];
// Small, cosmetic-feeling ground advances after an accepted close hit; not
// damaging dash paths and never applied for missed/canceled attacks.
const HUNTER_ADVANCE=Object.freeze({'foe_0_4':.18,'foe_1_4':.2,'foe_5_4':.22});
export const DRAIN_RANGE=8, DRAIN_HEIGHT=3;
const SINGLE_TALENT_LIMITS=Object.freeze({thorns:8,web:11,spore:12,frost:11,shock:13,time:14,gust:14,mark:16,defend:5,leech:DRAIN_RANGE});
// Presentation tracks selected by the already chosen boss technique. The
// authoritative warning, target, damage and timing are unchanged.
export function bossVisualAnimation(kind,phase){
 const style=kind==='cleave'?'cleave':['starfall','time_snare','star_collapse','summon'].includes(kind)?'cast':'wave';
 return `animation.hakkai.eclipse_${style}_${phase}`;
}

export function setupMobSystem(ctx){
 const {ns,world,system,num,property,report,isEvading=()=>false,tryParry=()=>false}=ctx;
 const mobStates=new Map(), bossStates=new Map(), lastBossTick=new Map();
 const targetMarks=createMobTargetMarks();
 let summonedBoss;
 const guardians=setupGuardianBoss({world,isEvading,tryParry,report});
 const validPlayer=p=>p?.isValid&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function particle(d,id,loc){try{d.spawnParticle(id,loc);}catch{}}
 function ring(d,loc,radius,realm){
  for(let i=0;i<16;i++){
   const a=Math.PI*2*i/16;
   particle(d,`hakkai:climate_${realm%8}`,{x:loc.x+Math.cos(a)*radius,y:loc.y+.15,z:loc.z+Math.sin(a)*radius});
  }
 }
 function push(source,target,horizontal=.85,vertical=.16){
  if(target.typeId==='minecraft:player'&&isEvading(target))return;
  const dx=target.location.x-source.location.x,dz=target.location.z-source.location.z,k=Math.hypot(dx,dz)||1;
  try{target.applyImpulse({x:dx/k*horizontal,y:vertical,z:dz/k*horizontal});}catch{}
 }
 function hit(source,target,amount){
  if(!validPlayer(target)||isEvading(target))return false;
  try{return Boolean(target.applyDamage(amount,{cause:EntityDamageCause.entityAttack,damagingEntity:source}));}catch{return false;}
 }
 function heal(entity,amount){
  try{const h=entity.getComponent('minecraft:health');if(h)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+amount));}catch{}
 }
 function addEffect(target,id,ticks,amplifier=0){if(target.typeId==='minecraft:player'&&isEvading(target))return;try{target.addEffect(id,ticks,{amplifier,showParticles:false});}catch{}}
 function signatureEcho(entity,target,profile){
  const id=profile.signatureId??0,style=id%15,tier=profile.signatureTier??0,v=profile.variant;
  const ticks=18+tier*3+v*4;
  switch(style){
   case 0:targetMarks.mark(entity,target,system.currentTick,ticks,profile.realm);break;
   case 1:addEffect(target,'weakness',ticks,0);break;
   case 2:addEffect(target,'slowness',ticks,0);break;
   case 3:addEffect(target,'poison',Math.max(12,ticks-8),0);break;
   case 4:addEffect(target,'blindness',Math.max(10,ticks-12),0);break;
   case 5:addEffect(target,'slow_falling',ticks,0);push(entity,target,.35+tier*.025,.14);break;
   case 6:push(entity,target,.55+tier*.035,.08);break;
   case 7:addEffect(entity,'resistance',ticks,0);break;
   case 8:addEffect(entity,'speed',ticks,0);break;
   case 9:heal(entity,.5+tier*.15);break;
   case 10:addEffect(target,'weakness',ticks+8,tier>5?1:0);break;
   case 11:addEffect(target,'mining_fatigue',ticks+8,0);break;
   case 12:addEffect(target,'slowness',ticks+8,1);break;
   case 13:targetMarks.mark(entity,target,system.currentTick,ticks,profile.realm);addEffect(target,'weakness',ticks,0);break;
   default:addEffect(entity,'resistance',ticks,0);heal(entity,.5+tier*.1);break;
  }
  particle(entity.dimension,`hakkai:climate_${profile.realm%8}`,{x:target.location.x,y:target.location.y+.8,z:target.location.z});
 }
 // Recheck the fixed warning and dimension after parry and visual callbacks.
 // The pre-damage hit remains authoritative once accepted; this does not try
 // to undo effects if a native damage handler moves a player afterward.
 function creatureEligible(entity,target,warning){
  try{return !!(entity?.isValid&&warning?.dimensionId&&entity.dimension.id===warning.dimensionId&&validPlayer(target)&&
   target.dimension.id===warning.dimensionId&&Number.isFinite(dist(entity.location,target.location))&&insideWarning(target.location,warning.aim,warning.radius)&&!isEvading(target));}catch{return false;}
 }
 function mobMove(entity,target,profile,warning,contactAllowed=true){
  if(!creatureEligible(entity,target,warning)||dist(entity.location,target.location)>=(profile.talent==='burst'?9:20))return;
  const v=profile.variant,realm=profile.realm;
  let landed=false;
  const rush=profile.talent==='leap'||profile.talent==='charge';
  // A body movement is shown at the creature, not as an instant impact at a
  // distant warning mark. This does not change the fixed warning circle.
  talentImpact(entity,profile,rush?{...warning,aim:entity.location}:warning);
  if(!creatureEligible(entity,target,warning)||dist(entity.location,target.location)>=(profile.talent==='burst'?9:20))return;
  const range=dist(entity.location,target.location);
  // Damage and secondary effects are one operation: a canceled hit must not
  // leave an orphaned debuff, knockback or lifesteal behind.
  const strike=(amount,after=()=>{})=>{
   if(!creatureEligible(entity,target,warning))return;
   const currentRange=dist(entity.location,target.location),limit=SINGLE_TALENT_LIMITS[profile.talent];
   if(limit!==undefined&&currentRange>=limit)return;
   if((rush||profile.talent==='ward'||profile.talent==='armor')&&(currentRange>RUSH_REACH||!clearRushLine(entity,target)))return;
   if(profile.talent==='leech'&&!clearRushLine(entity,target,DRAIN_HEIGHT))return;
   let impact,dimension;
   // Damage handlers may move or invalidate the victim, so snapshot only for
   // cosmetics before the hit; the accepted hit remains authoritative.
   if(isInstantMarkedTalent(profile.talent))try{impact={...target.location};dimension=entity.dimension;}catch{}
   if(!creatureEligible(entity,target,warning))return;
   if(hit(entity,target,amount)){
    landed=true;if(impact)talentContact(dimension,impact,profile);
    after();
   }
  };
  switch(profile.talent){
   case 'leap':
   case 'charge':{
    if(!clearRushLine(entity,target)||!creatureEligible(entity,target,warning))break;
    // These are impulses, not damaging dash paths. Before either moving or
    // striking, require a direct loaded line and similar elevation. Damage
    // is an immediate close-range hit, never a six-block invisible punch.
    const contactPoint={...target.location};
    if(profile.talent==='leap'){
     if(range>RUSH_REACH){try{entity.applyImpulse({x:(target.location.x-entity.location.x)*.09,y:.28+v*.04,z:(target.location.z-entity.location.z)*.09});}catch{}}
     else strike(5+v*2,()=>{push(entity,target,.6+v*.18,.3);particle(entity.dimension,'hakkai:mob_impact',{x:contactPoint.x,y:contactPoint.y+.8,z:contactPoint.z});});
    }else{
     if(range>RUSH_REACH&&range<13){try{entity.applyImpulse({x:(target.location.x-entity.location.x)*(.07+v*.015),y:.04,z:(target.location.z-entity.location.z)*(.07+v*.015)});}catch{}}
     if(range<=RUSH_REACH)strike(6+v*2,()=>{push(entity,target,1.1+v*.2,.12);particle(entity.dimension,'hakkai:mob_impact',{x:contactPoint.x,y:contactPoint.y+.8,z:contactPoint.z});});
    }
    break;
   }
   case 'web':if(range<11)strike(2+v,()=>{addEffect(target,'slowness',55+v*18,1+Math.floor(v/2));if(v===2)addEffect(target,'weakness',50,0);});break;
   case 'spore':if(range<12)strike(2+v,()=>{addEffect(target,'poison',55+v*22,v===2?1:0);if(v===1)addEffect(target,'nausea',65,0);});break;
   case 'frost':if(range<11)strike(3+v,()=>{addEffect(target,'slowness',65+v*20,1+v);addEffect(target,'mining_fatigue',75+v*15,0);});break;
   case 'shock':if(range<13)strike(4+v*2,()=>{addEffect(target,'weakness',75+v*18,v===2?1:0);});break;
   case 'time':
    if(profile.id==='foe_7_0'&&range>2.5&&range<8){const dx=target.location.x-entity.location.x,dz=target.location.z-entity.location.z;try{entity.applyImpulse({x:dx/range*.32,y:.04,z:dz/range*.32});}catch{}}
    if(range<14)strike(2+v,()=>{addEffect(target,'slowness',70+v*25,2+v);addEffect(target,'weakness',65,0);if(v===2)addEffect(target,'blindness',35,0);});break;
   case 'gust':if(range<14)strike(2+v,()=>{push(entity,target,1.1+v*.3,.25+v*.08);if(v===2)addEffect(target,'slow_falling',42,0);});break;
   case 'burst':
    if(range<9)for(const other of entity.dimension.getPlayers({location:warning.aim,maxDistance:warningSearchRadius(warning.radius)})){
     // Area damage cannot surprise an unnotified player who entered the
     // marked area after it appeared, or whose notification failed.
     try{
     if(!warning.warnedPlayers?.includes(other.id)||!creatureEligible(entity,other,warning)||tryParry(other,entity))continue;
     if(!creatureEligible(entity,other,warning))continue;
     let impact,dimension;try{impact={...other.location};dimension=entity.dimension;}catch{}
     if(!creatureEligible(entity,other,warning))continue;
     if(hit(entity,other,5+v*2)){
      if(impact)talentContact(dimension,impact,profile);
      // The winged marquis disperses players with a stronger updraft; it
      // still hits only inside the same warned area and on accepted damage.
      if(profile.id==='foe_6_8')push(entity,other,1.35,.35);else push(entity,other,1.15,.24);
      if(other.id===target.id)landed=true;
     }
     }catch{} // One stale or failing player must not hide other warned players.
    }
    break;
   case 'leech':{
    // An instant drain line, not a projectile or a damaging dash. Recheck
    // after parry callbacks before drawing or dealing the hit.
    if(range>=DRAIN_RANGE||!insideWarning(target.location,warning.aim,warning.radius)||!clearRushLine(entity,target,DRAIN_HEIGHT)||!creatureEligible(entity,target,warning))break;
    drainLink(entity,target,realm);
    if(!creatureEligible(entity,target,warning)||dist(entity.location,target.location)>=DRAIN_RANGE||!clearRushLine(entity,target,DRAIN_HEIGHT))break;
    if(profile.id==='foe_7_10'&&range>2.5){const dx=target.location.x-entity.location.x,dz=target.location.z-entity.location.z;try{entity.applyImpulse({x:dx/range*.22,y:.02,z:dz/range*.22});}catch{}}
    // Capture the direction before damage: damage handlers can invalidate or
    // relocate the target. The accepted hit, not the later target position,
    // controls this non-damaging movement.
    const advance=HUNTER_ADVANCE[profile.id],dx=target.location.x-entity.location.x,dz=target.location.z-entity.location.z,k=Math.hypot(dx,dz);
    strike(5+v,()=>{
     heal(entity,2+v*2);addEffect(entity,'speed',50,0);
     if(advance&&range>2.5&&range<6.5&&k>0)try{entity.applyImpulse({x:dx/k*advance,y:.02,z:dz/k*advance});}catch{}
    });break;
   }
   case 'mark':if(range<16)strike(v===2?4:2,()=>{targetMarks.mark(entity,target,system.currentTick,80+v*30,realm);addEffect(target,'weakness',65+v*10,0);});break;
   case 'ward':
   case 'armor':{
    addEffect(entity,'resistance',85+v*20,v===2?1:0);
    if(profile.talent==='ward'){
     for(const ally of entity.dimension.getEntities({families:['hakkai_wildlife'],location:entity.location,maxDistance:8+v*2}).slice(0,7)){
      if(ally.id!==entity.id&&mobContent.get(ally.typeId)?.realm===realm)addEffect(ally,'resistance',70,0);
     }
    }else addEffect(entity,'strength',65,0);
    // The self/ally buff is independent of the optional close strike. The
    // caller has checked reach, height and line before permitting the hit.
    if(contactAllowed&&insideWarning(target.location,warning.aim,warning.radius)&&dist(entity.location,target.location)<=RUSH_REACH&&clearRushLine(entity,target)){
     const impact={...target.location};
     strike(2+v,()=>particle(entity.dimension,'hakkai:mob_impact',{x:impact.x,y:impact.y+.8,z:impact.z}));
    }
    break;
   }
   case 'thorns':if(range<8)strike(3+v*2,()=>addEffect(target,'slowness',45+v*10,0));break;
   case 'defend':addEffect(entity,'resistance',80,1);if(range<5)strike(3+v,()=>push(entity,target,.75,.16));break;
   default:addEffect(entity,'speed',60,0);break;
  }
  if(landed&&range<12)signatureEcho(entity,target,profile);
  particle(entity.dimension,`hakkai:climate_${realm%8}`,{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});
 }
 function passiveMove(entity,player,profile){
  if(profile.talent==='shy'){
   const s=mobStates.get(entity.id);if(!s||system.currentTick>=s.nextAt){
    mobStates.set(entity.id,{nextAt:system.currentTick+95+profile.variant*20});
    const escape=safeWildlifeEscape(entity,player);if(!escape)return;
    try{entity.applyImpulse({x:escape.x*(.55+profile.variant*.12),y:.14,z:escape.z*(.55+profile.variant*.12)});}catch{return;}
    try{entity.addEffect('speed',65, {amplifier:1+profile.variant,showParticles:false});}catch{}
    addEffect(entity,['jump_boost','slow_falling','speed'][profile.signatureId%3],48+profile.signatureTier*3,profile.variant===2?1:0);
    particle(entity.dimension,`hakkai:climate_${profile.realm}`,{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});
   }
  }else if(profile.talent==='defend'){
   const s=mobStates.get(entity.id);if(!s||system.currentTick>=s.nextAt){
    mobStates.set(entity.id,{nextAt:system.currentTick+130+profile.variant*25});
    for(const ally of entity.dimension.getEntities({families:['hakkai_wildlife'],location:entity.location,maxDistance:7}).slice(0,6)){
     if(mobContent.get(ally.typeId)?.realm===profile.realm){addEffect(ally,'resistance',55+profile.signatureTier*3,0);addEffect(ally,['speed','jump_boost','regeneration'][profile.signatureId%3],42+profile.signatureTier*3,0);}
    }
    particle(entity.dimension,`hakkai:climate_${profile.realm}`,{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});
   }
  }
 }
 // Static 2.2s markers match the fixed two-second windup at the 40-tick
 // update cadence. Abort rather than strike invisibly after a delayed update.
 function warningRing(d,aim,radius,count=16){
  try{for(let i=0;i<count;i++){const a=Math.PI*2*i/count;d.spawnParticle('hakkai:warning_marker',{x:aim.x+Math.cos(a)*radius,y:aim.y+.15,z:aim.z+Math.sin(a)*radius});}return true;}catch{return false;}
 }
 function scheduleCreatureMove(entity,target,profile,t){
  let s=mobStates.get(entity.id);
  if(!s){s={nextAt:t+70+profile.variant*23,pending:undefined};mobStates.set(entity.id,s);}
  if(s.pending){
   if(t<s.pending.at)return;
   const warning=s.pending,victim=findCombatPlayer(world,s.pending.playerId);
   s.pending=undefined;s.nextAt=t+115+profile.variant*27+(profile.realm%3)*9;
   if(t!==warning.at||!warning.dimensionId||entity.dimension.id!==warning.dimensionId)return;
   creatureStrike(entity);
   const eligible=p=>creatureEligible(entity,p,warning);
   if(profile.talent==='burst'){
    // The original target may leave, evade or disconnect while another
    // notified player remains in the circle. Choose a valid nearby anchor
    // without introducing new recipients or changing the fixed warning.
    let anchor=eligible(victim)&&dist(victim.location,entity.location)<9?victim:undefined;
    if(!anchor)try{
     for(const p of entity.dimension.getPlayers({location:warning.aim,maxDistance:warningSearchRadius(warning.radius)}))try{
      if(warning.warnedPlayers.includes(p.id)&&eligible(p)&&dist(p.location,entity.location)<9){anchor=p;break;}
     }catch{}
    }catch{}
    if(anchor)mobMove(entity,anchor,profile,warning);
   }else if(eligible(victim)&&dist(victim.location,entity.location)<20){
    // Check an obstructed body attack before consuming the target's parry.
    if((profile.talent==='leap'||profile.talent==='charge')&&!clearRushLine(entity,victim))return;
    if(profile.talent==='leech'&&(dist(entity.location,victim.location)>=DRAIN_RANGE||!clearRushLine(entity,victim,DRAIN_HEIGHT)))return;
    if(profile.talent==='ward'||profile.talent==='armor'){
     // A shield/armor buff can still resolve behind cover; only its optional
     // body strike needs a clear close path. Parry the actual strike, not a
     // self/ally buff happening out of reach or behind a wall.
     const contact=dist(victim.location,entity.location)<=RUSH_REACH&&clearRushLine(entity,victim);
     if(!contact||!tryParry(victim,entity))mobMove(entity,victim,profile,warning,contact);
    }else if(!tryParry(victim,entity))mobMove(entity,victim,profile,warning);
   }
   return;
  }
  if(t<s.nextAt||!validPlayer(target)||dist(entity.location,target.location)>17)return;
  const radius=profile.talent==='burst'?4+profile.variant:1.2+profile.variant*.7,aim={...target.location};
  const audience=profile.talent==='burst'?'通知を受けた人が対象':'あなたのみ対象';
  const detail=profile.talent==='leap'||profile.talent==='charge'?'、近距離のみ命中・遮蔽物や高低差で不発':
   profile.talent==='ward'?'、近距離のみ打撃・自身と仲間の強化あり':profile.talent==='armor'?'、近距離のみ打撃・自身の強化あり':
   profile.talent==='leech'?'、吸命の射線は遮蔽物で止まる':isInstantAreaTalent(profile.talent)?'、輪内に即時発生・壁を貫通':'';
  const message=`§c⚠ ${profile.actionName}！ 輪の範囲と上下3ブロックから離れよう（2秒、${audience}${detail}）`;
  try{target.sendMessage(message);}catch{s.nextAt=t+115;return;}
  if(!warningRing(entity.dimension,aim,radius)){s.nextAt=t+115;return;}
  const warnedPlayers=[target.id];
  if(profile.talent==='burst'){
   // A fixed recipient set prevents new entrants or message failures from
   // receiving damage without the corresponding two-second notice.
   try{for(const other of entity.dimension.getPlayers({location:aim,maxDistance:warningSearchRadius(radius)})){
    try{
     if(warnedPlayers.includes(other.id)||!validPlayer(other)||!insideWarning(other.location,aim,radius))continue;
     other.sendMessage(message);warnedPlayers.push(other.id);
    }catch{}
   }}catch{}
  }
  creatureWindup(entity);s.pending={at:t+40,playerId:target.id,aim,radius,warnedPlayers,dimensionId:entity.dimension.id};
 }
 function bossPhase(entity){
  const h=entity.getComponent('minecraft:health');
  const ratio=h?.effectiveMax? h.currentValue/h.effectiveMax:1;
  return ratio<=.3?2:ratio<=.65?1:0;
 }
 function announce(d,loc,line){let ok=true;for(const p of d.getPlayers({location:loc,maxDistance:84}))try{p.sendMessage(line);}catch{ok=false;}return ok;}
 function bossTarget(entity){
  const list=[];
  for(const p of entity.dimension.getPlayers({location:entity.location,maxDistance:54}))try{
   if(validPlayer(p))list.push({player:p,distance:dist(p.location,entity.location)});
  }catch{}
  list.sort((a,b)=>a.distance-b.distance);
  return list[0]?.player;
 }
 function startBossAttack(entity,state,t,target,phase){
  const attacks=phase===0?['cleave','starfall','time_snare','eclipse_burst','star_collapse','summon']:
   phase===1?['cleave','starfall','time_snare','eclipse_burst','star_collapse','summon','rift_wave']:
   ['cleave','starfall','time_snare','eclipse_burst','star_collapse','summon','rift_wave','roar','rewind'];
  const kind=attacks[state.attackIndex++%attacks.length];
  const windup=40;
  const bossCenter=['summon','eclipse_burst','rift_wave','roar','rewind'].includes(kind);
  const mark=bossCenter?entity.location:target.location;
  const labels={cleave:'八界断ち',starfall:'星骸落とし',time_snare:'時環封じ',eclipse_burst:'蝕光爆ぜ',summon:'影兵招来',rift_wave:'時空裂波',roar:'終焉咆哮',rewind:'逆刻再編',star_collapse:'星蝕の収束'};
  const area=kind==='summon'?'予告円内に影兵出現':`輪内・上下3ブロック${kind==='roar'||kind==='rewind'?'（外側は状態異常のみ）':''}`;
  const text=`§c§l${labels[kind]}§r §7— ${windup/20}秒後に発動、${area}`;
  // Capture recipients from the very same snapshot that receives the message.
  // A separate pre-message query could include a player who never got it.
  const warnedPlayers=[];let warned=true;
  for(const p of entity.dimension.getPlayers({location:entity.location,maxDistance:84}))try{
   p.sendMessage(text);if(validPlayer(p))warnedPlayers.push(p.id);
  }catch{warned=false;}
  const radius={cleave:3.5,starfall:4,time_snare:6,eclipse_burst:9,summon:7,rift_wave:18,roar:18,rewind:16,star_collapse:7}[kind]??3;
  if(!warned||!warnedPlayers.includes(target.id)||!warningRing(entity.dimension,mark,radius,kingWarningMarkerCount(radius))){state.nextAt=t+120;return;}
  creatureWindup(entity,bossVisualAnimation(kind,'windup'));state.pending={kind,at:t+windup,targetId:target.id,aim:{...mark},warnedPlayers,dimensionId:entity.dimension.id};
  for(let i=0;i<6;i++)particle(entity.dimension,'minecraft:basic_smoke_particle',{x:mark.x+(Math.random()-.5)*2,y:mark.y+.3+i*.35,z:mark.z+(Math.random()-.5)*2});
 }
 // Warned boss skills: higher than the original .45 multiplier. Native melee
 // remains separately configured; avoid introducing unavoidable contact spikes.
 function bossHit(entity,target,damage){return hit(entity,target,damage*2);}
 function resolveBossAttack(entity,state,phase){
  const attack=state.pending;if(!attack)return;
  state.pending=undefined;
  if(!attack.dimensionId||entity.dimension.id!==attack.dimensionId)return;
  creatureStrike(entity,bossVisualAnimation(attack.kind,'strike'));
  const effect=attack.kind==='cleave'?'impact':['time_snare','rewind'].includes(attack.kind)?'time':['summon','eclipse_burst'].includes(attack.kind)?'ward':'wind';
  // Cosmetic spark at the already-warned aim; never expands the hit area.
  const talent={impact:'charge',time:'time',ward:'ward',wind:'burst'}[effect];
  talentImpact(entity,{talent},{aim:attack.aim,radius:1});
  const d=entity.dimension;
  const target=findCombatPlayer(world,attack.targetId);
  // The API query is spherical; bound a horizontal warning circle and its
  // ±3 block height, then filter before applying parry or any effect.
  const warnedTargets=(aim,radius)=>d.getPlayers({location:aim,maxDistance:warningSearchRadius(radius)})
   .filter(p=>{try{return validPlayer(p)&&attack.warnedPlayers.includes(p.id)&&insideWarning(p.location,aim,radius)&&!isEvading(p)&&!tryParry(p,entity);}catch{return false;}});
  if(attack.kind==='summon'){
   // Spawn around the fixed warning, not the king's later position. Refuse
   // obstructed, unloaded or occupied candidates rather than modifying blocks.
   const nearby=d.getEntities({families:['hakkai_wildlife'],location:attack.aim,maxDistance:34}).length;
   const reserved=[];
   for(let i=0;i<Math.min(2,Math.max(0,6-nearby));i++){
    const shape=KING_SHADOW_SUMMONS[i],a=system.currentTick*.04+i*Math.PI;
    const at=findKingShadowSpawn(d,attack.aim,a,shape,reserved);if(!at)continue;
    try{d.spawnEntity(`${ns}${shape.type}`,at,{spawnEvent:'hakkai:wild',initialPersistence:false});reserved.push(at);}catch{}
   }
   return;
  }
  if(attack.kind==='rewind'){
   heal(entity,95+phase*25);addEffect(entity,'resistance',90,1);ring(d,attack.aim,16,7);
   for(const p of warnedTargets(attack.aim,16))try{if(dist(p.location,attack.aim)>=9||bossHit(entity,p,7+phase*2))addEffect(p,'weakness',80,1);}catch{}
   return;
  }
  if(attack.kind==='star_collapse'){
   ring(d,attack.aim,7,7);
   for(const p of warnedTargets(attack.aim,7))try{
    if(bossHit(entity,p,10+phase*3)){push(entity,p,1.1,.45);addEffect(p,'slowness',65,1);}
   }catch{}
   return;
  }
  if(attack.kind==='starfall'){
   const aim=attack.aim;ring(d,aim,4,7);
   for(const p of warnedTargets(aim,4))try{
    if(bossHit(entity,p,12+phase*3)){push(entity,p,1.1,.4);addEffect(p,'weakness',45,0);}
   }catch{}
   return;
  }
  if(attack.kind==='time_snare'){
   const aim=attack.aim;
   for(const p of warnedTargets(aim,6))try{if(bossHit(entity,p,4+phase*2)){addEffect(p,'slowness',95,3);addEffect(p,'weakness',75,1);}}catch{}
   return;
  }
  if(attack.kind==='eclipse_burst'){
   for(const p of warnedTargets(attack.aim,9))try{if(bossHit(entity,p,9+phase*3)){push(entity,p,1.45,.42);addEffect(p,'blindness',30,0);}}catch{}
   ring(d,attack.aim,9,7);return;
  }
  if(attack.kind==='rift_wave'){
   for(const p of warnedTargets(attack.aim,18))try{if(bossHit(entity,p,8+phase*2)){addEffect(p,'slowness',50,2);push(entity,p,1.2,.62);}}catch{}
   ring(d,attack.aim,18,7);return;
  }
  if(attack.kind==='roar'){
   for(const p of warnedTargets(attack.aim,18))try{if(dist(p.location,attack.aim)>=12||bossHit(entity,p,6+phase*2)){addEffect(p,'weakness',120,1);addEffect(p,'mining_fatigue',100,1);}}catch{}
   return; // Avoid an unbounded melee damage boost after the roar.
  }
  if(attack.kind==='cleave'){
   const aim=attack.aim;
   for(const p of warnedTargets(aim,3.5))try{if(bossHit(entity,p,13+phase*3)){push(entity,p,1.75,.34);addEffect(p,'slowness',42,1);}}catch{}
   return;
  }
  if(validPlayer(target)&&attack.warnedPlayers.includes(target.id)&&target.dimension.id===d.id&&dist(target.location,entity.location)<8&&!isEvading(target)&&!tryParry(target,entity)){if(bossHit(entity,target,8+phase*2))push(entity,target,1.35,.32);}
 }
 function tickBoss(entity,t){
  if(lastBossTick.get(entity.id)===t)return;
  lastBossTick.set(entity.id,t);
  let s=bossStates.get(entity.id);
  if(!s){s={phase:0,nextAt:t+95,attackIndex:0,pending:undefined};bossStates.set(entity.id,s);}
  const phase=bossPhase(entity);
  if(phase!==s.phase){
   s.phase=phase;const d=entity.dimension;
   announce(d,entity.location,phase===1?'§d【時蝕】八界王が第二形態へ移行。裂波と時縛りが激化する。':'§c【終焉相】巨王が最終形態へ。攻撃間隔が縮まり、逆刻再編を始める。');
   addEffect(entity,'resistance',110,phase===2?2:1);addEffect(entity,'speed',120,phase);
   for(const p of d.getPlayers({location:entity.location,maxDistance:50}))particle(d,'hakkai:climate_7',{x:p.location.x,y:p.location.y+1,z:p.location.z});
  }
  if(s.pending&&t>=s.pending.at){if(t===s.pending.at)resolveBossAttack(entity,s,s.phase);else s.pending=undefined;s.nextAt=t+(s.phase===2?30:s.phase===1?40:50);}
  if(!s.pending&&t>=s.nextAt){const target=bossTarget(entity);if(target)startBossAttack(entity,s,t,target,s.phase);else s.nextAt=t+40;}
  if(t%20===0)particle(entity.dimension,'hakkai:climate_7',{x:entity.location.x,y:entity.location.y+2.2,z:entity.location.z});
 }
 function activeBosses(){
  try{if(summonedBoss?.isValid)return true;}catch{}
  summonedBoss=undefined;
  for(let realm=0;realm<8;realm++)try{if(world.getDimension(`${ns}realm_${realm}`).getEntities({type:BOSS}).length)return true;}catch{}
  return false;
 }
 function summonColossus(player){
  if(!validPlayer(player))return false;
  if(world.getDifficulty()===Difficulty.Peaceful){player.sendMessage('§eピースフルでは八界王に挑戦できません。');return false;}
  if((num(player,'guards')&255)!==255){player.sendMessage('§e八界の守護獣をすべて倒すと、巨王への挑戦が解放されます。');return false;}
  if(player.dimension.id!==`${ns}realm_7`){player.sendMessage('§e時の終着駅へ移動してから、終焉の召喚印を選んでください。');return false;}
  if(activeBosses()){player.sendMessage('§c八界王はすでにどこかの界で戦っています。');return false;}
  if(world.getAbsoluteTime()<num(player,'eclipse_summon_ready',0)){player.sendMessage('§e召喚印の再使用まで、しばらく休んでください。');return false;}
  const d=player.dimension,look=player.getViewDirection(),base=player.location;
  let spawn;
  for(const radius of [13,16,20,24])for(let step=0;step<8&&!spawn;step++){
   const a=Math.atan2(look.z,look.x)+(step-3.5)*Math.PI/8;
   const x=Math.floor(base.x+Math.cos(a)*radius),z=Math.floor(base.z+Math.sin(a)*radius);
   for(let y=Math.floor(base.y)-3;y<=Math.floor(base.y)+3;y++){
    const candidate={x:x+.5,y,z:z+.5};
    try{if(d.getPlayers({location:candidate,maxDistance:6,closest:1}).length)continue;}catch{continue;}
    if(clearColossusSpawnGround(d,x,y,z)){spawn=candidate;break;}
   }
  }
  if(!spawn){player.sendMessage('§e巨王を呼ぶ広さのある平地が見つかりません。開けた場所で再挑戦してください。');return false;}
  try{
   const boss=d.spawnEntity(BOSS,spawn);summonedBoss=boss;boss.nameTag='終焉の八界王';
   property(player,'eclipse_summon_ready',world.getAbsoluteTime()+360);
   player.sendMessage('§4§l終焉の八界王が目覚めた。予告の輪から離れ、形態ごとの技を見極めろ。');
   ring(d,spawn,7,7);return true;
  }catch(err){report('終焉の八界王召喚',err);player.sendMessage('§c召喚に失敗しました。数秒後にもう一度試してください。');return false;}
 }
 function onHurt(event){
  try{
   const mob=event.hurtEntity,profile=mobContent.get(mob.typeId),attacker=combatPlayerAttacker(event.damageSource);
   if(!profile||!attacker)return;
   if(profile.talent==='ward'||profile.talent==='armor')addEffect(mob,'resistance',80,profile.variant===2?1:0);
   if(profile.talent==='defend'&&profile.temper!=='hostile')addEffect(mob,'speed',50,1);
  }catch{}
 }
 function stagger(entity,t){
  if(!entity?.isValid)return;
  guardians.stagger(entity,t);
  for(const map of [bossStates,mobStates]){
   const s=map.get(entity.id);if(!s)continue;
   s.pending=undefined;s.nextAt=Math.max(s.nextAt,t+40);
  }
 }
 function onDeath({deadEntity,damageSource}){
  if(deadEntity.typeId==='minecraft:player')targetMarks.clear(deadEntity.id);
  guardians.onDeath(deadEntity);
  if(deadEntity.typeId!==BOSS)return;
  if(summonedBoss?.id===deadEntity.id)summonedBoss=undefined;
  bossStates.delete(deadEntity.id);lastBossTick.delete(deadEntity.id);
 }
 function tick(player,t){
  if(!player?.isValid)return;
  const d=player.dimension,peaceful=world.getDifficulty()===Difficulty.Peaceful;
  // Limit the query to relevant creatures before applying closest:40. Dropped
  // items and unrelated mobs must not crowd the entire wildlife scan out.
  // The boss has its own query: it does not have the wildlife family.
  try{
   for(const entity of d.getEntities({families:['hakkai_wildlife'],location:player.location,maxDistance:25,closest:40})){
    try{
     const profile=mobContent.get(entity.typeId);if(!profile)continue;
     const range=dist(entity.location,player.location);if(range>20)continue;
     if(profile.temper==='hostile'){if(peaceful)mobStates.delete(entity.id);else scheduleCreatureMove(entity,player,profile,t);}
     else if(range<8)passiveMove(entity,player,profile);
    }catch(err){if(t%200===0)report('追加MOBの固有行動',err);}
   }
  }catch(err){if(t%200===0)report('追加MOBの検索',err);}
  try{
   for(const entity of d.getEntities({type:BOSS,location:player.location,maxDistance:25,closest:4})){
    try{
     if(entity.typeId!==BOSS)continue;
     if(peaceful)bossStates.delete(entity.id);else tickBoss(entity,t);
    }catch(err){if(t%200===0)report('八界王の行動',err);}
   }
  }catch(err){if(t%200===0)report('八界王の検索',err);}
  for(const [id,state] of mobStates)if(t>state.nextAt+2400)mobStates.delete(id);
 }
 // Called every 10 ticks by the main loop. The regular creature scan may also
 // see the boss; lastBossTick prevents duplicate resolution in multiplayer.
 function tickBosses(player,t){
  if(!player?.isValid)return;
  guardians.tick(player,t);
  try{
   const peaceful=world.getDifficulty()===Difficulty.Peaceful;
   for(const entity of player.dimension.getEntities({type:BOSS,location:player.location,maxDistance:25,closest:4})){
    try{if(peaceful)bossStates.delete(entity.id);else tickBoss(entity,t);}
    catch(err){if(t%200===0)report('八界王個体の行動',err);}
   }
  }catch(err){if(t%200===0)report('八界王の行動',err);}
 }
 function bossHudLine(player,t){
  try{
   const boss=player.dimension.getEntities({type:BOSS,location:player.location,maxDistance:84,closest:1})[0];
   if(!boss)return undefined;
   const h=boss.getComponent('minecraft:health'),ratio=h?.effectiveMax?Math.max(0,Math.min(1,h.currentValue/h.effectiveMax)):1;
   const phase=bossPhase(boss),segments=24,filled=Math.ceil(ratio*segments),pulse=t%12<6?'◆':'◇';
   const bar=`§c${'■'.repeat(filled)}§8${'□'.repeat(segments-filled)}§r`;
   return `§4${pulse} ${PHASES[phase]} §7${Math.ceil(ratio*100)}%\n${bar}`;
  }catch{return undefined;}
 }
 function fieldGuide(player,index){
  const profile=mobContentList[index];if(!profile)return;
  const attribute=recycledAttribute(profile,home);
  const materialUse=attribute===undefined?'':`\n作業台：${profile.dropName} 1個 → ${attrs[attribute]}の欠片 2個。欠片2個とアメジストの欠片から同属性の結晶を作れます。`;
  const instantNote=profile.temper==='hostile'&&isInstantAreaTalent(profile.talent)?'\n§7技は予告円内に即時発生し、壁を貫通します。移動する飛び道具ではありません。§r':'';
  const markNote=profile.talent==='mark'||profile.temper==='hostile'&&[0,13].includes(profile.signatureId%15)?'\n§7追跡粒子は対象の周囲に現れる目印です。壁越しの輪郭表示や周囲を照らす効果ではありません。§r':'';
  return `§b${profile.realmName} §7｜${profile.temper==='hostile'?'敵対':profile.temper==='neutral'?'中立':'友好'}§r\n\n§6━━ 生息地 ━━§r\n${profile.biomeNames.join('・')}\n\n§6━━ 行動と技 ━━§r\n${profile.actionName}：${profile.actionDetail}${instantNote}\n${profile.signatureName}：${profile.signatureDetail}${markNote}\n\n§6━━ 素材と使い道 ━━§r\n${profile.dropName}${materialUse}`;
 }
 return {tick,tickBosses,tickMarks:targetMarks.tick,clearMarks:targetMarks.clear,onHurt,onDeath,summonColossus,bossHudLine,fieldGuide,mobContentList,stagger};
}
