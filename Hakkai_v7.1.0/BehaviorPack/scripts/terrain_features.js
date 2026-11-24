import { blendSiteHeight } from './natural_sites.js';
// Pure, deterministic planning helpers. Only used inside new, preflighted
// seed chunks; existing generated chunks keep their old shape and properties.

export function caveInterval(realm,x,z,top,bottom,hash){
 if(!Number.isInteger(realm)||realm<0||realm>7||realm===6||top-bottom<12)return undefined;
 // Two gently curving continuous bands, rather than a random hole per block.
 // The passage follows the surface at a safe depth and retains floor and roof.
 const phase=hash?hash(0,0,realm,619)*Math.PI*2:0;
 const xwarp=x+Math.sin(z/75+realm*.7+phase)*30;
 const zwarp=z+Math.sin(x/90-realm*.8-phase)*27;
 const first=Math.abs(Math.sin(xwarp/61+realm*.81+phase)+.30*Math.sin(zwarp/92));
 const second=Math.abs(Math.sin(zwarp/74-realm*.68-phase)+.25*Math.sin(xwarp/82));
 // Deep cavern sectors in realm 5 have their own preflighted lower
 // envelope; other realms keep the existing sector boundary. Enlarge both
 // passages and junction rooms using the same continuous global fields.
 const deep=realm===5&&top-bottom>=48;
 const oldWidth=deep?.34:realm===5?.18:.095;
 const width=deep?.48:realm===5?.28:.16, distance=Math.hypot(first,second);
 const originalPassage=first<=oldWidth||second<=oldWidth;
 const inPassage=first<=width||second<=width;
 const chamber=Math.max(0,1-distance/(deep?1.02:realm===5?.52:.43));
 if(!inPassage&&chamber===0)return undefined;
 // Broad ramps, rather than abrupt pits. Only the original tunnel bands can
 // open to the surface; the expanded outer perimeter retains its roof.
 const entrance=Math.max(0,1-distance/(deep?1.18:realm===5?.57:.50));
 const floor=Math.max(bottom+2,Math.round(top-(deep?56:realm===5?16:17)+entrance*(deep?55:realm===5?15:16)));
 const opens=originalPassage&&distance<(deep?.18:.13);
 const lower=floor+1,upper=Math.min(opens?top:top-1,floor+(deep?28:7)+Math.round(chamber*(deep?14:4)));
 return lower<=upper?{lower,upper}:undefined;
}


// Smooth landforms, with no discontinuous height jump at biome borders.
// Noise is supplied by the seeded world generator so plans remain repeatable.
export function realmRelief(realm,x,z,noise){
 const n=(scale,salt)=>noise(x,z,scale,realm,salt);
 const ridge=Math.pow(Math.max(0,1-Math.abs(n(132,811))*3.2),2);
 const hills=n(72,821), detail=n(27,823);
 switch(realm){
  case 0: return ridge*8 + hills*3; // rolling grass terraces and valleys
  case 1: return hills*5 + detail*2; // uneven forest floor
  case 2: return ridge*18 + Math.sin((x+n(180,827)*42)/31)*3; // mesas and dunes
  case 3: return ridge*14 + hills*4; // glacial shoulders
  case 4: return ridge*24 + hills*5; // steep rocky ridges
  case 5: return hills*4 + detail*3; // underground mounds
  case 6: return hills*2; // island silhouettes handled separately
  case 7: return ridge*10 + hills*4; // eroded, irregular plateaus
  default: return 0;
 }
}

// Intervals excluding a cavity; useful for both rock and ore placement.
export function solidIntervals(lower,upper,gap){
 if(lower>upper)return [];
 if(!gap||gap.upper<lower||gap.lower>upper)return [[lower,upper]];
 const segments=[];
 if(lower<gap.lower)segments.push([lower,Math.min(upper,gap.lower-1)]);
 if(upper>gap.upper)segments.push([Math.max(lower,gap.upper+1),upper]);
 return segments;
}

