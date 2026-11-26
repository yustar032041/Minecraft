#!/usr/bin/env python3
"""Generate the in-game index from the pack's actual JSON recipes.

Run after changing recipes or Japanese item names. --check verifies freshness.
Machine/scripted recipes are intentionally not represented here.
"""
import collections
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'
OUT=BP/'scripts/recipe_index.js'
lang={}
for line in (ROOT/'Hakkai_v7.1.0/ResourcePack/texts/ja_JP.lang').read_text(encoding='utf-8').splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1);lang[k]=v
vanilla={'book':'本','paper':'紙','iron_ingot':'鉄インゴット','gold_ingot':'金インゴット','copper_ingot':'銅インゴット','diamond':'ダイヤモンド','emerald':'エメラルド','stick':'棒','string':'糸','leather':'革','redstone':'レッドストーン','coal':'石炭','charcoal':'木炭','cobblestone':'丸石','stone':'石','glass':'ガラス','crafting_table':'作業台','piston':'ピストン','furnace':'かまど','water_bucket':'水入りバケツ','lava_bucket':'溶岩入りバケツ','egg':'卵','sugar':'砂糖','bowl':'ボウル','bread':'パン','netherite_ingot':'ネザライトインゴット','nether_star':'ネザースター'}
# Common vanilla names used by the pack's recipes. IDs remain visible so that
# translated names never make similarly named ingredients ambiguous.
vanilla.update({
 'diamond_helmet':'ダイヤモンドのヘルメット','diamond_chestplate':'ダイヤモンドのチェストプレート','diamond_leggings':'ダイヤモンドのレギンス','diamond_boots':'ダイヤモンドのブーツ','netherite_scrap':'ネザライトの欠片','ancient_debris':'古代の残骸',
 'glowstone':'グロウストーン','stone_bricks':'石レンガ','iron_helmet':'鉄のヘルメット','iron_chestplate':'鉄のチェストプレート','iron_boots':'鉄のブーツ',
 'amethyst_shard':'アメジストの欠片','oak_planks':'オークの板材','iron_leggings':'鉄のレギンス','feather':'羽根','hopper':'ホッパー','baked_potato':'ベイクドポテト','flint':'火打石','wheat_seeds':'小麦の種','gravel':'砂利','sweet_berries':'スイートベリー','glass_bottle':'ガラス瓶','carrot':'ニンジン','dried_kelp':'乾燥した昆布','cooked_beef':'ステーキ','cooked_cod':'焼き鱈','bucket':'バケツ','pumpkin_seeds':'カボチャの種','oak_leaves':'オークの葉','dandelion':'タンポポ','brown_mushroom':'茶色のキノコ','cooked_chicken':'焼き鳥','brick':'レンガ','glow_berries':'グロウベリー','dirt':'土','compass':'コンパス','bone_meal':'骨粉','cauldron':'大釜','iron_nugget':'鉄塊','iron_hoe':'鉄のクワ','pumpkin_pie':'パンプキンパイ','cherry_leaves':'サクラの葉','rail':'レール','wheat':'小麦','apple':'リンゴ','azure_bluet':'ヒナソウ','snowball':'雪玉','iron_pickaxe':'鉄のツルハシ','beetroot':'ビートルート','tripwire_hook':'トリップワイヤーフック','beetroot_soup':'ビートルートスープ','pink_dye':'桃色の染料','red_tulip':'赤色のチューリップ','ice':'氷','sugar_cane':'サトウキビ','hay_block':'干草の俵','sunflower':'ヒマワリ','yellow_dye':'黄色の染料','gunpowder':'火薬','bell':'鐘','goat_horn':'ヤギの角','oak_fence':'オークのフェンス','lantern':'ランタン','ladder':'はしご','netherite_helmet':'ネザライトのヘルメット','netherite_chestplate':'ネザライトのチェストプレート','netherite_leggings':'ネザライトのレギンス','netherite_boots':'ネザライトのブーツ','netherite_pickaxe':'ネザライトのツルハシ','netherite_sword':'ネザライトの剣','netherite_axe':'ネザライトの斧','white_wool':'白色の羊毛','barrel':'樽','anvil':'金床','stonecutter_block':'石切台','comparator':'レッドストーンコンパレーター','lever':'レバー','slime_ball':'スライムボール','smooth_stone':'滑らかな石','shears':'ハサミ','golden_apple':'金のリンゴ','chest':'チェスト','shield':'盾','gold_nugget':'金塊','iron_sword':'鉄の剣','iron_axe':'鉄の斧','bow':'弓'
})
def name(id):
    if id.startswith('minecraft:'):
        short=id.split(':',1)[1];return vanilla.get(short,short)+'（'+id+'）'
    return lang.get('item.'+id+'.name',lang.get('tile.'+id+'.name',id))+'（'+id+'）'
def ingredient(obj):
    if isinstance(obj,str): return name(obj)
    if 'item' in obj:return name(obj['item'])
    if 'tag' in obj:return 'タグ '+obj['tag']
    raise ValueError(f'unsupported ingredient: {obj}')
