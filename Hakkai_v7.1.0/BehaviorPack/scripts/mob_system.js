import { safeWildlifeEscape } from './wildlife_escape.js';
import { combatPlayerAttacker } from './combat_player_attacker.js';
import { createMobTargetMarks } from './mob_target_mark.js';
import { findCombatPlayer } from './combat_find_player.js';
import { talentImpact, talentContact, talentTell } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import { setupGuardianBoss } from './guardian_boss.js';
import { KING_SHADOW_SUMMONS, findKingShadowSpawn } from './king_summon_positions.js';
import { EntityDamageCause, GameMode, Difficulty } from '@minecraft/server';
import { mobContent, mobContentList } from './mob_content.js';
import { insideWarning, warningSearchRadius, kingWarningMarkerCount, isMovingProjectileTalent } from './attack_warning.js';
import { clearRushLine, RUSH_REACH } from './mob_rush_line.js';
import { startMobProjectile, advanceMobProjectile } from './mob_projectile.js';
import { BURST_DESIGNS, startBurstWave, advanceBurstWave } from './mob_burst_wave.js';
import { guardianDirection } from './guardian_attacks.js';
import { BODY_RUSH, bodyRushImpulse } from './mob_body_rush.js';
import { GUARD_STYLES } from './mob_guard_styles.js';
import { WILDLIFE_STYLES } from './wildlife_styles.js';
import { hasTwinShot } from './mob_shot_styles.js';
import { clearColossusSpawnGround } from './colossus_spawn_ground.js';
import { home, attrs } from './data.js';
import { recycledAttribute } from './drop_recycling.js';
import {scaledMobDamage} from './realm_balance.js';

const BOSS='hakkai:eclipse_colossus';
const PHASES=['§b第一相・星喰い','§d第二相・時蝕','§c第三相・終焉'];
// Small, cosmetic-feeling ground advances after an accepted close hit; not
// damaging dash paths and never applied for missed/canceled attacks.
const HUNTER_ADVANCE=Object.freeze({'foe_0_4':.18,'foe_1_4':.2,'foe_5_4':.22});
export const DRAIN_RANGE=8;
const SINGLE_TALENT_LIMITS=Object.freeze({thorns:8,web:11,spore:12,frost:11,shock:13,time:14,gust:14,mark:16,defend:5,leech:DRAIN_RANGE});
// Presentation tracks selected by the already chosen boss technique. The
// authoritative warning, target, damage and timing are unchanged.
export function bossVisualAnimation(kind,phase){
 const style=(kind==='cleave'||kind==='melee')?'cleave':['starfall','time_snare','star_collapse','summon','guardian_summon'].includes(kind)?'cast':'wave';
 return `animation.hakkai.eclipse_${style}_${phase}`;
}

