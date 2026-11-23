// Non-combat compatibility layer for the 72 expedition discoveries from v2.6.1.
// Keeps discovery records and rewards, while leaving the old combat-contract hooks disabled.
export function setupExpeditionRecords(ctx){
 const {ns,world,places,num,property,notice,form,give,drop,paged,simple,frontierWorlds}=ctx;
 const offsets=[[22,0],[-18,19],[-20,-21]];
 const baseNames=['風の道標','忘れられた野営地','見晴らしの岩棚'];
 const frontierNames=['古代の境界塔','風脈の渡り場','封印された見張り台'];
 const deepNames=[
  ['風鳴りの環状遺跡','草海の巡礼塔','最果ての風見砦'],
  ['苔霧の根脈聖堂','胞子湿原の鐘楼','深森の眠り門'],
  ['赤砂の断層神殿','流砂の刃塔','砂海の王墓'],
  ['白嶺の氷鏡宮','凍湖の観測楼','極北の晶壁砦'],
  ['雷稜の導電祭壇','銅嶺の嵐見塔','轟雷の落星門'],
  ['紫晶の地底聖域','菌庭の逆さ鐘楼','深淵の晶核殿'],
  ['雲海の浮遊回廊','天輪の風読塔','蒼穹の果ての門'],
  ['時止まりの分岐駅','残響の時計聖堂','終端の零時門']
 ];
 const clues=[
  ['界の入口から東へ。風に削られた石が道を示している。','界の入口から南西へ。古い野営地の跡を探そう。','界の入口から北西へ。見晴らしのよい岩棚を探そう。'],
  ['大遠征地の南東。崩れた塔の上には、界の外縁を示す灯りがある。','大遠征地を横切る道の中央。地形の変化を観察しよう。','大遠征地の北西。塔の奥に古い記録が残されている。'],
  ['512×512に広がる外縁地帯。その奥に立つ三連の遺跡を探そう。','地形の異なる帯を越え、中央の古塔を目指そう。','遠征地の最奥、最後の標柱に界の記録が刻まれている。']
 ];
 const realms=Array.from({length:8},(_,realm)=>{
  const realmName=places[realm+1]?.name??`第${realm+1}界`;
  return Array.from({length:9},(_,index)=>({
   id:realm*9+index,realm,index,
   name:index<3?baseNames[index]:index<6?frontierNames[index-3]:deepNames[realm][index-6],
   realmName,clue:clues[Math.floor(index/3)][index%3]
  }));
 }).flat();
 const keyFor=id=>id<24?'discoveries':id<48?'frontier_discoveries':'deep_discoveries';
 const bitFor=id=>1<<(id%24);
 const has=(p,id)=>Boolean(num(p,keyFor(id))&bitFor(id));
 const add=(p,id)=>{const k=keyFor(id);property(p,k,num(p,k)|bitFor(id));};
 const total=p=>realms.reduce((n,s)=>n+(has(p,s.id)?1:0),0);
 function coordinates(s){
  if(s.index<3){const base=places[s.realm+1];return {x:base.x+offsets[s.index][0],z:base.z+offsets[s.index][1]};}
  const pt=frontierWorlds?.siteCoords(s.realm,s.index);
  return pt?{x:pt[0],z:pt[1]}:undefined;
 }
 function ready(s,pt){
  if(s.index<3)return true;
  return Boolean(pt&&frontierWorlds?.isGenerated(s.realm,pt));
 }
 function tick(p,t){
  if(t%20!==0||!p.dimension.id.startsWith(ns+'realm_'))return;
  const realm=Number(p.dimension.id.slice((ns+'realm_').length));
  if(!Number.isInteger(realm)||realm<0||realm>7)return;
  for(const s of realms){
   if(s.realm!==realm||has(p,s.id))continue;
   const pt=coordinates(s);if(!ready(s,pt))continue;
   if(Math.hypot(p.location.x-pt.x,p.location.z-pt.z)>7||Math.abs(p.location.y-88)>48)continue;
   add(p,s.id);
   const reward=s.index===0?'bandage':s.index===1?'mana_tonic':'toki_crystal';
   if(!give(p,ns+reward,1))drop(p.dimension,ns+reward,1,p.location);
   notice(p,`§d【遠征記録】${s.name}を発見。${s.realmName}の記録に新しい一頁が加わった。`,90);
   try{p.dimension.spawnParticle('minecraft:endrod',{x:p.location.x,y:p.location.y+1,z:p.location.z});p.playSound('random.orb',{volume:.5,pitch:1.25});}catch{}
  }
 }
 function realmProgress(p){
  return Array.from({length:8},(_,realm)=>{
   const found=realms.reduce((n,s)=>n+(s.realm===realm&&has(p,s.id)?1:0),0);
   return {realm,found,total:9,name:places[realm+1]?.name??`第${realm+1}界`};
  });
 }
 async function journal(p){
  const count=total(p), progress=realmProgress(p);
  const completed=progress.filter(r=>r.found===r.total).length;
  const overview=progress.map(r=>`${r.found===r.total?'§a◆':'§7◇'} ${r.name}：${r.found}/9`).join('\n');
  const rows=realms.map(s=>[`${has(p,s.id)?'◆':'◇'} ${s.realmName}｜${s.name}`]);
  const index=await paged(p,'八界巡礼帳・72地点の記録',`全体進捗：${count}/72（${Math.floor(count/72*100)}%）\n全地点発見：${completed}/8界\n\n【界ごとの記録】\n${overview}\n\n各界の拠点から大遠征地、外縁地帯へと記録が続きます。地点に近づくと自動で記録されます。`,rows);
  if(index===undefined)return;
  const s=realms[index],pt=coordinates(s),generated=ready(s,pt);
  return simple(p,`${s.realmName}｜${s.name}`,`${has(p,s.id)?'§a発見済み':'§7未発見'}\n\n${s.clue}\n\n${s.index<3?'界の入口付近にある探索地点です。':s.index<6?(generated?'大遠征地の生成済み地点です。':'大遠征地がまだ生成されていません。'):(generated?'外縁地帯の生成済み地点です。':'この区画はまだ生成されていません。')}`);
 }
 return {tick,journal,count:total};
}
