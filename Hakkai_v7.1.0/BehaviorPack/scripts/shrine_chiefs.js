// A shrine may replace its own chief only after a recorded death. Never infer
// death from an unloaded or missing entity: that could create duplicates.
const HOME='hakkai:shrine_chief_home_v1', PREFIX='hakkai:shrine_chief_v1_';
const key=(cx,cz)=>`${PREFIX}${cx}_${cz}`;
const validHome=h=>Number.isInteger(h?.cx)&&Number.isInteger(h?.cz)&&Number.isInteger(h?.y)&&h.y>=44&&h.y<=142;
export function setupShrineChiefs({world,report=()=>{}}){
 const active=new Map(),nextScan=new Map();
 function read(h){
  const raw=world.getDynamicProperty(key(h.cx,h.cz));if(typeof raw!=='string')return undefined;
  const s=JSON.parse(raw);return validHome(s)&&s.cx===h.cx&&s.cz===h.cz?s:undefined;
 }
 function write(s){world.setDynamicProperty(key(s.cx,s.cz),JSON.stringify(s));}
 function created(e,h){
  try{
   if(!e?.isValid||typeof e.id!=='string'||!e.id||!validHome(h))return false;
   const old=read(h);if(old)return false;
   // Both records are required for future tracking; failures never trigger
   // replacement and do not remove a live chief.
   e.setDynamicProperty(HOME,JSON.stringify(h));
   write({...h,status:'alive',id:e.id});active.set(e.id,h);return true;
  }catch(err){report('社のチーフ登録',err);return false;}
 }
 function onLoad(e){
  try{
   if(!e?.isValid||e.typeId!=='hakkai:fushi_chief')return;
   const raw=e.getDynamicProperty(HOME);if(typeof raw!=='string')return;
   const h=JSON.parse(raw);if(!validHome(h))return;
   const s=read(h);if(s?.status==='alive'&&s.id===e.id)active.set(e.id,h);
  }catch(err){report('社のチーフ読込',err);}
 }
 function onDeath(e){
  try{
   const h=active.get(e?.id);if(!h)return;
   const s=read(h),now=world.getAbsoluteTime();
   if(s?.status!=='alive'||s.id!==e.id||!Number.isFinite(now)||now<0)return;
   write({...h,status:'dead',deathAt:now});
  }catch(err){report('社のチーフ討伐記録',err);}
  finally{active.delete(e?.id);}
 }
 function safe(d,h){
  const x=h.cx*16+8,z=h.cz*16+8,y=h.y,centre={x:x+.5,y:y+1,z:z+.5};
  if(d.getPlayers({location:centre,maxDistance:12,closest:1}).length)return false;
  if(d.getEntities({type:'hakkai:fushi_chief',location:centre,maxDistance:56,closest:1}).length)return false;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=0;dy<=3;dy++){
   const at={x:x+dx,y:y+dy,z:z+dz};if(!d.isChunkLoaded(at))return false;
   const b=d.getBlock(at);if(!b)return false;
   if(dy===0){if(!b.isSolid||b.isLiquid||/magma|cactus|campfire|powder_snow/.test(b.typeId))return false;}
   else if(!b.isAir)return false;
  }
  return true;
 }
 function tick(p,t){
  if(!p?.isValid||p.dimension.id!=='hakkai:realm_7'||t<(nextScan.get(p.id)??0))return;
  nextScan.set(p.id,t+100);
  try{
   if(!world.gameRules?.doMobSpawning)return;
   const d=p.dimension,now=world.getAbsoluteTime(),cx=Math.floor(p.location.x/16),cz=Math.floor(p.location.z/16);
   if(!Number.isFinite(now))return;
   for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
    const s=read({cx:cx+dx,cz:cz+dz});
    if(s?.status!=='dead'||!Number.isFinite(s.deathAt)||now-s.deathAt<24000||!safe(d,s))continue;
    // Write the reservation before spawning. If spawn or a later write fails,
    // keep the reservation instead of risking duplicate persistent entities.
    write({...s,status:'reserved'});
    const home={cx:s.cx,cz:s.cz,y:s.y},at={x:s.cx*16+8.5,y:s.y+1,z:s.cz*16+8.5};
    const e=d.spawnEntity('hakkai:fushi_chief',at,{initialPersistence:true});
    e.setDynamicProperty(HOME,JSON.stringify(home));write({...home,status:'alive',id:e.id});active.set(e.id,home);
    return; // limit one summon per scan
   }
  }catch(err){report('社のチーフ再出現',err);}
 }
 return {created,onLoad,onDeath,onRemove:id=>active.delete(id),tick,clearPlayer:id=>nextScan.delete(id)};
}
