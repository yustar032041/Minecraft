// Stable spell order: 8 base attributes, 5 combinations, 5 special spells.
// Indices deliberately match learned_spells and the existing magic catalogue.
export function tomeSpells(attrs,pairs){
 return [...attrs.slice(0,8).map((label,a)=>({label,a,b:-1})),...pairs,
  {label:'光の矢（魔力5）',a:5,b:-1,special:'light'},
  {label:'絆の灯（魔力20）',a:0,b:1,special:'bond'},
  {label:'風の輪（魔力8）',a:0,b:-1,special:'wind'},
  {label:'水の縛り（魔力10）',a:1,b:-1,special:'water'},
  {label:'炎の環（魔力12）',a:2,b:-1,special:'fire'}];
}
// Visiting a realm is no longer a prerequisite for any tome spell. Keep
// stable indices so old selections and learned-spell records still work.
export function tomeUnlocked(spell){return !!spell;}
export function tomeCurrent(list,index){
 if(Number.isInteger(index)&&index>=0&&index<list.length&&tomeUnlocked(list[index]))return index;
 return list.findIndex(tomeUnlocked);
}
export function tomeNext(list,index){
 if(!list.length)return -1;
 const current=tomeCurrent(list,index);if(current<0)return -1;
 for(let n=1;n<=list.length;n++){const i=(current+n)%list.length;if(tomeUnlocked(list[i]))return i;}
 return -1;
}
// Track crouch edges globally, not only while holding the tome: equipping it
// while already crouched must not spuriously advance the selection.
export function tomeCrouchTick(p,s,held,advance){
 const sneaking=!!p?.isSneaking,was=s.tomeSneaking;
 s.tomeSneaking=sneaking;
 if(was===false&&sneaking&&held==='hakkai:element_tome'&&!s.busy&&!s.menu)advance();
}

// Keep tome visits separate from the existing site/discovery progression.
// Realm 0 includes the hub, so merely reaching the realm is sufficient.
export function tomeRealm(dimensionId){
 const m=/^hakkai:realm_([0-7])$/.exec(dimensionId??'');return m?Number(m[1]):-1;
}
// Only unsaved visit bits live here. This is session memory, not durable
// storage; the leave event must clear it. No player object is retained.
const pendingTomeVisits=new Map();
const playerKey=player=>{try{return typeof player?.id==='string'&&player.id?player.id:undefined;}catch{return undefined;}};
export function clearTomePending(playerId){if(typeof playerId==='string')pendingTomeVisits.delete(playerId);}
export function hasPendingTomeVisits(player){const key=playerKey(player);return !!(key&&pendingTomeVisits.get(key));}
export function recordTomeRealm(player,dimensionId){
 const key=playerKey(player);
 if(dimensionId===undefined){try{dimensionId=player?.dimension?.id;}catch{}}
 const r=tomeRealm(dimensionId),bit=r<0?0:1<<r;
 let pending=(key?pendingTomeVisits.get(key):0)||0;pending|=bit;
 if(!pending)return false;
 if(key)pendingTomeVisits.set(key,pending);
 try{
  const old=Number(player.getDynamicProperty('hakkai:tome_realms_v1'))||0;
  const next=old|pending;
  if(next!==old)player.setDynamicProperty('hakkai:tome_realms_v1',next);
  // Remove only bits processed by this attempt, even if a callback were to
  // add more during the write. A write that throws is retried idempotently.
  if(key){const remaining=(pendingTomeVisits.get(key)||0)&~pending;if(remaining)pendingTomeVisits.set(key,remaining);else pendingTomeVisits.delete(key);}
  return next!==old;
 }catch{return false;}
}
export function hasTomeRealm(player,realm){
 if(!Number.isInteger(realm)||realm<0||realm>7)return false;
 try{if(tomeRealm(player?.dimension?.id)===realm)return true;}catch{}
 const key=playerKey(player);if(key&&((pendingTomeVisits.get(key)||0)&(1<<realm)))return true;
 try{return Boolean((Number(player.getDynamicProperty('hakkai:tome_realms_v1'))||0)&(1<<realm));}catch{return false;}
}
