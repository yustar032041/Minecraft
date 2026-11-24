// Autonomous, bounded construction on vacant village plots. It never clears blocks.
export const BUILDER_IDS=Array.from({length:8},(_,r)=>`hakkai:builder_${r}`);
export const BLUEPRINTS=[
 {id:'house',name:'小さな家',desc:'屋根と入口、作業台と収納樽。ベッドは別途設置。'},
 {id:'factory',name:'小さな加工場',desc:'屋外の破砕機・風力回転機・入出力樽。'},
 {id:'farm',name:'共同農場',desc:'囲われた水源、耕地と小麦の小さな畑。'},
 {id:'hall',name:'交流施設',desc:'屋根のある広場、樽・コンポスター・灯り。'},
 {id:'festival',name:'四季祭りの会場',desc:'四隅の灯りと中央の目印がある祭り広場。'}
];
const KEY='hakkai:builder_project_v1';
const HOME='hakkai:builder_home_v1',PAUSED='hakkai:builder_paused_v1';
export function builderHome(builder){try{const id=builder.getDynamicProperty(HOME);return Number.isInteger(id)?id:undefined;}catch{return undefined;}}
export function builderPaused(builder){try{return builder.getDynamicProperty(PAUSED)===1;}catch{return true;}}
export function setBuilderPaused(builder,paused){builder.setDynamicProperty(PAUSED,paused?1:0);}
// A town receives each type's prosperity credit once, even after a restart.
export function constructionCredit(data,kind){
 const i=BLUEPRINTS.findIndex(b=>b.id===kind);if(i<0)return undefined;
 const mask=Number.isInteger(data?.builderCredits)?data.builderCredits:0;if(mask&(1<<i))return undefined;
 return {...data,goods:Math.min(200,(data.goods??0)+8),builderCredits:mask|(1<<i)};
}
const point=(o,x,y,z)=>({x:o.x+x,y:o.y+y,z:o.z+z});
export function blueprint(id){
 const blocks=[],add=(x,y,z,type,states)=>blocks.push({x,y,z,type,...(states?{states}:{})});
 if(!BLUEPRINTS.some(p=>p.id===id))return [];
 for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)add(x,0,z,'minecraft:oak_planks');
 if(id==='festival'){
  for(const [x,z] of [[-3,-3],[3,-3],[3,3],[-3,3]]){add(x,1,z,'minecraft:oak_log');add(x,2,z,'minecraft:lantern');}
  add(0,1,0,'minecraft:gold_block');
 }else if(id==='farm'){
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
   if(Math.abs(x)===3||Math.abs(z)===3)add(x,1,z,'minecraft:stone_bricks');
   else if(x!==0||z!==0)add(x,1,z,'minecraft:farmland',{moisturized_amount:7});
  }
  add(0,1,0,'minecraft:water');
  for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)if(x||z)add(x,2,z,'minecraft:wheat');
 }else if(id==='factory'){
  // West input, east output and north wind rotor match existing machine logic.
  add(-1,1,0,'minecraft:barrel');add(1,1,0,'minecraft:barrel');
  add(0,1,1,'hakkai:wind_rotor');add(0,1,0,'hakkai:crusher');
  for(const [x,z] of [[-3,-3],[3,-3],[-3,3],[3,3]])add(x,1,z,'minecraft:lantern');
 }else{
  for(let y=1;y<=3;y++)for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
   const edge=Math.abs(x)===3||Math.abs(z)===3;
   if(id==='house'&&edge&&!(x===0&&z===3&&y<3))add(x,y,z, y===2&&(Math.abs(x)===3&&z===0||Math.abs(z)===3&&x===0&&z!==3)?'minecraft:glass':'minecraft:oak_planks');
   if(id==='hall'&&Math.abs(x)===3&&Math.abs(z)===3)add(x,y,z,'minecraft:oak_log');
  }
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)add(x,4,z,'minecraft:oak_planks');
  if(id==='house'){
   add(-1,1,-1,'minecraft:crafting_table');
   add(2,1,-2,'minecraft:barrel');
  }else{add(-2,1,-2,'minecraft:barrel');add(2,1,-2,'minecraft:composter');add(0,1,0,'minecraft:lantern');}
 }
 return blocks;
}
export function readBuilderProject(builder){
 try{
  const raw=builder.getDynamicProperty(KEY);if(raw===undefined)return undefined;
  const j=JSON.parse(raw),p=blueprint(j.kind);
  if(j.v!==1||!p.length||!Number.isInteger(j.i)||j.i<0||j.i>p.length||!['x','y','z'].every(k=>Number.isSafeInteger(j.at?.[k])&&Math.abs(j.at[k])<30000000)||typeof j.pending!=='boolean'||typeof j.done!=='boolean')return null;
  return j;
 }catch{return null;}
}
const save=(builder,job)=>builder.setDynamicProperty(KEY,JSON.stringify(job));
// Never treat containers, mechanisms or decorative player flooring as a lot.
const NATURAL_GROUND=new Set(['minecraft:grass_block','minecraft:dirt','minecraft:stone','minecraft:gravel','minecraft:moss_block','minecraft:sandstone','minecraft:snow_block','minecraft:tuff','minecraft:deepslate','hakkai:cloudstone','hakkai:clockstone']);
const safeGround=b=>Boolean(b&&b.isSolid&&!b.isLiquid&&NATURAL_GROUND.has(b.typeId));
export function startBuilderProject(builder,kind,at,homeId,stage){
 if(!builder?.isValid||!BUILDER_IDS.includes(builder.typeId)||readBuilderProject(builder)!==undefined||!blueprint(kind).length||!['x','y','z'].every(k=>Number.isSafeInteger(at?.[k])))return 'invalid';
 const d=builder.dimension;
 if(!/^hakkai:realm_[0-7]$/.test(d.id)||d.id!==`hakkai:realm_${BUILDER_IDS.indexOf(builder.typeId)}`||Math.hypot(builder.location.x-at.x,builder.location.y-at.y,builder.location.z-at.z)>48)return 'distance';
 try{
  // The floor stays untouched. Require a 7x7x5 work volume plus a
  // one-block air buffer; never force-load or clear terrain/buildings.
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
   if(Math.abs(x)<=3&&Math.abs(z)<=3){const floor=point(at,x,-1,z);if(!d.isChunkLoaded(floor)||!safeGround(d.getBlock(floor)))return 'floor';}
   for(let y=0;y<=5;y++){const p=point(at,x,y,z);if(!d.isChunkLoaded(p)||!d.getBlock(p)?.isAir)return 'blocked';}
  }
  save(builder,{v:1,kind,at:{...at},i:0,pending:false,done:false,homeId,stage});return 'ok';
 }catch{return 'unloaded';}
}
// At most one block per step. Persist intent before writing; never replace a
// non-air block. After interruption a matching pending block may be accepted.
// A missing/occupied/unloaded block suspends rather than deletes anything.
export function stepBuilderProject(builder,{resolve,report=()=>{},completed=()=>{}}){
 if(!builder?.isValid||!BUILDER_IDS.includes(builder.typeId))return 'invalid';
 const j=readBuilderProject(builder);if(!j)return j===null?'invalid':'idle';
 const plan=blueprint(j.kind),d=builder.dimension;
 if(j.done)return 'done';
 if(d.id!==`hakkai:realm_${BUILDER_IDS.indexOf(builder.typeId)}`||Math.hypot(builder.location.x-j.at.x,builder.location.y-j.at.y,builder.location.z-j.at.z)>16)return 'worker_far';
 try{
  if(!d.isChunkLoaded(j.at))return 'unloaded';
  const center={x:j.at.x+.5,y:j.at.y+2,z:j.at.z+.5};
  if(d.getEntities({location:center,maxDistance:9}).some(e=>e.isValid&&Math.abs(e.location.x-center.x)<4.1&&Math.abs(e.location.z-center.z)<4.1&&e.location.y>=j.at.y-2&&e.location.y<=j.at.y+5))return 'occupied';
  if(j.i>=plan.length){
   // Never report prosperity for a partially destroyed or failed build.
   for(const q of plan){const p=point(j.at,q.x,q.y,q.z);if(!d.isChunkLoaded(p))return 'unloaded';if(d.getBlock(p)?.typeId!==q.type)return 'incomplete';}
   // Mark complete before notifying/crediting: crash can lose credit, not duplicate it.
   j.done=true;save(builder,j);completed(builder,j);return 'complete';
  }
  const b=plan[j.i],at=point(j.at,b.x,b.y,b.z);
  if(!d.isChunkLoaded(at))return 'unloaded';
  const block=d.getBlock(at);if(!block)return 'unloaded';
  if(j.pending&&!block.isAir){
   if(block.typeId!==b.type)return 'blocked';
   j.pending=false;j.i++;save(builder,j);return 'recovered';
  }
  if(!block.isAir)return 'blocked';
  // Stop if a new block has appeared next to the intended placement. Only
  // earlier blocks of this exact project can occupy the 1-block buffer.
  const prior=new Map(plan.slice(0,j.i).map(q=>[`${q.x},${q.y},${q.z}`,q.type]));
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
   const rx=b.x+x,ry=b.y+y,rz=b.z+z;if(ry<0)continue;
   const q=point(j.at,rx,ry,rz);if(!d.isChunkLoaded(q))return 'unloaded';
   const neighbor=d.getBlock(q);if(!neighbor)return 'unloaded';
   if(!neighbor.isAir&&neighbor.typeId!==prior.get(`${rx},${ry},${rz}`))return 'blocked';
  }
  if(b.y===0){const floor=point(at,0,-1,0);if(!d.isChunkLoaded(floor)||!safeGround(d.getBlock(floor)))return 'floor';}
  if(b.type==='minecraft:wheat'){const below=point(at,0,-1,0);if(!d.isChunkLoaded(below)||d.getBlock(below)?.typeId!=='minecraft:farmland')return 'floor';}
  if(b.type==='minecraft:water'){
   for(const [x,y,z] of [[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){
    const q=point(at,x,y,z);if(!d.isChunkLoaded(q)||!d.getBlock(q)?.isSolid)return 'water_guard';
   }
  }
  j.pending=true;save(builder,j);
  if(b.states)block.setPermutation(resolve(b.type,b.states));else block.setType(b.type);
  j.pending=false;j.i++;save(builder,j);return 'placed';
 }catch(err){report('建築係',err);return 'error';}
}
export function clearBuilderProject(builder){try{builder.setDynamicProperty(KEY,undefined);return true;}catch{return false;}}
export function foundBuilder({site,world,dimension,num,property,findFloor,report}){
 if(!(site?.kind==='culture'||site?.id===59)||!world.gameRules.doMobSpawning||!num(world,`built_${site.id}`)||dimension.id!==`hakkai:realm_${site.dim}`)return false;
 const key=`builder_founded_${site.id}_v1`;if(num(world,key))return false;
 try{
  const at=findFloor(dimension,{x:site.x+12.5,y:88,z:site.z+8.5},4);
  if(!at||dimension.getPlayers({location:at,maxDistance:2,closest:1}).length||dimension.getEntities({location:at,maxDistance:1.5,closest:1}).length)return false;
  property(world,key,1);const e=dimension.spawnEntity(BUILDER_IDS[site.dim],at);e.setDynamicProperty(HOME,site.id);return true;
 }catch(err){report('建築係の生成',err);return false;}
}

// Only the one-time village founders receive a home ID; spawn eggs do not
// build automatically. Search a small number of candidate plots per call.
export function autoBuilderPlan(builder,{sites,world,num,property}){
 if(!builder?.isValid||builderPaused(builder)||readBuilderProject(builder)!==undefined)return 'idle';
 const id=builderHome(builder),site=sites.find(s=>s.id===id&&(s.id===59||s.kind==='culture'));
 if(!site||!num(world,`built_${id}`)||builder.dimension.id!==`hakkai:realm_${site.dim}`||builder.typeId!==BUILDER_IDS[site.dim])return 'no_home';
 const stage=num(world,`builder_stage_${id}_v1`);if(!Number.isInteger(stage)||stage<0||stage>=BLUEPRINTS.length)return 'finished';
 const limit=Math.floor(((site.size??45)-1)/2)-4,points=[];
 for(let x=-limit;x<=limit;x+=10)for(let z=-limit;z<=limit;z+=10)points.push({x:site.x+x,y:88,z:site.z+z});
 // Nearby plots first, while maintaining a bounded, persistent search cursor.
 points.sort((a,b)=>Math.hypot(a.x-builder.location.x,a.z-builder.location.z)-Math.hypot(b.x-builder.location.x,b.z-builder.location.z)||a.x-b.x||a.z-b.z);
 const cursor=Number(builder.getDynamicProperty('hakkai:builder_search_v1'))||0;
 for(let n=0;n<2;n++){
  const i=(cursor+n)%points.length,at=points[i];
  if(startBuilderProject(builder,BLUEPRINTS[stage].id,at,id,stage)==='ok'){
   builder.setDynamicProperty('hakkai:builder_search_v1',0);return 'started';
  }
 }
 builder.setDynamicProperty('hakkai:builder_search_v1',(cursor+2)%points.length);return 'searching';
}
