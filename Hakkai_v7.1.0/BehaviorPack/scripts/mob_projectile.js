// Per-creature fixed paths. Every short segment is raycast and drawn together,
// with no homing or delayed-frame catch-up. Obstacles stop the visible shot.
import {advanceChiefMoon} from './fushi_moon_projectile.js';
import {attackPath,attackPathOffset} from './mob_attack_paths.js';
import {SHOT_SPEED} from './mob_shot_styles.js';
const PALETTE=Object.freeze({thorns:'impact',web:'spore',spore:'spore',frost:'frost',shock:'spark',time:'time',gust:'wind',mark:'time',leech:'shadow'});
const REALM=['wind','spore','sand','frost','spark','shadow','wind','time'];
export function mobProjectileParticle(profile){
 const kind=profile.talent==='web'||profile.talent==='traveler'?REALM[profile.realm]:PALETTE[profile.talent];
 return kind?`hakkai:shot_${kind}`:undefined;
}
export function startMobProjectile(source,aim,t,maximum,profile,branch=0){
 if(!source||!aim||![source.x,source.y,source.z,aim.x,aim.y,aim.z,t,maximum].every(Number.isFinite)||maximum<=0||maximum>32)return undefined;
 const path=attackPath(profile),speed=SHOT_SPEED[profile?.talent];if(!path||!speed||![-1,0,1].includes(branch))return undefined;
 const origin={x:source.x,y:source.y+.8,z:source.z},end={x:aim.x,y:aim.y+.8,z:aim.z};
 const dx=end.x-origin.x,dy=end.y-origin.y,dz=end.z-origin.z,n=Math.hypot(dx,dy,dz);
 if(n<.01)return undefined;
 const scale=Math.min(1,maximum/n),delta={x:dx*scale,y:dy*scale,z:dz*scale},length=n*scale;
 const h=Math.hypot(delta.x,delta.z),side=h>.001?{x:-delta.z/h,z:delta.x/h}:{x:1,z:0};
 return {origin,position:{...origin},delta,length,side,path,branch,frame:0,frames:Math.max(1,Math.ceil(length/speed)),next:t+1};
}
export function advanceMobProjectile(d,flight,t,sourceId,targetId,profile){
 const particle=mobProjectileParticle(profile);
 if(!particle||!flight||t!==flight.next||attackPath(profile)!==flight.path)return {done:true};
 const progress=(flight.frame+1)/flight.frames,offset=attackPathOffset(flight.path,progress,flight.length);
 if(!offset)return {done:true};
 const {origin,delta,side}=flight;
 const lateral=offset.side+flight.branch*Math.min(.45,flight.length*.12)*Math.sin(Math.PI*progress);
 const next={x:origin.x+delta.x*progress+side.x*lateral,y:origin.y+delta.y*progress+offset.up,z:origin.z+delta.z*progress+side.z*lateral};
 const dx=next.x-flight.position.x,dy=next.y-flight.position.y,dz=next.z-flight.position.z,n=Math.hypot(dx,dy,dz);
 if(!Number.isFinite(n)||n<.00001||n>2)return {done:true};
 // Slightly longer remaining distance distinguishes a clear single segment
 // from the shared raycaster's done-on-wall/entity/failure results.
 const segment={position:{...flight.position},direction:{x:dx/n,y:dy/n,z:dz/n},remaining:n+.0001,next:t};
 const result=advanceChiefMoon(d,segment,t,sourceId,targetId,particle,n);
 if(result.done)return result;
 flight.position=next;flight.frame++;flight.next=t+1;
 return {done:flight.frame>=flight.frames};
}
