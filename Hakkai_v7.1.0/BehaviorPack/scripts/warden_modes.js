// Enhanced modes for the arena boss. Separate from the original two warned
// attack slots: special modes wait for those slots to finish and never run
// legacy damage concurrently. All motion is bounded and swept before moving.
import {validWardenArenaFloor} from './warden_arena_floor.js';
import {createWardenBrain,observeWarden,wardenSituation,chooseWardenTarget,chooseWardenMode,modeScores,chooseSwordAction,chooseWardenBlade} from './warden_ai.js';
export const WARDEN_MODE_DAMAGE=Object.freeze({lightning:33,slash:24,fire:31.2,combo:33});
// Keep the second-form flight mode unchanged; tone down the fourth and
// fifth forms' sword/flight burst while keeping fifth >= fourth for shared moves.
export function wardenModeDamage(kind,phase){
 if(phase===3)return ({slash:18,combo:22})[kind]??WARDEN_MODE_DAMAGE[kind];
 if(phase===4)return ({lightning:24,slash:20,fire:20,combo:24})[kind]??WARDEN_MODE_DAMAGE[kind];
 return WARDEN_MODE_DAMAGE[kind];
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const len=v=>Math.hypot(v.x,v.y,v.z);
const distance=(a,b)=>len({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const point=(a,v,k)=>({x:a.x+v.x*k,y:a.y+v.y*k,z:a.z+v.z*k});
function segmentContact(a,b,p){const v={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},n=v.x*v.x+v.y*v.y+v.z*v.z,k=n?clamp(((p.x-a.x)*v.x+(p.y-a.y)*v.y+(p.z-a.z)*v.z)/n,0,1):0;return point(a,v,k);}
function clearLine(d,a,b){
 try{if(!finite(a)||!finite(b)||!d.isChunkLoaded(a)||!d.isChunkLoaded(b)||!d.getBlock(a)?.isAir||!d.getBlock(b)?.isAir)return false;
  const v={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},n=len(v);return n<.001||!d.getBlockFromRay(a,{x:v.x/n,y:v.y/n,z:v.z/n},{maxDistance:n});
 }catch{return false;}
}
function safeVolume(d,p,players,ground=false){
 try{
  if(!finite(p)||Math.abs(p.x)>12.8||Math.abs(p.z)>12.8||p.y<80||p.y>91.8)return false;
  if(players.some(x=>x.isValid&&Math.abs(x.location.y-p.y)<2.5&&Math.hypot(x.location.x-p.x,x.location.z-p.z)<1.5))return false;
  for(let x=Math.floor(p.x-.46);x<=Math.floor(p.x+.46);x++)for(let z=Math.floor(p.z-.46);z<=Math.floor(p.z+.46);z++){
   if(ground){const floor={x,y:79,z};if(!d.isChunkLoaded(floor)||!validWardenArenaFloor(d.getBlock(floor)))return false;}
   for(let y=Math.floor(p.y+.02);y<=Math.floor(p.y+2.34);y++){const at={x,y,z};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir)return false;}
  }
  return true;
 }catch{return false;}
}
function move(e,to,players){
 try{const from={...e.location},n=distance(from,to),steps=Math.max(1,Math.ceil(n/.18));if(n>1.2)return false;
  for(let j=1;j<=steps;j++){const k=j/steps,p={x:from.x+(to.x-from.x)*k,y:from.y+(to.y-from.y)*k,z:from.z+(to.z-from.z)*k};if(!safeVolume(e.dimension,p,players,p.y<=80.03))return false;}
  e.clearVelocity();return e.tryTeleport(to,{checkForBlocks:true})===true;
 }catch{return false;}
}
function particle(d,id,p){try{d.spawnParticle(id,p);return true;}catch{return false;}}
function pose(e,id){try{e.playAnimation(id,{blendOutTime:.1,stopExpression:'query.any_animation_finished'});return true;}catch{return false;}}
function hand(e){
 const p=e.location;let angle=0;try{angle=(e.getRotation().y||0)*Math.PI/180;}catch{}
 return {x:p.x-.55*Math.cos(angle),y:p.y+1.55,z:p.z-.55*Math.sin(angle)};
}
function flightVisual(e,s,on){
 try{e.setProperty('hakkai:flying',on);s.sentFlight=on;return true;}catch{return false;}
}
export function setupWardenModes({validPlayer,isEvading=()=>false,damageCause,swords,decision,damageGate}){
 const states=new Map();
 function enabled(e){return typeof e?.tryTeleport==='function'&&typeof e?.clearVelocity==='function'&&typeof e?.dimension?.getBlockFromRay==='function';}
 function stop(e,s,t){
  swords.release(e);s.mode='traditional';s.next=t+100;s.traditionalSince=t;s.attack=undefined;s.projectiles=[];s.zones=[];s.hitNext.clear();s.motion=undefined;
  if(s.flying){try{e.clearVelocity();e.addEffect('slow_falling',100,{amplifier:0,showParticles:false});}catch{}flightVisual(e,s.bossState,false);s.flying=false;}
 }
 function reset(e,t){const s=states.get(e?.id);if(s)stop(e,s,t);else if(e)swords.release(e);}
 function onDeath(e){if(e){reset(e,0);states.delete(e.id);}}
 function forget(id){states.delete(id);}
 // One successful special-mode hit per player per 10 ticks in late forms.
 // Projectiles and lingering flames share the budget; visuals still play.
 function modeHit(e,s,p,kind,t){
  if(s.phase>=3&&t<(s.hitNext.get(p.id)??0)||damageGate&&!damageGate.allows(e,p,s.phase,t))return false;
  let accepted=false;try{accepted=Boolean(p.applyDamage(wardenModeDamage(kind,s.phase),{cause:damageCause,damagingEntity:e}));}catch{}
  if(accepted&&s.phase>=3)s.hitNext.set(p.id,t+10);
  if(accepted)damageGate?.record(e,p,s.phase,t);
  return accepted;
 }
 function playersFor(e){try{return e.dimension.getPlayers({location:e.location,maxDistance:45}).filter(validPlayer);}catch{return [];}}
 function launch(e,s,target,type,spread=0){
  const origin=hand(e);
  const aim={x:target.location.x,y:target.location.y+.9,z:target.location.z},v={x:aim.x-origin.x,y:aim.y-origin.y,z:aim.z-origin.z},n=len(v);
  if(n<.1||n>40||!finite(aim))return false;
  const a=Math.atan2(v.z,v.x)+spread,h=Math.hypot(v.x,v.z)/n,dir={x:Math.cos(a)*h,y:v.y/n,z:Math.sin(a)*h};
  if(!particle(e.dimension,type==='lightning'?'hakkai:warden_thunder':'hakkai:warden_front_moon',origin))return false;
  s.projectiles.push({p:origin,dir,remain:Math.min(32,n+1),type,hit:new Set()});return true;
 }
 function createFlame(e,s,position,t){
  const at={x:position.x,y:Math.max(80,Math.min(83,position.y)),z:position.z};
  if(!safeVolume(e.dimension,{x:at.x,y:at.y,z:at.z},[],false)||s.zones.length>=3)return;
  if(particle(e.dimension,'hakkai:warden_hellfire',{...at,y:at.y+.3}))s.zones.push({p:at,until:t+160,next:new Map(),visibleAt:t});
 }
 function updateProjectiles(e,s,people,t){
  const d=e.dimension,next=[];
  for(const shot of s.projectiles){
   const step=Math.min(shot.type==='lightning'?1.05:.85,shot.remain),from=shot.p,to=point(from,shot.dir,step);
   if(step<=0||!clearLine(d,from,to))continue;
   let visible=true;for(let k=0;k<=step;k+=.35)visible=particle(d,shot.type==='lightning'?'hakkai:warden_thunder':'hakkai:warden_front_moon',point(from,shot.dir,k))&&visible;
   if(!visible)continue;
   let hit=false;
   for(const p of people){if(shot.hit.has(p.id)||isEvading(p))continue;
    const centre={x:p.location.x,y:p.location.y+.9,z:p.location.z};
    const contact=segmentContact(from,to,centre);
    if(distance(contact,centre)>.85||!clearLine(d,contact,centre))continue;
    shot.hit.add(p.id);hit=true;
    try{if(modeHit(e,s,p,shot.type==='lightning'?'lightning':'slash',t)&&shot.type==='lightning')p.setOnFire?.(s.phase>=3?2:3);}catch{}
   }
   shot.p=to;shot.remain-=step;
   if(shot.type==='lightning'&&(hit||shot.remain<=0))createFlame(e,s,{x:to.x,y:Math.max(80,to.y-1),z:to.z},t);
   if(!hit&&shot.remain>.001)next.push(shot);
  }
  s.projectiles=next;
 }
 function updateZones(e,s,people,t){
  const d=e.dimension;s.zones=s.zones.filter(z=>t<z.until);
  for(const z of s.zones){
   if(t%5===0){let visible=true;
    for(let i=0;i<12;i++){const a=2*Math.PI*i/12,r=i%2?.75:1.45;visible=particle(d,'hakkai:warden_hellfire',{x:z.p.x+Math.cos(a)*r,y:z.p.y+.25,z:z.p.z+Math.sin(a)*r})&&visible;}
    if(visible)z.visibleAt=t;
   }
   if(t-z.visibleAt>5)continue;
   for(const p of people){if(!p.isValid||isEvading(p)||t<(z.next.get(p.id)??0)||Math.abs(p.location.y-z.p.y)>2||Math.hypot(p.location.x-z.p.x,p.location.z-z.p.z)>1.6)continue;
    if(!clearLine(d,{...z.p,y:z.p.y+.7},{...p.location,y:p.location.y+.7}))continue;
    z.next.set(p.id,t+25);try{if(modeHit(e,s,p,'fire',t))p.setOnFire?.(s.phase>=3?2:4);}catch{}
   }
  }
 }
 function startSpecial(e,s,t,phase,mode){
  const forms=phase===1?['flight']:phase===3?['sword']:phase===4?['flight','sword','flight_sword']:[];
  if(!forms.includes(mode))return false;
  const flying=mode.includes('flight');
  if(flying&&!flightVisual(e,s.bossState,true))return false;
  s.mode=mode;s.flying=flying;s.started=t;s.until=t+(flying?620:360);s.nextAttack=t+35;s.motionAt=t+45;s.orbitAngle=Math.atan2(e.location.z,e.location.x);s.motion=undefined;s.failed=0;
  try{for(const p of playersFor(e))p.sendMessage(flying?'§c管理者が翼を広げ、空へ舞い上がる！':'§d管理者が八界の剣に手を伸ばした！');}catch{}
  return true;
 }
 function fly(e,s,obstacles,t,people){
  const l=e.location;
  if(t>=s.until){s.mode='landing';s.attack=undefined;swords.release(e);}
  let desired;
  if(s.mode==='landing')desired={x:l.x,y:Math.max(80,l.y-.24),z:l.z};
  else{
   if(!s.flightTarget?.isValid||t>=(s.retargetAt??0)){
    s.flightTarget=chooseWardenTarget(s.brain,s.situation,{origin:l,avoidId:s.flightTarget?.id})??people[0];s.retargetAt=t+40;
    if(s.flightTarget){const p=s.flightTarget.location;s.orbitAngle=Math.atan2(l.z-p.z,l.x-p.x);}
   }
   const p=s.flightTarget?.location??{x:0,y:80,z:0};
   const observation=s.situation.profiles.find(x=>x.player.id===s.flightTarget?.id);
   // Move around the observed target rather than a fixed arena-centred route.
   const direction=(observation?.approach??0)>.08?-1:1;
   s.orbitAngle+=direction*.062;
   const radius=observation?.distance<5?7:6, target={x:clamp(p.x+Math.cos(s.orbitAngle)*radius,-11.5,11.5),y:clamp(p.y+6,83,89),z:clamp(p.z+Math.sin(s.orbitAngle)*radius,-11.5,11.5)};
   const v={x:target.x-l.x,y:target.y-l.y,z:target.z-l.z},n=len(v),k=n?Math.min(.64/n,1):0;
   desired=point(l,v,k);
  }
  if(move(e,desired,obstacles))s.failed=0;else s.failed++;
  if(s.mode==='landing'&&l.y<=80.1){flightVisual(e,s.bossState,false);s.flying=false;stop(e,s,t);}
  else if(s.failed>35){stop(e,s,t);}
 }
 function groundMotion(e,s,people,t,obstacles=people){
  if(!s.motion&&e.location.y>80.03){const l=e.location;move(e,{x:l.x,y:Math.max(80,l.y-.24),z:l.z},obstacles);return;}
  if(!s.motion&&t>=s.motionAt&&people.length){
   const selected=chooseWardenTarget(s.brain,s.situation,{origin:e.location,avoidId:s.lastMotionTarget})??people[0];
   const l=e.location,p=selected.location,a=Math.atan2(p.z-l.z,p.x-l.x),profile=s.situation.profiles.find(x=>x.player.id===selected.id),distance=profile?.distance??8;
   s.lastMotionTarget=selected.id;
   // Close pressure prompts a sideways roll, an escaping player a dash,
   // otherwise a short leap closes distance. All still use swept checks.
   const kind=distance<3.5?0:(profile?.speed??0)>.13||distance>8?2:1;
   const angle=kind===0?a+(profile?.approach>0?-Math.PI/2:Math.PI/2):kind===1?a:a-Math.PI/8;
   s.motion={kind,step:0,dir:{x:Math.cos(angle),z:Math.sin(angle)}};s.motionAt=t+65;
   pose(e,kind===0?'animation.hakkai.warden_roll':'animation.hakkai.warden_leap');
  }
  const m=s.motion;if(!m)return;
  const l=e.location,n=m.step++,y=m.kind===0?0:m.kind===1?(n<6?.22:n<12?-.22:0):(n<4?.24:n<9?0:-.19),speed=m.kind===0?.42:m.kind===1?.23:.5;
  const to={x:l.x+m.dir.x*speed,y:Math.max(80,l.y+y),z:l.z+m.dir.z*speed};
  if(n>=13||!move(e,to,obstacles))s.motion=undefined;
 }
 function attack(e,s,phase,people,t){
  if(s.attack){
   const a=s.attack;if(!a.target?.isValid||!people.some(p=>p.id===a.target.id)){swords.release(e);s.attack=undefined;return;}
   if(a.kind==='lightning'){
    if(t<a.release){if(t%4===0)a.visible=particle(e.dimension,'hakkai:warden_thunder',hand(e))||a.visible;}
    else{if(a.visible)launch(e,s,a.target,'lightning');s.attack=undefined;}
   }else{
    if(t>=a.release&&t<=a.end&&(t-a.release)%a.interval===0){
     const strike=Math.floor((t-a.release)/a.interval);
     const animation=a.kind==='barrage'?'animation.hakkai.warden_blade_aerial':
      strike%2?'animation.hakkai.warden_blade_reverse':'animation.hakkai.warden_blade_cut';
     if(!pose(e,animation))return;
     try{e.playSound('mob.player.attack.strong',{volume:.7,pitch:.9+strike%3*.12});}catch{}
     if(a.kind==='combo'){
      const from={...e.location,y:e.location.y+1};
      for(const p of people){const to={...p.location,y:p.location.y+1};if(isEvading(p)||distance(from,to)>3.1||!clearLine(e.dimension,from,to))continue;
       modeHit(e,s,p,'combo',t);
      }
     }else{
      const spread=a.kind==='barrage'?((Math.floor((t-a.release)/a.interval)%5)-2)*.12:0;
      launch(e,s,a.target,'slash',spread);
     }
    }
    if(t>a.end){swords.release(e);s.attack=undefined;}
   }
  }
  if(s.attack||t<s.nextAttack||!people.length||s.mode==='landing')return;
  const target=chooseWardenTarget(s.brain,s.situation,{origin:e.location,avoidId:s.lastAttackTarget})??people[0];
  s.lastAttackTarget=target.id;
  if(s.mode==='flight'){
   if(!pose(e,'animation.hakkai.warden_sky_cast')){s.nextAttack=t+25;return;}
   s.attack={kind:'lightning',target,release:t+22,visible:false};s.nextAttack=t+85;
  }else{
   const index=chooseWardenBlade(s.brain,s.situation,target);if(!swords.acquire(e,index)){s.nextAttack=t+25;return;}
   const kind=s.mode==='flight_sword'?'barrage':chooseSwordAction(s.situation,target);
   if(!pose(e,'animation.hakkai.warden_blade_ready')){swords.release(e);s.nextAttack=t+25;return;}
   s.attack={kind,target,release:t+20,end:t+20+(kind==='barrage'?36:kind==='combo'?24:8),interval:kind==='barrage'?4:kind==='combo'?6:8};s.nextAttack=t+(kind==='barrage'?105:85);
  }
 }
 function tick(e,bossState,phase,t,{busy=false,paused=false,peaceful=false}={}){
  if(!enabled(e))return {enabled:false,active:false};
  let s=states.get(e.id);
  if(!s){s={phase,mode:'traditional',next:t+100,traditionalSince:t,projectiles:[],zones:[],hitNext:new Map(),bossState,lastTick:t-1};states.set(e.id,s);}
  s.bossState=bossState;
  if(s.lastTick===t)return {enabled:true,active:s.mode!=='traditional',flying:s.flying,mode:s.mode};
  if(s.lastTick!==t-1)stop(e,s,t);
  s.lastTick=t;
  if(s.phase!==phase){stop(e,s,t);s.phase=phase;}
  if(paused||peaceful){if(s.mode!=='traditional'||s.projectiles.length||s.zones.length)stop(e,s,t);return {enabled:true,active:false};}
  const people=playersFor(e);
  let obstacles;try{obstacles=e.dimension.getPlayers({location:e.location,maxDistance:45}).filter(p=>p.isValid);if(obstacles.some(p=>!finite(p.location)))throw Error('invalid player position');}catch{stop(e,s,t);return {enabled:true,active:false};}
  if(!people.length){if(s.mode!=='traditional')stop(e,s,t);return {enabled:true,active:false};}
  const brain=bossState.brain??(bossState.brain=createWardenBrain());
  if(!bossState.situation){observeWarden(brain,e,people,t,{isEvading});}
  const situation=bossState.situation??wardenSituation(brain,e,people,t);s.brain=brain;s.situation=situation;
  const choose=(opts)=>decision?.mode?.(brain,phase,situation,opts)??chooseWardenMode(brain,phase,situation,opts);
  if(s.mode==='traditional'&&t>=s.next&&!busy&&bossState.takeoffAt===undefined&&e.isOnGround===true){
   const selected=choose({current:'traditional',patience:t-s.traditionalSince});
   if(selected==='traditional')s.next=t+60;
   else if(startSpecial(e,s,t,phase,selected)){
    brain.recentModes.push(selected);if(brain.recentModes.length>6)brain.recentModes.shift();
   }else s.next=t+60;
  }
  // Re-evaluate only between attacks, after a minimum commitment. Finish the
  // current action and land before changing modes; retain a hysteresis margin.
  if(['flight','sword','flight_sword'].includes(s.mode)&&t-s.started>=240&&t%40===0&&!s.attack){
   const selected=choose({current:s.mode}),scores=modeScores(phase,situation);
   if(selected!==s.mode&&(scores[selected]??-Infinity)>(scores[s.mode]??0)+1.8){
    if(s.flying){s.mode='landing';s.until=t;}else{s.mode='ground_landing';s.failed=0;swords.release(e);}
   }
  }
  if(s.mode==='sword'&&t>=s.until){s.mode='ground_landing';s.attack=undefined;swords.release(e);s.failed=0;}
  if(s.mode!=='traditional'){
   if(s.flying)fly(e,s,obstacles,t,people);else if(s.mode==='sword')groundMotion(e,s,people,t,obstacles);
   else if(s.mode==='ground_landing'){
    const l=e.location;if(l.y<=80.03)stop(e,s,t);
    else if(!move(e,{x:l.x,y:Math.max(80,l.y-.24),z:l.z},obstacles)&&++s.failed>35)stop(e,s,t);
   }
   if(s.mode!=='traditional'&&s.mode!=='ground_landing')attack(e,s,phase,people,t);
  }
  updateProjectiles(e,s,people,t);updateZones(e,s,people,t);
  return {enabled:true,active:s.mode!=='traditional',flying:s.flying,mode:s.mode};
 }
 return {tick,reset,onDeath,forget};
}
