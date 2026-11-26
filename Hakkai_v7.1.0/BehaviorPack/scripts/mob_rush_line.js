// Approximate direct path for small creatures' warned body attacks, not a
// swept collision volume or a replacement for Bedrock navigation/physics.
// Unknown chunks, blocks or ray results fail closed. A clear line does not
// prove safe footing or that another entity cannot be pushed during movement.
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
export const RUSH_REACH=2.25, RUSH_HEIGHT=1.5;
export function clearRushLine(entity,target,maxHeight=RUSH_HEIGHT){
 try{
  const d=entity.dimension,a=entity.location,b=target.location;
  if(!Number.isFinite(maxHeight)||maxHeight<0||!finite(a)||!finite(b)||Math.abs(a.y-b.y)>maxHeight||!d?.id||target.dimension.id!==d.id)return false;
  const from={x:a.x,y:a.y+.55,z:a.z},to={x:b.x,y:b.y+.9,z:b.z};
  const v={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},n=Math.hypot(v.x,v.y,v.z);
  if(!Number.isFinite(n)||n>20)return false;
  const steps=Math.max(1,Math.ceil(n));
  for(let i=0;i<=steps;i++){
   const at={x:from.x+v.x*i/steps,y:from.y+v.y*i/steps,z:from.z+v.z*i/steps};
   if(!d.isChunkLoaded(at))return false;
  }
  for(const at of [from,to]){
   const block=d.getBlock(at);
   if(!block)return false;
   // Stable @minecraft/server does not expose Block.isSolid. When it is not
   // present, allow only known air or liquid endpoints; non-air plants and
   // unknown partial blocks remain blocked rather than guessed passable.
   if(typeof block.isSolid==='boolean'){if(block.isSolid)return false;}
   else if(block.isAir!==true&&block.isLiquid!==true)return false;
  }
  if(n<.001)return true;
  return !d.getBlockFromRay(from,{x:v.x/n,y:v.y/n,z:v.z/n},{maxDistance:n,includeLiquidBlocks:false,includePassableBlocks:false});
 }catch{return false;}
}