entries=[]
uses=collections.defaultdict(list)
for path in sorted((BP/'recipes').glob('*.json')):
    data=json.loads(path.read_text(encoding='utf-8'))
    kinds=[k for k in data if k.startswith('minecraft:recipe_')]
    if len(kinds)!=1:raise ValueError(path)
    kind=kinds[0].removeprefix('minecraft:recipe_');recipe=data[kinds[0]]
    if kind not in ('shaped','shapeless','furnace','brewing_mix'):raise ValueError(kind)
    output=recipe.get('result',recipe.get('output'));out_id=output['item'] if isinstance(output,dict) else output
    count=output.get('count',1) if isinstance(output,dict) else 1
    station=', '.join({'crafting_table':'作業台','smoker':'燻製器','brewing_stand':'醸造台'}.get(t,t) for t in recipe['tags'])
    if kind=='shaped':
        pattern='\n'.join(row.replace(' ','□') for row in recipe['pattern'])
        materials='\n'.join(f'{symbol}：{ingredient(item)}' for symbol,item in recipe['key'].items())
        detail=f'並べ方（□は空き）：\n{pattern}\n\n記号と素材：\n{materials}'
    elif kind=='shapeless':
        grouped=collections.Counter(ingredient(i) for i in recipe['ingredients'])
        detail='並べ方は自由：\n'+'\n'.join(f'{n} ×{c}' for n,c in grouped.items())
    elif kind=='furnace': detail='入力：'+ingredient(recipe['input'])+'\n燃料が必要です。'
    else: detail='入力：'+ingredient(recipe['input'])+'\n材料：'+ingredient(recipe['reagent'])
    category=0 if out_id.startswith('hakkai:gear_') or out_id.startswith('hakkai:ult_') or out_id.startswith('hakkai:series_leggings_') or out_id.startswith('hakkai:guardian_armor_') or out_id.startswith('hakkai:nightwalker_armor_') or out_id.startswith('hakkai:united_armor_') else 1 if kind in ('shaped','shapeless') else 2
    title=name(out_id)
    inputs = (list(recipe['key'].values()) if kind=='shaped' else recipe['ingredients'] if kind=='shapeless' else [recipe['input'],recipe['reagent']] if kind=='brewing_mix' else [recipe['input']])
    for obj in inputs:
        item=obj if isinstance(obj,str) else obj.get('item')
        if item and len(entries) not in uses[item]:uses[item].append(len(entries))
    note={'hakkai:dodge_scroll':'\n\n使い道：手に持って使うと1個消費し、移動速度上昇Iが8秒間。無敵や攻撃回避ではありません。', 'hakkai:taunt_scroll':'\n\n使い道：手に持って使うと1個消費し、自分に耐性Iが8秒間。敵を引き寄せる機能ではありません。', 'hakkai:war_horn':'\n\n使い道：手に持って使うと自分に攻撃力上昇Iが10秒間。消費せず、成功後20秒の待機が必要。敵の誘導や味方への効果はありません。', 'hakkai:awaken_book':'\n\n使い道：手に持って使うと覚醒・継承の画面を開きます。本は消費せず、各試練の条件や素材は必要です。'}.get(out_id,'')
    armor_outputs={f'hakkai:gear_{base+16*i:03}' for i in range(11) for base in (10,11,12)} | {f'hakkai:series_leggings_{i:02}' for i in range(11)}
    if out_id in armor_outputs or out_id.startswith('hakkai:guardian_armor_') or out_id.startswith('hakkai:nightwalker_armor_') or out_id.startswith('hakkai:united_armor_'):note+='\n\n材料の元防具のエンチャント・耐久等は引き継がれません。'
    if out_id.startswith('hakkai:gear_') and any((isinstance(o,dict) and (o.get('item','').startswith('minecraft:iron_sword') or o.get('item','').startswith('minecraft:iron_axe') or o.get('item') in ('minecraft:bow','minecraft:shield','minecraft:iron_pickaxe') or o.get('item','').startswith('hakkai:gear_'))) for o in inputs) and out_id not in armor_outputs:note+='\n\n材料の元装備のエンチャント・耐久等は引き継がれません。'
    entries.append([category,title,f'作成場所：{station}\n完成：{title} ×{count}\nレシピID：{recipe["description"]["identifier"]}\n\n{detail}{note}'])
text='// Generated by tools/generate_recipe_index.py; do not edit by hand.\nexport const RECIPE_INDEX='+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+';\nexport const RECIPE_USES='+json.dumps([[i,name(i),uses[i]] for i in sorted(uses)],ensure_ascii=False,separators=(',',':'))+';\n'
if '--check' in sys.argv:
    if not OUT.exists() or OUT.read_text(encoding='utf-8')!=text:raise SystemExit('recipe index is stale: run tools/generate_recipe_index.py')
else:OUT.write_text(text,encoding='utf-8')
print(f'{len(entries)} JSON recipes indexed; {len(uses)} ingredient IDs have reverse lookup; scripted machine recipes are separate')
