// The guide derives item transformations from the same functions and recipe
// tables used by the machines. Transport is explained separately in the
// industrial guide.
import {factoryRecipe} from './factory_network.js';
import {LINE_RECIPES,RECYCLE_DROPS} from './factory_line_recipes.js';
import {farmGuideCrops} from './factory_farm.js';
import {seasonalPlants,attrs} from './data.js';
import {MINER_DEPTH,miningGuideTargets} from './factory_mining.js';
import {FLUID_BASIN_RECIPES,FLUID_LOADER_RECIPES,FLUID_OBSIDIAN_RECIPE} from './factory_fluids.js';
import {RECIPE_INDEX,RECIPE_USES} from './recipe_index.js';
import {searchGuideEntries} from './guide_navigation.js';

const names=new Map(RECIPE_USES.map(([id,label])=>[id,label]));
for(const [,label] of RECIPE_INDEX){
 const id=/（([^（）]+:[^（）]+)）$/.exec(label)?.[1];if(id&&!names.has(id))names.set(id,label);
}
const extra={
 'minecraft:raw_iron':'原鉄','minecraft:raw_gold':'原金','minecraft:raw_copper':'原銅',
 'minecraft:gravel':'砂利','minecraft:sand':'砂','minecraft:red_sand':'赤い砂','minecraft:bone':'骨',
 'minecraft:clay':'粘土','minecraft:clay_ball':'粘土玉','minecraft:sandstone':'砂岩','minecraft:flint':'火打石',
 ...Object.fromEntries(['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'].flatMap((color,i)=>{
  const name=['白','橙','赤紫','空色','黄','黄緑','桃','灰','薄灰','青緑','紫','青','茶','緑','赤','黒'][i];
  return [[`minecraft:${color}_concrete_powder`,`${name}色のコンクリートパウダー`],[`minecraft:${color}_concrete`,`${name}色のコンクリート`]];
 })),
 'minecraft:bucket':'バケツ','minecraft:water_bucket':'水入りバケツ','minecraft:lava_bucket':'溶岩入りバケツ',
 'minecraft:dirt':'土','minecraft:mud':'泥','minecraft:obsidian':'黒曜石','minecraft:stone':'石',
 'minecraft:wheat':'小麦','minecraft:wheat_seeds':'小麦の種','minecraft:carrot':'ニンジン','minecraft:carrots':'ニンジンの株','minecraft:potato':'ジャガイモ','minecraft:potatoes':'ジャガイモの株','minecraft:beetroot':'ビートルート','minecraft:beetroot_seeds':'ビートルートの種','minecraft:bone_meal':'骨粉',
 ...Object.fromEntries(seasonalPlants.flatMap(p=>[[`hakkai:${p.id}`,p.name],[`hakkai:${p.id}_seed`,p.seed],[`hakkai:${p.id}_produce`,p.harvest]])),
 'minecraft:glass':'ガラス','minecraft:potato':'ジャガイモ','minecraft:beef':'生の牛肉','minecraft:porkchop':'生の豚肉',
 'minecraft:chicken':'生の鶏肉','minecraft:cod':'生鱈','minecraft:salmon':'生鮭',
 'minecraft:iron_block':'鉄ブロック','minecraft:gold_block':'金ブロック','minecraft:copper_block':'銅ブロック',
 'minecraft:diamond_block':'ダイヤモンドブロック','minecraft:emerald_block':'エメラルドブロック','minecraft:coal_block':'石炭ブロック','minecraft:redstone_block':'レッドストーンブロック',
 ...Object.fromEntries(['iron','gold','copper'].flatMap((x,i)=>[[`hakkai:crushed_${x}`,`砕いた原${['鉄','金','銅'][i]}`],[`hakkai:washed_${x}`,`洗浄済み原${['鉄','金','銅'][i]}`]]))
};
for(const [id,label] of Object.entries(extra))if(!names.has(id))names.set(id,`${label}（${id}）`);
const label=id=>names.get(id)??id;
const realms=Array.from({length:20},(_,i)=>i);
const ores=['iron','gold','copper'];
const kinds={
 crusher:['minecraft:cobblestone','minecraft:gravel','minecraft:bone',...ores.map(x=>`minecraft:raw_${x}`),...realms.map(i=>`hakkai:crystal_${i}`),...Object.keys(RECYCLE_DROPS)],
 washer:['minecraft:gravel','minecraft:sand',...ores.map(x=>`hakkai:crushed_${x}`)],
 press:['minecraft:clay_ball','minecraft:sand','minecraft:iron_ingot','minecraft:gold_ingot'],
 saw:['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry'].map(x=>`minecraft:${x}_log`),
 compressor:['minecraft:iron_ingot','minecraft:gold_ingot','minecraft:copper_ingot','minecraft:diamond','minecraft:emerald','minecraft:coal','minecraft:redstone',...realms.map(i=>`hakkai:shard_${i}`)],
 mill:[...ores.map(x=>`minecraft:raw_${x}`),...ores.map(x=>`hakkai:washed_${x}`)],
 kiln:['minecraft:sand','minecraft:red_sand','minecraft:potato','minecraft:beef','minecraft:porkchop','minecraft:chicken','minecraft:cod','minecraft:salmon','minecraft:clay_ball']
};
const titles={crusher:'破砕機',washer:'洗浄機',press:'プレス機',saw:'製材機',compressor:'圧縮機',mill:'風力加工機',kiln:'土組み自動炉',mixer:'動力混合機',assembler:'動力組立機',fluid_basin:'液体加工槽',fluid_loader:'液体注入機',farm_planter:'動力播種機',farm_harvester:'動力収穫機',farm_fertilizer:'動力施肥機',mobile_harvester:'可動収穫ヘッド',miner:'採掘機'};
const operation={
 crusher:'動力または西の入力樽に追加の燃料が必要です。',washer:'動力または西の入力樽に追加の燃料と、隣の水ブロックまたは水タンク1目盛りが必要です。',
 press:'動力または西の入力樽に追加の燃料が必要です。',saw:'動力または西の入力樽に追加の燃料が必要です。',compressor:'圧縮機は無動力でも加工します。接続動力が過負荷などの場合は停止します。',
 mill:'動力または西の入力樽に追加の燃料が必要です。高所では条件付きで単独の風でも稼働します。',kiln:'動力または西の入力樽に追加の燃料が必要です。',
 mixer:'動力が必要です。複数候補の材料が揃うと固定優先順です。',assembler:'動力が必要です。複数候補の材料が揃うと固定優先順です。'
};
function row(kind,costs,out,count){
 const input=costs.map(c=>`${label(c.id)} ×${c.count}`).join(' ＋ '),result=`${label(out)} ×${count}`;
 return {kind,title:`${titles[kind]}：${result}`,search:`${titles[kind]} ${input} ${result}`,details:`設備：${titles[kind]}\n西の入力樽：${input}\n東の出力樽：${result}\n\n${operation[kind]}\n元のアイテムの名前・エンチャント等は加工結果に引き継ぎません。`,costs,out,count};
}
// Fluid quantities are tank units, not inventory items. One bucket is four
// units; the basin and loader also require power and two adjacent barrels.
function fluidRow(kind,costs,out,fluids,explanation){
 const input=costs.length?costs.map(c=>`${label(c.id)} ×${c.count}`).join(' ＋ '):'アイテム不要（樽は必要）';
 const result=`${label(out)} ×1`,fluidText=fluids.map(f=>`${f.kind===1?'水 water':'溶岩 lava'} ${f.units}目盛り`).join(' ＋ ');
 return {kind,title:`${titles[kind]}：${result}${kind==='fluid_loader'?` ← ${input}`:''}`,search:`${titles[kind]} ${input} ${result} ${fluidText}`,
  details:`設備：${titles[kind]}\n西の入力樽：${input}\n東の出力樽：${result}\n隣のタンク：${fluidText}\n\n${explanation}\n動力が必要です。1バケツは4目盛り、タンクの容量は8目盛り。元のアイテムの名前等は完成品に引き継ぎません。`,
  costs,out,count:1,fluids};
}
// Farming actions are not crafting recipes: the crop stays in the field and
// only the stated produce, seed, bone meal or water enters/leaves a barrel.
function farmRows(crop){
 const plant=label(crop.crop),seed=label(crop.seed),produce=label(crop.item),bone=label('minecraft:bone_meal');
 const common='動力必須。本体と同じ高さの周囲5×5（本体を除く）で耕地の上を確認。';
 return [
  {kind:'farm_planter',title:`動力播種機：${plant}`,search:`動力播種機 ${plant} ${seed}`,costs:[{id:crop.seed,count:1}],out:crop.crop,count:1,crop:crop.crop,
   details:`設備：動力播種機\n西の入力樽：${seed} ×1\n畑：空いた耕地に${plant}を成長0で植えます。作物ブロックを樽に出力するレシピではありません。\n\n${common}`},
  {kind:'farm_harvester',title:`動力収穫機：${produce} ×${crop.amount}`,search:`動力収穫機 ${plant} ${produce}`,costs:[],out:crop.item,count:crop.amount,crop:crop.crop,
   details:`設備：動力収穫機\n畑：成熟した${plant}を収穫し、株を成長0に戻します。\n上の出力樽：${produce} ×${crop.amount}\n種は出力しません。\n\n${common}`},
  {kind:'farm_fertilizer',title:`動力施肥機：${plant}を成長`,search:`動力施肥機 ${plant} ${bone} 水 water`,costs:[{id:'minecraft:bone_meal',count:1}],out:crop.crop,count:1,crop:crop.crop,
   details:`設備：動力施肥機\n西の入力樽：${bone} ×1\n隣の水タンク：水1目盛りを消費\n畑：未成熟の${plant}を1段階成長。作物は畑に残り、樽に出力しません。季節や明るさは判定しません。\n\n${common}`}
 ];
}
export function buildMachineRecipes(){
 const rows=[];
 for(const [kind,inputs] of Object.entries(kinds))for(const id of inputs){
  const recipe=factoryRecipe(kind,id);if(!recipe)throw new Error(`Unknown machine recipe: ${kind} ${id}`);
  const [out,need,count,aux]=recipe,costs=[{id,count:need}];if(aux)costs.push({id:aux,count:1});rows.push(row(kind,costs,out,count));
 }
 for(const [kind,recipes] of Object.entries(LINE_RECIPES))for(const recipe of recipes)rows.push(row(kind,recipe.costs,recipe.output,recipe.amount));
 for(const r of FLUID_BASIN_RECIPES)rows.push(fluidRow('fluid_basin',[{id:r.input,count:1}],r.output,[{kind:r.kind,units:r.units}],
  'タンクから記載の量を消費します。対応する材料があれば、黒曜石より先に加工されます。'));
 for(const r of FLUID_LOADER_RECIPES)rows.push(fluidRow('fluid_loader',[{id:r.input,count:1}],r.output,[{kind:r.kind,units:r.units}],
  'タンクへ記載の量を注入します。同じ液体または空のタンクで、空きが必要です。'));
 const r=FLUID_OBSIDIAN_RECIPE;
 rows.push(fluidRow('fluid_basin',[],r.output,[{kind:2,units:r.lava},{kind:1,units:r.water}],
  '水と溶岩は別タンク。対応するアイテム加工がない場合に作られ、両方を消費します。'));
 for(const {block,out} of miningGuideTargets(attrs.length)){
  const number=/^hakkai:ore_(\d+)$/.exec(block),metal=/^minecraft:(deepslate_)?(iron|gold|copper)_ore$/.exec(block);
  const blockName=number?`${attrs[Number(number[1])]}の結晶鉱`:`${metal[1]?'深層':'通常'}${{iron:'鉄',gold:'金',copper:'銅'}[metal[2]]}鉱石`;
  const input=`${blockName}（${block}）`,product=`${label(out)} ×1`;
  rows.push({kind:'miner',title:`採掘機：${input} → ${product}`,search:`採掘機 ${input} ${product}`,block,costs:[],out,count:1,
   details:`設備：採掘機\n対象ブロック：${input}\n東の出力樽：${product}\n\n本体の真下${MINER_DEPTH}ブロックまでを上から確認し、対応鉱石を1個だけ実際に空気にします。鉱石は樽に入れません。空気・石・深層岩・凝灰岩・花崗岩・安山岩・閃緑岩・ネザーラックは通過します。途中に対応外のブロックや鉱石があれば止まり、その下は採掘しません。\n西の入力樽と東の出力樽が必要。動力または西樽の燃料で動き、出力が満杯・未読込・動力過負荷などでは停止。天候や夜間に動作が間引かれる場合があります。幸運やシルクタッチ、バニラのドロップ・経験値は使わず固定1個です。`});
 }
 for(const crop of farmGuideCrops()){
  rows.push(...farmRows(crop));
  const plant=label(crop.crop),produce=label(crop.item);
  rows.push({kind:'mobile_harvester',title:`可動収穫ヘッド：${produce} ×${crop.amount}`,search:`可動収穫ヘッド 移動農機 動力移動装置 ${plant} ${produce}`,
   costs:[],out:crop.item,count:crop.amount,crop:crop.crop,
   details:`設備：可動収穫ヘッド＋東西南北の動力移動装置\n畑：移動後にヘッドの直下の成熟${plant}を収穫し、株を成長0に戻します。\n装置の真上の出力樽：${produce} ×${crop.amount}\n種は出力しません。\n\n動力必須。ヘッドは水平移動専用、最大8個。移動前の最初の位置は帰りに処理。出力が満杯なら事前に停止します。移動後の処理失敗では移動と先行した収穫は戻らない場合があります。樽・作物・位置を確認してください。`});
 }
 return rows;
}
export const MACHINE_RECIPES=buildMachineRecipes();
export const MACHINE_RECIPE_GROUPS=Object.keys(titles).map(kind=>({kind,title:titles[kind]}));
export function searchMachineRecipes(query){
 return searchGuideEntries(MACHINE_RECIPES.map(r=>[r,r.search]),query).map(([r])=>r);
}
