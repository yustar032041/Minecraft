import { EntityDamageCause, GameMode } from '@minecraft/server';
import { mobContent, mobContentList } from './mob_content.js';

const BOSS='hakkai:eclipse_colossus';
const BOSS_ITEM='hakkai:eclipse_core';
const PHASES=['§b第一相・星喰い','§d第二相・時蝕','§c第三相・終焉'];

export function setupMobSystem(ctx){
 const {ns,world,system,num,property,report}=ctx;
 const mobStates=new Map(), reflectAt=new Map(), bossStates=new Map(), lastBossTick=new Map();
 const players=()=>world.getAllPlayers();
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
  const dx=target.location.x-source.location.x,dz=target.location.z-source.location.z,k=Math.hypot(dx,dz)||1;
  try{target.applyImpulse({x:dx/k*horizontal,y:vertical,z:dz/k*horizontal});}catch{}
 }
 function hit(source,target,amount){
  if(!validPlayer(target))return;
  try{target.applyDamage(amount,{cause:EntityDamageCause.entityAttack,damagingEntity:source});}catch{}
 }
 function heal(entity,amount){
  try{const h=entity.getComponent('minecraft:health');if(h)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+amount));}catch{}
 }
 function addEffect(target,id,ticks,amplifier=0){try{target.addEffect(id,ticks,{amplifier,showParticles:false});}catch{}}
 function signatureEcho(entity,target,profile){
  const id=profile.signatureId??0,style=id%15,tier=profile.signatureTier??0,v=profile.variant;
  const ticks=18+tier*3+v*4;
  switch(style){
   case 0:addEffect(target,'glowing',ticks,0);break;
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
   case 13:addEffect(target,'glowing',ticks,0);addEffect(target,'weakness',ticks,0);break;
   default:addEffect(entity,'resistance',ticks,0);heal(entity,.5+tier*.1);break;
  }
  particle(entity.dimension,`hakkai:climate_${profile.realm%8}`,{x:target.location.x,y:target.location.y+.8,z:target.location.z});
 }
 function mobMove(entity,target,profile){
  const range=dist(entity.location,target.location),v=profile.variant,realm=profile.realm;
  const hitClose=damage=>{if(range<8)hit(entity,target,damage);};
  switch(profile.talent){
   case 'leap':
    if(range>4){try{entity.applyImpulse({x:(target.location.x-entity.location.x)*.09,y:.28+v*.04,z:(target.location.z-entity.location.z)*.09});}catch{}}
    else{hitClose(5+v*2);push(entity,target,.6+v*.18,.3);}
    break;
   case 'charge':
    if(range<13){try{entity.applyImpulse({x:(target.location.x-entity.location.x)*(.07+v*.015),y:.04,z:(target.location.z-entity.location.z)*(.07+v*.015)});}catch{}}
    if(range<6){hitClose(6+v*2);push(entity,target,1.1+v*.2,.12);}
    break;
   case 'web':
    if(range<11){hitClose(2+v);addEffect(target,'slowness',55+v*18,1+Math.floor(v/2));if(v===2)addEffect(target,'weakness',50,0);}
    break;
   case 'spore':
    if(range<12){hitClose(2+v);addEffect(target,'poison',55+v*22,v===2?1:0);if(v===1)addEffect(target,'nausea',65,0);ring(entity.dimension,target.location,1.8+v,realm);}
    break;
   case 'frost':
    if(range<11){hitClose(3+v);addEffect(target,'slowness',65+v*20,1+v);addEffect(target,'mining_fatigue',75+v*15,0);}
    break;
   case 'shock':
    if(range<13){hitClose(4+v*2);addEffect(target,'weakness',75+v*18,v===2?1:0);ring(entity.dimension,target.location,1+v,realm);}
    break;
   case 'time':
    if(range<14){hitClose(2+v);addEffect(target,'slowness',70+v*25,2+v);addEffect(target,'weakness',65,0);if(v===2)addEffect(target,'blindness',35,0);}
    break;
   case 'gust':
    if(range<14){hitClose(2+v);push(entity,target,1.1+v*.3,.25+v*.08);if(v===2)addEffect(target,'slow_falling',42,0);}
    break;
   case 'burst':
    if(range<9){for(const other of entity.dimension.getPlayers({location:target.location,maxDistance:4+v})){hit(entity,other,5+v*2);push(entity,other,1.15,.24);}}
    ring(entity.dimension,entity.location,3+v,realm);
    break;
   case 'leech':
    if(range<8){hitClose(5+v);heal(entity,2+v*2);addEffect(entity,'speed',50,0);}
    break;
   case 'mark':
    if(range<16){addEffect(target,'glowing',80+v*30,0);addEffect(target,'weakness',65+v*10,0);if(v===2)hitClose(4);}
    break;
   case 'ward':
   case 'armor':{
    addEffect(entity,'resistance',85+v*20,v===2?1:0);
    if(profile.talent==='ward'){
     for(const ally of entity.dimension.getEntities({families:['hakkai_wildlife'],location:entity.location,maxDistance:8+v*2}).slice(0,7)){
      if(ally.id!==entity.id&&mobContent.get(ally.typeId)?.realm===realm)addEffect(ally,'resistance',70,0);
     }
    }else addEffect(entity,'strength',65,0);
    if(range<5)hitClose(2+v);
    break;
   }
   case 'thorns':
    if(range<8){hitClose(3+v*2);addEffect(target,'slowness',45+v*10,0);}
    break;
   case 'defend':
    addEffect(entity,'resistance',80,1);if(range<5){hitClose(3+v);push(entity,target,.75,.16);}
    break;
   default: addEffect(entity,'speed',60,0);break;
  }
  if(validPlayer(target)&&range<12)signatureEcho(entity,target,profile);
  particle(entity.dimension,`hakkai:climate_${realm%8}`,{x:entity.location.x,y:entity.location.y+1,z:entity.location.z});
 }
 function passiveMove(entity,player,profile){
  if(profile.talent==='shy'){
   const s=mobStates.get(entity.id);if(!s||system.currentTick>=s.nextAt){
    mobStates.set(entity.id,{nextAt:system.currentTick+95+profile.variant*20});
    const dx=entity.location.x-player.location.x,dz=entity.location.z-player.location.z,k=Math.hypot(dx,dz)||1;
    try{entity.applyImpulse({x:dx/k*(.55+profile.variant*.12),y:.14,z:dz/k*(.55+profile.variant*.12)});entity.addEffect('speed',65, {amplifier:1+profile.variant,showParticles:false});}catch{}
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
 function scheduleCreatureMove(entity,target,profile,t){
  let s=mobStates.get(entity.id);
  if(!s){s={nextAt:t+70+profile.variant*23, pending:undefined, reflectAt:0};mobStates.set(entity.id,s);}
  if(s.pending){
   if(t<s.pending.at)return;
   const victim=players().find(p=>p.id===s.pending.playerId);
   s.pending=undefined;
   s.nextAt=t+115+profile.variant*27+(profile.realm%3)*9;
   if(validPlayer(victim)&&victim.dimension.id===entity.dimension.id&&dist(victim.location,entity.location)<20)mobMove(entity,victim,profile);
   return;
  }
  if(t<s.nextAt||dist(entity.location,target.location)>17)return;
  s.pending={at:t+20+profile.variant*3,playerId:target.id};
  target.sendMessage(`§c⚠ ${profile.actionName}！`);
  particle(entity.dimension,`hakkai:climate_${profile.realm}`,{x:target.location.x,y:target.location.y+.2,z:target.location.z});
  ring(entity.dimension,target.location,1.2+profile.variant*.7,profile.realm);
 }
 function bossPhase(entity){
  const h=entity.getComponent('minecraft:health');
  const ratio=h?.effectiveMax? h.currentValue/h.effectiveMax:1;
  return ratio<=.3?2:ratio<=.65?1:0;
 }
 function announce(d,loc,line){for(const p of d.getPlayers({location:loc,maxDistance:84}))p.sendMessage(line);}
 function bossTarget(entity){
  const list=entity.dimension.getPlayers({location:entity.location,maxDistance:54}).filter(validPlayer);
  list.sort((a,b)=>dist(a.location,entity.location)-dist(b.location,entity.location));
  return list[0];
 }
 function startBossAttack(entity,state,t,target,phase){
  const attacks=phase===0?['cleave','starfall','time_snare','eclipse_burst','summon']:
   phase===1?['cleave','starfall','time_snare','eclipse_burst','summon','rift_wave']:
   ['cleave','starfall','time_snare','eclipse_burst','summon','rift_wave','roar','rewind'];
  const kind=attacks[state.attackIndex++%attacks.length];
  const windup=kind==='starfall'?34:kind==='rewind'?46:26;
  state.pending={kind,at:t+windup,targetId:target.id,aim:{...target.location}};
  const labels={cleave:'八界断ち',starfall:'星骸落とし',time_snare:'時環封じ',eclipse_burst:'蝕光爆ぜ',summon:'影兵招来',rift_wave:'時空裂波',roar:'終焉咆哮',rewind:'逆刻再編'};
  announce(entity.dimension,entity.location,`§c§l${labels[kind]}§r §7— ${windup/20}秒後に発動`);
  const bossCenter=['summon','eclipse_burst','rift_wave','roar','rewind'].includes(kind);
  const mark=bossCenter?entity.location:target.location;
  const radius={cleave:3.5,starfall:4,time_snare:6,eclipse_burst:9,summon:7,rift_wave:18,roar:18,rewind:16}[kind]??3;
  ring(entity.dimension,{x:mark.x,y:mark.y+.2,z:mark.z},radius,7);
  for(let i=0;i<6;i++)particle(entity.dimension,'minecraft:basic_smoke_particle',{x:mark.x+(Math.random()-.5)*2,y:mark.y+.3+i*.35,z:mark.z+(Math.random()-.5)*2});
 }
 function resolveBossAttack(entity,state,phase){
  const attack=state.pending;if(!attack)return;
  state.pending=undefined;
  const d=entity.dimension,playersNear=d.getPlayers({location:entity.location,maxDistance:32}).filter(validPlayer);
  const target=players().find(p=>p.id===attack.targetId);
  if(attack.kind==='summon'){
   const nearby=d.getEntities({families:['hakkai_wildlife'],location:entity.location,maxDistance:34}).length;
   if(nearby<6)for(let i=0;i<2;i++){
    const a=system.currentTick*.04+i*Math.PI;
    try{d.spawnEntity(`${ns}foe_${i?6:7}_${i?8:11}`,{x:entity.location.x+Math.cos(a)*5,y:entity.location.y,z:entity.location.z+Math.sin(a)*5},{spawnEvent:'hakkai:wild',initialPersistence:false});}catch{}
   }
   return;
  }
  if(attack.kind==='rewind'){
   heal(entity,95+phase*25);addEffect(entity,'resistance',90,1);ring(d,entity.location,6,7);
   for(const p of d.getPlayers({location:entity.location,maxDistance:16}).filter(validPlayer)){addEffect(p,'weakness',80,1);if(dist(p.location,entity.location)<9)hit(entity,p,7+phase*2);}
   return;
  }
  if(attack.kind==='starfall'){
   const aim=attack.aim;ring(d,aim,4,7);
   for(const p of d.getPlayers({location:aim,maxDistance:4}).filter(validPlayer)){
    hit(entity,p,12+phase*3);push(entity,p,1.1,.4);addEffect(p,'weakness',45,0);
   }
   return;
  }
  if(attack.kind==='time_snare'){
   const aim=attack.aim;
   for(const p of d.getPlayers({location:aim,maxDistance:6}).filter(validPlayer)){addEffect(p,'slowness',95,3);addEffect(p,'weakness',75,1);hit(entity,p,4+phase*2);}
   return;
  }
  if(attack.kind==='eclipse_burst'){
   for(const p of d.getPlayers({location:entity.location,maxDistance:9}).filter(validPlayer)){hit(entity,p,9+phase*3);push(entity,p,1.45,.42);addEffect(p,'blindness',30,0);}
   ring(d,entity.location,8,7);return;
  }
  if(attack.kind==='rift_wave'){
   for(const p of playersNear){if(dist(p.location,entity.location)<18){hit(entity,p,8+phase*2);addEffect(p,'slowness',50,2);push(entity,p,1.2,.62);}}
   ring(d,entity.location,18,7);return;
  }
  if(attack.kind==='roar'){
   for(const p of d.getPlayers({location:entity.location,maxDistance:18}).filter(validPlayer)){addEffect(p,'weakness',120,1);addEffect(p,'mining_fatigue',100,1);if(dist(p.location,entity.location)<12)hit(entity,p,6+phase*2);}
   addEffect(entity,'strength',140,1);return;
  }
  if(attack.kind==='cleave'){
   const aim=attack.aim;
   for(const p of d.getPlayers({location:aim,maxDistance:3.5}).filter(validPlayer)){hit(entity,p,13+phase*3);push(entity,p,1.75,.34);addEffect(p,'slowness',42,1);}
   return;
  }
  if(validPlayer(target)&&target.dimension.id===d.id&&dist(target.location,entity.location)<8){hit(entity,target,8+phase*2);push(entity,target,1.35,.32);}
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
  if(s.pending&&t>=s.pending.at){resolveBossAttack(entity,s,s.phase);s.nextAt=t+(s.phase===2?105:s.phase===1?130:155);}
  if(!s.pending&&t>=s.nextAt){const target=bossTarget(entity);if(target)startBossAttack(entity,s,t,target,s.phase);else s.nextAt=t+40;}
  if(t%20===0)particle(entity.dimension,'hakkai:climate_7',{x:entity.location.x,y:entity.location.y+2.2,z:entity.location.z});
 }
 function activeBosses(){
  for(let realm=0;realm<8;realm++)try{if(world.getDimension(`${ns}realm_${realm}`).getEntities({type:BOSS}).length)return true;}catch{}
  return false;
 }
 function clearGround(d,x,y,z){
  try{
   for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    const floor=d.getBlock({x:x+dx,y:y-1,z:z+dz});if(!floor||floor.isAir||!floor.isSolid)return false;
    for(let dy=0;dy<=9;dy++){const block=d.getBlock({x:x+dx,y:y+dy,z:z+dz});if(!block||!block.isAir)return false;}
   }
   return true;
  }catch{return false;}
 }
 function summonColossus(player){
  if(!validPlayer(player))return false;
  if((num(player,'guards')&255)!==255){player.sendMessage('§e八界の守護獣をすべて倒すと、巨王への挑戦が解放されます。');return false;}
  if(player.dimension.id!==`${ns}realm_7`){player.sendMessage('§e時の終着駅へ移動してから、終焉の召喚印を選んでください。');return false;}
  if(activeBosses()){player.sendMessage('§c八界王はすでにどこかの界で戦っています。');return false;}
  if(world.getAbsoluteTime()<num(player,'eclipse_summon_ready',0)){player.sendMessage('§e召喚印の再使用まで、しばらく休んでください。');return false;}
  const d=player.dimension,look=player.getViewDirection(),base=player.location;
  let spawn;
  for(const radius of [13,16,20,24])for(let step=0;step<8&&!spawn;step++){
   const a=Math.atan2(look.z,look.x)+(step-3.5)*Math.PI/8;
   const x=Math.floor(base.x+Math.cos(a)*radius),z=Math.floor(base.z+Math.sin(a)*radius);
   for(let y=Math.floor(base.y)-3;y<=Math.floor(base.y)+3;y++)if(clearGround(d,x,y,z)){spawn={x:x+.5,y,z:z+.5};break;}
  }
  if(!spawn){player.sendMessage('§e巨王を呼ぶ広さのある平地が見つかりません。開けた場所で再挑戦してください。');return false;}
  try{
   const boss=d.spawnEntity(BOSS,spawn);boss.nameTag='終焉の八界王';
   property(player,'eclipse_summon_ready',world.getAbsoluteTime()+7200);
   player.sendMessage('§4§l終焉の八界王が目覚めた。予告の輪から離れ、形態ごとの技を見極めろ。');
   ring(d,spawn,7,7);return true;
  }catch(err){report('終焉の八界王召喚',err);player.sendMessage('§c召喚に失敗しました。数秒後にもう一度試してください。');return false;}
 }
 function onHurt(event){
  try{
   const mob=event.hurtEntity,profile=mobContent.get(mob.typeId),attacker=event.damageSource?.damagingEntity;
   if(!profile||!attacker?.isValid||attacker.typeId!=='minecraft:player')return;
   const now=system.currentTick,next=reflectAt.get(mob.id)??0;
   if(profile.talent==='thorns'&&now>=next){reflectAt.set(mob.id,now+70+profile.variant*15);hit(mob,attacker,2+profile.variant*2);particle(mob.dimension,`hakkai:climate_${profile.realm}`,{x:mob.location.x,y:mob.location.y+1,z:mob.location.z});}
   if(profile.talent==='ward'||profile.talent==='armor')addEffect(mob,'resistance',80,profile.variant===2?1:0);
   if(profile.talent==='defend'&&profile.temper!=='hostile'){addEffect(mob,'speed',50,1);push(mob,attacker,.45,.08);}
  }catch{}
 }
 function onDeath({deadEntity,damageSource}){
  if(deadEntity.typeId!==BOSS)return;
  const killer=damageSource?.damagingEntity;
  if(killer?.typeId==='minecraft:player'&&killer.isValid){
   property(killer,'eclipse_colossus_clear',1);
   killer.sendMessage('§6終焉の八界王を討伐。時蝕核は、八界の記録に刻まれた。');
   try{killer.dimension.spawnParticle('minecraft:totem_particle',{x:killer.location.x,y:killer.location.y+1,z:killer.location.z});killer.playSound('random.levelup',{volume:1,pitch:.62});}catch{}
  }
  bossStates.delete(deadEntity.id);lastBossTick.delete(deadEntity.id);
 }
 function tick(player,t){
  if(!player?.isValid)return;
  const d=player.dimension;
  try{
   for(const entity of d.getEntities({location:player.location,maxDistance:25,closest:40})){
    if(entity.typeId===BOSS){tickBoss(entity,t);continue;}
    const profile=mobContent.get(entity.typeId);if(!profile)continue;
    const range=dist(entity.location,player.location);if(range>20)continue;
    if(profile.temper==='hostile')scheduleCreatureMove(entity,player,profile,t);
    else if(range<8)passiveMove(entity,player,profile);
   }
  }catch(err){if(t%200===0)report('追加MOBの固有行動',err);}
  for(const [id,state] of mobStates)if(t>state.nextAt+2400)mobStates.delete(id);
  for(const [id,end] of reflectAt)if(t>end+1200)reflectAt.delete(id);
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
  return `${profile.realmName}｜${profile.temper==='hostile'?'魔将':'生態MOB'}\n\n生息帯：${profile.biomeNames.join('・')}\n固有技：${profile.actionName}\n技の効果：${profile.actionDetail}\n固有の追技：${profile.signatureName}\n追技の効果：${profile.signatureDetail}\n落とす素材：${profile.dropName}\n\n${profile.lore}`;
 }
 return {tick,onHurt,onDeath,summonColossus,bossHudLine,fieldGuide,mobContentList};
}
