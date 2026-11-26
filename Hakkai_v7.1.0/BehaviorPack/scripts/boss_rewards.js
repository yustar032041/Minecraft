// Major bosses and progression encounters use individual rewards instead of shared entity loot.
export const COOP_BOSS_REWARDS=Object.freeze({
 'hakkai:eclipse_colossus':Object.freeze({property:'eclipse_colossus_clear',name:'終焉の八界王',items:[['hakkai:eclipse_core',1],['hakkai:drop_element_7',1]]}),
 'hakkai:time_warden':Object.freeze({property:'time_warden_clear',name:'時空の管理者',items:[['hakkai:warden_core',1],['hakkai:crystal_7',4]]}),
 'hakkai:fushi_chief':Object.freeze({name:'FUSHIのチーフ',items:[['hakkai:crystal_7',2],['hakkai:fushi_totem',1]]}),
 ...Object.fromEntries(['風','霧','砂','氷','雷','闇','空','時'].map((name,i)=>[`hakkai:ender_${i}`,Object.freeze({name:`${name}渡りのエンダーマン`,items:[[`hakkai:pearl_${i}`,1]]})]))
});
export function awardCoopBoss(e,players,{property,giveStatus,ItemStack,report}){
 const definition=COOP_BOSS_REWARDS[e?.typeId];if(!definition)return;
 for(const player of players)try{
  // A failed delivery never rolls back the player's participation record.
  let recorded=true;
  if(definition.property)try{property(player,definition.property,1);}catch(err){recorded=false;report('協力討伐の記録',err);}
  let dropped=false,failed=false;
  for(const [id,n] of definition.items){
   let delivered=false,status='error';
   try{status=giveStatus(player,id,n);delivered=status==='ok';}catch(err){report('協力報酬の受取',err);}
   // Only a known capacity failure is safe to retry as a ground drop. A write
   // exception may have changed inventory despite best-effort restoration.
   if(status==='full')try{player.dimension.spawnItem(new ItemStack(id,n),player.location);delivered=true;dropped=true;}catch(err){report('協力報酬の落下',err);}
   if(!delivered)failed=true;
   if(status!=='ok'&&status!=='full')break; // unknown inventory state; do not write more rewards
  }
  const status=!definition.property?'':recorded?'討伐を記録しました。':'討伐記録の保存に失敗しました。';
  try{player.sendMessage(failed?`§e${definition.name}：${status}一部の報酬を届けられませんでした。持ち物と記録を確認し、必要なら再戦してください。`:`§6${definition.name}：${status}報酬を受け取りました。${dropped?'満杯分は足元に落ち、他の人も拾えます。':''}`);}catch{}
 }catch(err){report('協力報酬の記録',err);}
}
