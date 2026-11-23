// A small, persistent optional friendship quest; it does not remove bamboo
// and does not replace the chief's repeatable trade or combat reward.
const COUNT='hakkai:fushi_quest_bamboo',NIGHTS='hakkai:fushi_quest_nights',DAY='hakkai:fushi_quest_day',CLAIMED='hakkai:fushi_quest_claimed';
const read=(p,key)=>{const v=p.getDynamicProperty(key);return Number.isFinite(v)?v:0;};
export function setupFushiQuest({give,notice,report=()=>{}}){
 function progress(p,now){
  try{
   if(read(p,CLAIMED))return;
   const n=read(p,COUNT);if(n<16)p.setDynamicProperty(COUNT,n+1);
   const day=Math.floor(now/24000),old=p.getDynamicProperty(DAY),nights=read(p,NIGHTS);
   // Store day first; a failed night count write cannot credit the same night twice.
   if(nights<2&&(!Number.isFinite(old)||day>old)){
    p.setDynamicProperty(DAY,day);p.setDynamicProperty(NIGHTS,nights+1);
   }
  }catch(err){report('FUSHIの友好記録',err);}
 }
 function status(p){
  try{return {bamboo:Math.max(0,Math.min(16,read(p,COUNT))),nights:Math.max(0,Math.min(2,read(p,NIGHTS))),claimed:!!read(p,CLAIMED)};}
  catch{return {bamboo:0,nights:0,claimed:false};}
 }
 function claim(p){
  try{
   const s=status(p);
   if(s.claimed){notice(p,'§e友好の贈り物は受け取り済みです');return false;}
   if(s.bamboo<16||s.nights<2){notice(p,'§e月竹を16本採り、2夜の月夜を過ごそう');return false;}
   // Reserve before payout. A failure to save the claim cannot duplicate items.
   p.setDynamicProperty(CLAIMED,1);
   let paid=false;try{paid=give(p,'hakkai:fushi_totem',1);}catch(err){report('FUSHIの友好報酬',err);}
   if(!paid){try{p.setDynamicProperty(CLAIMED,undefined);}catch{}notice(p,'§e持ち物に空きを作ってね');return false;}
   notice(p,'§dFUSHIのチーフから友好のトーテムを受け取った！');return true;
  }catch(err){report('FUSHIの友好報酬',err);return false;}
 }
 return {progress,status,claim};
}
