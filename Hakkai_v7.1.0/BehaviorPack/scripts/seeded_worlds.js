import { BlockVolume, BlockPermutation } from '@minecraft/server';

// 8界の現在地を中心に、4チャンク先までの見える範囲を先行生成する。
// 16x16チャンク単位で処理し、既存ブロックのあるチャンクは丸ごと保護する。
const CHUNK=16, VIEW=4, MIN_Y=40, MAX_Y=152;
const skyColours=['#83B7F0','#9BB7A7','#D9A36B','#B9DFF4','#7F8AA6','#52636C','#BDAAF5','#9B8AC5'];
const DEEP_SITES=[[[544,-160],[704,0],[864,160]],[[544,160],[704,-32],[864,-160]],[[544,-160],[704,64],[864,160]],[[544,160],[704,-64],[864,-160]],[[544,-160],[704,0],[864,160]],[[544,160],[704,-32],[864,-160]],[[544,-160],[704,64],[864,160]],[[544,160],[704,-64],[864,-160]]];

export function setupSeededWorlds(ctx){
 const {ns,world,system,num,property,report,places=[],biomes={},families={}}=ctx;
 let seedText='0';
 try{seedText=String(world.seed??'0');}catch{}
 let seedHash=2166136261;
 for(let i=0;i<seedText.length;i++)seedHash=Math.imul(seedHash^seedText.charCodeAt(i),16777619)>>>0;
 const queued=new Set(), queue=[], retryAt=new Map(), nextScan=new Map();
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
  if([5,9,11].includes(style))relief+=(1-Math.abs(noise(x,z,122,r,41)))*31;
  if(style===6){const trench=Math.abs(z-118*Math.sin(x/410+noise(x,z,510,r,43)*.8));relief-=Math.max(0,31-trench)*.85;}
  if(style===10)relief-=Math.max(0,24-Math.hypot(((x%360)+360)%360-180,((z%360)+360)%360-180))*.85;
  if(style===3||style===7)relief*=.72;
  if(r===5)relief=relief*.62+noise(x,z,33,r,47)*7;
  if(r===6){const shape=noise(x+41,z-27,26,r,151)*.82+noise(x-9,z+63,11,r,157)*.38;if(shape<.22)return -1;relief=relief*.38+Math.max(0,shape-.22)*11;}
  return Math.round(Math.max(48,Math.min(145,base+relief)));
 }
 function surfaceFor(r,x,z,y,style=biomeIndexAt(r,x,z)){
  const grain=hash(Math.floor(x/3),Math.floor(z/3),r,103),patch=noise(x,z,21,r,91),top=TOPS[r][style];
  const wetTop=style===3&&grain>.55?'minecraft:mud':style===4?'minecraft:gravel':top;
  const layered=style===1&&grain>.65?TOPS[r][(style+2)%12]:style===8&&grain>.72?TOPS[r][7]:wetTop;
  return {top:layered,sub:style===4||style===6?'minecraft:sand':style===3?'minecraft:clay':style===7?'hakkai:moonstone':SUBS[r],rock:style===11?TOPS[r][11]:ROCKS[r],patch};
 }
 function isReserved(r,x0,z0,x1,z1){
  // 元の接続地形と遠征地形の予約範囲は、生成順序に関係なく保護する。
  const rects=[[23,-22,73,22],[288,-64,415,63]];
  for(const [a,b,c,d] of rects)if(x0<=c&&x1>=a&&z0<=d&&z1>=b)return true;
  // 風見台・各拠点・離島・街道の予定地を避け、後からの拠点生成を妨げない。
  for(const s of places){
   if(s.dim!==r)continue;
   const half=(Number(s.size)||45)/2+5;
   if(x0<=s.x+half&&x1>=s.x-half&&z0<=s.z+half&&z1>=s.z-half)return true;
  }
  return false;
 }
 function chunkLoaded(d,cx,cz){
  try{return d.isChunkLoaded({x:cx*CHUNK+8,y:88,z:cz*CHUNK+8});}catch{return false;}
 }
 function heightFor(r,x,z){
  const style=biomeIndexAt(r,x,z);
  if(r===6){
   const shape=noise(x+41,z-27,26,r,151)*.82+noise(x-9,z+63,11,r,157)*.38;
   if(shape<.22)return -1;
   return Math.max(80,Math.min(140,Math.round(heightAt(r,x,z,style)+noise(x,z,17,r,163)*5+Math.max(0,shape-.22)*9)));
  }
  return heightAt(r,x,z,style);
 }
 function placeTree(d,r,cx,cz){
  if(r!==0&&r!==1&&r!==3&&r!==6)return;
  if(hash(cx,cz,r,211)>(r===1?.30:.18))return;
  const x=cx*CHUNK+8,z=cz*CHUNK+8,y=heightFor(r,x,z);
  if(y<0)return;
  const profile=surfaceFor(r,x,z,y),ground=d.getBlock({x,y,z});
  if(!ground||ground.typeId!==profile.top)return;
  const log=r===1?'minecraft:birch_log':r===3?'minecraft:spruce_log':'minecraft:oak_log';
  const leaf=r===1?'minecraft:birch_leaves':r===3?'minecraft:spruce_leaves':'minecraft:oak_leaves';
  const leaves=BlockPermutation.resolve(leaf,{persistent_bit:true,update_bit:false});
  const h=4+Math.floor(hash(cx,cz,r,223)*2);
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
 function placeBiomeFeature(d,r,cx,cz){
  const style=biomeIndexAt(r,cx*CHUNK+8,cz*CHUNK+8),roll=hash(cx,cz,r,401);
  if(roll>((style===5||style===7||style===11)?.32:.12))return;
  const x=cx*CHUNK+2+Math.floor(hash(cx,cz,r,409)*12),z=cz*CHUNK+2+Math.floor(hash(cx,cz,r,419)*12),y=heightFor(r,x,z);
  if(y<0)return;
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
   try{if(d.getBlock(at)?.isAir)d.setBlockType(at,block);}catch{}
  }
  if(style===11||style===7)for(const dx of [-1,1]){
   const at={x:x+dx,y:y+1,z};
   try{if(d.getBlock(at)?.isAir)d.setBlockType(at,style===11?TOPS[r][11]:block);}catch{}
  }
 }
 function placeDeepLandmark(d,realm,index){
  const [x,z]=DEEP_SITES[realm][index];let y=heightFor(realm,x,z);
  if(y<0){
   if(realm!==6)return;
   y=103;d.fillBlocks(new BlockVolume({x:x-5,y,z:z-5},{x:x+5,y,z:z+5}),'hakkai:cloudstone');
  }
  const stone=realm===6?'hakkai:cloudstone':realm===7?'hakkai:clockstone':TOPS[realm][11];
  const accent=realm===5?'hakkai:moonstone':realm===4?'hakkai:storm_crystal':realm===3?'hakkai:frost_crystal':realm===6?'hakkai:sky_crystal':realm===7?'hakkai:timeglass':stone;
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===5)d.setBlockType({x:x+dx,y,z:z+dz},stone);
  const towerH=9+(realm+index)%4*2;
  for(const dx of [-3,3])for(const dz of [-3,3])d.fillBlocks(new BlockVolume({x:x+dx,y:y+1,z:z+dz},{x:x+dx,y:y+towerH,z:z+dz}),stone);
  for(let dx=-3;dx<=3;dx++)d.setBlockType({x:x+dx,y:y+towerH,z:z-3},accent);
  d.setBlockType({x,y:y+towerH+1,z},accent);
 }
 function* buildSector(task){
  const {realm,cx,cz,key}=task,d=task.dimension;
  if(!chunkLoaded(d,cx,cz))return;
  const x0=cx*CHUNK,z0=cz*CHUNK,x1=x0+CHUNK-1,z1=z0+CHUNK-1;
  if(isReserved(realm,x0,z0,x1,z1))return;
  const envelope=new BlockVolume({x:x0,y:MIN_Y,z:z0},{x:x1,y:MAX_Y,z:z1});
  if(d.containsBlock(envelope,{excludeTypes:['minecraft:air']})){
   property(world,skipKey(realm,cx,cz),1);
   return;
  }
  for(let x=x0;x<=x1;x++){
   for(let z=z0;z<=z1;z++){
    const top=heightFor(realm,x,z);
    if(top<0)continue;
    const mat=surfaceFor(realm,x,z,top);
    if(realm===6){
     const depth=5+Math.floor(hash(x,z,realm,251)*4);
     d.fillBlocks(new BlockVolume({x,y:top-depth,z},{x,y:top-2,z}),mat.rock);
     d.setBlockType({x,y:top-1,z},mat.sub);
     d.setBlockType({x,y:top,z},mat.top);
    }else{
     const depth=realm===5?16+Math.floor(hash(x,z,realm,257)*5):20+Math.floor(hash(x,z,realm,257)*9);
     const bottom=Math.max(MIN_Y+2,top-depth);
     d.fillBlocks(new BlockVolume({x,y:bottom,z},{x,y:top-2,z}),mat.rock);
     d.setBlockType({x,y:top-1,z},mat.sub);
     d.setBlockType({x,y:top,z},mat.top);
     if(realm===5){
      const roofY=124+Math.round(noise(x,z,23,realm,269)*4);
      if(noise(x,z,17,realm,271)>-.48){
       d.fillBlocks(new BlockVolume({x,y:roofY-2,z},{x,y:roofY,z}),'minecraft:deepslate');
       if(hash(x,z,realm,277)>.94)d.setBlockType({x,y:roofY-1,z},'minecraft:glow_lichen');
      }
     }
    }
    yield;
   }
  }
  placeTree(d,realm,cx,cz);
  placeBiomeFeature(d,realm,cx,cz);
  for(let i=0;i<3;i++){
   const [sx,sz]=DEEP_SITES[realm][i];
   if(Math.floor(sx/CHUNK)===cx&&Math.floor(sz/CHUNK)===cz)placeDeepLandmark(d,realm,i);
  }
  // 草原・森・雪原に小さな自然の彩りを足す（バニラの植物だけを使用）。
  if(realm===0||realm===1||realm===3){
   for(let i=0;i<5;i++){
    const x=x0+1+Math.floor(hash(cx*7+i,cz*11,realm,281)*14);
    const z=z0+1+Math.floor(hash(cx*13,cz*5+i,realm,283)*14);
    const y=heightFor(realm,x,z);
    if(y<0)continue;
    const top=d.getBlock({x,y,z}),above=d.getBlock({x,y:y+1,z});
    if(!top||!above?.isAir)continue;
    const flowers=realm===3?['minecraft:short_grass','minecraft:fern']:['minecraft:dandelion','minecraft:azure_bluet','minecraft:oxeye_daisy','minecraft:pink_petals'];
    const type=flowers[Math.floor(hash(x,z,realm,293)*flowers.length)];
    try{d.setBlockType({x,y:y+1,z},type);}catch{}
   }
  }
  property(world,key,1);
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
   // 移動前の遠い未処理区画を捨て、現在の視界に近い順へ並べ直す。
   for(let i=queue.length-1;i>=0;i--){
    const q=queue[i];
    if(q.realm!==realm||Math.max(Math.abs(q.cx-cx),Math.abs(q.cz-cz))>VIEW+2){
     queue.splice(i,1);queued.delete(q.key);
    }else q.dist=(q.cx-cx)*(q.cx-cx)+(q.cz-cz)*(q.cz-cz);
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
 return {tick,biomeAt,isGenerated};
}
