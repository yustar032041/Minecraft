import {knownFullCube} from './full_cube_floor.js';
import {EntityDamageCause,GameMode,InputPermissionCategory} from '@minecraft/server';
// 30 blocks is the maximum checked target (previously 24). This is a
// target distance, not a promise about Bedrock physics or interrupted rolls.
const DOUBLE_TAP=9,COST=10,INVULNERABLE=10,COOLDOWN=5,DISTANCE=30,PER_TICK=3,SAMPLE=.1;
const ATTACKS=new Set([EntityDamageCause.entityAttack,EntityDamageCause.projectile,
 EntityDamageCause.entityExplosion,EntityDamageCause.magic,EntityDamageCause.sonicBoom,
 EntityDamageCause.ramAttack,EntityDamageCause.maceSmash].filter(x=>typeof x==='string'));

// These known contact hazards are excluded even when Bedrock reports them as
// non-solid. This is not an exhaustive list of every add-on's harmful block.
const BODY_HAZARDS=new Set(['minecraft:fire','minecraft:soul_fire','minecraft:campfire','minecraft:soul_campfire',
 'minecraft:sweet_berry_bush','minecraft:wither_rose','minecraft:powder_snow','minecraft:pointed_dripstone','minecraft:cactus']);
const FLOOR_HAZARDS=new Set([...BODY_HAZARDS,'minecraft:magma','minecraft:magma_block']);
// Explicit vanilla passable plants only; the stable API has no isSolid and
// non-air is not generally passable. Unknown custom/partial blocks stop the
// roll. Teleport still asks the engine to check collisions at the destination.
const PASSABLE_PLANTS=new Set(['minecraft:short_grass','minecraft:fern','minecraft:dandelion','minecraft:poppy',
 'minecraft:azure_bluet','minecraft:oxeye_daisy','minecraft:cornflower','minecraft:allium',
 'minecraft:blue_orchid','minecraft:red_tulip','minecraft:orange_tulip','minecraft:white_tulip','minecraft:pink_tulip']);
