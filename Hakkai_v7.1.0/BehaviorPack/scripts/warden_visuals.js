// Cosmetic-only, bounded effects. Warning boundaries and damage are owned by
// warden_boss.js; visual/API failures must never change the fight's outcome.
const PARTICLES=['hakkai:warden_time','hakkai:warden_sky','hakkai:warden_earth','hakkai:warden_thunder','hakkai:warden_moon'];
const STRIKES=['animation.hakkai.warden_slash','animation.hakkai.warden_sky_cast','animation.hakkai.warden_slam','animation.hakkai.warden_thunder_cast','animation.hakkai.warden_moon_cast'];
function point(d,id,p){try{d.spawnParticle(id,p);}catch{}}
function animation(e,id){try{e.playAnimation(id,{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}}
function ring(d,id,center,radius,y,count,offset=0){
 for(let i=0;i<count;i++){const a=offset+i*2*Math.PI/count;point(d,id,{x:center.x+Math.cos(a)*radius,y:center.y+y,z:center.z+Math.sin(a)*radius});}
}
export function wardenTransition(e,phase){
 try{
  const id=PARTICLES[phase],loc=e.location,d=e.dimension;
  animation(e,'animation.hakkai.warden_transform');
  for(let h=0;h<3;h++)ring(d,id,loc,1.4+h*.3,1+h*1.25,12,h*.25);
 }catch{}
}
export function wardenCharge(e,phase,step=0){
 try{
  const id=PARTICLES[phase],loc=e.location,d=e.dimension;
  // Converging elevated rings sit above the ground-level warning outline.
  ring(d,id,loc,2.1-step*.35,3+step*.2,12,step*.35);
  if(step===0)animation(e,'animation.hakkai.warden_warning');
 }catch{}
}
export function wardenStrikePose(e,phase){animation(e,STRIKES[phase]);}
export function wardenImpact(e,aim,attack,phase,inWarning){
 try{
  const id=PARTICLES[phase],d=e.dimension;
  wardenStrikePose(e,phase);
  // Sample only the existing damage footprint, never add a new hitbox.
  // Fixed budget: at most 36 floor points + 12 accents + 24 signature points.
  const extent=attack.shape==='twin'?attack.offset+attack.radius:attack.radius;
  const grid=7,candidates=[];
  for(let x=0;x<grid;x++)for(let z=0;z<grid;z++){
   const p={x:aim.x+(x/(grid-1)*2-1)*extent,y:aim.y,z:aim.z+(z/(grid-1)*2-1)*extent};
   if(inWarning(p,aim,attack))candidates.push(p);
  }
  // Narrow lines can fall between samples; their centre always lies inside.
  if(!candidates.length&&inWarning(aim,aim,attack))candidates.push({...aim});
  const stride=Math.max(1,Math.ceil(candidates.length/36));
  for(let i=0;i<candidates.length;i+=stride){const p=candidates[i];point(d,id,{...p,y:p.y+.8});}
  // For the final judgement, a visible moonlight column rises from its centre.
  const anchors=candidates.filter((_,i)=>i%Math.max(1,Math.ceil(candidates.length/12))===0).slice(0,12);
  for(const p of anchors)point(d,id,{...p,y:p.y+1.8});
  const centre=inWarning(aim,aim,attack)?aim:candidates[Math.floor(candidates.length/2)];
  if(!centre)return;
  // Signature forms are cosmetic only and stay inside the marked footprint.
  // Slash arc, sky spiral, earth columns, lightning zigzag, moon pillar.
  for(let i=0;i<24;i++){
   let x=centre.x,z=centre.z,y=aim.y+1;
   if(phase===0){const a=-1.5+i/23*3;x+=Math.cos(a)*1.1;z+=Math.sin(a)*1.1;y+=i/23*1.7;}
   else if(phase===1){const a=i*Math.PI/4;x+=Math.cos(a)*.65;z+=Math.sin(a)*.65;y+=i*.12;}
   else if(phase===2){const c=anchors[Math.floor(i/4)%anchors.length]??centre;x=c.x;z=c.z;y+=(i%4)*.55;}
   else if(phase===3){x+=(i%4-1.5)*.18;z+=(i%3-1)*.18;y+=i*.17;}
   else {const a=i*Math.PI/4,r=attack.totemWard ? .75 : .45;x+=Math.cos(a)*r;z+=Math.sin(a)*r;y+=i*.13;}
   const floor={x,y:aim.y,z};if(inWarning(floor,aim,attack))point(d,id,{x,y,z});
  }
 }catch{}
}
export function wardenParried(e,phase){
 try{animation(e,'animation.hakkai.warden_recoil');ring(e.dimension,PARTICLES[phase],e.location,1.4,2.5,12);}catch{}
}

// Bounded and cosmetic: winged flight also leaves a short ring of sparks.
export function wardenFlightAura(e,phase){
 try{ring(e.dimension,PARTICLES[phase],e.location,1.2,.5,8);}catch{}
}
