// Separate custom mobs: never replace or re-texture existing vanilla villagers.
// Catalog order and IDs are stable; each realm has four different professions.
const REALMS=[
 ['風車','風の粉と収穫を分ける草原の人々。','minecraft:bread','パン',2],
 ['霧森','手紙と灯りを守る森の人々。','minecraft:apple','リンゴ',2],
 ['砂路','水と帰り道を大切にする隊商の人々。','minecraft:baked_potato','ベイクドポテト',3],
 ['鏡湖','氷の下の水と湖の灯りを見守る人々。','minecraft:cooked_salmon','焼きサケ',2],
 ['雷炉','嵐を避け、橋と炉を直す断崖の人々。','minecraft:iron_ingot','鉄インゴット',2],
 ['灯苔','次の旅人のために光を残す地下の人々。','minecraft:torch','たいまつ',8],
 ['雲渡り','風を読み、仲間を待って橋を渡る人々。','minecraft:feather','羽根',4],
 ['時結び','遅れた旅人を待ち、帰り道を確かめる駅の人々。','minecraft:clock','時計',1]
];
const JOBS=[
 {role:'guide',name:'道案内',description:'近くの冒険者に短い移動速度の支援。敵から逃げます。'},
 {role:'healer',name:'手当て係',description:'近くで傷ついた冒険者に短い再生効果。敵から逃げます。'},
 {role:'artisan',name:'物資係',description:'エメラルドと土地の品を交換します。敵から逃げます。'},
 {role:'guard',name:'見守り兵',description:'近くの敵対モブを見つけると守るため戦います。クリーパーは追いません。'}
];
export const FRIENDLY_RESIDENTS=REALMS.flatMap(([prefix,lore,item,itemName,count],realm)=>JOBS.map((job,index)=>({
 ...job,id:`hakkai:resident_${realm}_${index}`,realm,index,name:`${prefix}の${job.name}`,lore,item,itemName,count
})));
export const friendlyResidentById=new Map(FRIENDLY_RESIDENTS.map(x=>[x.id,x]));
// Independent marker: upgrades add new residents without changing previous
// residents, buildings, trade data, or mob-spawning gamerules.
export function foundFriendlyResident({site,world,dimension,num,property,findFloor,report}){
 if(site?.kind!=='culture'||!world.gameRules.doMobSpawning||!num(world,`built_${site.id}`)||dimension.id!==`hakkai:realm_${site.dim}`)return false;
 const key=`friendly_residents_${site.id}_v1`,i=num(world,key);
 if(!Number.isInteger(i)||i<0||i>=4)return false;
 try{
  const at=findFloor(dimension,{x:site.x+[-8,-4,4,8][i]+.5,y:88,z:site.z+8.5},4);
  if(!at||dimension.getPlayers({location:at,maxDistance:2,closest:1}).length||dimension.getEntities({location:at,maxDistance:1.5,closest:1}).length)return false;
  property(world,key,i+1); // reserve before spawn: uncertain failure never duplicates
  dimension.spawnEntity(FRIENDLY_RESIDENTS[site.dim*4+i].id,at);
  return true;
 }catch(err){report('八界の友好住人',err);return false;}
}
// Bounded player-centered scan, no world blocks or inventories are modified.
// Cooldowns are per player; don't overwrite existing effects from other sources.
export function friendlySupportTick(player,state,tick){
 if(tick<(state.friendlyScanAt??0))return;
 state.friendlyScanAt=tick+40;
 let nearby;try{nearby=player.dimension.getEntities({families:['hakkai_resident'],location:player.location,maxDistance:6,closest:12});}catch{return;}
 const jobs=new Set(nearby.filter(e=>e.isValid).map(e=>friendlyResidentById.get(e.typeId)?.role));
 if(jobs.has('guide')&&tick>=(state.friendlyGuideAt??0))try{
  if(!player.getEffect('speed')){player.addEffect('speed',120,{amplifier:0,showParticles:false});state.friendlyGuideAt=tick+600;}
 }catch{}
 if(jobs.has('healer')&&tick>=(state.friendlyHealAt??0))try{
  const hp=player.getComponent('minecraft:health');
  if(hp&&hp.currentValue<hp.effectiveMax&&!player.getEffect('regeneration')){
   player.addEffect('regeneration',100,{amplifier:0,showParticles:false});state.friendlyHealAt=tick+1200;
  }
 }catch{}
}
// Single-container exchange, planned before writes; rollback is best effort.
export function friendlyTrade(container,product,report=()=>{}){
 if(!container||!product||!Number.isInteger(product.amount)||product.amount<1)return false;
 const clone=i=>i?.clone();let old,next;
 try{
  old=Array.from({length:container.size},(_,i)=>clone(container.getItem(i)));next=old.map(clone);
  const pay=next.findIndex(i=>i?.typeId==='minecraft:emerald');if(pay<0)return false;
  if(next[pay].amount===1)next[pay]=undefined;else next[pay].amount--;
  const changed=new Set([pay]);let left=product.amount;
  for(let i=0;i<next.length&&left;i++)if(next[i]&&next[i].isStackableWith(product)){
   const n=Math.min(left,next[i].maxAmount-next[i].amount);if(n>0){next[i].amount+=n;left-=n;changed.add(i);}
  }
  for(let i=0;i<next.length&&left;i++)if(!next[i]){
   const n=Math.min(left,product.maxAmount),item=clone(product);item.amount=n;next[i]=item;left-=n;changed.add(i);
  }
  if(left)return false;
  const writes=[];
  try{for(const i of changed){writes.push(i);container.setItem(i,next[i]);}return true;}
  catch(err){let incomplete=false;for(const i of writes.reverse())try{container.setItem(i,old[i]);}catch(e){incomplete=true;report('住人の交換復旧失敗',e);}
   report(incomplete?'住人の交換失敗（復旧要確認）':'住人の交換失敗（復旧を試行）',err);return false;}
 }catch(err){report('住人の交換事前確認',err);return false;}
}