function dangerous(block,hazards){return !!(block?.isLiquid||block?.isWaterlogged||hazards.has(block?.typeId));}
function passableBody(block){
 if(!block||dangerous(block,BODY_HAZARDS))return false;
 if(block.isAir===true)return true;
 return block.isAir===false&&block.isLiquid===false&&block.isWaterlogged===false&&PASSABLE_PLANTS.has(block.typeId);
}
// Scan every block cell touched by the player's usual collision footprint.
// Unknown/unloaded cells are blocked; this is deliberately conservative for
// partial blocks (whose collision boxes are not exposed by the stable API).
function clearBody(d,pos){
 const r=.3,epsilon=.001;
 for(let x=Math.floor(pos.x-r+epsilon);x<=Math.floor(pos.x+r-epsilon);x++)
 for(let z=Math.floor(pos.z-r+epsilon);z<=Math.floor(pos.z+r-epsilon);z++)
 for(let y=Math.floor(pos.y+epsilon);y<=Math.floor(pos.y+1.8-epsilon);y++){
  const at={x,y,z};if(!d.isChunkLoaded(at))return false;
  if(!passableBody(d.getBlock(at)))return false;
 }
 return true;
}
// The ray's hit height is relative to the block. A 3x3 footprint check avoids
// allowing the centre to run over an edge while a corner hangs over a drop.
// Selection and collision shapes can differ; Bedrock validation is required.
function supported(d,pos){
 try{
  for(const dx of [-.28,0,.28])for(const dz of [-.28,0,.28]){
   const x=pos.x+dx,z=pos.z+dz;
   // For proven full cubes, inspect the block directly: no tiny ray, and no
   // dependence on a ray starting almost exactly on a block boundary.
   const floor={x:Math.floor(x),y:Math.floor(pos.y-.035),z:Math.floor(z)};
   if(!d.isChunkLoaded(floor))return false;
   if(Math.abs(floor.y+1-pos.y)<.035&&knownFullCube(d.getBlock(floor)))continue;
   if(typeof d.getBlockFromRay!=='function')return false;
   const from={x,y:pos.y+.5,z};
   if(!d.isChunkLoaded(from))return false;
   const hit=d.getBlockFromRay(from,{x:0,y:-1,z:0},{maxDistance:1,includeLiquidBlocks:false,includePassableBlocks:false});
   if(!hit?.block||dangerous(hit.block,FLOOR_HAZARDS)||!hit.faceLocation||String(hit.face).toLowerCase()!=='up')return false;
   const y=hit.block.location?.y+hit.faceLocation.y;
   if(!Number.isFinite(y)||Math.abs(y-pos.y)>.035)return false;
  }
  return true;
 }catch{return false;}
}
export function planRollSegment(d,start,dir,distance,requireSupport=false){
 let pos={...start},travel=0;
 const valid=next=>clearBody(d,next)&&(!requireSupport||supported(d,next));
 while(travel+1e-6<distance){
  const step=Math.min(SAMPLE,distance-travel),next={x:pos.x+dir.x*step,y:pos.y,z:pos.z+dir.z*step};
  if(valid(next)){pos=next;travel+=step;continue;}
  // Climb only when the complete raised path is clear and the destination
  // footprint is supported. Requiring support at the first tiny sample would
  // make every one-block rise impassable while straddling its edge.
  let climbed;
  if(!clearBody(d,next)&&clearBody(d,{...pos,y:pos.y+1})){
   for(let jump=step;jump<=Math.min(.8,distance-travel)+1e-6;jump+=SAMPLE){
    const raised={x:pos.x+dir.x*jump,y:pos.y+1,z:pos.z+dir.z*jump};
    if(!clearBody(d,raised))break;
    if(!requireSupport||supported(d,raised)){climbed={pos:raised,travel:jump};break;}
   }
  }
  if(climbed){pos=climbed.pos;travel+=climbed.travel;continue;}
  // For diagonal travel, follow a clear wall/edge instead of bouncing off it.
  let slide;
  if(Math.abs(dir.x)>.05&&Math.abs(dir.z)>.05){
   const options=[{x:pos.x+dir.x*step,y:pos.y,z:pos.z},{x:pos.x,y:pos.y,z:pos.z+dir.z*step}];
   slide=options.find(valid);
  }
  if(!slide)break;
  pos=slide;travel+=step;
 }
 return travel>0?{pos,travel}:undefined;
}
export function setupCombatRoll({notice,safe}){
 const entries=new Map();
 function move(p,e){
  try{
   const m=e.motion;if(!m||!p.isValid||p.dimension.id!==e.dimension)return false;
   const start={...p.location,y:Math.max(p.location.y,m.floorY)};
   const segment=planRollSegment(p.dimension,start,m.dir,Math.min(PER_TICK,m.remaining),m.requireSupport);
   if(!segment){e.motion=undefined;try{p.clearVelocity();}catch{}return false;}
   // Stop residual horizontal and vertical momentum before the checked move.
   // A rejected teleport never advances the planned distance.
   p.clearVelocity();
   if(!p.tryTeleport(segment.pos,{checkForBlocks:true})){e.motion=undefined;return false;}
   m.floorY=Math.max(m.floorY,segment.pos.y);
   m.remaining-=segment.travel;if(m.remaining<1e-5)e.motion=undefined;
   return true;
  }catch{e.motion=undefined;return false;}
 }
 function tick(p,s,t){
  let e=entries.get(p.id);
  if(!e){e={down:false,first:undefined,until:0,dimension:p.dimension.id};entries.set(p.id,e);}
  if(e.dimension!==p.dimension.id){entries.delete(p.id);return;}
  let forward,input;
  try{
   if(!p.isValid||p.typeId!=='minecraft:player'||s.menu||s.busy||![GameMode.Survival,GameMode.Creative].includes(p.getGameMode())||
      p.isSwimming||p.isGliding||p.isFlying||p.getComponent('minecraft:riding')){
    e.down=false;e.first=undefined;e.motion=undefined;return;
   }
   if(!p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.LateralMovement)||
      !p.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.MoveForward)){
    e.down=false;e.first=undefined;e.motion=undefined;return;
   }
   if(e.motion)move(p,e);
   // Releasing sneak after the gesture must not truncate an active roll to
   // its first movement step. Sneak is required only to start another roll.
   if(!p.isSneaking){e.down=false;e.first=undefined;return;}
   input=p.inputInfo.getMovementVector();
   if(!Number.isFinite(input.x)||!Number.isFinite(input.y)){e.down=false;e.first=undefined;return;}
   forward=input.y>.6&&Math.abs(input.x)<.7;
  }catch{e.down=false;e.first=undefined;e.motion=undefined;return;}
  if(!forward){e.down=false;return;}
  if(e.down)return;e.down=true;
  // Ground is required only for a NEW roll, not for a roll already moving.
  // Do not retain an airborne first tap for an accidental launch on landing.
  if(!p.isOnGround){e.first=undefined;return;}
  if(e.first===undefined||t-e.first>DOUBLE_TAP){e.first=t;return;}
  e.first=undefined;
  if(t<(e.cooldownUntil??0))return; // no cost, animation or immunity renewal
  if(p.getGameMode()!==GameMode.Creative&&s.s<COST){notice(p,'§e回避に必要なスタミナが足りない',35);return;}
  try{
   const view=p.getViewDirection(),n=Math.hypot(view.x,view.z),at=p.location,d=p.dimension;
   if(n<.01||![n,at.x,at.y,at.z].every(Number.isFinite))return;
   const side=input.x,forwardAmount=input.y,rawX=view.x/n*forwardAmount-view.z/n*side,rawZ=view.z/n*forwardAmount+view.x/n*side,dirLen=Math.hypot(rawX,rawZ);
   if(!Number.isFinite(dirLen)||dirLen<.01)return;
   // Activation never depends on the support probe. Movement requires verified
   // support at every sample; if unavailable the roll still plays in place.
   e.motion={dir:{x:rawX/dirLen,z:rawZ/dirLen},remaining:DISTANCE,floorY:at.y,requireSupport:true};
   move(p,e); // A blocked movement still performs the roll in place.
   if(p.getGameMode()!==GameMode.Creative)s.s-=COST;e.until=t+INVULNERABLE;e.cooldownUntil=t+COOLDOWN;
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
