// Bounded, server-side utility AI, not an external model or a learned network.
// It observes recent motion, dodges and damage dealt, then scores available
// choices. Decisions never bypass a phase gate, windup, collision or cooldown.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const planar=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createWardenBrain(seed=1){return {players:new Map(),recentAttacks:[],recentModes:[],recentBlades:[],seed:(seed>>>0)||1,lastObserve:-1};}
function noise(brain){brain.seed=(Math.imul(brain.seed,1664525)+1013904223)>>>0;return brain.seed/4294967296;}
function entry(brain,id){let p=brain.players.get(id);if(!p){p={threat:0,dodges:0,speed:0,approach:0,sneaking:false,lastSeen:-1,lastDamage:-1};brain.players.set(id,p);}return p;}
function age(p,t){
 if(p.updated===undefined){p.updated=t;return;}
 const dt=clamp(t-p.updated,0,2400);p.threat*=Math.pow(.994,dt);p.dodges*=Math.pow(.992,dt);p.updated=t;
}
export function observeWarden(brain,boss,people,t,{isEvading=()=>false}={}){
 if(!brain||!finite(boss?.location)||!Array.isArray(people)||!Number.isFinite(t)||brain.lastObserve===t)return;
 if(brain.lastObserve>=0&&t-brain.lastObserve>200){brain.players.clear();brain.recentAttacks=[];brain.recentModes=[];brain.recentBlades=[];}
 brain.lastObserve=t;
 for(const p of people){
  if(!p?.isValid||!p.id||!finite(p.location))continue;
  const m=entry(brain,p.id);age(m,t);
  // Sparse samples retain movement over time instead of reacting to jitter.
  if(m.pos&&t-m.sampleAt>=8){
   const dt=t-m.sampleAt,travel=planar(p.location,m.pos),now=planar(p.location,boss.location);
   // Teleport/discontinuity is not interpreted as ordinary running.
   if(dt<=40&&travel/dt<=1.2){m.speed=.55*m.speed+.45*(travel/dt);m.approach=.55*m.approach+.45*((m.distance-now)/dt);m.vx=(p.location.x-m.pos.x)/dt;m.vz=(p.location.z-m.pos.z)/dt;}
   else {m.speed=0;m.approach=0;m.vx=0;m.vz=0;}
   m.pos={...p.location};m.sampleAt=t;m.distance=now;
  }else if(!m.pos){m.pos={...p.location};m.sampleAt=t;m.distance=planar(p.location,boss.location);}
  let evading=false;try{evading=Boolean(isEvading(p));}catch{}
  if(evading&&!m.evading)m.dodges=Math.min(4,m.dodges+1);
  m.evading=evading;m.sneaking=Boolean(p.isSneaking);m.lastSeen=t;
 }
 for(const [id,p] of brain.players)if(t-p.lastSeen>600&&t-p.lastDamage>600)brain.players.delete(id);
}
export function recordWardenHurt(brain,player,damage,t,cause){
 if(!brain||!player?.isValid||player.typeId!=='minecraft:player'||!player.id||!Number.isFinite(damage)||damage<=0||!Number.isFinite(t))return;
 const p=entry(brain,player.id);age(p,t);p.threat=Math.min(30,p.threat+Math.min(8,damage*.16)+1);p.lastDamage=t;
 if(cause==='projectile'||cause==='ranged')p.rangedUntil=t+140;
 else if(cause==='entityAttack'||cause==='melee')p.meleeUntil=t+100;
}
export function recordWardenParry(brain,player,t){
 if(!brain||!player?.isValid||!player.id||!Number.isFinite(t))return;
 const p=entry(brain,player.id);age(p,t);p.dodges=Math.min(4,p.dodges+1.5);p.lastSeen=t;
}
export function wardenSituation(brain,boss,people,t){
 const profiles=[];if(!brain||!finite(boss?.location)||!Array.isArray(people)||!Number.isFinite(t))return {profiles,near:0,grouped:0,nearest:Infinity,fast:0,pressure:0,ranged:0};
 for(const player of people){if(!player?.isValid||!player.id||!finite(player.location))continue;
  const m=entry(brain,player.id);age(m,t);const d=Math.hypot(boss.location.x-player.location.x,boss.location.y-player.location.y,boss.location.z-player.location.z);
  profiles.push({player,distance:d,speed:m.speed||0,approach:m.approach||0,vx:m.vx||0,vz:m.vz||0,dodges:m.dodges||0,threat:m.threat||0,sneaking:m.sneaking,ranged:(m.rangedUntil??0)>t,melee:(m.meleeUntil??0)>t});
 }
 return {profiles,near:profiles.filter(p=>p.distance<5).length,grouped:profiles.filter(p=>p.distance<9).length,nearest:Math.min(Infinity,...profiles.map(p=>p.distance)),fast:profiles.filter(p=>p.speed>.14||p.dodges>=1).length,pressure:profiles.reduce((n,p)=>n+p.threat,0),ranged:profiles.filter(p=>p.ranged).length};
}
export function chooseWardenTarget(brain,situation,{origin,avoidId}={}){
 let best,score=-Infinity;
 for(const p of situation.profiles){
  const d=finite(origin)?planar(origin,p.player.location):p.distance;
  const value=clamp(p.threat,0,18)*.55+Math.max(0,14-d)*.4+(p.approach>.08?1:0)-(p.player.id===avoidId?3.5:0)+noise(brain)*.45;
  if(value>score){score=value;best=p.player;}
 }
 return best;
}
export function modeScores(phase,s){
 // Phase gates stay explicit. Recent damage at range and fast movement favour
 // aerial pressure; close combat favours the held blade; packed players favour
 // wide conventional patterns and aerial slashes.
 const near=s.near,far=s.nearest>9,mid=s.nearest>=5&&s.nearest<=9,fast=s.fast>0,range=s.ranged>0,group=s.grouped>=2;
 const scores={traditional:3.2+(group?1.5:0)+(s.nearest>5?1:0),flight:2+(far?3:0)+(range?2.5:0)+(fast?1.5:0)-(near?1.5:0),sword:2+(near?5:0)+(mid?2.5:0)+(s.pressure>4?1:0)-(far?1.5:0),flight_sword:2.3+(group?4.5:0)+(fast?2:0)+(range?1:0)+(far?1:0)};
 if(phase===0||phase===2)return {traditional:scores.traditional};
 if(phase===1)return {traditional:scores.traditional,flight:scores.flight};
 if(phase===3)return {traditional:scores.traditional,sword:scores.sword};
 return scores;
}
export function chooseWardenMode(brain,phase,situation,{current='traditional',commit=false,patience=0}={}){
 const scores=modeScores(phase,situation),recent=brain.recentModes.slice(-3);
 // After prolonged conventional combat, give viable special modes more
 // opportunity without forcing a fixed switch sequence.
 if(current==='traditional')for(const k of Object.keys(scores))if(k!=='traditional')scores[k]+=clamp(patience/200,0,2.5);
 let selected='traditional',best=-Infinity;
 for(const [mode,base] of Object.entries(scores)){
  const penalty=mode===current?-.15:recent.filter(x=>x===mode).length*1.1;
  const value=base-penalty+noise(brain)*.65;if(value>best){selected=mode;best=value;}
 }
 if(commit){brain.recentModes.push(selected);if(brain.recentModes.length>6)brain.recentModes.shift();}
 return selected;
}
export function chooseWardenAttack(brain,patterns,situation,target){
 if(!patterns.length)return undefined;
 const p=situation.profiles.find(x=>x.player.id===target?.id),fast=p&&(p.speed>.12||p.dodges>=1),group=situation.grouped>=2,d=p?.distance??10;
 let best,score=-Infinity;
 for(const a of patterns){
  let value=noise(brain)*1.3;
  if(fast)value+=a.motion?2.1:0;
  else value+=!a.motion?1.2:0;
  if(group)value+=['wave','twinwave','sweep','zones'].includes(a.motion)||['cross','square','twin'].includes(a.shape)?2:0;
  if(d>8)value+=['bolt','barrage'].includes(a.motion)||['line','lanes'].includes(a.shape)?1.8:0;
  if(d<5)value+=['cross','annulus','square'].includes(a.shape)?1.2:0;
  if(p?.sneaking)value+=a.strikes>1||a.motion==='sweep'?1.3:0;
  if(p?.ranged)value+=a.motion==='barrage'||a.motion==='bolt'?1.2:0;
  const recent=brain.recentAttacks;
  value-=recent.filter(x=>x.name===a.attack).length*4;
  value-=recent.filter(x=>x.motion===(a.motion??a.shape)).length*.8;
  if(value>score){score=value;best=a;}
 }
 return best;
}
export function rememberWardenAttack(brain,attack){brain.recentAttacks.push({name:attack.attack,motion:attack.motion??attack.shape});if(brain.recentAttacks.length>8)brain.recentAttacks.shift();}
export function chooseWardenBlade(brain,situation,target){
 const p=situation.profiles.find(x=>x.player.id===target?.id),fast=p&&(p.speed>.12||p.dodges>=1),group=situation.grouped>=2;
 let best=0,top=-Infinity;
 for(let i=0;i<8;i++){
  let score=noise(brain)*1.4;
  if(fast&&[0,4,6].includes(i))score+=2;
  if(p?.sneaking&&[1,5,7].includes(i))score+=1.7;
  if(group&&[2,3].includes(i))score+=2;
  score-=brain.recentBlades.filter(v=>v===i).length*2.5;
  if(score>top){top=score;best=i;}
 }
 brain.recentBlades.push(best);if(brain.recentBlades.length>5)brain.recentBlades.shift();return best;
}
export function chooseSwordAction(situation,target){
 const p=situation.profiles.find(x=>x.player.id===target?.id);
 return p&&(p.distance<4.2&&p.speed<.2)?'combo':'wave';
}
