import { talentTell } from './mob_talent_effects.js';
import { creatureWindup, creatureStrike } from './mob_attack_visuals.js';
import { GUARDIAN_REALM_ATTACKS, KING_GUARDIAN_REALM_ATTACKS, guardianDirection, guardianShapeContains, guardianClearDistance } from './guardian_attacks.js';
import {Difficulty,EntityDamageCause,GameMode} from '@minecraft/server';
import {scaledRealmDamage,REALM_GUARDIAN_MULTIPLIERS} from './realm_balance.js';

// The base techniques are shared; normal guardians scale by realm.
export const GUARDIAN_TECHNIQUES=[
 {name:'守護の衝撃',radius:3.5,damage:10,effect:'slowness',visual:'brace'},
 {name:'守護の追撃',radius:4.5,damage:14,effect:'weakness',visual:'lunge'},
 {name:'守護の波動',radius:6,damage:9,effect:'slowness',visual:'cast'}
];
const PALETTE=['wind','spore','sand','frost','spark','shadow','wind','time'];
// Different travel speeds make realm patterns react and read differently.
// King shadows keep their existing speed; damage and warned windup stay intact.
export const GUARDIAN_WAVE_SPEEDS=Object.freeze([.72,.58,.56,.62,.9,.68,.8,.64]);
const KING_SPEED=.65,HEIGHT=1.5;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const same=(a,b)=>finite(a)&&finite(b)&&a.x===b.x&&a.y===b.y&&a.z===b.z;
export function guardianVisualAnimation(entity,attack,phase){
 const match=/^hakkai:(?:king_)?guardian_([0-7])$/.exec(entity?.typeId??'');
 return match?`animation.hakkai.guardian_${match[1]}_${attack.visual}_${phase}`:`animation.hakkai.creature_${phase}`;
}
export function setupGuardianBoss({world,system,isEvading=()=>false,tryParry=()=>false,report=()=>{}}){
 const states=new Map(),valid=p=>p?.isValid&&p.typeId==='minecraft:player'&&p.getGameMode()!==GameMode.Creative&&p.getGameMode()!==GameMode.Spectator;
 function launch(e,s,p,realm,t){
  const origin={...e.location};if(!finite(origin))return;
  const direction=p.direction,dimensionId=p.dimensionId;
  const speed=e.typeId.startsWith('hakkai:king_guardian_')?KING_SPEED:GUARDIAN_WAVE_SPEEDS[realm];
  const wave={origin,direction,realm,attack:p.attack,design:p.design,speed,at:t+1,last:0,hit:new Set()};
  s.flight=wave;
  function finish(now){if(s.flight===wave){s.flight=undefined;s.nextAt=now+40;}}
  function schedule(){try{if(!system?.runTimeout)throw Error('scheduler unavailable');system.runTimeout(step,1);}catch{finish(system?.currentTick??t);}}
  function step(){
   const now=system?.currentTick;
   try{
    if(states.get(e.id)!==s||s.flight!==wave)return;
    if(now!==wave.at||!e.isValid||e.dimension.id!==dimensionId||world.getDifficulty()===Difficulty.Peaceful){finish(Number.isFinite(now)?now:t);return;}
    const d=e.dimension,r=Math.min(wave.attack.radius,wave.last+wave.speed),dir=wave.direction;
    const center={x:origin.x,y:origin.y+.8,z:origin.z};
    if(!d.isChunkLoaded(center)||!d.getBlock(center)?.isAir){finish(now);return;}
    // Each visible point is tested against the exact same angular shape and
    // block ray used for damage. These particles are the moving attack, not
    // a warning or a target-floor marker.
    const count=Math.max(16,Math.min(64,Math.ceil(2*Math.PI*r/.65)));
    for(let i=0;i<count;i++){
     const a=2*Math.PI*i/count,x=Math.cos(a),z=Math.sin(a);
     // Check the exact emitted position, including floating-point rounding at
     // the translated origin, against the same predicate used for hits.
     const dx=(origin.x+x*r)-origin.x,dz=(origin.z+z*r)-origin.z;
     const forward=dx*dir.x+dz*dir.z,side=-dx*dir.z+dz*dir.x;
     if(!guardianShapeContains(wave.design.shape,forward,side))continue;
     // Three visible heights bracket the accepted vertical extent. Obstacle
     // rays are evaluated at each displayed height, not only at the floor.
     for(const height of [.8-HEIGHT,.8,.8+HEIGHT]){
      if(guardianClearDistance(d,origin,x,z,r,height)<r-.001)continue;
      try{d.spawnParticle(`hakkai:shot_${PALETTE[realm]}`,{x:origin.x+x*r,y:origin.y+height,z:origin.z+z*r});}catch{}
     }
    }
    const search=Math.hypot(r,HEIGHT)+.01;
    for(const target of d.getPlayers({location:origin,maxDistance:search}))try{
     if(!valid(target)||target.dimension.id!==dimensionId||wave.hit.has(target.id))continue;
     const point={...target.location};if(!finite(point)||Math.abs(point.y-origin.y)>HEIGHT)continue;
     const x=point.x-origin.x,z=point.z-origin.z,n=Math.hypot(x,z);
     if(n>wave.last+wave.speed+1e-6||n+1e-6<wave.last||n>wave.attack.radius+1e-6)continue;
     const forward=x*dir.x+z*dir.z,side=-x*dir.z+z*dir.x;
     if(!guardianShapeContains(wave.design.shape,forward,side))continue;
     if(n>.001){if(guardianClearDistance(d,origin,x/n,z/n,n,point.y-origin.y+.8)<n-.001)continue;}
     else {const at={x:origin.x,y:point.y+.8,z:origin.z};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir)continue;}
     const source={...e.location};
     if(isEvading(target)||tryParry(target,e))continue;
     if(states.get(e.id)!==s||s.flight!==wave||!e.isValid||!valid(target)||e.dimension.id!==dimensionId||target.dimension.id!==dimensionId||world.getDifficulty()===Difficulty.Peaceful||!same(target.location,point)||!same(e.location,source))continue;
     // Mark even when damage is rejected, preventing one wave retrying damage.
     wave.hit.add(target.id);
     const damage=e.typeId.startsWith('hakkai:king_guardian_')?wave.attack.damage:scaledRealmDamage(wave.attack.damage,wave.realm,REALM_GUARDIAN_MULTIPLIERS);
     let accepted=false;try{accepted=Boolean(target.applyDamage(damage,{cause:EntityDamageCause.entityAttack,damagingEntity:e}));}catch{}
     if(accepted){
      try{d.spawnParticle(`hakkai:mob_${PALETTE[realm]}`,{x:point.x,y:point.y+.8,z:point.z});}catch{}
      try{target.addEffect(wave.design.effect,50,{amplifier:0,showParticles:false});}catch{}
     }
    }catch{}
    wave.last=r;wave.at=now+1;
    if(r>=wave.attack.radius)finish(now);else schedule();
   }catch{finish(Number.isFinite(now)?now:t);}
  }
  schedule();
 }
 function tickEntity(e,t){
  if(!e?.isValid||!/^hakkai:(?:king_)?guardian_[0-7]$/.test(e.typeId))return;
  if(world.getDifficulty()===Difficulty.Peaceful){states.delete(e.id);return;}
  let s=states.get(e.id);if(!s){s={lastTick:-1,nextAt:t+30,index:0};states.set(e.id,s);}
  if(s.lastTick===t)return;s.lastTick=t;
  if(s.pending&&t>=s.pending.at){
   const p=s.pending;s.pending=undefined;s.nextAt=t+40;
   if(t!==p.at||!p.dimensionId||e.dimension.id!==p.dimensionId)return;
   creatureStrike(e,guardianVisualAnimation(e,p.attack,'strike'));
   if(!e.isValid||e.dimension.id!==p.dimensionId||world.getDifficulty()===Difficulty.Peaceful)return;
   launch(e,s,p,Number(e.typeId.slice(-1)),t);return;
  }
  if(s.pending||s.flight||t<s.nextAt)return;
  const origin=e.location,targets=[];
  if(!finite(origin)){s.nextAt=t+40;return;}
  for(const p of e.dimension.getPlayers({location:origin,maxDistance:22}))try{
   if(!valid(p))continue;
   const l=p.location,id=p.id;if(!id||!finite(l))continue;
   targets.push({id,location:{x:l.x,y:l.y,z:l.z}});
  }catch{}
  targets.sort((a,b)=>Math.hypot(a.location.x-origin.x,a.location.z-origin.z)-Math.hypot(b.location.x-origin.x,b.location.z-origin.z));
  if(!targets.length){s.nextAt=t+40;return;}
  const index=s.index++%GUARDIAN_TECHNIQUES.length,attack=GUARDIAN_TECHNIQUES[index],realm=Number(e.typeId.slice(-1));
  const design=(e.typeId.startsWith('hakkai:king_guardian_')?KING_GUARDIAN_REALM_ATTACKS:GUARDIAN_REALM_ATTACKS)[realm][index];
  const direction=guardianDirection(targets[0].location.x-origin.x,targets[0].location.z-origin.z);
  creatureWindup(e,guardianVisualAnimation(e,attack,'windup'));
  talentTell(e,{talent:'burst',realm},targets[0].location,design.shape==='circle'?'radial':'forward');
  s.pending={at:t+40,attack,design,direction,dimensionId:e.dimension.id};
 }
 function tick(player,t){
  if(!player?.isValid)return;
  for(const family of ['hakkai_guardian','hakkai_king_guardian'])try{
   for(const e of player.dimension.getEntities({families:[family],location:player.location,maxDistance:28,closest:8})){
    try{tickEntity(e,t);}catch(err){if(t%200===0)report('守護獣個体の行動',err);}
   }
  }catch(err){if(t%200===0)report('守護獣の行動',err);}
  for(const [id,s] of states)if(t-s.lastTick>2400)states.delete(id);
 }
 function stagger(e,t){const s=states.get(e?.id);if(s){s.pending=undefined;s.flight=undefined;s.nextAt=Math.max(s.nextAt,t+40);}}
 function onDeath(e){states.delete(e?.id);}
 return {tick,stagger,onDeath};
}
