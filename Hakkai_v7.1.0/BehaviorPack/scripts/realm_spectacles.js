// Distinctive seed-driven landscapes and silhouettes, confined to freshly
// generated chunks. These are plans only; callers must validate loaded blocks,
// terrain, player proximity and protected areas before placing anything.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export const REALM_LANDSCAPES=['風花の丘','霧樹の根丘','風紋の砂丘','蒼氷の波丘','雷雲の稜線','光菌の地底丘','雲上の浮丘','刻の段丘'];
export function realmPanorama(r,x,z,noise){
 if(!Number.isInteger(r)||r<0||r>7)return 0;
 const n=(scale,salt)=>noise(x,z,scale,r,salt);
 // All terms are continuous world-coordinate fields, not chunk randomness.
 const ridge=Math.pow(Math.max(0,1-Math.abs(n(180,1801))*2.2),2);
 const broad=n(130,1807), detail=n(54,1811), mask=smooth((n(310,1817)+.3)/.8);
 switch(r){
  case 0:return mask*(ridge*10+broad*3); // sweeping flower terraces
  case 1:return mask*(ridge*13+detail*4); // root mounds
  case 2:return mask*(9*Math.sin((x+n(210,1823)*30)/26)+ridge*8); // long dunes
  case 3:return mask*(ridge*17+broad*4); // glacial shoulders
  case 4:return mask*(ridge*23+detail*5); // sharp but smooth storm ridge
  case 5:return mask*(ridge*11+detail*4); // illuminated cavern floor
  case 6:return mask*(ridge*11+broad*2); // relief only on existing islands
  case 7:return mask*(ridge*13+broad*4); // worn clockwork plateaus
 }
}

