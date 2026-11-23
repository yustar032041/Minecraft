import {GameMode,InputPermissionCategory} from '@minecraft/server';
// A conservative, once-per-airtime horizontal impulse. Unlike the ground
// roll this is not a dodge and has no invulnerability or fall protection.
const DOUBLE_TAP=9,COST=15,IMPULSE=.30;
export function setupAirDash({notice}){
 const entries=new Map();
 function tick(p,s,t){
  let e=entries.get(p.id);
  if(!e){e={dim:p.dimension.id,used:!p.isOnGround,neutral:false,down:false,first:undefined};entries.set(p.id,e);}
  if(e.dim!==p.dimension.id){entries.delete(p.id);return;}
  try{
   if(p.isOnGround){e.used=false;e.neutral=false;e.down=false;e.first=undefined;return;}
   if(!p.isValid||p.typeId!=='minecraft:player'||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||p.isSwimming||p.isGliding||p.isFlying||p.isSneaking||s.busy||s.menu||p.getComponent('minecraft:riding')||
      !p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.LateralMovement)||!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.MoveForward)){
    e.neutral=false;e.down=false;e.first=undefined;return;
   }
   const input=p.inputInfo.getMovementVector();
   if(!Number.isFinite(input.x)||!Number.isFinite(input.y)){e.neutral=false;e.down=false;e.first=undefined;return;}
   const forward=input.y>.6&&Math.abs(input.x)<.7;
   if(!forward){e.neutral=true;e.down=false;return;}
   if(!e.neutral||e.down)return;
   e.down=true;
   if(e.first===undefined||t-e.first>DOUBLE_TAP){e.first=t;return;}
   e.first=undefined;
   if(e.used)return;
   if(p.getGameMode()!==GameMode.Creative&&s.s<COST){notice(p,'§e空中ダッシュにはスタミナ15が必要',35);return;}
   const v=p.getVelocity(),look=p.getViewDirection(),n=Math.hypot(look.x,look.z),at=p.location,d=p.dimension;
   if(![v.x,v.y,v.z,n,at.x,at.y,at.z].every(Number.isFinite)||n<.01||Math.hypot(v.x,v.z)>.4){notice(p,'§e安全にダッシュできない速度です',35);return;}
   const x=look.x/n,z=look.z/n;
   for(let step=0;step<=3;step+=.5)for(const side of [-.28,0,.28])for(const height of [0,.9,1.7]){
    const pos={x:at.x+x*step-z*side,y:at.y+height,z:at.z+z*step+x*side};
    if(!d.isChunkLoaded(pos)||!d.getBlock(pos)?.isAir){notice(p,'§e前方に十分な空間が必要です',35);return;}
   }
   p.applyImpulse({x:x*IMPULSE,y:0,z:z*IMPULSE});
   if(p.getGameMode()!==GameMode.Creative)s.s-=COST;e.used=true;
   try{p.playAnimation('animation.hakkai.air_dash',{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.orb',{volume:.24,pitch:1.4});}catch{}
   for(let i=0;i<10;i++)try{const u=i/10;d.spawnParticle('hakkai:wind_trace',{x:at.x-x*u,y:at.y+.5+u*.4,z:at.z-z*u});}catch{}
  }catch{e.neutral=false;e.down=false;e.first=undefined;}
 }
 function status(p){const e=entries.get(p.id);return e?.used&&!p.isOnGround?'§7着地で空中ダッシュ回復':'';}
 function clear(id){entries.delete(id);}
 return {tick,status,clear};
}
