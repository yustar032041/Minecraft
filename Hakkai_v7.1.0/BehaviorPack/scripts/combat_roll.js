import {EntityDamageCause,GameMode,InputPermissionCategory} from '@minecraft/server';
// 24 blocks is eight times the previous three-block safety horizon. This is a
// target distance, not a promise about Bedrock physics or interrupted rolls.
const DOUBLE_TAP=9,COST=10,INVULNERABLE=10,DISTANCE=24,PER_TICK=2.4,SAMPLE=.3;
const ATTACKS=new Set([EntityDamageCause.entityAttack,EntityDamageCause.projectile,
 EntityDamageCause.entityExplosion,EntityDamageCause.magic,EntityDamageCause.sonicBoom,
 EntityDamageCause.ramAttack,EntityDamageCause.maceSmash].filter(x=>typeof x==='string'));

// These are deliberately conservative full-footprint checks. No point in the
// footprint may be over a drop; incomplete blocks are governed by safe().
function footprint(pos,fn){
 for(const dx of [-.28,0,.28])for(const dz of [-.28,0,.28])if(!fn({x:pos.x+dx,y:pos.y,z:pos.z+dz}))return false;
 return true;
}
function supported(d,pos,safe){return footprint(pos,p=>d.isChunkLoaded(p)&&safe(d,p));}
function clearBody(d,pos){
 return footprint(pos,p=>{
  for(const dy of [0,1]){const at={x:p.x,y:p.y+dy,z:p.z};if(!d.isChunkLoaded(at)||!d.getBlock(at)?.isAir)return false;}
  return true;
 });
}
// Plan no more than 2.4 blocks, sample every .3 and never move down. Step up
// only when the entire transition has headroom and lower or upper support,
// and the final footprint is fully supported at the raised height.
export function planRollSegment(d,start,dir,distance,safe){
 let pos={...start},travel=0;
 if(!supported(d,pos,safe))return undefined;
 while(travel+1e-6<distance){
  const step=Math.min(SAMPLE,distance-travel),next={x:pos.x+dir.x*step,y:pos.y,z:pos.z+dir.z*step};
  if(supported(d,next,safe)){pos=next;travel+=step;continue;}
  // Check the old location's extra headroom before lifting the body.
  if(!clearBody(d,{...pos,y:pos.y+1}))break;
  let climbed;
  for(let delta=step;delta<=1.20001&&travel+delta<=distance+1e-6;delta+=SAMPLE){
   const high={x:pos.x+dir.x*delta,y:pos.y+1,z:pos.z+dir.z*delta};
   if(!clearBody(d,high)||!footprint(high,p=>{
    const lower={...p,y:p.y-1};return d.isChunkLoaded(p)&&(safe(d,p)||safe(d,lower));
   }))break;
   if(supported(d,high,safe)){climbed={high,delta};break;}
  }
  if(!climbed)break;
  pos=climbed.high;travel+=climbed.delta;
 }
 return travel>0?{pos,travel}:undefined;
}
export function setupCombatRoll({notice,safe}){
 const entries=new Map();
 function move(p,e){
  try{
   const m=e.motion;if(!m||!p.isValid||p.dimension.id!==e.dimension)return false;
   const segment=planRollSegment(p.dimension,p.location,m.dir,Math.min(PER_TICK,m.remaining),safe);
   if(!segment){e.motion=undefined;try{p.clearVelocity();}catch{}return false;}
   // Stop residual horizontal and vertical momentum before the checked move.
   // A rejected teleport never advances the planned distance.
   p.clearVelocity();
   if(!p.tryTeleport(segment.pos,{checkForBlocks:true})){e.motion=undefined;return false;}
   m.remaining-=segment.travel;if(m.remaining<1e-5)e.motion=undefined;
   return true;
  }catch{e.motion=undefined;return false;}
 }
 function tick(p,s,t){
  let e=entries.get(p.id);
  if(!e){e={down:false,first:undefined,until:0,dimension:p.dimension.id};entries.set(p.id,e);}
  if(e.dimension!==p.dimension.id){entries.delete(p.id);return;}
  let forward;
  try{
   if(!p.isValid||p.typeId!=='minecraft:player'||!p.isSneaking||s.menu||s.busy||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||
      p.isSwimming||p.isGliding||p.isFlying||p.getComponent('minecraft:riding')){
    e.down=false;e.first=undefined;e.motion=undefined;return;
   }
   if(!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.LateralMovement)||
      !p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.MoveForward)){
    e.down=false;e.first=undefined;e.motion=undefined;return;
   }
   if(e.motion)move(p,e);
   const input=p.inputInfo.getMovementVector();
   if(!Number.isFinite(input.x)||!Number.isFinite(input.y)){e.down=false;e.first=undefined;return;}
   forward=input.y>.6&&Math.abs(input.x)<.7;
  }catch{e.down=false;e.first=undefined;e.motion=undefined;return;}
  if(!forward){e.down=false;return;}
  if(e.down)return;e.down=true;
  if(e.first===undefined||t-e.first>DOUBLE_TAP){e.first=t;return;}
  e.first=undefined;
  // The action is ground-based; motion already in progress may briefly appear
  // airborne when traversing an upward step. No cooldown or speed restriction.
  if(!p.isOnGround&&!e.motion)return;
  if(p.getGameMode()!==GameMode.Creative&&s.s<COST){notice(p,'§e回避に必要なスタミナが足りない',35);return;}
  try{
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z),at=p.location,d=p.dimension;
   if(n<.01||![n,at.x,at.y,at.z].every(Number.isFinite))return;
   const x=view.x/n,z=view.z/n;
   e.motion={dir:{x,z},remaining:DISTANCE};
   if(!move(p,e)){notice(p,'§e前方の足場や空間を確認してください',35);return;}
   if(p.getGameMode()!==GameMode.Creative)s.s-=COST;e.until=t+INVULNERABLE;
   try{p.playAnimation('animation.hakkai.dodge_roll',{blendOutTime:.12,stopExpression:'query.any_animation_finished'});}catch{}
   try{p.playSound('random.orb',{volume:.22,pitch:1.25});}catch{}
   for(let i=0;i<8;i++)try{const a=i*Math.PI/4;d.spawnParticle('hakkai:wind_trace',{x:at.x+Math.cos(a)*.5,y:at.y+.3,z:at.z+Math.sin(a)*.5});}catch{}
  }catch{e.motion=undefined;}
 }
 function evading(p,t){
  const e=entries.get(p?.id);
  return !!(e&&p?.isValid&&p.typeId==='minecraft:player'&&p.dimension.id===e.dimension&&[GameMode.Survival,GameMode.Creative].includes(p.getGameMode())&&t<e.until);
 }
 function blocks(p,source,t){return ATTACKS.has(source?.cause)&&evading(p,t);}
 function status(p,t){const e=entries.get(p.id);return e&&e.dimension===p.dimension.id&&t<e.until?'§bロール回避中':'';}
 function clear(id){entries.delete(id);}
 return {tick,evading,blocks,status,clear};
}