// Three differently shaped landmarks per realm. Rotation and placement are
// seeded per chunk; all columns remain at least one block inside the chunk.
export function spectaclePlan(r,cx,cz,hash){
 if(!Number.isInteger(r)||r<0||r>7||hash(cx,cz,r,1901)>=.38)return [];
 const variant=Math.min(2,Math.floor(hash(cx,cz,r,1907)*3));
 const rotation=Math.min(3,Math.floor(hash(cx,cz,r,1913)*4));
 const x=cx*16+8,z=cz*16+8,out=[],occupied=new Set();
 const add=(dx,dy,dz,type)=>{
  for(let i=0;i<rotation;i++)[dx,dz]=[-dz,dx];
  if(Math.abs(dx)>6||Math.abs(dz)>6||dy<1||dy>23)throw Error('spectacle plan out of bounds');
  const k=`${dx},${dy},${dz}`;if(occupied.has(k))return;
  occupied.add(k);out.push({x:x+dx,y:dy,z:z+dz,type});
 };
 const col=(x,z,h,type,start=1)=>{for(let y=start;y<=h;y++)add(x,y,z,type);};
 const lineX=(a,b,y,z,type)=>{for(let x=a;x<=b;x++)add(x,y,z,type);};
 const ring=(y,rad,type)=>{for(let x=-rad;x<=rad;x++)for(let z=-rad;z<=rad;z++)if(Math.abs(Math.hypot(x,z)-rad)<.55)add(x,y,z,type);};
 switch(r){
  case 0:{ // Wind monuments / open stone arches / tall wind vanes.
   const stone='hakkai:windworn_sandstone',a='hakkai:sky_crystal';
   if(variant===0){
    col(0,0,13,stone);for(let k=-5;k<=5;k++){add(k,12,0,k===0?a:'minecraft:birch_planks');if(k!==0)add(0,12+k,0,Math.abs(k)===5?a:'minecraft:birch_planks');}
    for(const dx of [-2,2])col(dx,0,3,stone);
   }else if(variant===1){
    for(const dx of [-5,5]){col(dx,0,8,stone);col(dx,0,9,a,9);}lineX(-4,4,8,0,stone);lineX(-2,2,10,0,a);
    for(const dz of [-3,3])col(0,dz,3,stone);
   }else{
    for(const [dx,dz,h] of [[-4,-4,5],[4,-4,7],[4,4,5],[-4,4,7]]){col(dx,dz,h,stone);add(dx,h+1,dz,a);}
    ring(1,4,stone);col(0,0,10,stone);add(0,11,0,a);
   }break;
  }
  case 1:{ // Giant trees: persistent leaves are handled by the placer.
   const log=variant===2?'minecraft:birch_log':'minecraft:oak_log',leaf=variant===2?'minecraft:birch_leaves':'minecraft:oak_leaves';
   const h=variant===0?14:variant===1?17:13;
   for(const dx of [-1,0,1])for(const dz of [-1,0,1])if(Math.abs(dx)+Math.abs(dz)<2)col(dx,dz,h,log);
   for(let k=1;k<=5;k++){add(k,h-3,0,log);add(-k,h-2,0,log);add(0,h-2,k,log);add(0,h-3,-k,log);}
   for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
    const d=Math.hypot(dx,dz);if(d>5.1)continue;
    for(let dy=h-1;dy<=h+2;dy++)if(d<=(dy===h+2?3.2:dy===h-1?4.1:5.1))add(dx,dy,dz,leaf);
   }
   if(variant===1){for(let dx=-4;dx<=4;dx++)add(dx,5,-4,'hakkai:glow_moss');}
   if(variant===2){for(const dx of [-3,3])col(dx,2,5,'hakkai:glow_moss');}
   break;
  }
  case 2:{ // Sandstone gates, giant ribs and weathered pillars.
   const rock='hakkai:windworn_sandstone',red='hakkai:red_dune_stone',bone='minecraft:bone_block';
   if(variant===0){for(const dx of [-5,5]){col(dx,0,9,red);col(dx,0,12,rock,10);}lineX(-4,4,10,0,rock);lineX(-3,3,12,0,red);}
   else if(variant===1){for(const dx of [-5,-2,1,4]){col(dx,-2,5,bone);col(dx,2,5,bone);for(let z=-1;z<=1;z++)add(dx,6,z,bone);}lineX(-5,4,3,0,bone);}
   else{for(const [dx,dz,h] of [[-4,-3,13],[0,0,18],[4,3,10],[-2,4,7]]){col(dx,dz,h,red);add(dx,h+1,dz,rock);}ring(1,5,rock);}
   break;
  }
  case 3:{ // Jagged glaciers and crystalline arches.
   const ice='minecraft:packed_ice',blue='minecraft:blue_ice',crystal='hakkai:frost_crystal';
   if(variant===0){for(const [dx,dz,h] of [[0,0,20],[-3,-2,13],[3,2,15],[-2,4,9],[4,-3,8]]){col(dx,dz,h,ice);add(dx,h+1,dz,crystal);for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]])col(dx+ax,dz+az,Math.floor(h*.55),blue);}}
   else if(variant===1){for(const dx of [-5,5]){col(dx,0,10,ice);add(dx,11,0,crystal);}lineX(-4,4,10,0,blue);lineX(-3,3,11,0,ice);}
   else{ring(1,5,blue);for(const [dx,dz,h] of [[-4,0,11],[4,0,15],[0,-4,9],[0,4,13]]){col(dx,dz,h,ice);add(dx,h+1,dz,crystal);}col(0,0,5,blue);}
   break;
  }
  case 4:{ // Lightning rods and split stormstone spires.
   const rock='hakkai:thunderstone',copper='minecraft:cut_copper',spark='hakkai:storm_crystal';
   if(variant===0){col(0,0,19,rock);for(let i=0;i<5;i++){add(i,14+i,0,copper);add(-i,12+i,0,rock);}add(0,20,0,spark);add(4,19,0,spark);}
   else if(variant===1){for(const dx of [-4,4]){col(dx,0,14,rock);col(dx,0,16,copper,15);add(dx,17,0,spark);}lineX(-3,3,11,0,copper);lineX(-2,2,14,0,rock);}
   else{ring(1,5,rock);for(const [dx,dz,h] of [[-4,-4,7],[4,-4,10],[4,4,7],[-4,4,10],[0,0,16]]){col(dx,dz,h,rock);add(dx,h+1,dz,spark);}}
   break;
  }
  case 5:{ // Glowing mushroom-like groves, mineral clusters and pillars.
   const stone='hakkai:abyssal_stone',light='hakkai:glow_moss',gem='hakkai:moonstone';
   if(variant===0){col(0,0,10,stone);for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(x*x+z*z<=17){add(x,10,z,light);if(x*x+z*z<=8)add(x,11,z,gem);}col(-4,3,4,light);col(4,-3,5,light);}
   else if(variant===1){for(const [dx,dz,h] of [[0,0,15],[-3,-3,9],[3,3,10],[3,-3,7],[-3,3,8]]){col(dx,dz,h,stone);add(dx,h+1,dz,gem);for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]])col(dx+ax,dz+az,Math.floor(h/2),light);}}
   else{for(const dx of [-5,5]){col(dx,0,10,stone);add(dx,11,0,gem);}lineX(-4,4,10,0,light);ring(1,4,light);col(0,0,5,gem);}
   break;
  }
  case 6:{ // Cloud arches and aerial beacon towers, on existing islands only.
   const cloud='hakkai:cloudstone',white='hakkai:aether_stone',light='hakkai:sky_crystal';
   if(variant===0){for(const dx of [-5,5]){col(dx,0,10,cloud);add(dx,11,0,light);}lineX(-4,4,10,0,white);lineX(-3,3,12,0,cloud);}
   else if(variant===1){for(const [dx,dz] of [[-3,-3],[-3,3],[3,-3],[3,3]])col(dx,dz,14,cloud);for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)if(Math.abs(x)===3||Math.abs(z)===3)add(x,14,z,white);col(0,0,19,white);add(0,20,0,light);}
   else{ring(1,5,cloud);for(const [dx,dz,h] of [[-4,0,9],[4,0,9],[0,-4,9],[0,4,9]]){col(dx,dz,h,white);add(dx,h+1,dz,light);}lineX(-3,3,9,0,cloud);}
   break;
  }
  case 7:{ // Station clocks, brass arcs and timeglass beacons.
   const stone='hakkai:clockstone',brass='hakkai:brasswork',glass='hakkai:timeglass';
   if(variant===0){
    for(const dx of [-5,5])col(dx,0,14,stone);lineX(-4,4,14,0,brass);
    // Vertical, visible clock face; decorative, not a working clock.
    for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++)if(Math.abs(Math.hypot(dx,dy)-4)<.6)add(dx,9+dy,0,brass);
    col(0,0,10,glass,6);for(let dx=1;dx<=3;dx++)add(dx,9,0,glass);add(0,15,0,glass);
   }else if(variant===1){for(const dx of [-5,5]){col(dx,0,12,stone);add(dx,13,0,glass);}lineX(-4,4,12,0,brass);lineX(-4,4,9,0,stone);col(0,0,16,stone);add(0,17,0,glass);}
   else{ring(1,5,brass);for(const [dx,dz,h] of [[-4,0,12],[4,0,12],[0,-4,9],[0,4,9]]){col(dx,dz,h,stone);add(dx,h+1,dz,glass);}col(0,0,17,brass);add(0,18,0,glass);}
   break;
  }
 }
 return out;
}