export function treeCandidates(realm,cx,cz,hash){
 const chance=({0:.13,1:.62,3:.16,6:.10})[realm];
 if(chance===undefined)return [];
 const candidates=[];
 for(let i=0;i<(realm===1?5:3);i++){
  const xx=cx*17+i*101,zz=cz*19+i*67;
  if(hash(xx,zz,realm,211)>=chance)continue;
  // 3-block inset keeps the entire crown in the original chunk.
  const x=cx*16+3+Math.min(9,Math.floor(hash(xx,zz,realm,213)*10));
  const z=cz*16+3+Math.min(9,Math.floor(hash(xx,zz,realm,217)*10));
  const height=4+Math.min(2,Math.floor(hash(xx,zz,realm,223)*3))+(realm===1?1:0);
  candidates.push({x,z,height});
 }
 return candidates;
}

// A coherent, seed-dependent patch rather than a grove in every chunk.
// The same field controls soil and candidate plants across chunk edges.
export function moonGroveAt(x,z,noise){return noise(x,z,190,7,1181)>.22;}
export function bambooCandidates(cx,cz,hash,isGrove){
 const result=[],seen=new Set();
 for(let i=0;i<12;i++){
  const a=cx*19+i*83,b=cz*23+i*101;
  const x=cx*16+1+Math.min(13,Math.floor(hash(a,b,7,1187)*14));
  const z=cz*16+1+Math.min(13,Math.floor(hash(a,b,7,1193)*14));
  const key=`${x},${z}`;if(seen.has(key)||!isGrove(x,z))continue;
  seen.add(key);result.push({x,z,height:4+Math.min(3,Math.floor(hash(a,b,7,1201)*4))});
 }
 return result;
}

