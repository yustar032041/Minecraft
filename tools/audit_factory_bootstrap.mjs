// Static, deliberately scoped proof of one possible factory bootstrap route.
// This is not a Minecraft survival simulator: vanilla inputs and water are
// explicitly assumed obtainable, not inferred from their namespace.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const recipeDir=path.join(root,'Hakkai_v7.1.0/BehaviorPack/recipes');
export const EQUIPMENT=`crusher washer press saw compressor mill kiln mixer assembler miner sorter shaft clutch gear_up gear_down gear_up_z gear_down_z gear_up_y gear_down_y wind_rotor water_wheel conveyor factory_pipe factory_pipe_west factory_pipe_north factory_pipe_south factory_pipe_up factory_pipe_down filter_router farm_planter farm_harvester farm_fertilizer item_duct item_extractor item_extractor_west item_extractor_north item_extractor_south item_extractor_up item_extractor_down fluid_pipe fluid_tank fluid_basin fluid_loader fluid_pump fluid_pump_west fluid_pump_north fluid_pump_south fluid_pump_up fluid_pump_down gantry gantry_west gantry_north gantry_south gantry_up gantry_down gantry_frame gantry_panel gantry_joint gantry_joint_west gantry_joint_north gantry_joint_south gantry_joint_up gantry_joint_down gantry_harvester bearing`.split(' ');
export const BASE=`anvil barrel bone_meal brick bucket cauldron cobblestone comparator copper_ingot crafting_table feather flint furnace glass gravel hopper iron_hoe iron_ingot iron_nugget iron_pickaxe lever oak_planks piston rail redstone shears slime_ball smooth_stone stick stonecutter_block string wheat_seeds white_wool raw_iron raw_gold raw_copper`.split(' ').map(x=>`minecraft:${x}`).concat('world:water_source');
const id=x=>`hakkai:${x}`;

