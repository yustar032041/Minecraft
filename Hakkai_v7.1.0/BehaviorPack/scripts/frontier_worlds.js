import { BlockVolume } from '@minecraft/server';

// Each realm keeps its original 128x128 expedition and grows a 512x512
// wilderness beyond it. The deep wilderness is generated one loaded 32x32
// sector at a time, so remote chunks and player builds are never swept.
const X0=288, X1=415, Z0=-64, Z1=63, TILE=8;
const DEEP_X0=448, DEEP_X1=959, DEEP_Z0=-256, DEEP_Z1=255, SECTOR=32;
const SURFACES=[
 ['minecraft:grass_block','minecraft:dirt','minecraft:stone'],
 ['minecraft:moss_block','minecraft:podzol','minecraft:stone'],
 ['minecraft:sand','minecraft:red_sand','minecraft:sandstone'],
 ['minecraft:snow_block','minecraft:packed_ice','minecraft:stone'],
 ['minecraft:andesite','minecraft:copper_ore','minecraft:stone'],
 ['minecraft:moss_block','minecraft:amethyst_block','minecraft:deepslate'],
 ['minecraft:calcite','minecraft:quartz_block','minecraft:stone'],
 ['minecraft:copper_block','minecraft:oxidized_copper','minecraft:deepslate']
];
const SITES=[[310,25],[352,-24],[394,25]];
const SKY_SITES=[[302,0],[342,0],[398,0]];
const DEEP_SITES=[[[544,-160],[704,0],[864,160]],[[544,160],[704,-32],[864,-160]],[[544,-160],[704,64],[864,160]],[[544,160],[704,-64],[864,-160]],[[544,-160],[704,0],[864,160]],[[544,160],[704,-32],[864,-160]],[[544,-160],[704,64],[864,160]],[[544,160],[704,-64],[864,-160]]];