// Roof formations never cross a chunk or the ceiling; the placer checks the
// actual roof is still solid and every target is air before writing.
export function cavernHangingPlan(cx,cz,hash){
 const out=[];
 for(let i=0;i<6;i++){
  const a=cx*31+i*73,b=cz*29+i*97;
  if(hash(a,b,5,1951)>.65)continue;
  const x=cx*16+2+Math.floor(hash(a,b,5,1957)*12),z=cz*16+2+Math.floor(hash(a,b,5,1961)*12);
  const length=3+Math.floor(hash(a,b,5,1967)*7);
  out.push({x,z,length});
 }
 return out;
}

// Large mottled ground patches amplify each realm's palette. They are not new
// engine biomes: valley beds and the moon grove take precedence in the caller.
export const REALM_SURFACES=[
 ['minecraft:grass_block','hakkai:wind_soil'],
 ['minecraft:moss_block','minecraft:rooted_dirt'],
 ['minecraft:red_sand','hakkai:red_dune_stone'],
 ['minecraft:packed_ice','hakkai:mirror_ice'],
 ['hakkai:thunderstone','hakkai:copper_slate'],
 ['hakkai:glow_moss','hakkai:moonstone'],
 ['hakkai:cloudstone','hakkai:cloud_loam'],
 ['hakkai:clockstone','hakkai:brasswork']
];
export function realmSurface(r,x,z,noise,hash){
 if(!REALM_SURFACES[r])return undefined;
 const field=noise(x+137,z-113,190,r,1973),grain=hash(Math.floor(x/4),Math.floor(z/4),r,1979);
 // Mottling fades at the edge instead of replacing a whole square chunk.
 if(field<-.06+(grain-.5)*.22)return undefined;
 return REALM_SURFACES[r][noise(x-31,z+71,68,r,1987)>.04?1:0];
}
