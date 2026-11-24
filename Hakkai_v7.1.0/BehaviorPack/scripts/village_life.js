// Small bounded shared village ledger. No direct block/entity creation here.
export const SEASON_NAMES=['春','夏','秋','冬'];
const REALM_NAMES=['草原','霧森','砂路','鏡湖','雷炉','地下庭','雲渡り','時結び'];
const CELEBRATIONS=[
 ['風花の種まき祭','風車の夏市','分けあう収穫祭','帰り灯の冬祭'],
 ['芽吹きの文祭','霧灯りの夏祭','手紙の収穫祭','苔灯の冬祭'],
 ['砂路の水分け祭','隊商の夕涼み','砂紋の実り市','旅人の焚火祭'],
 ['湖畔の芽吹き祭','鏡湖の涼風祭','湖の実り市','氷鏡の夜灯祭'],
 ['雷炉の春開き','雷雲の夕祭','鍛冶の実り市','炉守の冬灯祭'],
 ['灯苔の芽吹き祭','水脈の夏祭','地下庭の実り市','ひとつ残す灯祭'],
 ['雲花の春祭','風渡りの夏祭','雲橋の収穫祭','帰路の冬灯祭'],
 ['時結びの春祭','待合の夏市','駅の実り祭','再出発の冬祭']
];
const CROPS=[['minecraft:wheat','小麦',8],['minecraft:carrot','ニンジン',8],['minecraft:pumpkin','カボチャ',8],['minecraft:beetroot','ビートルート',8]];
const finite=(n,fallback=0)=>Number.isFinite(n)?Math.floor(n):fallback;
const bounded=(n,max)=>Math.min(max,Math.max(0,finite(n)));
const actor=name=>String(name??'旅人').replace(/[§\n\r\t]/g,'').slice(0,24)||'旅人';
export function seasonAt(day){day=Math.max(0,finite(day));const cycle=Math.floor(day/3),index=cycle%4;return {day,index,cycle,name:SEASON_NAMES[index],dayInSeason:day%3+1,year:Math.floor(cycle/4)+1};}
export function festivalAt(day,realm){const s=seasonAt(day),r=Math.max(0,Math.min(7,finite(realm)));return {...s,title:CELEBRATIONS[r][s.index],open:s.dayInSeason===2};}
export function dailyRequest(day,realm){const s=seasonAt(day),r=Math.max(0,Math.min(7,finite(realm))),[item,label,goal]=CROPS[s.index];return {day:s.day,item,label,goal,name:`${REALM_NAMES[r]}の${s.name}の持ち寄り`,amount:2};}
export function addVillageMemory(data,day,text,who=''){
 const history=Array.isArray(data.lifeHistory)?data.lifeHistory.filter(e=>e&&Number.isInteger(e.day)&&typeof e.text==='string').slice(-19):[];
 history.push({day:Math.max(0,finite(day)),text:String(text).replace(/[§\n\r\t]/g,'').slice(0,72),who:who?actor(who):''});
 return {...data,lifeHistory:history};
}
export function villageTier(data,buildings){
 const structures=bounded(buildings,4), quests=bounded(data.lifeQuests,30), festivals=bounded(data.lifeFestivals,30),recovery=bounded(data.lifeRecoveries,30),level=bounded(data.level,4);
 const points=structures*2+Math.min(quests,8)+Math.min(festivals,4)+Math.min(recovery,4)+level;
 const index=points>=12?3:points>=6?2:points>=2?1:0;
 return {points,index,name:['小さな集落','育つ村','にぎわう町','絆の交流中心'][index],structures};
}
export function requestStatus(data,day,realm){
 const q=dailyRequest(day,realm),record=data.lifeRequest;
 const count=record?.day===q.day?bounded(record.count,q.goal):0;
 return {...q,count,complete:count>=q.goal};
}
export function contributeRequest(data,day,realm,who){
 const q=requestStatus(data,day,realm);if(q.complete)return undefined;
 const n=Math.min(q.amount,q.goal-q.count),count=q.count+n,done=count===q.goal;
 let next={...data,lifeRequest:{day:q.day,count},...(done?{lifeQuests:bounded(data.lifeQuests,100000)+1,goods:Math.min(200,bounded(data.goods,200)+6)}:{})};
 next=addVillageMemory(next,q.day,done?`${q.name}を皆で達成（備蓄+6）`:`${q.label}を${n}個持ち寄った`,who);
 return {next,item:q.item,count:n,done};
}
export function festivalJoin(data,day,realm,id,name){
 const f=festivalAt(day,realm);if(!f.open||typeof id!=='string'||!id||id.length>256)return undefined;
 const previous=data.lifeFestivalCycle===f.cycle&&Array.isArray(data.lifeFestivalPeople)?data.lifeFestivalPeople.filter(x=>typeof x==='string').slice(0,32):[];
 if(previous.includes(id)||previous.length>=32)return undefined;
 let next={...data,lifeFestivalCycle:f.cycle,lifeFestivalPeople:[...previous,id]};
 if(!previous.length)next={...next,lifeFestivals:bounded(data.lifeFestivals,100000)+1,goods:Math.min(200,bounded(data.goods,200)+2)};
 return addVillageMemory(next,day,`${f.title}に参加${previous.length?'':'（村の備蓄+2）'}`,name);
}
export function donation(data,kind,day,name){
 if(!['food','wood'].includes(kind))return undefined;
 const key=kind==='food'?'lifeFood':'lifeWood',current=bounded(data[key],64);if(current>60)return undefined;
 const next=addVillageMemory({...data,[key]:current+4},day,`${kind==='food'?'小麦':'板材'}を共同備蓄に4個寄付`,name);
 return {next,item:kind==='food'?'minecraft:wheat':'minecraft:oak_planks',count:4};
}
// Abstract stocks come from real player donations, not physical transport.
export function workDay(data,day,{farmer=false,artisan=false,builder=false}={}){
 day=Math.max(0,finite(day));let next={...data},worked=false;
 if((farmer||artisan)&&bounded(next.lifeFood,64)>=2&&next.lifeFoodDay!==day&&bounded(next.goods,200)<=197){
  next.lifeFood=bounded(next.lifeFood,64)-2;next.goods=bounded(next.goods,200)+3;next.lifeFoodDay=day;worked=true;
  next=addVillageMemory(next,day,`${farmer?'畑守':'物資係'}が共同小麦を暮らしの備蓄に加工（+3）`);
 }
 if(builder&&bounded(next.lifeWood,64)>=2&&next.lifeWoodDay!==day&&bounded(next.goods,200)<=198){
  next.lifeWood=bounded(next.lifeWood,64)-2;next.goods=bounded(next.goods,200)+2;next.lifeWoodDay=day;worked=true;
  next=addVillageMemory(next,day,'建築係が共同板材を村の備蓄に整理（+2）');
 }
 return worked?next:undefined;
}
// An alert observes existing threats/weather; it never spawns attackers or
// damages terrain. Only one new alert per day; it persists until resolved.
export function detectCrisis(data,day,{monsters=0,rain=false}={}){
 day=Math.max(0,finite(day));if(data.lifeCrisis?.active||data.lifeCrisisDay===day)return undefined;
 const type=monsters>0?'monster':rain&&day%3===2?'storm':undefined;if(!type)return undefined;
 const next={...data,lifeCrisis:{active:true,type,day},lifeCrisisDay:day};
 return addVillageMemory(next,day,type==='monster'?'近くの魔物に警戒':'嵐の備えを呼びかけ');
}
export function recoverCrisis(data,day,{monsters=0,rain=false}={},name){
 const c=data.lifeCrisis;if(!c?.active||c.type==='monster'&&monsters>0||c.type==='storm'&&rain)return undefined;
 const next=addVillageMemory({...data,lifeCrisis:{...c,active:false},lifeRecoveries:bounded(data.lifeRecoveries,100000)+1,goods:Math.min(200,bounded(data.goods,200)+6)},day,'復興の資材を持ち寄った（備蓄+6）',name);
 return {next,item:'minecraft:oak_planks',count:4};
}
// Deduct a small exact amount from the player's actual inventory and save the
// shared ledger without yielding. Failed writes are rolled back best-effort;
// a crash/native failure cannot be guaranteed atomic across both stores.
export function depositToVillage(container,itemId,count,commit,report=()=>{}){
 if(!container||!Number.isInteger(count)||count<1)return false;
 let old,next,changed=[];
 try{
  old=Array.from({length:container.size},(_,i)=>container.getItem(i)?.clone());next=old.map(x=>x?.clone());let left=count;
  for(let i=0;i<next.length&&left;i++)if(next[i]?.typeId===itemId){const n=Math.min(left,next[i].amount);left-=n;changed.push(i);if(n===next[i].amount)next[i]=undefined;else next[i].amount-=n;}
  if(left)return false;
 }catch(e){report('村の寄付の事前確認',e);return false;}
 const writes=[];try{for(const i of changed){writes.push(i);container.setItem(i,next[i]);}commit();return true;}
 catch(e){let incomplete=false;for(const i of writes.reverse())try{container.setItem(i,old[i]);}catch(err){incomplete=true;report('村の寄付の復旧失敗',err);}report(incomplete?'村の寄付失敗（復旧要確認）':'村の寄付失敗（復旧を試行）',e);return false;}
}
// Explicitly registered village barrels only: no search of arbitrary player
// inventories and no block edits. Workers must actually be near both barrels.
export function validWorkshop(t,setup){
 const a=setup?.input,b=setup?.output,coord=p=>p&&['x','y','z'].every(k=>Number.isSafeInteger(p[k])&&Math.abs(p[k])<30000000);
 if(!coord(a)||!coord(b)||a.x===b.x&&a.y===b.y&&a.z===b.z)return false;
 const distance=(u,v)=>Math.hypot(u.x-v.x,u.y-v.y,u.z-v.z),limit=t.factoryVillage?50:28;
 return distance(a,b)<=4&&distance(t.l,a)<=limit&&distance(t.l,b)<=limit;
}
export function workshopStep(t,setup,{ItemStack,factoryTransaction,factoryResidentRole,friendlyResidentById,onCraft=()=>{},report=()=>{}}){
 if(!validWorkshop(t,setup))return undefined;
 const d=t.d,a=setup.input,b=setup.output;
 try{
  if(!d.isChunkLoaded(a)||!d.isChunkLoaded(b))return undefined;
  const west=d.getBlock(a),east=d.getBlock(b);if(west?.typeId!=='minecraft:barrel'||east?.typeId!=='minecraft:barrel')return undefined;
  const input=west.getComponent('minecraft:inventory')?.container,output=east.getComponent('minecraft:inventory')?.container;
  if(!input||!output||input===output)return undefined;
  const workers=d.getEntities({location:a,maxDistance:6,closest:32}).filter(e=>e.isValid&&Math.hypot(e.location.x-b.x,e.location.y-b.y,e.location.z-b.z)<=6);
  const artisan=workers.some(e=>friendlyResidentById.get(e.typeId)?.role==='artisan');
  const saw=t.factoryVillage&&workers.some(e=>e.typeId==='minecraft:villager_v2'&&factoryResidentRole(e)==='saw'&&!e.getComponent('minecraft:is_baby'));
  const candidates=[];
  if(artisan)candidates.push({cost:'minecraft:wheat',need:3,product:'minecraft:bread',amount:1,label:'物資係が小麦3個からパン1個を作った'});
  if(saw)candidates.push({cost:'minecraft:oak_log',need:1,product:'minecraft:oak_planks',amount:4,label:'製材係が原木1個から板材4個を作った'});
  for(const r of candidates)if(factoryTransaction({input,output,costs:[{id:r.cost,count:r.need}],product:new ItemStack(r.product,r.amount),commitExternal:()=>onCraft(r.label),report}))return r.label;
 }catch(e){report('住人の共同工房',e);}
}
