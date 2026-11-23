import { GameMode, ItemStack } from '@minecraft/server';

// This checks time and lunar phase, not the actual sky above a block.
export function isMoonlitNight(world){
 try{const time=world.getTimeOfDay(),phase=world.getMoonPhase();return time>=13000&&time<23000&&Number.isInteger(phase)&&phase>=0&&phase<=7&&phase!==4;}catch{return false;}
}

// A player-broken bamboo block only. This is an additional rare reward, not
// a replacement for bamboo's normal drops or the chief's existing exchange.
export function setupMoonBamboo({world,isMoonGrove,random=Math.random,report=()=>{},onEligibleBreak=()=>{}}){
 const key='hakkai:moon_bamboo_totem_at';
 function onBreak({player,block,brokenBlockPermutation}){
  try{
   if(!player?.isValid||player.getGameMode()!==GameMode.Survival||player.dimension.id!=='hakkai:realm_7'||brokenBlockPermutation?.type?.id!=='minecraft:bamboo')return false;
   const at=block?.location;
   if(!at||!isMoonGrove(at))return false;
   if(!isMoonlitNight(world))return false;
   const now=world.getAbsoluteTime(),last=player.getDynamicProperty(key);
   if(!Number.isFinite(now)||now<0)return false;
   try{onEligibleBreak(player,now);}catch(err){report('月竹林の友好記録',err);}
   if(typeof last==='number'&&Number.isFinite(last)&&now-last<24000)return false;
   if(random()>=1/160)return false;
   // Reserve cooldown before spawning so an unavailable property store cannot
   // produce repeat rewards. Failed spawn restores the previous value if possible.
   player.setDynamicProperty(key,now);
   try{player.dimension.spawnItem(new ItemStack('hakkai:fushi_totem',1),{x:at.x+.5,y:at.y+.5,z:at.z+.5});}
   catch(err){try{player.setDynamicProperty(key,last);}catch{}report('月竹林の贈り物',err);return false;}
   try{player.dimension.spawnParticle('hakkai:climate_7',{x:at.x+.5,y:at.y+.5,z:at.z+.5});}catch{}
   try{player.sendMessage('§d月竹からFUSHIのトーテムが現れた！');}catch{}
   return true;
  }catch(err){report('月竹林の贈り物',err);return false;}
 }
 return {onBreak};
}
