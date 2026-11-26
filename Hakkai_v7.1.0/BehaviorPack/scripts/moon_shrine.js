// A small open shrine, deliberately contained in a single freshly-generated
// chunk. Never remove trees, ground, player blocks or existing entities.
export function placeMoonShrine({dimension:d,cx,cz,hash,heightFor,isGrove,playersNear,spawnChief=true,onChief=()=>{},report=()=>{}}){
 const x=cx*16+8,z=cz*16+8;
 if(hash(cx,cz,7,1249)>=.10||!isGrove(x,z))return false;
 try{
  const y=heightFor(7,x,z);if(!Number.isFinite(y)||y<44||y>142||playersNear(d,{x:x+.5,y:y+1,z:z+.5},12))return false;
  const floor=new Map();
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
   const px=x+dx,pz=z+dz,top=heightFor(7,px,pz);
   if(!Number.isFinite(top)||Math.abs(top-y)>1||!isGrove(px,pz)||!d.isChunkLoaded({x:px,y:top,z:pz}))return false;
   // The exact vanilla full-block grass surface is required, not an
   // approximation of arbitrary solid blocks via the preview-only API.
   const ground=d.getBlock({x:px,y:top,z:pz});if(ground?.typeId!=='minecraft:grass_block'||ground.isLiquid||ground.isWaterlogged)return false;
   floor.set(`${dx},${dz}`,top);
  }
  // The intended boss area must be level and clear, with adequate headroom.
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
   if(floor.get(`${dx},${dz}`)!==y)return false;
   for(let dy=1;dy<=3;dy++)if(!d.getBlock({x:x+dx,y:y+dy,z:z+dz})?.isAir)return false;
  }
  const plan=[];
  const add=(dx,dy,dz,type)=>plan.push({x:x+dx,y:floor.get(`${dx},${dz}`)+dy,z:z+dz,type});
  for(const [dx,dz] of [[-3,-3],[3,-3],[-3,3],[3,3]]){
   for(let dy=1;dy<=4;dy++)add(dx,dy,dz,'hakkai:clockstone');
   add(dx,5,dz,'hakkai:timeglass');
  }
  for(let dx=-2;dx<=2;dx++)add(dx,4,-3,'hakkai:clockstone');
  for(const dx of [-2,2])add(dx,1,1,'minecraft:lantern');
  add(0,5,-3,'hakkai:timeglass');
  if(plan.some(p=>p.y>152||!d.getBlock(p)?.isAir))return false;
  // Full preflight first, then only place into air, without yielding.
  try{for(const p of plan)d.setBlockType({x:p.x,y:p.y,z:p.z},p.type);}
  catch(err){report('FUSHIの社の生成',err);return {x,z,partial:true};}
  // A shrine can exist without a chief if the spawn fails or one is nearby.
  // The separate registry may record a confirmed death for a later respawn.
  try{
   if(spawnChief&&!d.getEntities({type:'hakkai:fushi_chief',location:{x:x+.5,y:y+1,z:z+.5},maxDistance:56,closest:1}).length)
    {const chief=d.spawnEntity('hakkai:fushi_chief',{x:x+.5,y:y+1,z:z+.5},{initialPersistence:true});
     try{onChief(chief,{cx,cz,y});}catch(err){report('社のチーフ登録',err);}}
  }catch(err){report('FUSHIの社の守護者',err);}
  return {x,z};
 }catch(err){report('FUSHIの社の生成',err);return false;}
}
