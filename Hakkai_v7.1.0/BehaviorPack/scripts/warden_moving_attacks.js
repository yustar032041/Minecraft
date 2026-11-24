// Scripted moving fronts, not engine projectile entities. Each displayed frame
// and its damage use the same fixed arena geometry, with no timers/catch-up.
export const WARDEN_MOVING=[
 [
  {attack:'時環の追い波',motion:'wave',shape:'circle',radius:6,damage:7,effect:'slowness'},
  {attack:'時の直進斬',motion:'bolt',shape:'line',radius:7,width:.9,damage:9,effect:'weakness'},
  {attack:'三筋の時弾',motion:'barrage',shape:'lanes',radius:7,width:.7,offset:2.5,damage:8,effect:'slowness'}
 ],[
  {attack:'天空の拡散波',motion:'wave',shape:'circle',radius:7,damage:9,effect:'slow_falling'},
  {attack:'天空の光弾',motion:'bolt',shape:'line',radius:8,width:.9,damage:11,effect:'weakness'},
  {attack:'空の三連弾幕',motion:'barrage',shape:'lanes',radius:8,width:.7,offset:2.5,damage:9,effect:'slow_falling'}
 ],[
  {attack:'大地を走る震波',motion:'wave',shape:'circle',radius:7,damage:11,effect:'slowness'},
  {attack:'岩脈の突進',motion:'bolt',shape:'line',radius:8,width:.9,damage:13,effect:'slowness'},
  {attack:'三条の地走り',motion:'barrage',shape:'lanes',radius:8,width:.7,offset:2.5,damage:11,effect:'weakness'}
 ],[
  {attack:'雷環の拡散',motion:'wave',shape:'circle',radius:7,damage:12,effect:'weakness'},
  {attack:'走る雷光',motion:'bolt',shape:'line',radius:9,width:.9,damage:15,effect:'weakness'},
  {attack:'三条の雷弾',motion:'barrage',shape:'lanes',radius:9,width:.7,offset:2.5,damage:13,effect:'blindness'}
 ],[
  {attack:'終刻の光輪',motion:'wave',shape:'circle',radius:8,damage:14,effect:'blindness'},
  {attack:'月光の直進弾',motion:'bolt',shape:'line',radius:9,width:.9,damage:17,effect:'weakness'},
  {attack:'三条の終刻弾',motion:'barrage',shape:'lanes',radius:9,width:.7,offset:2.5,damage:15,effect:'slowness'}
 ]
];
const IDS=['hakkai:warden_front_time','hakkai:warden_front_sky','hakkai:warden_front_earth','hakkai:warden_front_thunder','hakkai:warden_front_moon'];
const FRAMES=16,HEIGHT=1,HEIGHT_LIMIT=1.6;
function clearRay(d,from,to,cache){
 const loaded=p=>{
  const key=`${Math.floor(p.x/16)}:${Math.floor(p.z/16)}`;
  if(!cache.chunks.has(key))cache.chunks.set(key,d.isChunkLoaded(p));
  return cache.chunks.get(key);
 };
 const air=p=>{
  const key=`${Math.floor(p.x)}:${Math.floor(p.y)}:${Math.floor(p.z)}`;
  if(!cache.starts.has(key))cache.starts.set(key,!!d.getBlock(p)?.isAir);
  return cache.starts.get(key);
 };
 try{
  if(!loaded(from)||!loaded(to))return false;
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,n=Math.hypot(dx,dy,dz);
  if(!air(from))return false;
  if(n<.01)return true;
  for(let i=1;i<n;i++)if(!loaded({x:from.x+dx*i/n,y:from.y+dy*i/n,z:from.z+dz*i/n}))return false;
  return !d.getBlockFromRay(from,{x:dx/n,y:dy/n,z:dz/n},{maxDistance:n});
 }catch{return false;}
}
function laneOffsets(attack){return attack.motion==='barrage'?[-attack.offset,0,attack.offset]:[0];}
export function startMoving(aim,attack,phase,warned,t){
 return {aim:{...aim},attack,phase,warned:[...warned],hit:new Set(),frame:0,next:t+1};
}
// Returns {done,targets}. Visual failure or blocked/unloaded paths end the
// entire move before applying damage. Call only once per exact next tick.
export function advanceMoving(d,m,t,players){
 if(t!==m.next)return {done:true,targets:[]};
 const {aim,attack,phase,frame}=m,prev=frame/FRAMES,next=(frame+1)/FRAMES,points=[],origins=[];
 const y=aim.y+HEIGHT,cache={chunks:new Map(),starts:new Map()},centre={x:aim.x,y,z:aim.z};
 const add=(x,z,origin)=>{points.push({x,y,z});origins.push(origin);};
 const progress=attack.reverse?1-next:next,lo=attack.reverse?1-next:prev,hi=attack.reverse?1-prev:next;
 let collision;
 if(attack.motion==='wave'||attack.motion==='twinwave'){
  const centres=attack.motion==='twinwave'?[-attack.offset,attack.offset]:[0];
  const r=Math.min(attack.radius*progress,attack.radius-1e-7),count=attack.motion==='twinwave'?20:40;
  for(const offset of centres){
   const origin={x:aim.x+offset,y,z:aim.z};
   for(let i=0;i<count;i++){const a=i*Math.PI*2/count;add(origin.x+Math.cos(a)*r,origin.z+Math.sin(a)*r,origin);}
  }
  collision=pos=>{
   for(const offset of centres){
    const origin={x:aim.x+offset,y,z:aim.z},r=Math.hypot(pos.x-origin.x,pos.z-origin.z);
    if(r>=attack.radius*lo-.28&&r<=attack.radius*hi+.28&&r<=attack.radius)return origin;
   }
  };
 }else if(attack.motion==='bolt'||attack.motion==='barrage'){
  const z0=-attack.radius+2*attack.radius*prev,z1=-attack.radius+2*attack.radius*next;
  const axis0=attack.reverse?-z0:z0,axis1=attack.reverse?-z1:z1,start=attack.reverse?attack.radius:-attack.radius;
  const xy=(along,side)=>attack.axis==='x'?{x:aim.x+along,y,z:aim.z+side}:{x:aim.x+side,y,z:aim.z+along};
  for(const lane of laneOffsets(attack))for(const along of [axis0,axis1])for(const dx of [-attack.width*.99,0,attack.width*.99]){
   const point=xy(along,lane+dx),origin=xy(start,lane+dx);add(point.x,point.z,origin);
  }
  collision=pos=>{
   const along=attack.axis==='x'?pos.x-aim.x:pos.z-aim.z,side=attack.axis==='x'?pos.z-aim.z:pos.x-aim.x;
   const lane=laneOffsets(attack).find(n=>Math.abs(side-n)<=attack.width);
   if(lane!==undefined&&along>=Math.max(-attack.radius,Math.min(axis0,axis1)-.18)&&along<=Math.min(attack.radius,Math.max(axis0,axis1)+.18))return xy(start,side);
  };
 }else if(attack.motion==='cross'){
  for(const distance of [attack.radius*lo,Math.min(attack.radius*hi,attack.radius-1e-7)])for(const side of [-attack.width*.99,0,attack.width*.99])for(const sign of [-1,1]){
   add(aim.x+sign*distance,aim.z+side,centre);add(aim.x+side,aim.z+sign*distance,centre);
  }
  collision=pos=>{
   const x=Math.abs(pos.x-aim.x),z=Math.abs(pos.z-aim.z),low=attack.radius*lo-.18,high=attack.radius*hi+.18;
   if((z<=attack.width&&x>=low&&x<=Math.min(attack.radius,high))||(x<=attack.width&&z>=low&&z<=Math.min(attack.radius,high)))return centre;
  };
 }else if(attack.motion==='sweep'){
  const direction=attack.reverse?-1:1,angles=[prev,(prev+next)/2,next].map(v=>v*2*Math.PI*direction);
  const steps=Math.ceil(attack.radius/.65);
  for(const a of angles)for(let i=0;i<=steps;i++){
   const r=(attack.radius-1e-7)*i/steps;add(aim.x+Math.cos(a)*r,aim.z+Math.sin(a)*r,centre);
  }
  collision=pos=>{
   const x=pos.x-aim.x,z=pos.z-aim.z;if(Math.hypot(x,z)>attack.radius)return;
   for(const a of angles){
    const along=Math.max(0,Math.min(attack.radius,x*Math.cos(a)+z*Math.sin(a)));
    if(Math.hypot(x-along*Math.cos(a),z-along*Math.sin(a))<=attack.width)return centre;
   }
  };
 }else if(attack.motion==='zones'){
  const n=Math.min(2,Math.floor(frame*3/FRAMES)),offset=(attack.reverse?1-n:n-1)*attack.offset,origin={x:aim.x+offset,y,z:aim.z};
  add(origin.x,origin.z,origin);
  for(const scale of [.5,1])for(let i=0;i<12;i++){
   const a=i*Math.PI/6,r=(attack.radius-1e-7)*scale;add(origin.x+Math.cos(a)*r,origin.z+Math.sin(a)*r,origin);
  }
  collision=pos=>Math.hypot(pos.x-origin.x,pos.z-origin.z)<=attack.radius?origin:undefined;
 }else return {done:true,targets:[]}; // Unknown movement is never damaging.
 // Clip individual rays, not the entire front: a single wall or unloaded
 // edge used to erase every moving attack, even on the unobstructed side.
 // No visible rays or a particle/API failure still cancels safely.
 const visible=[];
 for(let i=0;i<points.length;i++)if(clearRay(d,origins[i],points[i],cache))visible.push(points[i]);
 if(!visible.length)return {done:true,targets:[]};
 try{for(const point of visible)d.spawnParticle(IDS[phase],point);}catch{return {done:true,targets:[]};}
 const targets=[];
 for(const p of players){
  if(m.hit.has(p.id))continue;
  const pos=p.location;if(Math.abs(pos.y-aim.y)>HEIGHT_LIMIT)continue;
  const origin=collision(pos);
  if(origin&&visible.some(point=>Math.hypot(point.x-pos.x,point.z-pos.z)<=1.5)&&clearRay(d,origin,{x:pos.x,y,z:pos.z},cache))targets.push(p);
 }
 m.frame++;m.next=t+1;
 return {done:m.frame>=FRAMES,targets};
}
