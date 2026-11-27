// Seven distinct burst talents: emitted from the creature at release, fixed
// after launch, and expanded one short interval per tick. Not homing and not
// a floor marker. The same angular shape and terrain checks draw and hit.
import {guardianDirection,guardianShapeContains,guardianClearDistance} from './guardian_attacks.js';
export const BURST_DESIGNS=Object.freeze({
 foe_0_10:'cross',    // 旋刃: four cutting fronts
 foe_2_10:'wide',     // 焦熱: wide sand plume
 foe_3_10:'wedge',    // 雪崩: forward avalanche
 foe_4_8:'line',      // 鋼角: concentrated lightning
 foe_5_10:'circle',   // 響き: outward reverberation
 foe_6_8:'side',      // 翼侯: wing sweeps on either side
 foe_7_11:'diagonal'  // 逆行: four diagonal time traces
});
const PALETTE=['wind','spore','sand','frost','spark','shadow','wind','time'],SPEED=.65,HEIGHT=1.5;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
export function startBurstWave(origin,aim,profile,t){
 const shape=BURST_DESIGNS[profile?.id],radius=4+profile?.variant;
 if(!shape||!finite(origin)||!finite(aim)||!Number.isFinite(t)||!Number.isFinite(radius)||radius<=0||radius>8||!PALETTE[profile.realm])return undefined;
 return {origin:{...origin},direction:guardianDirection(aim.x-origin.x,aim.z-origin.z),shape,realm:profile.realm,radius,last:0,next:t+1,hit:new Set()};
}
export function advanceBurstWave(d,w,t){
 if(!d||!w||w.next!==t)return {done:true,contacts:[]};
 try{
  const origin=w.origin,dir=w.direction,center={x:origin.x,y:origin.y+.8,z:origin.z};
  if(!d.isChunkLoaded(center)||!d.getBlock(center)?.isAir)return {done:true,contacts:[]};
  const r=Math.min(w.radius,w.last+SPEED),count=Math.max(16,Math.min(64,Math.ceil(2*Math.PI*r/.65)));
  for(let i=0;i<count;i++){
   const a=2*Math.PI*i/count,x=Math.cos(a),z=Math.sin(a),forward=x*dir.x+z*dir.z,side=-x*dir.z+z*dir.x;
   if(!guardianShapeContains(w.shape,forward,side))continue;
   for(const height of [.8-HEIGHT,.8,.8+HEIGHT]){
    if(guardianClearDistance(d,origin,x,z,r,height)<r-.001)continue;
    try{d.spawnParticle(`hakkai:shot_${PALETTE[w.realm]}`,{x:origin.x+x*r,y:origin.y+height,z:origin.z+z*r});}catch{}
   }
  }
  const contacts=[];
  for(const p of d.getPlayers({location:origin,maxDistance:Math.hypot(r,HEIGHT)+.01}))try{
   if(!p?.isValid||!p.id||w.hit.has(p.id)||!finite(p.location))continue;
   const point={...p.location},x=point.x-origin.x,z=point.z-origin.z,n=Math.hypot(x,z);
   if(Math.abs(point.y-origin.y)>HEIGHT||n>w.radius+1e-6||n>r+1e-6||n+1e-6<w.last)continue;
   if(!guardianShapeContains(w.shape,x*dir.x+z*dir.z,-x*dir.z+z*dir.x))continue;
   if(n>.001){if(guardianClearDistance(d,origin,x/n,z/n,n,point.y-origin.y+.8)<n-.001)continue;}
   else {const at={x:origin.x,y:point.y+.8,z:origin.z};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir)continue;}
   w.hit.add(p.id);contacts.push({player:p,position:point});
  }catch{}
  w.last=r;w.next=t+1;return {done:r>=w.radius,contacts};
 }catch{return {done:true,contacts:[]};}
}
