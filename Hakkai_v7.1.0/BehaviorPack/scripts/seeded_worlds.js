import { BlockVolume, BlockPermutation, ItemStack } from '@minecraft/server';
import { oreColumn } from './ore_distribution.js';
import { placeMoonShrine } from './moon_shrine.js';
import { nearestQueuedDistance } from './terrain_queue.js';
import { isNaturalSite, inSite, siteIntersects, siteBounds, blendSiteHeight, FRONTIER_SITES, SKY_FRONTIER_SITES } from './natural_sites.js';
import { createLandscapeField } from './landscape_regions.js';
import { caveInterval, solidIntervals, treeCandidates, scenicPlan, realmRelief, skyRoute, skySiteRoute, pondPlan, moonGroveAt, bambooCandidates } from './terrain_features.js';

// 8界の現在地を中心に、4チャンク先までの見える範囲を先行生成する。
// 16x16チャンク単位で処理し、既存ブロックのあるチャンクは丸ごと保護する。
const CHUNK=16, VIEW=4, MIN_Y=40, MAX_Y=152;
const skyColours=['#83B7F0','#9BB7A7','#D9A36B','#B9DFF4','#7F8AA6','#52636C','#BDAAF5','#9B8AC5'];
const DEEP_SITES=[[[544,-160],[704,0],[864,160]],[[544,160],[704,-32],[864,-160]],[[544,-160],[704,64],[864,160]],[[544,160],[704,-64],[864,-160]],[[544,-160],[704,0],[864,160]],[[544,160],[704,-32],[864,-160]],[[544,-160],[704,64],[864,160]],[[544,160],[704,-64],[864,-160]]];

