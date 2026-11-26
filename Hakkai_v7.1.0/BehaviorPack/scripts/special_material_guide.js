// A bounded supplement for dynamically named items that JSON recipe reverse
// lookup cannot discover. These are examples, not a complete item-use audit.
import {attrs,places} from './data.js';
import {realmOres} from './ore_distribution.js';
import {factoryRecipe} from './factory_network.js';
import {searchGuideEntries} from './guide_navigation.js';

const row=(id,name,detail,keywords)=>[id,`${name}（${id}）`,detail,keywords];
const metals=[['iron','鉄'],['gold','金'],['copper','銅']];
const fishes=[['桜灯の銀魚','春'],['夏帆の珊瑚魚','夏'],['紅葉の錦魚','秋'],['氷花の透魚','冬']];
const runes=[['風',0],['水',1],['雷',4],['時',7]];
export function buildSpecialMaterials(){
 const rows=[];
 for(let i=0;i<attrs.length;i++){
  const realm=realmOres.findIndex(group=>group.includes(i));
  if(realm<0)throw Error(`Missing ore realm ${i}`);
  rows.push(row(`hakkai:ore_${i}`,`${attrs[i]}の結晶鉱`,
   `入手の手掛かり：${places[realm+1].name}の未生成シード地形に埋まる鉱脈。地点の内部などには生成されません。\n\n使い道：鉱石として掘ると${attrs[i]}の結晶が候補。採掘機なら直下の鉱石を消し、東の樽に結晶1個を出します。幸運・シルクタッチ・経験値は使いません。採掘機の詳しい条件は機械加工検索を確認。\n\n地形の生成・採掘とドロップはBedrock実機未確認。`,`鉱石 採掘 結晶鉱 ${places[realm+1].name}`));
 }
 for(const [key,name] of metals){
  const crush=factoryRecipe('crusher',`minecraft:raw_${key}`),wash=factoryRecipe('washer',`hakkai:crushed_${key}`),mill=factoryRecipe('mill',`hakkai:washed_${key}`);
  if(!crush||!wash||!mill)throw Error(`Missing ${key} processing route`);
  rows.push(row(`hakkai:crushed_${key}`,`砕いた原${name}`,
   `入手の手掛かり：破砕機で原${name} ×${crush[1]} → 砕いた原${name} ×${crush[2]}。\n\n使い道：洗浄機に入れると、砕いた原${name} ×${wash[1]} → 洗浄済み原${name} ×${wash[2]}。洗浄機の隣に水ブロックまたは水タンクが必要。水タンクは1目盛り消費します。\n\n動力または燃料・入力樽・出力樽が必要。実機未確認。`,`原鉱 工業 破砕機 洗浄機 ${name} ${key}`));
  rows.push(row(`hakkai:washed_${key}`,`洗浄済み原${name}`,
   `入手の手掛かり：洗浄機で砕いた原${name} ×${wash[1]} → 洗浄済み原${name} ×${wash[2]}。\n\n使い道：風力加工機で洗浄済み原${name} ×${mill[1]} → ${name}インゴット ×${mill[2]}。動力または燃料、高所では条件付きの風・入力樽・出力樽が必要。\n\n実機未確認。`,`原鉱 工業 洗浄機 風力加工機 ${name} ${key}`));
 }
 for(let i=0;i<fishes.length;i++){
  const [name,season]=fishes[i];
  rows.push(row(`hakkai:festival_fish_${i}`,name,
   `入手の手掛かり：${season}の祭り（季節の2日目）に、水面の近くで釣り竿を持って「水辺の釣り」を行うと一定確率で入手。持ち物に空きが必要。\n\n使い道：村人の近くの「季節の収穫市」でこの魚1匹を選び、湖の結晶1個と交換。魚の種類と現在の季節は一致しなくても交換できます。\n\n実機の釣り・交換・マルチは未確認。`,`祭り魚 釣り 収穫市 ${season}`));
 }
 for(let i=0;i<runes.length;i++){
  const [name,attribute]=runes[i];
  rows.push(row(`hakkai:rune_book_${i}`,`${name}の刻印書`,
   `入手の手掛かり：普通の本を持ってしゃがみ、エンチャント台を使って「${name}の刻印書」を選ぶ。サバイバルでは本1冊と${attrs[attribute]}の結晶2個を消費。\n\n使い道：刻印書を手に持ってしゃがみ、エンチャント台を使い、持ち物から刻印のないバニラの剣を選択。サバイバルでは刻印書1冊を消費します。既存の耐久・エンチャント等は保持を試みます。\n\n停止・復旧失敗・実機マルチは未確認。`,`刻印 剣 ${attrs[attribute]} ${name}`));
 }
 return rows;
}
export const SPECIAL_MATERIALS=buildSpecialMaterials();
export const searchSpecialMaterials=query=>searchGuideEntries(SPECIAL_MATERIALS.map(entry=>[entry,`${entry[1]} ${entry[3]}`]),query).map(([entry])=>entry);