export function setupFrontierWorlds(ctx){
 const {ns,world,num,property,report}=ctx;
 const active=new Set(), activeSectors=new Set(), retryAt=new Map(), done=new Set(), deepRetry=new Map();
 const realmOf=p=>{
  if(!p.dimension.id.startsWith(ns+'realm_'))return -1;
  const n=Number(p.dimension.id.slice((ns+'realm_').length));
  return Number.isInteger(n)&&n>=0&&n<8?n:-1;
 };
 function chunksLoaded(d,x0,z0,x1,z1){
  for(const x of [x0,x1])for(const z of [z0,z1])if(!d.isChunkLoaded({x,y:88,z}))return false;
  return true;
 }
 function height(realm,x,z){
  const ridge=Math.sin((x-288)/18+realm*.7)*4+Math.cos(z/16-realm*.4)*3+Math.sin((x+z)/29)*2;
  if(realm===2){const canyon=Math.abs(z-14*Math.sin(x/31));return Math.round(86+ridge-(canyon<12?10:canyon<20?4:0));}
  if(realm===3||realm===4)return Math.round(92+ridge+Math.max(0,18-Math.abs(z-8*Math.sin(x/24)))*.45);
  if(realm===5)return Math.round(84+ridge-2*Math.cos(x/9)*Math.cos(z/11));
  if(realm===7)return 82+Math.round((ridge+10)/3)*3;
  return Math.round(87+ridge);
 }
 function island(realm,x,z){
  if(realm!==6)return false;
  return [[302,0,18],[337,0,20],[372,0,19],[406,0,18]].some(([cx,cz,r])=>Math.hypot((x-cx)*.82,z-cz)<r);
 }
 function topAt(realm,x,z){
  if(realm===6){
   if(!island(realm,x,z))return -1;
   const center=[[302,0],[337,0],[372,0],[406,0]].sort((a,b)=>Math.hypot(x-a[0],z-a[1])-Math.hypot(x-b[0],z-b[1]))[0];
   return Math.round(97+Math.max(0,8-Math.hypot(x-center[0],z-center[1])*.25)+Math.sin(x/7+z/9)*2);
  }
  return height(realm,x,z);
 }
 function materialAt(realm,x,z,top){
  const set=SURFACES[realm];
  if(realm===2&&Math.abs(z-14*Math.sin(x/31))<9)return 'minecraft:gravel';
  if(realm===3&&top>98)return 'minecraft:ice';
  if(realm===4&&top>100)return 'minecraft:exposed_copper';
  if(realm===5&&Math.abs(z-14*Math.sin(x/19))<3)return 'minecraft:glow_lichen';
  return set[Math.abs(Math.floor(x/5)+Math.floor(z/4)+realm)%set.length];
 }
 function landmark(d,realm,x,z,index){
  const y=topAt(realm,x,z);if(y<0)return;
  const stone=SURFACES[realm][2],accent=SURFACES[realm][1],h=3+((realm+index)%3);
  for(const dx of [-2,2])for(const dz of [-2,2])d.fillBlocks(new BlockVolume({x:x+dx,y:y+1,z:z+dz},{x:x+dx,y:y+h,z:z+dz}),stone);
  for(let dx=-2;dx<=2;dx++)d.setBlockType({x:x+dx,y:y+h,z:z-2},accent);
  d.setBlockType({x,y:y+1,z},realm===5?'minecraft:amethyst_block':realm===7?'minecraft:lightning_rod':'minecraft:lantern');
 }
 function bridge(d,realm){
  const key=`frontier_bridge_${realm}_v1`,skip=`frontier_bridge_${realm}_skipped_v1`;
  if(num(world,key)||num(world,skip))return;
  if(!d.isChunkLoaded({x:256,y:88,z:0})||!d.isChunkLoaded({x:272,y:88,z:0}))return;
  const volume=new BlockVolume({x:256,y:69,z:-3},{x:287,y:116,z:3});
  if(d.containsBlock(volume,{excludeTypes:['minecraft:air']})){property(world,skip,1);return;}
  d.fillBlocks(new BlockVolume({x:256,y:75,z:-3},{x:287,y:86,z:3}),SURFACES[realm][2]);
  d.fillBlocks(new BlockVolume({x:256,y:87,z:-3},{x:287,y:87,z:3}),SURFACES[realm][1]);
  d.fillBlocks(new BlockVolume({x:256,y:88,z:-1},{x:287,y:88,z:1}),'minecraft:gravel');
  property(world,key,1);
 }
 function deepBridge(d,realm){
  const key=`frontier_deep_bridge_${realm}_v1`,skip=`frontier_deep_bridge_${realm}_skip_v1`;
  if(num(world,key)||num(world,skip))return;
  if(!chunksLoaded(d,416,-5,447,5))return;
  const volume=new BlockVolume({x:416,y:69,z:-5},{x:447,y:116,z:5});
  if(d.containsBlock(volume,{excludeTypes:['minecraft:air']})){property(world,skip,1);return;}
  d.fillBlocks(new BlockVolume({x:416,y:75,z:-5},{x:447,y:86,z:5}),SURFACES[realm][2]);
  d.fillBlocks(new BlockVolume({x:416,y:87,z:-5},{x:447,y:87,z:5}),SURFACES[realm][1]);
  d.fillBlocks(new BlockVolume({x:416,y:88,z:-2},{x:447,y:88,z:2}),'minecraft:gravel');
  property(world,key,1);
 }
 async function build(p,realm){
  const d=p.dimension,key=`frontier_land_${realm}_v1`,skip=`frontier_land_${realm}_skipped_v1`,prepared=`frontier_land_${realm}_prepared_v1`,progress=`frontier_land_${realm}_strips_v1`;
  const bounds={from:{x:X0,y:69,z:Z0},to:{x:X1,y:116,z:Z1}};
  if(!num(world,prepared)&&d.containsBlock(new BlockVolume(bounds.from,bounds.to),{excludeTypes:['minecraft:air']})){
   property(world,skip,1);report('大規模遠征地形',`界${realm+1}の生成区画に既存ブロックがあるため、上書きを避けて中止しました`);return;
  }
  if(!num(world,prepared))property(world,prepared,1);
  const firstStrip=Math.max(0,Math.floor(num(world,progress)));
  for(let strip=firstStrip,sx=X0+firstStrip*16;sx<=X1;strip++,sx+=16){
   for(let x=sx;x<sx+16;x+=TILE)for(let z=Z0;z<=Z1;z+=TILE){
    // Recheck each not-yet-generated tile after interruptions/restarts.
    const tileBounds=new BlockVolume({x,y:69,z},{x:x+7,y:116,z:z+7});
    if(d.containsBlock(tileBounds,{excludeTypes:['minecraft:air']})){
     property(world,skip,1);report('大規模遠征地形',`界${realm+1}の未生成タイルに既存ブロックがあるため、残りの生成を中止しました`);return;
    }
    const mx=x+3,mz=z+3,top=topAt(realm,mx,mz);if(top<0)continue;
    const block=materialAt(realm,mx,mz,top),stone=SURFACES[realm][2],sub=SURFACES[realm][1];
    if(realm===6){d.fillBlocks(new BlockVolume({x,y:top-4,z},{x:x+7,y:top-1,z:z+7}),stone);d.fillBlocks(new BlockVolume({x,y:top,z},{x:x+7,y:top,z:z+7}),block);}
    else{const lower=Math.max(70,top-11);d.fillBlocks(new BlockVolume({x,y:70,z},{x:x+7,y:lower,z:z+7}),stone);if(top-lower>1)d.fillBlocks(new BlockVolume({x,y:lower+1,z},{x:x+7,y:top-1,z:z+7}),sub);d.fillBlocks(new BlockVolume({x,y:top,z},{x:x+7,y:top,z:z+7}),block);}
   }
   property(world,progress,strip+1);await new Promise(resolve=>ctx.system.runTimeout(resolve,8));
  }
  for(let x=X0;x<=X1;x++){const tx=X0+Math.floor((x-X0)/TILE)*TILE+3,tz=Z0+Math.floor((0-Z0)/TILE)*TILE+3,y=topAt(realm,tx,tz);if(y<0)continue;for(const z of [-1,0,1])d.setBlockType({x,y:y+1,z},z===0?'minecraft:gravel':'minecraft:coarse_dirt');}
  for(let i=0;i<SITES.length;i++){const [x,z]=(realm===6?SKY_SITES:SITES)[i];landmark(d,realm,x,z,i);}
  property(world,key,1);done.add(realm);
 }
 function sectorKey(realm,sx,sz){return `frontier_deep_${realm}_${sx}_${sz}_v1`;}
 function deepHeight(realm,x,z){
  const quadrant=(Math.floor((x-DEEP_X0)/128)+Math.floor((z-DEEP_Z0)/128)*3+realm*3)%4;
  const band=[0,6,-8,12*Math.sin(x*.035)][quadrant];
  const wave=Math.sin(x*.025+realm*1.1)*8+Math.cos(z*.031-realm*.8)*6+Math.sin((x+z)*.014)*5+band;
  if(realm===2)return Math.round(83+wave-Math.max(0,19-Math.abs(z-42*Math.sin(x*.012)))*.62);
  if(realm===3)return Math.round(94+wave+Math.max(0,22-Math.abs(z-30*Math.sin(x*.013)))*.52);
  if(realm===4)return Math.round(90+wave+Math.max(0,23-Math.abs(z-38*Math.sin(x*.011)))*.58);
  if(realm===5)return Math.round(80+wave-4*Math.cos(x*.08)*Math.cos(z*.07));
  if(realm===6)return Math.round(100+wave*.45);
  if(realm===7)return 78+Math.round((wave+19)/4)*4;
  return Math.round(88+wave);
 }
 function deepMaterial(realm,x,z,y){
  const cellX=Math.floor((x-DEEP_X0)/128),cellZ=Math.floor((z-DEEP_Z0)/128),biome=(cellX+cellZ*3+realm*3)%4;
  if(realm===2&&Math.abs(z-42*Math.sin(x*.012))<7)return 'minecraft:gravel';
  if(realm===3&&y>101)return 'minecraft:ice';
  if(realm===4&&y>104)return 'minecraft:exposed_copper';
  if(realm===5&&biome===2)return 'minecraft:glow_lichen';
  const palettes=[[SURFACES[realm][0],SURFACES[realm][1]],[SURFACES[realm][1],SURFACES[realm][2]],[SURFACES[realm][0],SURFACES[realm][2]],[SURFACES[realm][0],SURFACES[realm][1]]][biome];
  return palettes[Math.abs(Math.floor(x/9)+Math.floor(z/7)+realm)%2];
 }
 function deepLandmark(d,realm,index){
  const [x,z]=DEEP_SITES[realm][index],y=deepHeight(realm,x,z),stone=SURFACES[realm][2],accent=SURFACES[realm][1];
  // A distinctive three-part landmark: foundation ring, paired pylons, and a high beacon.
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===5)d.setBlockType({x:x+dx,y,z:z+dz},stone);
  const towerH=10+((realm+index)%4)*3;
  for(const dx of [-3,3])for(const dz of [-3,3])d.fillBlocks(new BlockVolume({x:x+dx,y:y+1,z:z+dz},{x:x+dx,y:y+towerH,z:z+dz}),stone);
  for(let dx=-3;dx<=3;dx++)d.setBlockType({x:x+dx,y:y+towerH,z:z-3},accent);
  d.fillBlocks(new BlockVolume({x:x-1,y:y+towerH-2,z:z-1},{x:x+1,y:y+towerH+1,z:z+1}),realm===5?'minecraft:amethyst_block':realm===7?'minecraft:lightning_rod':'minecraft:sea_lantern');
 }
 async function buildSector(p,realm,sx,sz){
  const d=p.dimension,key=sectorKey(realm,sx,sz),x0=DEEP_X0+sx*SECTOR,z0=DEEP_Z0+sz*SECTOR;
  if(num(world,key)||num(world,`${key}_skip`))return;
  if(!chunksLoaded(d,x0,z0,x0+31,z0+31))return;
  const prepared=`${key}_prepared`,progressKey=`${key}_tiles`;
  if(!num(world,prepared)){
   // Deep terrain can reach Y=48 and landmark towers can reach about Y=148.
   // Scan the full write envelope before generation so player builds are not overwritten.
   const bounds=new BlockVolume({x:x0,y:40,z:z0},{x:x0+31,y:160,z:z0+31});
   if(d.containsBlock(bounds,{excludeTypes:['minecraft:air']})){property(world,`${key}_skip`,1);return;}
   property(world,prepared,1);
  }
  const start=Math.max(0,Math.min(16,Math.floor(num(world,progressKey))));
  for(let tile=start;tile<16;tile++){
   const x=x0+(tile%4)*TILE,z=z0+Math.floor(tile/4)*TILE;
   // Recheck each remaining tile so a build placed after a restart is not overwritten.
   const tileBounds=new BlockVolume({x,y:40,z},{x:x+7,y:160,z:z+7});
   if(d.containsBlock(tileBounds,{excludeTypes:['minecraft:air']})){property(world,`${key}_skip`,1);return;}
   const mx=x+3,mz=z+3,top=deepHeight(realm,mx,mz),topBlock=deepMaterial(realm,mx,mz,top),stone=SURFACES[realm][2],sub=SURFACES[realm][1];
   const lower=Math.max(70,top-14);d.fillBlocks(new BlockVolume({x,y:70,z},{x:x+7,y:lower,z:z+7}),stone);
   if(top-lower>1)d.fillBlocks(new BlockVolume({x,y:lower+1,z},{x:x+7,y:top-1,z:z+7}),sub);
   d.fillBlocks(new BlockVolume({x,y:top,z},{x:x+7,y:top,z:z+7}),topBlock);
   property(world,progressKey,tile+1);
   await new Promise(resolve=>ctx.system.runTimeout(resolve,1));
  }
  for(let i=0;i<3;i++){const [lx,lz]=DEEP_SITES[realm][i];if(Math.floor((lx-DEEP_X0)/SECTOR)===sx&&Math.floor((lz-DEEP_Z0)/SECTOR)===sz)deepLandmark(d,realm,i);}
  property(world,key,1);
 }
 function tick(p,t){
  const realm=realmOf(p);if(realm<0||t<(retryAt.get(realm)??0))return;
  if(!num(world,`built_${21+realm}`)||num(world,`frontier_land_${realm}_skipped_v1`))return;
  bridge(p.dimension,realm);
  deepBridge(p.dimension,realm);
  if(!done.has(realm)&&!num(world,`frontier_land_${realm}_v1`)){
   if(p.location.x>=278&&p.location.x<=426&&Math.abs(p.location.z)<=84&&!active.has(realm)){
    retryAt.set(realm,t+100);
    if(p.dimension.isChunkLoaded({x:344,y:88,z:0})){active.add(realm);void build(p,realm).catch(err=>report('大規模遠征地形',err)).finally(()=>active.delete(realm));}
   }
   return;
  }
  // v7 seed terrain owns the former 512x512 fixed wilderness. The old sector
  // generator remains available only through its saved completion markers.
  if(p.location.x>=DEEP_X0-16&&p.location.x<=DEEP_X1+16&&p.location.z>=DEEP_Z0-16&&p.location.z<=DEEP_Z1+16)return;
  if(p.location.x<DEEP_X0-16||p.location.x>DEEP_X1+16||p.location.z<DEEP_Z0-16||p.location.z>DEEP_Z1+16)return;
  if(t<(deepRetry.get(p.id)??0))return;
  deepRetry.set(p.id,t+20);
  const sx=Math.max(0,Math.min(15,Math.floor((p.location.x-DEEP_X0)/SECTOR))),sz=Math.max(0,Math.min(15,Math.floor((p.location.z-DEEP_Z0)/SECTOR)));
  const key=`${realm}:${sx}:${sz}`;
  if(activeSectors.has(key))return;
  activeSectors.add(key);
  void buildSector(p,realm,sx,sz).catch(err=>report('界の超大規模外縁地形',err)).finally(()=>activeSectors.delete(key));
 }
 function siteCoords(realm,index){if(index>=6)return DEEP_SITES[realm]?.[index-6]??[0,0];return (realm===6?SKY_SITES:SITES)[index-3]??[0,0];}
 function isGenerated(realm,location){
  if(location.x>=X0&&location.x<=X1&&location.z>=Z0&&location.z<=Z1)return Boolean(num(world,`frontier_land_${realm}_v1`));
  if(location.x<DEEP_X0||location.x>DEEP_X1||location.z<DEEP_Z0||location.z>DEEP_Z1)return false;
  const sx=Math.floor((location.x-DEEP_X0)/SECTOR),sz=Math.floor((location.z-DEEP_Z0)/SECTOR);
  const legacy=Boolean(num(world,sectorKey(realm,sx,sz)));
  const seeded=Boolean(num(world,`seed_land_${realm}_${Math.floor(location.x/16)}_${Math.floor(location.z/16)}_v1`));
  return legacy||seeded;
 }
 return {tick,siteCoords,topAt,isGenerated};
}