export function setupSeededWorlds(ctx){
 const {ns,world,system,num,property,report,places=[],biomes={},families={},buildSite,onShrineChief}=ctx;
 const naturalSites=Array.from({length:8},(_,r)=>places.filter(s=>s.dim===r&&isNaturalSite(s)));
 const siteAt=(r,x,z)=>naturalSites[r].find(s=>inSite(s,x,z));
 let seedText='0';
 try{seedText=String(world.seed??'0');}catch{}
 let seedHash=2166136261;
 for(let i=0;i<seedText.length;i++)seedHash=Math.imul(seedHash^seedText.charCodeAt(i),16777619)>>>0;
 const queued=new Set(), queue=[], retryAt=new Map(), nextScan=new Map(), siteRetry=new Map(), sitePending=new Set();
 let running=false;
 const realmId=p=>{
  const prefix=ns+'realm_';
  if(!p.dimension.id.startsWith(prefix))return -1;
  const v=Number(p.dimension.id.slice(prefix.length));
  return Number.isInteger(v)&&v>=0&&v<8?v:-1;
 };
 const propKey=(r,cx,cz)=>`seed_land_${r}_${cx}_${cz}_v1`;
 const skipKey=(r,cx,cz)=>`seed_land_${r}_${cx}_${cz}_skip_v1`;
 function hash(x,z,r,salt=0){
  let h=(seedHash ^ Math.imul((x|0),0x9e3779b1) ^ Math.imul((z|0),0x85ebca6b) ^ Math.imul(r+1,0xc2b2ae35) ^ salt)>>>0;
  h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;
  h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;
  h=(h^(h>>>16))>>>0;
  return h/4294967295;
 }
 function smooth(t){return t*t*(3-2*t);}
 function lerp(a,b,t){return a+(b-a)*t;}
 function noise(x,z,scale,r,salt){
  const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=smooth(fx-x0),tz=smooth(fz-z0);
  const a=hash(x0,z0,r,salt)*2-1,b=hash(x0+1,z0,r,salt)*2-1;
  const c=hash(x0,z0+1,r,salt)*2-1,d=hash(x0+1,z0+1,r,salt)*2-1;
  return lerp(lerp(a,b,tx),lerp(c,d,tx),tz);
 }
 const landscape=createLandscapeField(hash,noise);
 const TOPS=[
  ['minecraft:grass_block','minecraft:podzol','minecraft:grass_block','minecraft:moss_block','minecraft:gravel','minecraft:tuff','hakkai:windworn_sandstone','minecraft:calcite','hakkai:glow_moss','minecraft:coarse_dirt','minecraft:clay','hakkai:ruin_windstone'],
  ['minecraft:moss_block','minecraft:podzol','hakkai:canopy_0','minecraft:rooted_dirt','minecraft:mud','minecraft:gravel','minecraft:coarse_dirt','hakkai:glow_moss','minecraft:mycelium','minecraft:clay','minecraft:podzol','hakkai:ruin_mossstone'],
  ['minecraft:sand','minecraft:red_sand','minecraft:sandstone','hakkai:red_dune_stone','minecraft:gravel','minecraft:tuff','hakkai:windworn_sandstone','minecraft:calcite','minecraft:sand','minecraft:clay','minecraft:terracotta','hakkai:ruin_sandstone'],
  ['minecraft:snow_block','minecraft:packed_ice','hakkai:mirror_ice','hakkai:frost_stone','minecraft:gravel','minecraft:snow_block','minecraft:ice','hakkai:frost_crystal','minecraft:calcite','minecraft:packed_ice','minecraft:blue_ice','hakkai:ruin_iceglass'],
  ['minecraft:andesite','minecraft:tuff','hakkai:copper_slate','minecraft:gravel','minecraft:stone','minecraft:tuff','hakkai:thunderstone','hakkai:storm_crystal','minecraft:deepslate','minecraft:exposed_copper','hakkai:copper_slate','hakkai:ruin_thunderstone'],
  ['minecraft:moss_block','hakkai:glow_moss','hakkai:abyssal_stone','minecraft:clay','minecraft:gravel','minecraft:deepslate','hakkai:moonstone','hakkai:frost_crystal','hakkai:moonstone','minecraft:deepslate','minecraft:obsidian','hakkai:ruin_moonstone'],
  ['minecraft:grass_block','minecraft:calcite','hakkai:cloudstone','minecraft:snow_block','minecraft:gravel','minecraft:tuff','hakkai:aether_stone','hakkai:sky_crystal','hakkai:glow_moss','minecraft:quartz_block','minecraft:stone','hakkai:ruin_cloudstone'],
  ['minecraft:cut_copper','hakkai:clockstone','hakkai:brasswork','minecraft:gravel','minecraft:andesite','minecraft:tuff','hakkai:timeglass','minecraft:copper_block','minecraft:deepslate','minecraft:oxidized_copper','minecraft:amethyst_block','hakkai:ruin_clockstone']
 ];
 const SUBS=['minecraft:dirt','minecraft:rooted_dirt','minecraft:sandstone','minecraft:packed_ice','minecraft:stone','minecraft:deepslate','hakkai:cloudstone','minecraft:andesite'];
 const ROCKS=['minecraft:stone','minecraft:stone','minecraft:sandstone','minecraft:stone','minecraft:deepslate','minecraft:deepslate','hakkai:cloudstone','minecraft:deepslate'];
 function biomeIndexAt(r,x,z){
  const wx=noise(x+29*r,z-17*r,224,r,301)*128,wz=noise(x-13*r,z+37*r,224,r,307)*128;
  const macro=noise(x+wx,z+wz,286,r,313)*.68+noise(x-53*r,z+41*r,118,r,317)*.32;
  return Math.max(0,Math.min(11,Math.floor((macro+1)*6)));
 }
 function biomeAt(r,l){
  if(!Number.isInteger(r)||r<0||r>7||!l)return undefined;
  const x=Math.floor(l.x),z=Math.floor(l.z);
  if(x>=23&&x<=73&&z>=-22&&z<=22)return undefined;
  for(const site of places){
   if(site.dim!==r)continue;
   const half=(Number(site.size)||45)/2+5;
   if(Math.abs(site.x-x)<=half&&Math.abs(site.z-z)<=half)return undefined;
  }
  const id=`hakkai:seed_${r}_${String(biomeIndexAt(r,x,z)).padStart(2,'0')}`,key=biomes[id],profile=families[key];
  return key&&profile?{id,key,profile}:undefined;
 }
 function heightAt(r,x,z,style=biomeIndexAt(r,x,z)){
  const base=[88,87,85,91,88,76,94,84][r];
  const continental=noise(x+19*r,z-41*r,390,r,11)*17;
  const broad=noise(x+17*r,z-23*r,142,r,13)*13;
  const middle=noise(x-31*r,z+13*r,49,r,23)*8;
  const fine=noise(x+7*r,z-5*r,17,r,37)*3;
  let relief=continental+broad+middle+fine;
  relief+=realmRelief(r,x,z,noise)+landscape.sample(r,x,z);
  if(r===5)relief=relief*.62+noise(x,z,33,r,47)*7;
  if(r===6){const shape=noise(x+41,z-27,26,r,151)*.82+noise(x-9,z+63,11,r,157)*.38;if(shape<.22)return -1;relief=relief*.38+Math.max(0,shape-.22)*11;}
  return Math.round(Math.max(48,Math.min(145,base+relief)));
 }
 function surfaceFor(r,x,z,y,style=biomeIndexAt(r,x,z)){
  const grain=hash(Math.floor(x/3),Math.floor(z/3),r,103),patch=noise(x,z,21,r,91),top=TOPS[r][style];
  const wetTop=style===3&&grain>.55?'minecraft:mud':style===4?'minecraft:gravel':top;
  const layered=style===1&&grain>.65?TOPS[r][(style+2)%12]:style===8&&grain>.72?TOPS[r][7]:wetTop;
  const grove=r===7&&moonGroveAt(x,z,noise);
  return {top:grove?'minecraft:grass_block':layered,sub:grove?'minecraft:dirt':style===4||style===6?'minecraft:sand':style===3?'minecraft:clay':style===7?'hakkai:moonstone':SUBS[r],rock:style===11?TOPS[r][11]:ROCKS[r],patch};
 }
 function isReserved(r,x0,z0,x1,z1){
  // 元の接続地形と遠征地形の予約範囲は、生成順序に関係なく保護する。
  // The old large frontier remains reserved only if it was ever prepared.
  // New worlds use the same chunk-by-chunk seeded generator as the rest.
  const legacyFrontier=num(world,`frontier_land_${r}_prepared_v1`)||num(world,`frontier_land_${r}_v1`);
  const centralNames=['meadow','forest','desert','ice','cliff','cave','sky','time'];
  const legacyId=[0,20,11,12,13,14,15,16][r],central=centralNames[r];
  const legacyCentral=r===0||num(world,`${central}_terrain_v1`)||num(world,`${central}_terrain_skipped_v1`)||
   (num(world,`built_${legacyId}`)&&world.getDynamicProperty?.(ns+`natural_site_plan_${legacyId}_v2`)===undefined);
  const rects=[...(legacyCentral?[[23,-22,73,22]]:[]),...(legacyFrontier?[[288,-64,415,63]]:[])];
  for(const [a,b,c,d] of rects)if(x0<=c&&x1>=a&&z0<=d&&z1>=b)return true;
  // 風見台・各拠点・離島・街道の予定地を避け、後からの拠点生成を妨げない。
  for(const s of places){
   if(s.dim!==r||isNaturalSite(s))continue;
   const half=(Number(s.size)||45)/2+5;
   if(x0<=s.x+half&&x1>=s.x-half&&z0<=s.z+half&&z1>=s.z-half)return true;
  }
  // An unbuilt site owns its exact footprint; wait until it is placed.
  // Reserving the whole intersecting chunk prevents structure/terrain races.
  if(naturalSites[r].some(s=>siteIntersects(s,x0,z0,x1,z1)&&!num(world,`built_${s.id}`)))return true;
  return false;
 }
 function chunkLoaded(d,cx,cz){
  try{return d.isChunkLoaded({x:cx*CHUNK+8,y:88,z:cz*CHUNK+8});}catch{return false;}
 }
 function heightFor(r,x,z){
  const style=biomeIndexAt(r,x,z);
  let base;
  if(r===6){
   const route=skyRoute(x,z,noise);
   const siteRoute=skySiteRoute(x,z,naturalSites[r],noise);
   const shape=noise(x+41,z-27,26,r,151)*.82+noise(x-9,z+63,11,r,157)*.38;
   if(siteRoute)return siteRoute.height;
   if(route.distance<=2.5)base=route.height;
   else if(shape<.22)base=-1;
   else{
    const island=Math.max(80,Math.min(140,Math.round(heightAt(r,x,z,style)+noise(x,z,17,r,163)*5+Math.max(0,shape-.22)*9)));
    const blend=Math.max(0,Math.min(1,(route.distance-2.5)/12));
    base=Math.round(route.height*(1-blend)+island*blend);
   }
  }else base=heightAt(r,x,z,style);
  return blendSiteHeight(base,x,z,naturalSites[r]);
 }
 function playersNear(d,location,radius){
  // If the query fails, skip decorations rather than risk trapping a player.
  try{return d.getPlayers({location,maxDistance:radius,closest:1}).length>0;}catch{return true;}
 }
 function playerIntersectsColumn(d,x,z,bottom,top){
  try{
   return d.getPlayers().some(p=>{
    const l=p.location;
    return Math.abs(l.x-(x+.5))<.8&&Math.abs(l.z-(z+.5))<.8&&l.y<top+1&&l.y+1.8>bottom;
   });
  }catch{return true;}
 }
 function placeTree(d,r,cx,cz){
  const candidates=treeCandidates(r,cx,cz,hash);
  const log=r===1?'minecraft:birch_log':r===3?'minecraft:spruce_log':'minecraft:oak_log';
  const leaf=r===1?'minecraft:birch_leaves':r===3?'minecraft:spruce_leaves':'minecraft:oak_leaves';
  let leaves;try{leaves=BlockPermutation.resolve(leaf,{persistent_bit:true,update_bit:false});}catch{return;}
  for(const tree of candidates){
   const {x,z,height:h}=tree,y=heightFor(r,x,z);
   if(y<0||y+h+1>MAX_Y||playersNear(d,{x:x+.5,y:y+1,z:z+.5},5))continue;
   const ground=d.getBlock({x,y,z});
   if(!ground||ground.typeId!==surfaceFor(r,x,z,y).top)continue;
   let clear=true;
   for(let dy=1;dy<=h;dy++)if(!d.getBlock({x,y:y+dy,z})?.isAir){clear=false;break;}
   if(!clear)continue;
   for(let dy=1;dy<=h;dy++)d.setBlockType({x,y:y+dy,z},log);
   for(let dy=h-1;dy<=h+1;dy++){
    const radius=dy===h+1?1:2;
    for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
     if(Math.abs(dx)+Math.abs(dz)>radius*2-1)continue;
     const at={x:x+dx,y:y+dy,z:z+dz};
     try{if(d.getBlock(at)?.isAir)d.setBlockPermutation(at,leaves);}catch{}
    }
   }
  }
 }
 function placeBiomeFeature(d,r,cx,cz){
  const style=biomeIndexAt(r,cx*CHUNK+8,cz*CHUNK+8),roll=hash(cx,cz,r,401);
  if(roll>((style===5||style===7||style===11)?.32:.12))return;
  const x=cx*CHUNK+2+Math.floor(hash(cx,cz,r,409)*12),z=cz*CHUNK+2+Math.floor(hash(cx,cz,r,419)*12),y=heightFor(r,x,z);
  if(y<0||playersNear(d,{x:x+.5,y:y+1,z:z+.5},5))return;
  const ground=d.getBlock({x,y,z}),profile=surfaceFor(r,x,z,y,style);
  if(!ground||ground.typeId!==profile.top)return;
  const block=style===11?TOPS[r][11]:style===7?TOPS[r][7]:r===0?'hakkai:windworn_sandstone':r===1?'hakkai:canopy_1':r===2?'hakkai:red_dune_stone':r===3?'hakkai:frost_crystal':r===4?'hakkai:storm_crystal':r===5?'hakkai:glow_moss':r===6?'hakkai:sky_crystal':'hakkai:timeglass';
  if(style===8&&(r===1||r===5)){
   const mushroom=r===5?'minecraft:red_mushroom':'minecraft:brown_mushroom';
   try{if(d.getBlock({x,y:y+1,z})?.isAir)d.setBlockType({x,y:y+1,z},mushroom);}catch{}
   return;
  }
  const h=style===11?3+Math.floor(hash(cx,cz,r,421)*4):style===7?2+Math.floor(hash(cx,cz,r,431)*3):1+Math.floor(hash(cx,cz,r,433)*2);
  for(let dy=1;dy<=h;dy++){
   const at={x,y:y+dy,z};
   if(at.y>MAX_Y)break;
   try{if(d.getBlock(at)?.isAir)d.setBlockType(at,block);}catch{}
  }
  if(style===11||style===7)for(const dx of [-1,1]){
   const at={x:x+dx,y:y+1,z};
   try{if(d.getBlock(at)?.isAir)d.setBlockType(at,style===11?TOPS[r][11]:block);}catch{}
  }
 }
 function placeMoonBamboo(d,cx,cz,shrine){
  const candidates=bambooCandidates(cx,cz,hash,(x,z)=>moonGroveAt(x,z,noise));
  if(!candidates.length)return false;
  let stalk,top;try{
   stalk=BlockPermutation.resolve('minecraft:bamboo',{bamboo_leaf_size:'no_leaves',bamboo_stalk_thickness:'thick'});
   top=BlockPermutation.resolve('minecraft:bamboo',{bamboo_leaf_size:'large_leaves',bamboo_stalk_thickness:'thick'});
  }catch{return false;}
  let planted=false;
  for(const {x,z,height} of candidates){
   if(shrine&&Math.abs(x-shrine.x)<=4&&Math.abs(z-shrine.z)<=4)continue;
   const y=heightFor(7,x,z);if(y<0||y+height>MAX_Y||playersNear(d,{x:x+.5,y:y+1,z:z+.5},4))continue;
   if(d.getBlock({x,y,z})?.typeId!=='minecraft:grass_block')continue;
   let clear=true;
   for(let dy=1;dy<=height;dy++)if(!d.getBlock({x,y:y+dy,z})?.isAir){clear=false;break;}
   if(!clear)continue;
   for(let dy=1;dy<=height;dy++)d.setBlockPermutation({x,y:y+dy,z},dy===height?top:stalk);
   planted=true;
  }
  return planted;
 }
 function placeScenery(d,realm,cx,cz){
  const x=cx*CHUNK+8,z=cz*CHUNK+8,y=heightFor(realm,x,z);
  if(y<0||playersNear(d,{x:x+.5,y:y+1,z:z+.5},9))return;
  const plan=scenicPlan(realm,cx,cz,y,hash);if(!plan.length)return;
  // Adapt each column to the local slope rather than requiring an unnaturally
  // flat pad. Only air is filled; a pond, cave mouth or player block stops it.
  const tops=new Map(),adjusted=[];
  for(const at of plan){
   const key=`${at.x},${at.z}`;
   let ground=tops.get(key);
   if(ground===undefined){
    ground=heightFor(realm,at.x,at.z);
    if(ground<0||Math.abs(ground-y)>2)return;
    const block=d.getBlock({x:at.x,y:ground,z:at.z});
    if(!block||block.typeId!==surfaceFor(realm,at.x,at.z,ground).top)return;
    tops.set(key,ground);
   }
   const pos={...at,y:at.y+ground-y};
   if(pos.y>MAX_Y||!d.getBlock(pos)?.isAir)return;
   adjusted.push(pos);
  }
  for(const at of adjusted)d.setBlockType({x:at.x,y:at.y,z:at.z},at.type);
  // Supplies are finite and stored in a real barrel, not generated on every
  // interaction. It is placed only inside this freshly preflighted chunk.
  for(const at of adjusted)if(at.cache)try{
   const c=d.getBlock(at)?.getComponent('minecraft:inventory')?.container;if(!c)continue;
   const attrs=[[0,3,18],[10,13,16],[2,12],[1,11,19],[4,17],[6,14],[5,8,15],[7,9]][realm];
   const pick=Math.min(attrs.length-1,Math.floor(hash(cx,cz,realm,743)*attrs.length));
   c.setItem(0,new ItemStack(ns+`shard_${attrs[pick]}`,2+Math.floor(hash(cx,cz,realm,751)*3)));
   c.setItem(1,new ItemStack(realm===5?'minecraft:torch':'minecraft:bread',realm===5?4:2));
  }catch(err){report('探索物資の配置',err);}
 }
 function placeExpeditionLandmark(d,realm,index,coords){
  const [sx,sz]=coords;
  // Keep every decorative block within the same chunk and within six blocks
  // of the unchanged saved discovery coordinate, including negative chunks.
  const inset=n=>Math.max(Math.floor(n/16)*16+4,Math.min(Math.floor(n/16)*16+11,n));
  const x=inset(sx),z=inset(sz);let y=heightFor(realm,x,z);
  if(y<0){
   if(realm!==6||playersNear(d,{x:x+.5,y:104,z:z+.5},8))return;
   y=103;
   for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if(!d.getBlock({x:x+dx,y,z:z+dz})?.isAir)return;
   for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)d.setBlockType({x:x+dx,y,z:z+dz},'hakkai:cloudstone');
  }
  if(playersNear(d,{x:x+.5,y:y+1,z:z+.5},8))return;
  const stone=realm===6?'hakkai:cloudstone':realm===7?'hakkai:clockstone':TOPS[realm][11];
  const accent=realm===5?'hakkai:moonstone':realm===4?'hakkai:storm_crystal':realm===3?'hakkai:frost_crystal':realm===6?'hakkai:sky_crystal':realm===7?'hakkai:timeglass':stone;
  const h=Math.min(9+(realm+index)%4*2,MAX_Y-y-1);if(h<4)return;
  // A landmark should rest on its own terrain, not float above a slope.
  for(const dx of [-2,2])for(const dz of [-2,2]){
   const ground=d.getBlock({x:x+dx,y,z:z+dz});
   if(!ground||ground.isAir)return;
  }
  const planned=[];
  for(const dx of [-2,2])for(const dz of [-2,2])for(let dy=1;dy<=h;dy++)planned.push({x:x+dx,y:y+dy,z:z+dz,type:stone});
  for(let dx=-1;dx<=1;dx++)planned.push({x:x+dx,y:y+h,z:z-2,type:accent});
  planned.push({x,y:y+h+1,z,type:accent});
  if(planned.some(at=>!d.getBlock(at)?.isAir))return;
  for(const at of planned)d.setBlockType({x:at.x,y:at.y,z:at.z},at.type);
 }
 function placePond(d,plan){
  if(!plan||playersNear(d,{x:plan.x+.5,y:plan.level,z:plan.z+.5},8))return;
  const solid=at=>{const block=d.getBlock(at);return Boolean(block&&block.isSolid&&!block.isLiquid);};
  // Verify the entire wall and bed after the multi-tick job. If someone
  // modified the basin during generation, do not place any fluid.
  for(const cell of plan.cells){
   if(!solid({x:cell.x,y:plan.floor,z:cell.z}))return;
   for(let y=plan.floor+1;y<=plan.level;y++)if(!d.getBlock({x:cell.x,y,z:cell.z})?.isAir)return;
  }
  for(const rim of plan.rim)for(let y=plan.floor+1;y<=plan.level;y++)if(!solid({x:rim.x,y,z:rim.z}))return;
  // No yield between validation and placement. All source blocks are behind
  // a complete solid rim; water is never written outside this chunk.
  for(const cell of plan.cells)for(let y=plan.floor+1;y<=plan.level;y++)
   d.setBlockType({x:cell.x,y,z:cell.z},plan.frozen&&y===plan.level?'minecraft:packed_ice':'minecraft:water');
 }
 function* buildSector(task){
  const {realm,cx,cz,key}=task,d=task.dimension;
  if(!chunkLoaded(d,cx,cz))return;
  const x0=cx*CHUNK,z0=cz*CHUNK,x1=x0+CHUNK-1,z1=z0+CHUNK-1;
  if(isReserved(realm,x0,z0,x1,z1))return;
  const sites=naturalSites[realm].filter(s=>siteIntersects(s,x0,z0,x1,z1));
  const envelope=new BlockVolume({x:x0,y:MIN_Y,z:z0},{x:x1,y:MAX_Y,z:z1});
  // Existing built structures are expected in boundary chunks. Check every
  // non-site column separately; no natural or player block may be replaced.
  if(sites.length){
   for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    if(siteAt(realm,x,z))continue;
    if(d.containsBlock(new BlockVolume({x,y:MIN_Y,z},{x,y:MAX_Y,z}),{excludeTypes:['minecraft:air']})){
     property(world,skipKey(realm,cx,cz),1);return;
    }
   }
  }else if(d.containsBlock(envelope,{excludeTypes:['minecraft:air']})){
   property(world,skipKey(realm,cx,cz),1);return;
  }
  // Decorations are disabled in boundary chunks to avoid touching a site.
  const pond=sites.length?undefined:pondPlan(realm,cx,cz,hash,heightFor);
  const pondCells=new Set(pond?.cells.map(({x,z})=>`${x},${z}`)??[]);
  const pondRim=new Set(pond?.rim.map(({x,z})=>`${x},${z}`)??[]);
  let wroteTerrain=false,hasSkyRoad=false;
  for(let x=x0;x<=x1;x++){
   for(let z=z0;z<=z1;z++){
    // A new block can appear after preflight while this job yields; never
    // overwrite it. Abandon the remaining chunk and preserve partial terrain.
    const site=siteAt(realm,x,z);
    // Old sites have no opt-in marker and are completely untouched. Newly
    // placed sites get only entirely empty columns, never their structures.
    if(site&&!num(world,`natural_join_${site.id}_v1`)){yield;continue;}
    const column=new BlockVolume({x,y:MIN_Y,z},{x,y:MAX_Y,z});
    if(d.containsBlock(column,{excludeTypes:['minecraft:air']})){
     if(site){yield;continue;}
     property(world,skipKey(realm,cx,cz),1);return;
    }
    if(realm===6&&(skyRoute(x,z,noise).distance<=3||skySiteRoute(x,z,naturalSites[realm],noise)))hasSkyRoad=true;
    const naturalTop=heightFor(realm,x,z);
    const inPond=pondCells.has(`${x},${z}`),nearPond=Boolean(site)||inPond||pondRim.has(`${x},${z}`);
    const top=inPond?pond.floor:naturalTop;
    if(top<0){yield;continue;}
    // Avoid creating solid terrain in an occupied player body. If generation
    // already began, preserve the partial chunk instead of risking a retry.
    if(playerIntersectsColumn(d,x,z,MIN_Y,realm===5?MAX_Y:top)){
     if(wroteTerrain)property(world,skipKey(realm,cx,cz),1);
     return;
    }
    wroteTerrain=true;
    const mat=surfaceFor(realm,x,z,top);
    let bottom;
    if(realm===6){
     const depth=5+Math.floor(hash(x,z,realm,251)*4);
     bottom=top-depth;
     d.fillBlocks(new BlockVolume({x,y:top-depth,z},{x,y:top-2,z}),mat.rock);
     d.setBlockType({x,y:top-1,z},mat.sub);
     d.setBlockType({x,y:top,z},mat.top);
    }else{
     const depth=realm===5?16+Math.floor(hash(x,z,realm,257)*5):20+Math.floor(hash(x,z,realm,257)*9);
     bottom=Math.max(MIN_Y+2,top-depth);
     const cave=nearPond?undefined:caveInterval(realm,x,z,top,bottom,hash);
     for(const [lower,upper] of solidIntervals(bottom,top-2,cave))
      d.fillBlocks(new BlockVolume({x,y:lower,z},{x,y:upper,z}),mat.rock);
     if(!cave||top-1<cave.lower||top-1>cave.upper)d.setBlockType({x,y:top-1,z},mat.sub);
     if(!cave||top<cave.lower||top>cave.upper)d.setBlockType({x,y:top,z},mat.top);
     if(realm===5&&!site){
      const roofY=124+Math.round(noise(x,z,23,realm,269)*4);
      if(roofY>top+4&&noise(x,z,17,realm,271)>-.48){
       d.fillBlocks(new BlockVolume({x,y:roofY-2,z},{x,y:roofY,z}),'minecraft:deepslate');
       if(hash(x,z,realm,277)>.94)d.setBlockType({x,y:roofY-1,z},'minecraft:glow_lichen');
      }
     }
    }
    // この区画は生成前に空であることを確認済み。既存区画には追加しない。
    const cave=nearPond?undefined:caveInterval(realm,x,z,top,bottom,hash);
    const ore=site?undefined:oreColumn(realm,x,z,top,bottom,hash);
    if(ore)for(const [lower,upper] of solidIntervals(ore.lower,ore.upper,cave))
     d.fillBlocks(new BlockVolume({x,y:lower,z},{x,y:upper,z}),`hakkai:ore_${ore.id}`);
    // Keep the passages navigable: occasional illuminated floor stones, not
    // obstructions in the air or replacements for the ore just placed.
    if(cave&&hash(x,z,realm,631)>.985){
     const floor={x,y:cave.lower-1,z};
     const existing=d.getBlock(floor);
     if(existing?.typeId===mat.rock){
      const light=['hakkai:glow_moss','hakkai:glow_moss','hakkai:sky_crystal','hakkai:frost_crystal','hakkai:storm_crystal','hakkai:glow_moss','hakkai:sky_crystal','hakkai:timeglass'][realm];
      d.setBlockType(floor,light);
     }
    }
    yield;
   }
  }
  if(sites.length){property(world,key,1);return;}
  placePond(d,pond);
  const shrine=realm===7&&placeMoonShrine({dimension:d,cx,cz,hash,heightFor,isGrove:(x,z)=>moonGroveAt(x,z,noise),playersNear,spawnChief:Boolean(world.gameRules?.doMobSpawning),onChief:onShrineChief,report});
  if(!shrine&&!hasSkyRoad)placeScenery(d,realm,cx,cz);
  const planted=realm===7&&placeMoonBamboo(d,cx,cz,shrine);
  const moonGrove=realm===7&&Boolean(shrine||planted);
  if(!hasSkyRoad)placeTree(d,realm,cx,cz);
  if(!shrine&&!hasSkyRoad)placeBiomeFeature(d,realm,cx,cz);
  for(let i=0;i<3;i++){
   for(const coords of [DEEP_SITES[realm][i],(realm===6?SKY_FRONTIER_SITES:FRONTIER_SITES)[i]]){
    const [sx,sz]=coords;
    if(Math.floor(sx/CHUNK)===cx&&Math.floor(sz/CHUNK)===cz)placeExpeditionLandmark(d,realm,i,coords);
   }
  }
  // 草原・森・雪原に小さな自然の彩りを足す（バニラの植物だけを使用）。
  if(realm===0||realm===1||realm===3){
   for(let i=0;i<5;i++){
    const x=x0+1+Math.floor(hash(cx*7+i,cz*11,realm,281)*14);
    const z=z0+1+Math.floor(hash(cx*13,cz*5+i,realm,283)*14);
    const y=heightFor(realm,x,z);
    if(y<0||playersNear(d,{x:x+.5,y:y+1,z:z+.5},3))continue;
    const top=d.getBlock({x,y,z}),above=d.getBlock({x,y:y+1,z});
    if(!top||!above?.isAir)continue;
    const flowers=realm===3?['minecraft:short_grass','minecraft:fern']:['minecraft:dandelion','minecraft:azure_bluet','minecraft:oxeye_daisy','minecraft:pink_petals'];
    const type=flowers[Math.floor(hash(x,z,realm,293)*flowers.length)];
    try{d.setBlockType({x,y:y+1,z},type);}catch{}
   }
  }
  property(world,key,1);
  if(moonGrove)property(world,`seed_moon_grove_${cx}_${cz}_v1`,1);
 }
 function enqueue(realm,cx,cz,d,dist){
  const key=propKey(realm,cx,cz);
  if(num(world,key)||num(world,skipKey(realm,cx,cz))||queued.has(key))return;
  if(system.currentTick<(retryAt.get(key)??0)||!chunkLoaded(d,cx,cz))return;
  if(isReserved(realm,cx*CHUNK,cz*CHUNK,cx*CHUNK+15,cz*CHUNK+15))return;
  queued.add(key);queue.push({realm,cx,cz,key,dimension:d,dist});
 }
 function pump(){
  if(running)return;
  while(queue.length){
   queue.sort((a,b)=>a.dist-b.dist);
   const task=queue.shift();
   if(num(world,task.key)||num(world,skipKey(task.realm,task.cx,task.cz))){queued.delete(task.key);continue;}
   running=true;
   const job=(function*(){
    try{yield* buildSector(task);}
    catch(err){retryAt.set(task.key,system.currentTick+200);report('シード地形の区画生成',err);}
    finally{running=false;queued.delete(task.key);}
   })();
   try{system.runJob(job);}catch(err){running=false;queued.delete(task.key);retryAt.set(task.key,system.currentTick+200);report('シード地形ジョブ',err);}
   return;
  }
 }
 function tick(p,t){
  const realm=realmId(p);if(realm<0)return;
  const next=nextScan.get(p.id)??0;
  if(t>=next){
   nextScan.set(p.id,t+20);
   const cx=Math.floor(p.location.x/CHUNK),cz=Math.floor(p.location.z/CHUNK),d=p.dimension;
   // 全プレイヤーを基準に整理する。別の界にいる人の待ち区画を消さない。
   const players=world.getAllPlayers().map(player=>({realm:realmId(player),cx:Math.floor(player.location.x/CHUNK),cz:Math.floor(player.location.z/CHUNK)}));
   for(let i=queue.length-1;i>=0;i--){
    const q=queue[i],distance=nearestQueuedDistance(q,players,VIEW+2);
    if(!Number.isFinite(distance)){queue.splice(i,1);queued.delete(q.key);}
    else q.dist=distance;
   }
   // Reserve all intersecting chunks before scheduling the site's structure.
   // The same viewport scan that queues terrain controls site generation.
   if(buildSite)for(const site of naturalSites[realm]){
    if(num(world,`built_${site.id}`)||sitePending.has(site.id)||t<(siteRetry.get(site.id)??0))continue;
    const b=siteBounds(site),x0=(cx-VIEW)*CHUNK,z0=(cz-VIEW)*CHUNK,x1=(cx+VIEW+1)*CHUNK-1,z1=(cz+VIEW+1)*CHUNK-1;
    if(!siteIntersects(site,x0,z0,x1,z1))continue;
    let occupied=true;
    try{occupied=d.getPlayers().some(other=>other.location.x>=b.x0-2&&other.location.x<=b.x1+2&&other.location.z>=b.z0-2&&other.location.z<=b.z1+2);}catch{}
    if(occupied)continue;
    sitePending.add(site.id);siteRetry.set(site.id,t+1200);
    Promise.resolve().then(()=>buildSite(site)).catch(err=>report('探索地のシード生成',err)).finally(()=>sitePending.delete(site.id));
   }
   const tasks=[];
   for(let dx=-VIEW;dx<=VIEW;dx++)for(let dz=-VIEW;dz<=VIEW;dz++)tasks.push({cx:cx+dx,cz:cz+dz,dist:dx*dx+dz*dz});
   tasks.sort((a,b)=>a.dist-b.dist);
   for(const q of tasks)enqueue(realm,q.cx,q.cz,d,q.dist);
   if(!num(p,'seedland_notice_v1')){
    property(p,'seedland_notice_v1',1);
    try{p.sendMessage('§b【8界風記】この界の周囲をワールドシードに合わせて準備しています。歩き進むと先の地形も続けて生成されます。');}catch{}
   }
  }
  pump();
 }
 function isGenerated(realm,l){
  if(!Number.isInteger(realm)||realm<0||realm>7||!l)return false;
  const cx=Math.floor(l.x/CHUNK),cz=Math.floor(l.z/CHUNK);
  return Boolean(num(world,propKey(realm,cx,cz)));
 }
 return {tick,biomeAt,isGenerated,isMoonGrove:l=>Boolean(l&&num(world,`seed_moon_grove_${Math.floor(l.x/CHUNK)}_${Math.floor(l.z/CHUNK)}_v1`)&&moonGroveAt(Math.floor(l.x),Math.floor(l.z),noise))};
}
