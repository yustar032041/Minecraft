// A small, persistent optional friendship quest; it does not remove bamboo
// and does not replace the chief's repeatable trade or combat reward.
const COUNT='hakkai:fushi_quest_bamboo',NIGHTS='hakkai:fushi_quest_nights',DAY='hakkai:fushi_quest_day',CLAIMED='hakkai:fushi_quest_claimed';
const read=(p,key)=>{const v=p.getDynamicProperty(key);return Number.isFinite(v)?v:0;};
// claimReward must atomically plan the item and claimed property, with
// best-effort rollback on write failures; it returns the transaction result.
export function setupFushiQuest({claimReward,notice,report=()=>{}}){
 function progress(p,now){
  try{
   if(read(p,CLAIMED))return;
   const n=read(p,COUNT);if(n<16)p.setDynamicProperty(COUNT,n+1);
   const day=Math.floor(now/24000),old=p.getDynamicProperty(DAY),oldNights=p.getDynamicProperty(NIGHTS),nights=Number.isFinite(oldNights)?oldNights:0;
   if(nights<2&&(!Number.isFinite(old)||day>old)){
    try{p.setDynamicProperty(DAY,day);p.setDynamicProperty(NIGHTS,nights+1);}
    catch(err){
     // A write can mutate then throw. Try both snapshots even if one restore fails.
     for(const [key,value] of [[DAY,old],[NIGHTS,oldNights]])try{p.setDynamicProperty(key,value);}catch(restore){report('FUSHIの夜数復旧失敗',restore);}
     throw err;
    }
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
   const result=claimReward(p);
   if(result!=='ok'){
    notice(p,result==='full'?'§e持ち物に空きを作ってね':'§e友好報酬を受け取れません。持ち物と記録を確認してね');return false;
   }
   notice(p,'§dFUSHIのチーフから友好のトーテムを受け取った！');return true;
  }catch(err){report('FUSHIの友好報酬',err);return false;}
 }
 return {progress,status,claim};
}
