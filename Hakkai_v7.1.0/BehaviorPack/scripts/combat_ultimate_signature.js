// Bounded, procedural signatures for each add-on weapon. No timers, terrain
// changes or damage occur here. Art variation does not imply 105 hand-authored
// skills; the underlying combat roles are the eight weapon classes.
const particles=['shot_wind','shot_wind','shot_spark','shot_sand','shot_spark','shot_frost','shot_shadow','shot_time','shot_frost','shot_time','shot_spore','shot_frost','shot_sand','shot_spore','shot_wind','shot_wind','shot_shadow','shot_spark','shot_spore','shot_frost'];
const role={剣:{damage:25,push:1.1,effect:'weakness'},斧:{damage:30,push:1.4,effect:'weakness'},弓:{damage:27,push:.5,effect:'slowness'},杖:{damage:23,push:.4,effect:'weakness'},ハンマー:{damage:28,push:1.5,effect:'slowness'},槍:{damage:27,push:.7,effect:'slowness'},盾:{damage:20,push:1.3,self:'resistance'},扇:{damage:22,push:1.1,effect:'slowness'}};
export function ultimateSignature(g){
 let hash=2166136261;for(const c of String(g.id??'')){hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;}
 const n=Number.isInteger(g.wardenBlade)&&g.wardenBlade>=0&&g.wardenBlade<8?200+g.wardenBlade:g.id==='ult_sword'?198:g.id==='ult_axe'?199:Number(/^gear_(\d{3})$/.exec(g.id??'')?.[1]??hash%197);
 const a=Number.isInteger(g.a)&&g.a>=0&&g.a<particles.length?g.a:0;
 const rank=Number.isFinite(g.rank)?Math.max(1,Math.min(3,Math.floor(g.rank))):1;
 const r=role[g.kind]??role['剣'];
 const blade=Number.isInteger(g.wardenBlade)&&g.wardenBlade>=0&&g.wardenBlade<8?g.wardenBlade:undefined;
 const bladeSelf=['speed','invisibility','resistance','absorption','strength','night_vision','slow_falling','haste'];
 return {...r,kind:g.kind,self:blade===undefined?r.self:bladeSelf[blade],damage:r.damage+rank*2+(n%3)-1,push:r.push+(n%4)*.08,particle:`hakkai:${particles[a]}`,form:n%4,phase:n*Math.PI/107,arms:2+n%3,radius:2+(n%13)*.06,serial:n};
}
// Positioning changes the effect of a successful ultimate: committed melee
// rewards close spacing, thrusts and projectiles reward maintaining distance.
// No multiplier uses the item's native attack damage; caps avoid huge spikes.
export function ultimateDamage(profile,origin,target){
 const dist=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z);
 if(!Number.isFinite(dist))return profile.damage;
 if(['剣','斧','ハンマー'].includes(profile.kind)&&dist<=3)return profile.damage+4;
 if(profile.kind==='槍'&&dist>=5)return profile.damage+5;
 if(['弓','杖'].includes(profile.kind)&&dist>=7)return profile.damage+5;
 return profile.damage;
}
export function ultimateShow(p,profile){
 // 48 single-particle emitters. Every weapon gets its own stable phase and
 // radius, element palette and one of four spatial forms; no world mutation.
 const base={...p.location},v=p.getViewDirection(),n=Math.hypot(v.x,v.z),fx=n>.001?v.x/n:0,fz=n>.001?v.z/n:1;
 if(!Number.isFinite(base.x)||!Number.isFinite(base.y)||!Number.isFinite(base.z)||!Number.isFinite(fx)||!Number.isFinite(fz))return;
 for(let i=0;i<48;i++){
  const u=i/47,a=profile.phase+u*Math.PI*2*profile.arms;let x,y,z;
  if(profile.form===0){const r=profile.radius*(.25+.75*u);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.25+2*u;}
  else if(profile.form===1){const r=profile.radius*(i%2?.65:1);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.5+(i%3)*.55;}
  else if(profile.form===2){const side=Math.sin(a)*profile.radius*.65,forward=.5+u*profile.radius*1.5;x=fx*forward-fz*side;z=fz*forward+fx*side;y=.35+Math.abs(Math.cos(a))*1.7;}
  else{const r=profile.radius*(.35+.65*Math.sin(u*Math.PI));x=Math.cos(a)*r;z=Math.sin(a)*r;y=.2+u*2.6;}
  try{p.dimension.spawnParticle(i%5===0?'hakkai:wind_burst':profile.particle,{x:base.x+x,y:base.y+y,z:base.z+z});}catch{}
 }
}
export function ultimateStatus(p,target,profile){
 // This is an optional short tactical effect. Protection, boss and damage
 // acceptance are checked by the caller; unsupported effects fail harmlessly.
 if(!profile.effect)return;
 try{const e=target.getEffect(profile.effect);if(e&&(e.amplifier>0||e.amplifier===0&&e.duration>=50))return;}catch{return;}
 try{target.addEffect(profile.effect,50,{amplifier:0,showParticles:false});}catch{}
}
export function ultimateSelf(p,profile){
 if(!profile.self)return;
 try{const e=p.getEffect(profile.self);if(e&&(e.amplifier>0||e.amplifier===0&&e.duration>=60))return;}catch{return;}
 try{p.addEffect(profile.self,60,{amplifier:0,showParticles:false});}catch{}
}
