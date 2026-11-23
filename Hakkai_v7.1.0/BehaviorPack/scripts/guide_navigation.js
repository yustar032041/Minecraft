// Index numbers are the existing dispatchGuide routes. Keeping this table
// separate makes it possible to test that every old page stays reachable.
export const GUIDE_ENTRIES=[
 '旅の地図','風記の手引き','装備とレシピ図鑑','依頼帳','水辺の釣り',
 '設定・帰還地点','ガイド本と帰還石の再発行','旅の記録を読む','自然調査ノート','時の列車',
 '季節の収穫市','港の市と停泊船','村の集落台帳','バニラの遺跡と風の道','醸造と属性刻印',
 '八属性と合成魔法の図鑑','装備を見つける・注文する','サバイバルの追加レシピ','季節の菜園','八界の発見記録',
 '八界記念頁','八界の宝物庫','八界の探索試練','八界の秘密遺跡','八界の記憶断章',
 '八界の余韻と記録','八界の記念品交換所','冒険者記録帳','八界の記念品図鑑','冒険者ランクと称号',
 '八界の展示コーナー設計帳','八界の記念碑と特別称号','展示館の秘密記録','八界総合大図鑑','大記念館・最後の頁',
 '八界の幻影闘技場','幻影闘技場・戦術図鑑','幻影闘技場の優勝記念展示','八界の巡礼・旅先イベント','八界の四季巡礼と物語',
 '八界の甲冑展示室','八界の装備収集・進化','八界の伝説装備クエスト','八界の甲冑図鑑・収集記録','風記の装備進化年鑑',
 '終章・夜渡りの鎧 覚醒試練','八界の覚醒装備・継承試練','八界の覚醒鎧・極進化','八界の守護核・収集年鑑','守護核継承工房・八界統合装備',
 '八界統合・終章の大記念館','大遠征地・72地点の記録','サバイバル実践ガイド','生き物・素材・技図鑑','終焉の八界王'
];
// Distinct thumbnails help users recognise destinations within each chapter.
export const GUIDE_ICONS=[
 'return_stone','guide','gear_048','chronicle_fragment','festival_fish_0',
 'relic_key','return_stone','guide','crystal_0','crystal_7',
 'autumn_squash_produce','fish_token','village_badge','relic_key','rune_book_0',
 'element_tome','gear_048','awaken_book','summer_corn_seed','crystal_0',
 'festival_0','crystal_8','gear_006','relic_key','chronicle_fragment',
 'guardian_core_7','festival_1','guide','festival_2','village_badge',
 'gear_010','wind_legacy_memorial','relic_key','guide','wind_legacy_memorial',
 'gear_048','gear_006','festival_1','guide','festival_0',
 'gear_010','gear_010','gear_187','gear_010','gear_010',
 'gear_187','gear_188','gear_196','guardian_core_0','gear_204',
 'wind_legacy_memorial','chronicle_fragment','trail_ration','drop_wild_0_0','eclipse_core'
];
export const GUIDE_SECTIONS=[
 {title:'旅と探索', hint:'地図・列車・遺跡・遠征', icon:'return_stone', ids:[0,9,11,13,19,22,23,38,39,51]},
 {title:'暮らしと準備', hint:'初心者案内・依頼・料理・村', icon:'camp_stew', ids:[1,3,4,10,12,17,18,52]},
 {title:'装備と魔法', hint:'製作・進化・属性・刻印', icon:'gear_048', ids:[2,14,15,16,40,41,42,43,44,45,46,47,48,49]},
 {title:'生き物と自然', hint:'生態・ドロップ・調査', icon:'crystal_0', ids:[8,53]},
 {title:'旅の記録と記念館', hint:'冒険記録・称号・収集', icon:'guide', ids:[7,20,21,24,25,26,27,28,29,30,31,32,33,34,50]},
 {title:'戦いと挑戦', hint:'幻影闘技場・終焉の八界王', icon:'eclipse_core', ids:[35,36,37,54]},
 {title:'設定と困ったとき', hint:'帰還地点・本や帰還石の再発行', icon:'relic_key', ids:[5,6]}
];

export function guidePageCount(length, pageSize=8){
 return Math.max(1,Math.ceil(length/pageSize));
}
export function guidePageSlice(entries, page, pageSize=8){
 const last=guidePageCount(entries.length,pageSize)-1;
 const safePage=Math.max(0,Math.min(last,page));
 return {page:safePage, pages:last+1, offset:safePage*pageSize, entries:entries.slice(safePage*pageSize,(safePage+1)*pageSize)};
}
export function creatureEntriesByRealm(list,realm){
 return list.map((profile,index)=>({profile,index})).filter(entry=>entry.profile.realm===realm);
}

// Inject the pack's form function so paging and cancellation are testable
// without loading the Minecraft runtime.
export async function selectGuidePage(player,title,body,rows,show,startPage=0){
 let page=startPage;
 while(player.isValid){
  const view=guidePageSlice(rows,page);page=view.page;
  const choices=[...view.entries];
  const prev=page>0?choices.push(['§7◀ 前の頁'])-1:-1;
  const next=page+1<view.pages?choices.push(['§7次の頁 ▶'])-1:-1;
  const back=choices.push(['§8↩ ひとつ戻る'])-1;
  const picked=await show(player,title,`${body}\n\n§8━━ ${page+1} / ${view.pages} 頁 ━━`,choices);
  if(picked===undefined)return {closed:true,page};
  if(picked===back)return {back:true,page};
  if(picked===prev){page--;continue;}
  if(picked===next){page++;continue;}
  if(Number.isInteger(picked)&&picked>=0&&picked<view.entries.length)return {index:view.offset+picked,page};
  return {closed:true,page};
 }
 return {closed:true,page};
}

export function gearKinds(catalog){
 return [...new Set(catalog.map(gear=>gear.kind))];
}
export function filterGear(catalog,mode,value){
 if(mode==='kind')return catalog.filter(gear=>gear.kind===value);
 if(mode==='attribute')return catalog.filter(gear=>gear.a===value||gear.modifier===value);
 if(mode==='number')return catalog.slice(value*12,value*12+12);
 return [];
}
