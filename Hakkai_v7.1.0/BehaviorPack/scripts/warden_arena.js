import { BlockVolume, GameMode, Difficulty, EquipmentSlot } from '@minecraft/server';

export const WARDEN_DIMENSION='hakkai:warden_arena';
const BUILT='warden_arena_built_v1',BOSS='hakkai:time_warden';
const PEARL_NAMES=['風','霧','砂','氷','雷','闇','空','時'];
// Inventory only: chests and items dropped on the ground are not counted.
export function challengeMaterials(p,space,total){
 try{
  const inventory=space(p);if(!inventory)return undefined;
  const off=p.getComponent?.('minecraft:equippable')?.getEquipment(EquipmentSlot.Offhand)?.typeId;
  const has=id=>total(inventory,id)>0||off===id;
  return {pearls:PEARL_NAMES.map((name,i)=>({name,held:has(`hakkai:pearl_${i}`)})),totem:has('hakkai:fushi_totem')};
 }catch{return undefined;}
}
function challengeMaterialText(p,space,total){
 const m=challengeMaterials(p,space,total);
 if(!m)return '§7持ち物を確認できません。必要素材はパール8種とトーテムです。';
 const pearls=m.pearls.map(x=>`${x.held?'§a◆':'§7◇'}${x.name}`).join('  ');
 return `§b持ち物の確認（箱の中は含みません）\n${pearls}\n${m.totem?'§a◆':'§7◇'} FUSHIのトーテム`;
}
export function setupWardenArena({world,system,num,property,notice,report,loaded,safe,safeNear,point,parsePoint,returnNatural,form,total,space}){
 let building=false;
 const rescueAt=new Map();
 function fill(d,from,to,id){d.fillBlocks(new BlockVolume(from,to),id);}
 function ensureArena(d){
  if(num(world,BUILT))return true;
  if(building)return false;
  const from={x:-17,y:78,z:-17},to={x:17,y:97,z:17};
  if(d.getPlayers().some(p=>Math.abs(p.location.x)<=17&&Math.abs(p.location.z)<=17&&p.location.y>=76&&p.location.y<=98))return false;
  if(d.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']}))return false;
  building=true;
  try{
   // All checks and writes are synchronous; no existing non-air blocks or
   // players are touched. A partial failure is never automatically overwritten.
   fill(d,{x:-16,y:79,z:-16},{x:16,y:79,z:16},'hakkai:clockstone');
   fill(d,{x:-16,y:80,z:-16},{x:-16,y:95,z:16},'hakkai:clockstone');
   fill(d,{x:16,y:80,z:-16},{x:16,y:95,z:16},'hakkai:clockstone');
   fill(d,{x:-15,y:80,z:-16},{x:15,y:95,z:-16},'hakkai:clockstone');
   fill(d,{x:-15,y:80,z:16},{x:15,y:95,z:16},'hakkai:clockstone');
   fill(d,{x:-16,y:96,z:-16},{x:16,y:96,z:16},'hakkai:clockstone');
   for(const x of [-12,12])for(const z of [-12,12])d.setBlockType({x,y:95,z},'minecraft:sea_lantern');
   property(world,BUILT,1);return true;
  }finally{building=false;}
 }
 function arenaUnlocked(p){return total(space(p),'hakkai:warden_sigil')>0||Boolean(parsePoint(p,'warden_return'));}
 async function enter(p){
  if(!p.isValid||p.getGameMode()===GameMode.Spectator||!arenaUnlocked(p))return false;
  let d;
  try{
   d=world.getDimension(WARDEN_DIMENSION);
   return await loaded(d,{x:-17,y:78,z:-17},{x:17,y:97,z:17},async()=>{
    if(!p.isValid||p.dimension.id===WARDEN_DIMENSION||!arenaUnlocked(p)||!ensureArena(d)){
     if(p.isValid)notice(p,'§e闘技場を安全に準備できませんでした。既存ブロックは変更しません。');return false;
    }
    if(!safe(p.dimension,p.location)){notice(p,'§e帰還できる安全な足場から挑戦してください');return false;}
    let at;
    for(const [dx,dz] of [[0,0],[4,0],[-4,0],[0,-4]]){
     const candidate=safeNear(d,{x:.5+dx,y:80,z:12.5+dz},1);
     if(candidate&&!d.getPlayers({location:candidate,maxDistance:2,closest:1}).length&&
         !d.getEntities({type:BOSS,location:candidate,maxDistance:3,closest:1}).length){at=candidate;break;}
    }
    if(!at){notice(p,'§e闘技場の到着地点が塞がれています');return false;}
    // Save the actual origin only immediately before teleport; on failure,
    // restore the previous record rather than stranding a returning player.
    const old=p.getDynamicProperty('hakkai:warden_return');
    property(p,'warden_return',JSON.stringify(point(p)));
    let moved=false;
    try{moved=p.tryTeleport(at,{dimension:d,checkForBlocks:true});}catch{}
    if(!moved){property(p,'warden_return',old);notice(p,'§e闘技場へ移動できませんでした');return false;}
    notice(p,'§d時空の闘技場に到着。挑戦印かサバイバル実践ガイドから戻れます。');
    return true;
   });
  }catch(err){if(p.isValid)notice(p,'§e闘技場を準備できませんでした');report('時空闘技場の準備',err);return false;}
 }
 function summon(p){
  if(!p.isValid||p.dimension.id!==WARDEN_DIMENSION||p.getGameMode()===GameMode.Spectator)return false;
  if(world.getDifficulty()===Difficulty.Peaceful){notice(p,'§eピースフルでは挑戦を開始しません');return false;}
  const d=p.dimension;
  try{
   if(d.getEntities({type:BOSS}).length){notice(p,'§e管理者はすでに闘技場にいます');return false;}
   const center={x:.5,y:80,z:-6.5};
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    const q={x:center.x+dx,y:center.y,z:center.z+dz};
    if(!safe(d,q)||!d.getBlock({x:Math.floor(q.x),y:q.y+2,z:Math.floor(q.z)})?.isAir){notice(p,'§e召喚場所が塞がれています');return false;}
   }
   if(d.getPlayers({location:center,maxDistance:5,closest:1}).length){notice(p,'§e召喚地点から5ブロック以上離れてください');return false;}
   d.spawnEntity(BOSS,center);notice(p,'§c時空の管理者が現れた。予告された範囲から離れよう。');return true;
  }catch(err){report('時空の管理者召喚',err);notice(p,'§e召喚に失敗しました');return false;}
 }
 // Best effort safety net for a player who falls below the arena. It does
 // not grant invulnerability or promise to prevent void damage / death.
 function rescuePlayer(p,t){
  if(!p?.isValid||p.dimension.id!==WARDEN_DIMENSION||p.getGameMode()===GameMode.Spectator||p.getGameMode()===GameMode.Creative||p.location.y>=75)return false;
  if(t<(rescueAt.get(p.id)??0))return false;
  rescueAt.set(p.id,t+20);
  try{
   const d=p.dimension;
   for(const [x,z] of [[.5,12.5],[4.5,12.5],[-3.5,12.5],[.5,8.5]]){
    const target={x,y:80,z};
    if(!d.isChunkLoaded(target))continue;
    const at=safeNear(d,target,1);if(!at)continue;
    if(d.getPlayers({location:at,maxDistance:2}).some(other=>other.id!==p.id))continue;
    if(d.getEntities({type:BOSS,location:at,maxDistance:4,closest:1}).length)continue;
    if(p.tryTeleport(at,{dimension:d,checkForBlocks:true})){
     try{p.clearVelocity();}catch{}
     notice(p,'§b闘技場の安全な足場へ戻りました');return true;
    }
   }
  }catch(err){report('闘技場の救出',err);}
  return false;
 }
 function clearPlayer(id){rescueAt.delete(id);}
 async function open(p){
  if(!p.isValid||p.getGameMode()===GameMode.Spectator)return;
  if(p.dimension.id===WARDEN_DIMENSION){
   const choice=await form(p,'§d時空の闘技場','§7現在のボスを倒した後は再戦できます。戻ると入口の元の場所へ帰ります。\n§b管理者の核＋時の結晶＋虹の欠片＋対応するネザライト防具・剣・斧・ツルハシを作業台で合わせると、対応する終刻装備を作れます。元の装備のエンチャント等は引き継ぎません。\n§e試作パリィ：予告範囲内で、直前にしゃがみ近接攻撃。スタミナ15が必要。三連撃は各回に予告。光の輪や弾・回る刃が動いて当たります。最大2技を同時予告。形態別40パターン、第五形態は全200パターンを使用。いずれも試作です。',[
    ['§b元の場所へ戻る'],['§c時空の管理者に挑む'],['§8閉じる']]);
   if(choice===0&&p.isValid&&p.dimension.id===WARDEN_DIMENSION){if(!parsePoint(p,'warden_return'))return notice(p,'§e帰還地点がありません。帰還石をご利用ください');return returnNatural(p,'warden_return');}
   if(choice===1&&p.isValid)return summon(p);
   return;
  }
  if(!arenaUnlocked(p)){
   return form(p,'§d時空の闘技場',`${challengeMaterialText(p,space,total)}\n\n§7各界のエンダーマンからパール、チーフとの交換・友好などでトーテムを入手。8種とトーテムを作業台で合わせて挑戦印を作ります。素材は消費されるため、帰還に使うパールは別に確保してください。\n§eトーテムの復活は試作・実機未検証です。`,[['閉じる']]);
  }
  const choice=await form(p,'§d時空の闘技場','§7安全な現在地を帰還先に記録して入場します。死亡後はこのガイドから再入場できます。\n§e管理者と闘技場は試作です。',[['§d闘技場へ入る'],['§8閉じる']]);
  if(choice===0&&p.isValid&&p.dimension.id!==WARDEN_DIMENSION)return enter(p);
 }
 return {open,enter,summon,rescuePlayer,clearPlayer};
}