// Only the exact format under test is accepted. Do not optimistically treat
// unknown tags, stations, or recipe formats as obtainable.
export function loadEquipmentRecipes(names=EQUIPMENT,read=(name)=>fs.readFileSync(path.join(recipeDir,`${name}.json`),'utf8')){
 return names.map(name=>{
  const json=JSON.parse(read(name));const types=Object.keys(json).filter(k=>k.startsWith('minecraft:recipe_'));
  if(types.length!==1||types[0]!=='minecraft:recipe_shapeless')throw Error(`${name}: unsupported recipe type`);
  const r=json[types[0]],result=r.result;
  if(!Array.isArray(r.tags)||!r.tags.includes('crafting_table')||!Array.isArray(r.ingredients)||!r.ingredients.length||result?.item!==id(name)||!Number.isInteger(result.count??1)||(result.count??1)<1)throw Error(`${name}: unsupported recipe`);
  const counts=new Map();for(const ingredient of r.ingredients){if(!ingredient||Object.keys(ingredient).length!==1||typeof ingredient.item!=='string'||!ingredient.item.includes(':'))throw Error(`${name}: unsupported ingredient`);counts.set(ingredient.item,(counts.get(ingredient.item)||0)+1);}
  return {name:`作業台:${name}`,out:result.item,amount:result.count??1,costs:[...counts].map(([id,count])=>({id,count})).concat({id:'minecraft:crafting_table',count:1})};
 });
}
export function oreRoutes(recipe=factoryRecipe){
 const routes=[];
 for(const metal of ['iron','gold','copper']){
  const stages=[['crusher',`minecraft:raw_${metal}`,`hakkai:crushed_${metal}`,2],['washer',`hakkai:crushed_${metal}`,`hakkai:washed_${metal}`,1],['mill',`hakkai:washed_${metal}`,`minecraft:${metal}_ingot`,1]];
  for(const [machine,input,output,amount] of stages){
   const actual=recipe(machine,input);
   if(!actual||actual[0]!==output||actual[1]!==1||actual[2]!==amount||actual[3])throw Error(`Unexpected ${machine} recipe for ${input}`);
   const costs=[{id:input,count:1},{id:id(machine),count:1},{id:'minecraft:barrel',count:2},{id:'hakkai:wind_rotor',count:1},{id:'hakkai:shaft',count:1}];
   if(machine==='washer')costs.push({id:'world:water_source',count:1});
   routes.push({name:`${machine}:${metal}`,out:output,amount,costs});
  }
 }
 return routes;
}
// Fixed point from explicit seeds: cycles with no seed never become reachable.
export function reachable(rules,seeds){
 const reached=new Map([...seeds].map(item=>[item,null]));let changed=true;
 while(changed){changed=false;for(const rule of rules)if(!reached.has(rule.out)&&rule.costs.every(c=>reached.has(c.id))){reached.set(rule.out,rule);changed=true;}}
 return reached;
}
export function report(equipment=loadEquipmentRecipes(),routes=oreRoutes(),base=BASE){
 const reached=reachable([...equipment,...routes],base),missing=[...EQUIPMENT.map(id),...['iron','gold','copper'].flatMap(x=>[`hakkai:crushed_${x}`,`hakkai:washed_${x}`])].filter(x=>!reached.has(x));
 const lines=['# 工業設備のバニラ素材起点・静的依存検査（未配布）','',`対象：設備・方向違い ${EQUIPMENT.length} 種と、原鉄・原金・原銅の破砕／洗浄／加工。到達不能 ${missing.length} 種。`,
 'バニラ材料と水源を入手済みと仮定し、作業台レシピ・3段加工の実装から固定点を求める。追加アイテムを起点にしないため、対象設備の製作に結晶・ボス・探索報酬・自己依存は不要。これは材料の存在だけの検査で、量の確保やゲーム内での実際の入手・設置・稼働を証明しない。',
 '推定した前提：以下のバニラアイテムがサバイバルで用意でき、水源、作業台、十分な燃料・空き・設置場所がある。風車の高さ・空・回路・容量と樽・水を満たし、工程ごとに機械を稼働させる。有限数量の同時使用や配置は計算しない。',
 '',`仮定したバニラ素材（${base.length-1}種）：${base.filter(x=>x.startsWith('minecraft:')).map(x=>'`'+x+'`').join('、')}。`,'','## 製作の根拠','',...equipment.map(r=>`- \`${r.out}\` ×${r.amount}：${r.costs.filter(c=>c.id!=='minecraft:crafting_table').map(c=>`\`${c.id}\` ×${c.count}`).join(' + ')}`),'','## 原鉱の工程','',...routes.map(r=>`- ${r.name}：\`${r.costs[0].id}\` ×1 → \`${r.out}\` ×${r.amount}。機械・樽2・風車・軸${r.name.startsWith('washer')?'・水源':''}を使用。`),'',
 '機械は動力等の条件があり、これは最短経路や全加工物の入手可能性の証明ではない。追加作物・結晶・生体核片を使う任意の加工は、その材料を外部から得る必要がある。レシピ競合、実際のバニラID・レシピ本、座標・容量、Bedrockの処理・マルチは別途確認。','',`再生成：\`node --experimental-default-type=module tools/audit_factory_bootstrap.mjs\`。\`--check\` は差分を確認。`,''];
 return {text:lines.join('\n'),missing,reached};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {text,missing}=report();const out=path.join(root,'工業設備の依存関係検査.md');
 if(missing.length)throw Error(`Unreachable targets: ${missing.join(', ')}`);
 if(process.argv.includes('--check')){if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==text)throw Error('Factory bootstrap report is stale');console.log('Factory bootstrap report matches');}
 else {fs.writeFileSync(out,text);console.log(`Factory bootstrap: ${EQUIPMENT.length} equipment, 6 intermediates, 9 ore stages; static assumptions`);}
}
