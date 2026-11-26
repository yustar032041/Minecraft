// Non-combat compatibility layer for the 72 expedition discoveries from v2.6.1.
// Keeps discovery records and rewards, while leaving the old combat-contract hooks disabled.
export function setupExpeditionRecords(ctx){
 const {ns,places,num,notice,paged,simple,frontierWorlds,claimDiscovery}=ctx;
 const offsets=[[22,0],[-18,19],[-20,-21]], nextScan=new Map();
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
 const total=p=>realms.reduce((n,s)=>n+(has(p,s.id)?1:0),0);
 function coordinates(s){
  if(s.index<3){const base=places[s.realm+1];return {x:base.x+offsets[s.index][0],z:base.z+offsets[s.index][1]};}
  const pt=frontierWorlds?.siteCoords(s.realm,s.index);
  return pt?{x:pt[0],z:pt[1]}:undefined;
 }
 // Show an approximate bearing only in the same realm. This is guidance, not
 // a path finder: cliffs, water, unloaded terrain and protection still apply.
 function approach(p,s,pt){
  try{
   if(!pt)return '座標を確認できません。';
   if(p.dimension.id!==ns+`realm_${s.realm}`)return '対応する界に入ると、ここからの方角と距離を表示します。';
   const l=p.location,dx=pt.x-l.x,dz=pt.z-l.z,dist=Math.hypot(dx,dz);
   if(![dx,dz,l.y].every(Number.isFinite))return '現在地を確認できません。';
   const x=dx>1?'東':dx< -1?'西':'',z=dz>1?'南':dz< -1?'北':'',direction=(z+x)||'ほぼ中心';
   return `今いる場所から${direction}へ水平約${Math.round(dist)}ブロック（記録範囲まで約${Math.max(0,Math.ceil(dist-16))}ブロック）。今の高さY ${Math.floor(l.y)}。安全な経路の案内ではありません。`;
  }catch{return '現在地を確認できません。';}
 }
 function ready(s,pt){
  if(s.index<3)return true;
  return Boolean(pt&&frontierWorlds?.isGenerated(s.realm,pt));
 }
 function tick(p,t){
  if(!p.dimension.id.startsWith(ns+'realm_')||t<(nextScan.get(p.id)??0))return;
  nextScan.set(p.id,t+20);
  const realm=Number(p.dimension.id.slice((ns+'realm_').length));
  if(!Number.isInteger(realm)||realm<0||realm>7)return;
  // The old landmarks may not exist on new seeded terrain or in protected
  // chunks. Recording changes no blocks; do not require their generation bit.
  // Choose the nearest point including already-discovered ones, so overlapping
  // radii never claim a second point without actually moving towards it.
  const nearby=realms.filter(s=>s.realm===realm).map(s=>{const pt=coordinates(s);return {s,pt,d:pt?Math.hypot(p.location.x-pt.x,p.location.z-pt.z):Infinity};}).sort((a,b)=>a.d-b.d||a.s.id-b.s.id)[0];
  if(!nearby||nearby.d>16||Math.abs(p.location.y-88)>64||has(p,nearby.s.id))return;
  {
   const {s}=nearby;
   const reward=s.index===0?'bandage':s.index===1?'mana_tonic':'toki_crystal',k=keyFor(s.id);
   // Save the reward and bit together; if the inventory is full or the write
   // fails, leave the discovery unclaimed so proximity can retry later.
   let result;try{result=claimDiscovery(p,ns+reward,k,num(p,k)|bitFor(s.id));}catch{result='error';}
   if(result!=='ok'){
    nextScan.set(p.id,t+200); // avoid a notice and failed write every second
    notice(p,result==='full'?'§e遠征報酬の空きを作り、地点にとどまるか後で戻ってね':'§e遠征記録を保存できません。持ち物と記録を確認して再訪してね',100);
    return;
   }
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
  const index=await paged(p,'八界巡礼帳・72地点の記録',`全体進捗：${count}/72（${Math.floor(count/72*100)}%）\n全地点発見：${completed}/8界\n\n【界ごとの記録】\n${overview}\n\n各界の拠点から大遠征地、外縁地帯へと記録が続きます。座標の水平16ブロック以内・高さ24～152で報酬と記録を一緒に受け取ります。目印の建物がない場合もあります。持ち物が満杯なら空きを作り、地点にとどまるか後で戻ってね。`,rows);
  if(!Number.isInteger(index)||index<0||index>=realms.length||p.isValid===false)return;
  const s=realms[index],pt=coordinates(s),generated=ready(s,pt);
  return simple(p,`${s.realmName}｜${s.name}`,`${has(p,s.id)?'§a発見済み':'§7未発見'}\n\n${s.clue}\n目標座標：X ${pt?.x??'不明'} / Z ${pt?.z??'不明'}。水平16ブロック以内、高さ24～152。建物や足場が必ずあるとは限りません。\n${approach(p,s,pt)}\n\n${s.index<3?'界の入口付近にある探索地点です。':s.index<6?(generated?'大遠征地の生成済み地点です。':'旧地形・対象区画の生成記録はありません。'):(generated?'外縁地帯の生成済み地点です。':'旧地形・対象区画の生成記録はありません。')}`);
 }
 return {tick,journal,count:total,clear:id=>nextScan.delete(id)};
}