// Miniature points of interest: paths only in local empty air, with a bounded
// footprint. Their silhouettes vary by realm; they never replace ground blocks.
export function scenicPlan(realm,cx,cz,y,hash){
 if(realm<0||realm>7||hash(cx,cz,realm,701)>=.32)return [];
 const x=cx*16+8,z=cz*16+8;
 const palettes=[
  ['hakkai:windworn_sandstone','hakkai:sky_crystal'],
  ['minecraft:birch_log','hakkai:glow_moss'],
  ['hakkai:red_dune_stone','minecraft:bone_block'],
  ['minecraft:packed_ice','hakkai:frost_crystal'],
  ['hakkai:thunderstone','hakkai:storm_crystal'],
  ['hakkai:abyssal_stone','hakkai:glow_moss'],
  ['hakkai:cloudstone','hakkai:sky_crystal'],
  ['hakkai:clockstone','hakkai:timeglass']
 ];
 const [stone,accent]=palettes[realm],out=[],occupied=new Set();
 const variant=Math.min(13,Math.floor(hash(cx,cz,realm,733)*14));
 const rotation=Math.min(3,Math.floor(hash(cx,cz,realm,739)*4));
 const add=(dx,dy,dz,type,cache=false)=>{
  for(let i=0;i<rotation;i++)[dx,dz]=[-dz,dx];
  const key=`${dx},${dy},${dz}`;if(occupied.has(key))return;occupied.add(key);
  out.push({x:x+dx,y:y+dy,z:z+dz,type,...(cache?{cache:true}:{})});
 };
 const pillar=(dx,dz,height,cap=true)=>{
  for(let dy=1;dy<=height;dy++)add(dx,dy,dz,stone);
  if(cap)add(dx,height+1,dz,accent);
 };
 if(variant===0){ // broken ceremonial gate
  for(const dx of [-2,2])pillar(dx,0,4,false);
  for(let dx=-1;dx<=1;dx++)add(dx,4,0,stone);
  add(0,5,0,accent);add(-3,1,1,stone);add(3,1,-1,stone);
 }else if(variant===1){ // solitary beacon and a supply cache
  pillar(0,0,7);pillar(-3,2,2,false);pillar(3,-2,3,false);
  add(1,1,2,'minecraft:barrel',true);
 }else if(variant===2){ // half-buried shrine with a low roof
  pillar(-2,-1,3,false);pillar(2,-1,4,false);pillar(-2,2,2,false);
  for(let dx=-1;dx<=1;dx++)add(dx,4,-1,stone);
  add(2,5,-1,accent);add(0,1,1,'minecraft:barrel',true);
 }else if(variant===3){ // uneven circle of standing stones
  pillar(-3,0,3);pillar(3,0,2);pillar(0,-3,4);pillar(0,3,1);
  add(0,1,0,accent);
 }else if(variant===4){ // lookout / fractured tower
  pillar(-2,-2,7,false);pillar(2,-2,6,false);pillar(-2,2,5,false);
  for(let dx=-1;dx<=1;dx++)add(dx,6,-2,stone);
  add(-2,8,-2,accent);add(0,1,1,'minecraft:barrel',true);
 }else if(variant===5){ // leaning fossil or crystalline ribs
  for(let i=0;i<4;i++){
   const dx=-3+i*2,height=2+i%2*2;
   pillar(dx,0,height,false);add(dx,height+1,0,accent);
  }
  add(0,2,1,stone);add(0,3,1,stone);
 }else if(variant===6){ // ruined wayside shelter with an open entrance
  for(const dx of [-3,3])for(const dz of [-3,3])pillar(dx,dz,4,false);
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)
   if(Math.abs(dx)===3||Math.abs(dz)===3||Math.abs(dx)+Math.abs(dz)<4)add(dx,5,dz,stone);
  for(let dx=-2;dx<=2;dx++)for(let dy=1;dy<=3;dy++)if(dx!==0||dy!==2)add(dx,dy,-3,stone);
  add(0,6,0,accent);add(2,1,1,'minecraft:barrel',true);
 }else if(variant===7){ // compact two-level observation tower
  for(const dx of [-2,2])for(const dz of [-2,2])pillar(dx,dz,7,false);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)===2||Math.abs(dz)===2)add(dx,5,dz,stone);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)add(dx,8,dz,stone);
  for(const dx of [-2,0,2])add(dx,9,-2,accent);
  add(0,1,0,'minecraft:barrel',true);
 }else if(variant===8){ // small open archive / shrine, with a broken wall
  for(const dx of [-3,3])for(const dz of [-2,2])pillar(dx,dz,4,false);
  for(let dx=-2;dx<=2;dx++)for(let dy=1;dy<=3;dy++)if(dx!==1||dy!==3)add(dx,dy,-2,stone);
  for(let dx=-3;dx<=3;dx++)for(let dz=-2;dz<=2;dz++)add(dx,5,dz,stone);
  for(let dx=-2;dx<=2;dx++)add(dx,6,0,accent);
  add(-2,1,1,'minecraft:barrel',true);add(1,1,1,accent);
 }else if(variant===9){ // stepped pavilion / abandoned workshop
  for(const dx of [-3,3])for(const dz of [-3,3])pillar(dx,dz,4,false);
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if(Math.abs(dx)===3||Math.abs(dz)===3)add(dx,5,dz,stone);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)add(dx,6,dz,stone);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)add(dx,7,dz,stone);
  add(0,8,0,accent);add(-2,1,0,'minecraft:barrel',true);add(2,1,0,accent);
 }else if(variant===10){ // twin spires, fractured skyward
  pillar(-2,0,6);pillar(2,0,4);pillar(0,2,2,false);
  for(let dx=-1;dx<=1;dx++)add(dx,3,0,stone);
  add(0,4,0,accent);add(0,1,-2,'minecraft:barrel',true);
 }else if(variant===11){ // open crossroads and waymarkers
  for(let i=-3;i<=3;i++){if(i!==0){add(i,1,0,stone);add(0,1,i,stone);}}
  pillar(-3,-3,3);pillar(3,3,3);add(0,2,0,accent);
 }else if(variant===12){ // broken arched viaduct
  for(const dx of [-3,0,3])pillar(dx,-1,4,false);
  for(let dx=-2;dx<=2;dx++)if(dx!==1)add(dx,5,-1,stone);
  add(-3,5,-1,accent);add(3,5,-1,accent);add(0,1,2,'minecraft:barrel',true);
 }else{ // radial mineral cluster / ancient ring
  for(const [dx,dz,h] of [[-2,-2,2],[2,-2,4],[2,2,2],[-2,2,4],[0,0,6]])pillar(dx,dz,h);
  add(-3,1,0,stone);add(3,1,0,stone);add(0,1,3,stone);
 }
 return out;
}

