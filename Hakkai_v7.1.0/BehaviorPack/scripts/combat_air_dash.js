import {GameMode,InputPermissionCategory} from '@minecraft/server';
// One dash per airtime. Bedrock collision handles obstacles; only loaded
// nearby chunks are required. A successful dash arms one landing fall block.
const DOUBLE_TAP=9,COST=15,IMPULSE=1.50;
export function setupAirDash({notice}){
 const entries=new Map();
 function tick(p,s,t){
  let e=entries.get(p.id);
  if(!e){e={dim:p.dimension.id,used:!p.isOnGround,neutral:false,down:false,first:undefined};entries.set(p.id,e);}
  if(e.dim!==p.dimension.id){entries.delete(p.id);return;}
  try{
   if(p.isOnGround){if(e.protected&&e.landed===undefined)e.landed=t;if(e.landed!==undefined&&t-e.landed>5){e.protected=false;e.landed=undefined;}e.used=false;e.neutral=false;e.down=false;e.first=undefined;return;}
   if(e.landed!==undefined){e.protected=false;e.landed=undefined;}
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
   if(![v.x,v.y,v.z,n,at.x,at.y,at.z].every(Number.isFinite)||n<.01)return;
   const x=look.x/n,z=look.z/n;
   if(!d.isChunkLoaded(at)||!d.isChunkLoaded({x:at.x+x*2,y:at.y,z:at.z+z*2})){notice(p,'§e前方が読み込まれていません',35);return;}
   p.applyImpulse({x:x*IMPULSE,y:0,z:z*IMPULSE});
   if(p.getGameMode()!==GameMode.Creative)s.s-=COST;e.used=true;e.protected=true;e.landed=undefined;
   try{p.playAnimation('animation.hakkai.air_dash',{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.orb',{volume:.24,pitch:1.4});}catch{}
   for(let i=0;i<10;i++)try{const u=i/10;d.spawnParticle('hakkai:wind_trace',{x:at.x-x*u,y:at.y+.5+u*.4,z:at.z-z*u});}catch{}
  }catch{e.neutral=false;e.down=false;e.first=undefined;}
 }
 function blocksFall(p,t){
  try{const e=entries.get(p?.id);if(!e?.protected||!p.isValid||p.dimension.id!==e.dim||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||e.landed!==undefined&&t-e.landed>5)return false;e.protected=false;e.landed=undefined;return true;}catch{return false;}
 }
 function status(p){const e=entries.get(p.id);return e?.used&&!p.isOnGround?'§7着地で空中ダッシュ回復':'';}
 function clear(id){entries.delete(id);}
 return {tick,blocksFall,status,clear};
}
