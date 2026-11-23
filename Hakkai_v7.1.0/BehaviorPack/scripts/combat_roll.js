import {EntityDamageCause,GameMode,InputPermissionCategory} from '@minecraft/server';
// Movement input is sampled each tick. A new forward press after a release is
// required; keeping the stick held can never repeatedly trigger a roll.
const DOUBLE_TAP=9, COST=10, INVULNERABLE=10, COOLDOWN=24;
const ATTACKS=new Set([EntityDamageCause.entityAttack,EntityDamageCause.projectile,
 EntityDamageCause.entityExplosion,EntityDamageCause.magic,EntityDamageCause.sonicBoom,
 EntityDamageCause.ramAttack,EntityDamageCause.maceSmash].filter(x=>typeof x==='string'));
export function setupCombatRoll({notice,safe}){
 const entries=new Map();
 function tick(p,s,t){
  let e=entries.get(p.id);
  if(!e){e={down:false,first:undefined,until:0,cooldown:0,dimension:p.dimension.id};entries.set(p.id,e);}
  if(e.dimension!==p.dimension.id){entries.delete(p.id);return;}
  let forward;
  try{
   if(!p.isValid||!p.isSneaking||s.menu||s.busy||p.getGameMode()!==GameMode.Survival||
      p.isSwimming||p.isGliding||p.isFlying||!p.isOnGround||p.getComponent('minecraft:riding')){
    e.down=false;e.first=undefined;return;
   }
   // Raw input remains observable while movement is disabled; do not bypass
   // an adventure map's input restrictions.
   if(!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.LateralMovement)||
      !p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.MoveForward)){
    e.down=false;e.first=undefined;return;
   }
   const input=p.inputInfo.getMovementVector();
   if(!Number.isFinite(input.x)||!Number.isFinite(input.y)){e.down=false;e.first=undefined;return;}
   forward=input.y>.6&&Math.abs(input.x)<.7;
  }catch{e.down=false;e.first=undefined;return;}
  if(!forward){e.down=false;return;}
  if(e.down)return;e.down=true;
  if(e.first===undefined||t-e.first>DOUBLE_TAP){e.first=t;return;}
  e.first=undefined;
  if(t<e.cooldown)return;
  if(s.s<COST){notice(p,'§e回避に必要なスタミナが足りない',35);return;}
  try{
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z),v=p.getVelocity();
   if(n<.01||![n,v.x,v.z].every(Number.isFinite)||Math.hypot(v.x,v.z)>.24){notice(p,'§e安全に回避できる場所で使ってね',35);return;}
   const x=view.x/n,z=view.z/n,at=p.location,d=p.dimension;
   // Conservative preflight on the center and sides, without teleporting or
   // modifying terrain. Bedrock physics still decides the actual trajectory.
   for(let step=0;step<=3;step+=.5)for(const side of [-.28,0,.28]){
    const point={x:at.x+x*step-z*side,y:at.y,z:at.z+z*step+x*side};
    if(!d.isChunkLoaded(point)||!safe(d,point)){notice(p,'§e前方に安全な平地が必要です',35);return;}
   }
   p.applyImpulse({x:x*.38,y:0,z:z*.38});
   s.s-=COST;e.until=t+INVULNERABLE;e.cooldown=t+COOLDOWN;
   try{p.playAnimation('animation.hakkai.dodge_roll',{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.orb',{volume:.22,pitch:1.25});}catch{}
   for(let i=0;i<8;i++)try{const a=i*Math.PI/4;d.spawnParticle('hakkai:wind_trace',{x:at.x+Math.cos(a)*.5,y:at.y+.3,z:at.z+Math.sin(a)*.5});}catch{}
  }catch{} // Failed preflight or impulse never costs stamina or grants immunity.
 }
 function evading(p,t){
  const e=entries.get(p?.id);
  return !!(e&&p?.isValid&&p.typeId==='minecraft:player'&&p.dimension.id===e.dimension&&p.getGameMode()===GameMode.Survival&&t<e.until);
 }
 function blocks(p,source,t){return ATTACKS.has(source?.cause)&&evading(p,t);}
 function status(p,t){
  const e=entries.get(p.id);if(!e||e.dimension!==p.dimension.id)return '';
  if(t<e.until)return '§bロール回避中';
  return t<e.cooldown?`§7回避再使用 ${Math.ceil((e.cooldown-t)/20)}秒`:'';
 }
 function clear(id){entries.delete(id);}
 return {tick,evading,blocks,status,clear};
}