export function setupMobSystem(ctx){
 const {ns,world,system,num,property,report,isEvading=()=>false,tryParry=()=>false,allowKingMelee=()=>true}=ctx;
 const mobStates=new Map(), bossStates=new Map(), lastBossTick=new Map();
 const targetMarks=createMobTargetMarks();
 let summonedBoss;
 const guardians=setupGuardianBoss({world,system,isEvading,tryParry,report});
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
  const profile=mobContent.get(source.typeId);
  const damage=profile?.temper==='hostile'?scaledMobDamage(amount,profile.realm):amount;
  try{return Boolean(target.applyDamage(damage,{cause:EntityDamageCause.entityAttack,damagingEntity:source}));}catch{return false;}
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
 // Body attacks no longer use an invisible fixed target circle. They resolve
 // against the current target only, with reach/height/line checks below.
 // Ranged talents are resolved separately by moving projectile contact.
 function creatureEligible(entity,target,warning){
  try{return !!(entity?.isValid&&warning?.dimensionId&&entity.dimension.id===warning.dimensionId&&validPlayer(target)&&
   target.dimension.id===warning.dimensionId&&Number.isFinite(dist(entity.location,target.location))&&
   (warning.contactOnly||insideWarning(target.location,warning.aim,warning.radius))&&!isEvading(target));}catch{return false;}
 }
 // After a real impulse, follow the creature's actual position each tick.
 // This is not a teleport or homing hit: only close, unobstructed body
 // contact with the captured target can complete the attack.
 function launchBodyRush(entity,target,profile,warning){
  const s=mobStates.get(entity.id),design=BODY_RUSH[profile.id];if(!s||!design||s.flight)return;
  const from={...entity.location},point={...target.location},impulse=bodyRushImpulse(profile,from,point);
  const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
  if(!impulse||!creatureEligible(entity,target,warning)||!clearRushLine(entity,target)||!same(entity.location,from)||!same(target.location,point))return;
  const wave={next:system.currentTick+1,remaining:design.ticks,targetId:target.id,dimensionId:warning.dimensionId,last:from};s.flight=wave;
  function finish(){if(s.flight===wave)s.flight=undefined;}
  function schedule(){try{if(!system.runTimeout)throw Error('no scheduler');system.runTimeout(step,1);}catch{finish();}}
  function step(){
   try{
    if(mobStates.get(entity.id)!==s||s.flight!==wave)return;
    const now=system.currentTick,p=findCombatPlayer(world,wave.targetId);
    if(now!==wave.next||!entity.isValid||entity.dimension.id!==wave.dimensionId||world.getDifficulty()===Difficulty.Peaceful||!validPlayer(p)||p.dimension.id!==wave.dimensionId){finish();return;}
    const source={...entity.location},contact={...p.location};
    if(![source.x,source.y,source.z,contact.x,contact.y,contact.z].every(Number.isFinite)||dist(source,contact)>20||Math.hypot(source.x-wave.last.x,source.y-wave.last.y,source.z-wave.last.z)>2){finish();return;}
    if(!clearRushLine({dimension:entity.dimension,location:wave.last},{dimension:entity.dimension,location:source},2)){finish();return;}
    if(!same(entity.location,source)||!same(p.location,contact)){finish();return;}
    wave.last=source;
    if(dist(source,contact)<=design.reach){
     if(!creatureEligible(entity,p,warning)||!clearRushLine(entity,p)||!same(entity.location,source)||!same(p.location,contact)||isEvading(p)||tryParry(p,entity)){finish();return;}
     if(mobStates.get(entity.id)!==s||s.flight!==wave||!entity.isValid||!validPlayer(p)||entity.dimension.id!==wave.dimensionId||p.dimension.id!==wave.dimensionId||world.getDifficulty()===Difficulty.Peaceful||!same(entity.location,source)||!same(p.location,contact)){finish();return;}
     if(hit(entity,p,(profile.talent==='leap'?5:6)+profile.variant*2)){
      particle(entity.dimension,'hakkai:mob_impact',{x:contact.x,y:contact.y+.8,z:contact.z});
      if(same(entity.location,source)&&same(p.location,contact)){
       if(profile.talent==='leap')push(entity,p,.6+profile.variant*.18,.3);else push(entity,p,1.1+profile.variant*.2,.12);
       signatureEcho(entity,p,profile);
      }
     }
     finish();return;
    }
    wave.next=now+1;if(--wave.remaining<=0)finish();else schedule();
   }catch{finish();}
  }
  try{entity.applyImpulse(impulse);}catch{finish();return;}
  if(!same(entity.location,from)||!same(target.location,point)){finish();return;}
  schedule();
 }
 function mobMove(entity,target,profile,warning,contactAllowed=true){
  if(!creatureEligible(entity,target,warning)||dist(entity.location,target.location)>=(profile.talent==='burst'?9:20))return;
  const v=profile.variant,realm=profile.realm;
  let landed=false;
  const rush=profile.talent==='leap'||profile.talent==='charge';
  // A body movement is shown at the creature, not as an instant impact at a
  // distant point. Body attacks use current reach, not a target-floor circle.
  talentImpact(entity,profile,rush?{...warning,aim:entity.location}:warning);
  if(!creatureEligible(entity,target,warning)||dist(entity.location,target.location)>=(profile.talent==='burst'?9:20))return;
  const range=dist(entity.location,target.location);
  // Damage and secondary effects are one operation: a canceled hit must not
  // leave an orphaned debuff, knockback or lifesteal behind.
  const strike=(amount,after=()=>{})=>{
   if(!creatureEligible(entity,target,warning))return;
   const currentRange=dist(entity.location,target.location),limit=SINGLE_TALENT_LIMITS[profile.talent];
   if(limit!==undefined&&currentRange>=limit)return;
   const contactReach=rush?(BODY_RUSH[profile.id]?.reach??0):(GUARD_STYLES[profile.id]?.reach??RUSH_REACH);
   if((rush||profile.talent==='ward'||profile.talent==='armor')&&(currentRange>contactReach||!clearRushLine(entity,target)))return;
   if(!creatureEligible(entity,target,warning))return;
   if(hit(entity,target,amount)){landed=true;after();}
  };
  switch(profile.talent){
   case 'leap':
   case 'charge':{
    if(!clearRushLine(entity,target)||!creatureEligible(entity,target,warning))break;
    // Already close: strike once. Otherwise use the real body impulse and
    // watch for actual contact while it travels, never an invisible long hit.
    const contactPoint={...target.location};
    if(range>(BODY_RUSH[profile.id]?.reach??0)){if(range<13)launchBodyRush(entity,target,profile,warning);}
    else if(profile.talent==='leap')strike(5+v*2,()=>{push(entity,target,.6+v*.18,.3);particle(entity.dimension,'hakkai:mob_impact',{x:contactPoint.x,y:contactPoint.y+.8,z:contactPoint.z});});
    else strike(6+v*2,()=>{push(entity,target,1.1+v*.2,.12);particle(entity.dimension,'hakkai:mob_impact',{x:contactPoint.x,y:contactPoint.y+.8,z:contactPoint.z});});
    break;
   }
   case 'ward':
   case 'armor':{
    addEffect(entity,'resistance',85+v*20,v===2?1:0);
    if(profile.talent==='ward'){
     for(const ally of entity.dimension.getEntities({families:['hakkai_wildlife'],location:entity.location,maxDistance:8+v*2}).slice(0,7)){
      if(ally.id!==entity.id&&mobContent.get(ally.typeId)?.realm===realm)addEffect(ally,'resistance',70,0);
     }
    }else addEffect(entity,'strength',65,0);
    const style=GUARD_STYLES[profile.id];
    if(style)addEffect(entity,style.trait,45,0);
    // The self/ally buff is independent of the optional close strike. The
    // caller has checked reach, height and line before permitting the hit.
    if(contactAllowed&&(warning.contactOnly||insideWarning(target.location,warning.aim,warning.radius))&&dist(entity.location,target.location)<=(style?.reach??0)&&clearRushLine(entity,target)){
     const impact={...target.location};
     strike(2+v,()=>particle(entity.dimension,'hakkai:mob_impact',{x:impact.x,y:impact.y+.8,z:impact.z}));
    }
    break;
   }
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
    const style=WILDLIFE_STYLES[profile.id];if(!style)return;
    const escape=safeWildlifeEscape(entity,player,style.escape);if(!escape)return;
    try{entity.applyImpulse({x:escape.x*style.speed,y:style.lift,z:escape.z*style.speed});}catch{return;}
    try{entity.addEffect('speed',65, {amplifier:1+profile.variant,showParticles:false});}catch{}
    addEffect(entity,style.effect,48+profile.signatureTier*3,profile.variant===2?1:0);
    particle(entity.dimension,`hakkai:climate_${profile.realm}`,{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});
   }
  }else if(profile.talent==='defend'){
   const s=mobStates.get(entity.id);if(!s||system.currentTick>=s.nextAt){
    mobStates.set(entity.id,{nextAt:system.currentTick+130+profile.variant*25});
    const style=WILDLIFE_STYLES[profile.id];if(!style)return;
    for(const ally of entity.dimension.getEntities({families:['hakkai_wildlife'],location:entity.location,maxDistance:7}).slice(0,6)){
     if(mobContent.get(ally.typeId)?.realm===profile.realm){addEffect(ally,'resistance',55+profile.signatureTier*3,0);addEffect(ally,style.support,42+profile.signatureTier*3,0);}
    }
    particle(entity.dimension,`hakkai:climate_${profile.realm}`,{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});
   }
  }
 }
 // The king retains its own fixed warnings; ordinary creatures do not.
 function warningRing(d,aim,radius,count=16){
  try{for(let i=0;i<count;i++){const a=Math.PI*2*i/count;d.spawnParticle('hakkai:warning_marker',{x:aim.x+Math.cos(a)*radius,y:aim.y+.15,z:aim.z+Math.sin(a)*radius});}return true;}catch{return false;}
 }
 // The eight single-target effects and drain use the same moving, blocked
 // trajectory. Damage/effects happen only on physical contact, never at the
 // old player position; another entity intercepts the projectile.
 function projectileHit(entity,target,profile){
  const v=profile.variant,realm=profile.realm;
  const amounts={thorns:3+v*2,web:2+v,spore:2+v,frost:3+v,shock:4+v*2,time:2+v,gust:2+v,mark:v===2?4:2,leech:5+v};
  const amount=amounts[profile.talent];if(amount===undefined)return;
  const impact={...target.location},dimension=entity.dimension;
  if(!hit(entity,target,amount))return;
  talentContact(dimension,impact,profile);
  switch(profile.talent){
   case 'thorns':addEffect(target,'slowness',45+v*10,0);break;
   case 'web':addEffect(target,'slowness',55+v*18,1+Math.floor(v/2));if(v===2)addEffect(target,'weakness',50,0);break;
   case 'spore':addEffect(target,'poison',55+v*22,v===2?1:0);if(v===1)addEffect(target,'nausea',65,0);break;
   case 'frost':addEffect(target,'slowness',65+v*20,1+v);addEffect(target,'mining_fatigue',75+v*15,0);break;
   case 'shock':addEffect(target,'weakness',75+v*18,v===2?1:0);break;
   case 'time':addEffect(target,'slowness',70+v*25,2+v);addEffect(target,'weakness',65,0);if(v===2)addEffect(target,'blindness',35,0);break;
   case 'gust':push(entity,target,1.1+v*.3,.25+v*.08);if(v===2)addEffect(target,'slow_falling',42,0);break;
   case 'mark':targetMarks.mark(entity,target,system.currentTick,80+v*30,realm);addEffect(target,'weakness',65+v*10,0);break;
   case 'leech':{
    heal(entity,2+v*2);addEffect(entity,'speed',50,0);
    const dx=impact.x-entity.location.x,dz=impact.z-entity.location.z,k=Math.hypot(dx,dz);
    const advance=HUNTER_ADVANCE[profile.id]??(profile.id==='foe_7_10'?.22:0);
    if(advance&&k>2.5&&k<6.5)try{entity.applyImpulse({x:dx/k*advance,y:.02,z:dz/k*advance});}catch{}
    break;
   }
  }
  if(dist(entity.location,impact)<12)signatureEcho(entity,target,profile);
 }
 function launchCreatureProjectile(entity,s,profile,warning,t){
  const limit=SINGLE_TALENT_LIMITS[profile.talent];
  if(profile.id==='foe_7_0'){
   const dx=warning.aim.x-entity.location.x,dz=warning.aim.z-entity.location.z,k=Math.hypot(dx,dz);
   if(k>2.5&&k<8)try{entity.applyImpulse({x:dx/k*.32,y:.04,z:dz/k*.32});}catch{}
  }
  const branches=hasTwinShot(profile)?[-1,1]:[0];
  const shots=branches.map(branch=>startMobProjectile(entity.location,warning.aim,t,limit,profile,branch));
  if(shots.some(shot=>!shot))return;
  const flight={shots},dimensionId=warning.dimensionId,targetId=warning.playerId;s.flight=flight;
  function finish(){if(s.flight===flight)s.flight=undefined;}
  function schedule(){try{system.runTimeout(step,1);}catch{finish();}}
  function step(){
   try{
    const now=system.currentTick;
    if(mobStates.get(entity.id)!==s||s.flight!==flight)return;
    const p=findCombatPlayer(world,targetId);
    if(!entity.isValid||entity.dimension.id!==dimensionId||!validPlayer(p)||p.dimension.id!==dimensionId||world.getDifficulty()===Difficulty.Peaceful){finish();return;}
    const source={...entity.location},remaining=[];
    for(const shot of flight.shots){
     if(mobStates.get(entity.id)!==s||s.flight!==flight)return;
     const result=advanceMobProjectile(entity.dimension,shot,now,entity.id,targetId,profile);
     if(result.hit&&result.contact){
      const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
      if(same(p.location,result.contact)&&same(entity.location,source)&&!isEvading(p)&&!tryParry(p,entity)&&
        mobStates.get(entity.id)===s&&s.flight===flight&&entity.isValid&&validPlayer(p)&&
        entity.dimension.id===dimensionId&&p.dimension.id===dimensionId&&world.getDifficulty()!==Difficulty.Peaceful&&
        same(p.location,result.contact)&&same(entity.location,source))projectileHit(entity,p,profile);
      // A contact or parry consumes the entire cast, including its second
      // strand. This prevents a double hit or a second unavoidable parry.
      finish();return;
     }
     if(!result.done)remaining.push(shot);
    }
    flight.shots=remaining;
    if(!remaining.length)finish();else schedule();
   }catch{finish();}
  }
  schedule();
 }
 // These seven creatures have distinct expanding fronts, not instantaneous
 // target circles. Contacts are evaluated on the same visible moving front.
 function launchCreatureBurst(entity,s,profile,warning,t){
  const origin={...entity.location},dir=warning.direction;
  const aim=dir?{x:origin.x+dir.x,y:origin.y,z:origin.z+dir.z}:warning.aim;
  const wave=startBurstWave(origin,aim,profile,t);if(!wave)return;
  const dimensionId=warning.dimensionId;s.flight=wave;
  const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&a.z===b.z;
  function finish(){if(s.flight===wave)s.flight=undefined;}
  function schedule(){try{system.runTimeout(step,1);}catch{finish();}}
  function step(){
   try{
    const now=system.currentTick;
    if(mobStates.get(entity.id)!==s||s.flight!==wave)return;
    if(!entity.isValid||entity.dimension.id!==dimensionId||world.getDifficulty()===Difficulty.Peaceful){finish();return;}
    const result=advanceBurstWave(entity.dimension,wave,now),source={...entity.location};
    for(const {player,position} of result.contacts)try{
     if(!validPlayer(player)||player.dimension.id!==dimensionId||!same(player.location,position)||isEvading(player)||tryParry(player,entity))continue;
     if(mobStates.get(entity.id)!==s||s.flight!==wave||!entity.isValid||entity.dimension.id!==dimensionId||!validPlayer(player)||player.dimension.id!==dimensionId||world.getDifficulty()===Difficulty.Peaceful||!same(player.location,position)||!same(entity.location,source))continue;
     if(hit(entity,player,5+profile.variant*2)){
      talentContact(entity.dimension,position,profile);
      if(same(player.location,position)&&same(entity.location,source)){
       if(profile.id==='foe_6_8')push(entity,player,1.35,.35);else push(entity,player,1.15,.24);
       if(player.id===warning.playerId&&dist(source,position)<12)signatureEcho(entity,player,profile);
      }
     }
    }catch{}
    if(result.done)finish();else schedule();
   }catch{finish();}
  }
  schedule();
 }
 function scheduleCreatureMove(entity,target,profile,t){
  let s=mobStates.get(entity.id);
  if(!s){s={nextAt:t+70+profile.variant*23,pending:undefined};mobStates.set(entity.id,s);}
  if(s.flight)return;
  if(s.pending){
   if(t<s.pending.at)return;
   const warning=s.pending,victim=findCombatPlayer(world,s.pending.playerId);
   s.pending=undefined;s.nextAt=t+115+profile.variant*27+(profile.realm%3)*9;
   if(t!==warning.at||!warning.dimensionId||entity.dimension.id!==warning.dimensionId)return;
   creatureStrike(entity);
   if(isMovingProjectileTalent(profile.talent)){
    if(validPlayer(victim)&&victim.dimension.id===warning.dimensionId)launchCreatureProjectile(entity,s,profile,warning,t);
    return;
   }
   if(profile.talent==='burst'){launchCreatureBurst(entity,s,profile,warning,t);return;}
   const eligible=p=>creatureEligible(entity,p,warning);
   if(eligible(victim)&&dist(victim.location,entity.location)<20){
    // Check an obstructed body attack before consuming the target's parry.
    if((profile.talent==='leap'||profile.talent==='charge')&&!clearRushLine(entity,victim))return;
    if(profile.talent==='ward'||profile.talent==='armor'){
     // A shield/armor buff can still resolve behind cover; only its optional
     // body strike needs a clear close path. Parry the actual strike, not a
     // self/ally buff happening out of reach or behind a wall.
     const contact=dist(victim.location,entity.location)<=(GUARD_STYLES[profile.id]?.reach??0)&&clearRushLine(entity,victim);
     if(!contact||!tryParry(victim,entity))mobMove(entity,victim,profile,warning,contact);
    }else if((['leap','charge'].includes(profile.talent)&&dist(entity.location,victim.location)>(BODY_RUSH[profile.id]?.reach??0))||!tryParry(victim,entity))mobMove(entity,victim,profile,warning);
   }
   return;
  }
  if(t<s.nextAt||!validPlayer(target)||dist(entity.location,target.location)>17)return;
  const radius=profile.talent==='burst'?4+profile.variant:1.2+profile.variant*.7,aim={...target.location};
  if(['leap','charge','armor','ward','burst'].includes(profile.talent)){
   // Visible body windup, with no floor marker or chat alert. A later hit is
   // limited to close, unobstructed contact; the impulse is not a hitbox.
   // Armor/ward buff themselves and nearby allies; bursts project a moving
   // shape in the direction shown at windup, from the actual release point.
   const radial=['armor','ward'].includes(profile.talent)||BURST_DESIGNS[profile.id]==='circle';
   const direction=profile.talent==='burst'?guardianDirection(aim.x-entity.location.x,aim.z-entity.location.z):undefined;
   creatureWindup(entity);talentTell(entity,profile,aim,radial?'radial':'forward');
   s.pending={at:t+40,playerId:target.id,aim,radius,direction,contactOnly:profile.talent!=='burst',dimensionId:entity.dimension.id};
   return;
  }
  creatureWindup(entity);talentTell(entity,profile,aim);
  s.pending={at:t+40,playerId:target.id,aim,radius,dimensionId:entity.dimension.id};
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
  const attacks=phase===0?['cleave','starfall','time_snare','eclipse_burst','star_collapse','summon','guardian_summon']:
   phase===1?['cleave','starfall','time_snare','eclipse_burst','star_collapse','summon','rift_wave','guardian_summon']:
   ['cleave','starfall','time_snare','eclipse_burst','star_collapse','summon','rift_wave','roar','rewind','guardian_summon'];
  // Alternate a close, explicitly warned hand strike with the usual skills.
  // No native melee: the scaled engine hitbox previously reached too far
  // without any actionable windup. Keep other skills from being starved.
  const melee=state.meleeReady&&allowKingMelee()&&dist(target.location,entity.location)<=3.5;
  const kind=melee?'melee':attacks[state.attackIndex++%attacks.length];
  if(melee)state.meleeReady=false;
  const windup=40; // 2s: the existing 1.9s cleave windup reaches its end before impact
  if(kind==='guardian_summon'){
   // Summoning is shown on the king rather than as a player-floor warning.
   // It deals no direct damage and does not depend on messages or markers.
   const aim={...entity.location};
   if(![aim.x,aim.y,aim.z].every(Number.isFinite)){state.nextAt=t+120;return;}
   creatureWindup(entity,bossVisualAnimation(kind,'windup'));
   talentTell(entity,{talent:'ward',realm:7},aim,'radial');
   state.pending={kind,at:t+windup,targetId:target.id,aim,warnedPlayers:[],dimensionId:entity.dimension.id};
   return;
  }
  const bossCenter=['melee','summon','guardian_summon','eclipse_burst','rift_wave','roar','rewind'].includes(kind);
  const mark=bossCenter?entity.location:target.location;
  const labels={melee:'近接攻撃',cleave:'八界断ち',starfall:'星骸落とし',time_snare:'時環封じ',eclipse_burst:'蝕光爆ぜ',summon:'影兵招来',guardian_summon:'八界守護の影',rift_wave:'時空裂波',roar:'終焉咆哮',rewind:'逆刻再編',star_collapse:'星蝕の収束'};
  const area=kind==='summon'?'予告円内に影兵出現':kind==='guardian_summon'?'予告円内に特別な守護獣が出現':`輪内・上下3ブロック${kind==='roar'||kind==='rewind'?'（外側は状態異常のみ）':''}`;
  const text=`§c§l${labels[kind]}§r §7— ${windup/20}秒後に発動、${area}`;
  // Capture recipients from the very same snapshot that receives the message.
  // A separate pre-message query could include a player who never got it.
  const warnedPlayers=[];let warned=true;
  for(const p of entity.dimension.getPlayers({location:entity.location,maxDistance:84}))try{
   p.sendMessage(text);if(validPlayer(p))warnedPlayers.push(p.id);
  }catch{warned=false;}
  const radius={melee:3.5,cleave:3.5,starfall:4,time_snare:6,eclipse_burst:9,summon:7,guardian_summon:7,rift_wave:18,roar:18,rewind:16,star_collapse:7}[kind]??3;
  if(!warned||!warnedPlayers.includes(target.id)||!warningRing(entity.dimension,mark,radius,kingWarningMarkerCount(radius))){state.nextAt=t+120;return;}
  creatureWindup(entity,bossVisualAnimation(kind,'windup'));state.pending={kind,at:t+windup,targetId:target.id,aim:{...mark},warnedPlayers,dimensionId:entity.dimension.id};
  for(let i=0;i<6;i++)particle(entity.dimension,'minecraft:basic_smoke_particle',{x:mark.x+(Math.random()-.5)*2,y:mark.y+.3+i*.35,z:mark.z+(Math.random()-.5)*2});
 }
 // King skills target players with late-game equipment. The warned melee
 // intentionally retains its original damage rather than the skill multiplier.
 function bossHit(entity,target,damage){return hit(entity,target,damage*3);}
 function resolveBossAttack(entity,state,phase){
  const attack=state.pending;if(!attack)return;
  state.pending=undefined;
  if(!attack.dimensionId||entity.dimension.id!==attack.dimensionId)return;
  if(attack.kind==='guardian_summon'){
   attack.aim={...entity.location};
   if(![attack.aim.x,attack.aim.y,attack.aim.z].every(Number.isFinite))return;
  }
  creatureStrike(entity,bossVisualAnimation(attack.kind,'strike'));
  const effect=['cleave','melee'].includes(attack.kind)?'impact':['time_snare','rewind'].includes(attack.kind)?'time':['summon','guardian_summon','eclipse_burst'].includes(attack.kind)?'ward':'wind';
  // Cosmetic spark at the already-warned aim; never expands the hit area.
  const talent={impact:'charge',time:'time',ward:'ward',wind:'burst'}[effect];
  talentImpact(entity,{talent},{aim:attack.aim,radius:1});
  const d=entity.dimension;
  const target=findCombatPlayer(world,attack.targetId);
  // The API query is spherical; bound a horizontal warning circle and its
  // ±3 block height, then filter before applying parry or any effect.
  const warnedTargets=(aim,radius)=>d.getPlayers({location:aim,maxDistance:warningSearchRadius(radius)})
   .filter(p=>{try{return validPlayer(p)&&attack.warnedPlayers.includes(p.id)&&insideWarning(p.location,aim,radius)&&!isEvading(p)&&!tryParry(p,entity);}catch{return false;}});
  if(attack.kind==='guardian_summon'){
   // Separate IDs and family from challenge guardians and shadow soldiers.
   // The 60s native timer is a fallback if the king dies unloaded/restarts.
   // Scan failures refuse a spawn; recheck geometry at the moment of spawn.
   let nearby;
   try{nearby=d.getEntities({families:['hakkai_king_guardian'],location:attack.aim,maxDistance:34}).length;}catch{return;}
   const reserved=[];
   for(let i=0;i<Math.min(2,Math.max(0,2-nearby));i++){
    const at=findKingShadowSpawn(d,attack.aim,system.currentTick*.04+i*Math.PI,{width:.7,height:1.12},reserved);
    if(!at)continue;
    const realm=(state.guardianSequence??0)%8;let summoned;
    try{
     summoned=d.spawnEntity(`${ns}king_guardian_${realm}`,at,{initialPersistence:false});
     if(!summoned?.isValid)break;
     summoned.setDynamicProperty('hakkai:king_owner',entity.id);
     reserved.push(at);state.guardianSequence=(realm+1)%8;
    }catch{
     // Avoid unowned summons if ownership cannot be stored; the native timer
     // remains a fallback if removal itself is unavailable.
     try{summoned?.remove();}catch{}
     break;
    }
   }
   return;
  }
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
  if(attack.kind==='melee'){
   for(const p of warnedTargets(attack.aim,3.5))try{
    if(dist(p.location,entity.location)<=3.5&&hit(entity,p,9))push(entity,p,.65,.12);
   }catch{}
   return;
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
  if(s.pending&&t>=s.pending.at){if(t===s.pending.at){const kind=s.pending.kind;resolveBossAttack(entity,s,s.phase);if(kind!=='melee')s.meleeReady=true;}else s.pending=undefined;s.nextAt=t+(s.phase===2?30:s.phase===1?40:50);}
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
   s.pending=undefined;s.flight=undefined;s.nextAt=Math.max(s.nextAt,t+40);
  }
 }
 function onDeath({deadEntity,damageSource}){
  if(deadEntity.typeId==='minecraft:player')targetMarks.clear(deadEntity.id);
  mobStates.delete(deadEntity.id);
  guardians.onDeath(deadEntity);
  if(deadEntity.typeId!==BOSS)return;
  // Remove only loaded summons belonging to this king. The independent
  // native timer retires unloaded or otherwise inaccessible ones later.
  try{for(const e of deadEntity.dimension.getEntities({families:['hakkai_king_guardian'],location:deadEntity.location,maxDistance:96}))try{
   if(e.getDynamicProperty('hakkai:king_owner')===deadEntity.id)e.remove();
  }catch{}}catch{}
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
  const instantNote=profile.temper==='hostile'&&profile.talent==='burst'?'\n§7構えの後、敵自身から移動する波が広がり、壁で止まります。§r':profile.temper==='hostile'&&(isMovingProjectileTalent(profile.talent))?'\n§7構えの後、個体に応じた軌道で弾を放ちます。'+(hasTwinShot(profile)?'二筋は別々に遮られますが、同じ技で狙われた人が受ける攻撃は一度です。':'')+'弾は壁や他の生物で止まり、狙われた人だけに当たります。§r':'';
  const markNote=profile.talent==='mark'||profile.temper==='hostile'&&[0,13].includes(profile.signatureId%15)?'\n§7追跡粒子は対象の周囲に現れる目印です。壁越しの輪郭表示や周囲を照らす効果ではありません。§r':'';
  return `§b${profile.realmName} §7｜${profile.temper==='hostile'?'敵対':profile.temper==='neutral'?'中立':'友好'}§r\n\n§6━━ 生息地 ━━§r\n${profile.biomeNames.join('・')}\n\n§6━━ 行動と技 ━━§r\n${profile.actionName}：${profile.actionDetail}${instantNote}\n${profile.signatureName}：${profile.signatureDetail}${markNote}\n\n§6━━ 素材と使い道 ━━§r\n${profile.dropName}${materialUse}`;
 }
 return {tick,tickBosses,tickMarks:targetMarks.tick,clearMarks:targetMarks.clear,onHurt,onDeath,summonColossus,bossHudLine,fieldGuide,mobContentList,stagger};
}