// A narrow, continuous pair of winding cloud paths across the sky realm.
// The route is coordinate-based, not chunk-based, so opposite chunk edges
// agree. It does not promise access across reserved or already-built chunks.
export function skyRoute(x,z,noise){
 const period=224, bend=20;
 const zx=z-bend*Math.sin(x/116),xz=x-bend*Math.sin(z/116);
 const distance=Math.min(Math.abs(xz-Math.round(xz/period)*period),Math.abs(zx-Math.round(zx/period)*period));
 const height=Math.round(102+noise(x,z,280,6,911)*4+noise(x,z,105,6,919)*2);
 return {distance,height};
}

// Connect an individual sky site to the closest existing winding cloud route.
// This plan uses only world coordinates, so chunk order cannot change it. It
// applies only to freshly generated terrain; protected chunks can break a path.
export function skySiteRoute(x,z,sites,noise){
 let nearest;
 for(const site of sites){
  const pathZ=Math.round((site.z-20*Math.sin(site.x/116))/224)*224+20*Math.sin(site.x/116);
  const pathX=Math.round((site.x-20*Math.sin(site.z/116))/224)*224+20*Math.sin(site.z/116);
  const alongZ=Math.abs(pathZ-site.z)<=Math.abs(pathX-site.x);
  const endX=alongZ?site.x:pathX,endZ=alongZ?pathZ:site.z;
  const dx=endX-site.x,dz=endZ-site.z,length=Math.hypot(dx,dz);
  if(length<1)continue;
  const t=((x-site.x)*dx+(z-site.z)*dz)/(length*length);
  if(t<0||t>1)continue;
  const side=Math.hypot(x-(site.x+t*dx),z-(site.z+t*dz));
  if(side>3)continue;
  if(!nearest||side<nearest.side){
   const endHeight=skyRoute(endX,endZ,noise).height;
   const half=((site.size??45)-1)/2,travel=Math.max(0,length-half);
   const endBlend=blendSiteHeight(endHeight,endX,endZ,[site]);
   const progress=travel?Math.max(0,Math.min(1,(t*length-half)/travel)):0;
   nearest={side,height:Math.round(87+(endBlend-87)*progress),siteId:site.id};
  }
 }
 return nearest;
}

// A bounded, self-contained basin. Returning undefined is deliberate when the
// terrain is too uneven: never force a pond into a cliff or a chunk edge.
export function pondPlan(realm,cx,cz,hash,height){
 if(![0,1,2,3,5].includes(realm)||hash(cx,cz,realm,941)>=.14)return undefined;
 const x=cx*16+7+Math.floor(hash(cx,cz,realm,947)*2);
 const z=cz*16+7+Math.floor(hash(cx,cz,realm,953)*2);
 const center=height(realm,x,z),level=center-1,floor=level-2;
 if(!Number.isFinite(center)||floor<46||level>143)return undefined;
 const cells=[],rim=new Set();
 for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
  if(dx*dx+dz*dz>9)continue;
  const natural=height(realm,x+dx,z+dz);
  if(natural<floor||natural>level+2)return undefined;
  cells.push({x:x+dx,z:z+dz});
  for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const rx=dx+ax,rz=dz+az;
   if(rx*rx+rz*rz>9)rim.add(`${x+rx},${z+rz}`);
  }
 }
 for(const point of rim){
  const [rx,rz]=point.split(',').map(Number);
  if(height(realm,rx,rz)<level)return undefined;
 }
 return {x,z,level,floor,cells,rim:[...rim].map(point=>{const [x,z]=point.split(',').map(Number);return {x,z};}),frozen:realm===3};
}
