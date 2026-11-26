#!/usr/bin/env python3
"""Keep armor names, crafting recipes and the Bedrock item catalog in sync.

Run after tools/create_series_armor.py. The 11 set IDs and bonuses remain
unchanged; the five families reflect the existing +80 evolution chains.
"""
import json,re,subprocess,sys
from material_progression import with_tier_material
from organize_weapons import organize_weapons
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BP=ROOT/'Hakkai_v7.1.0/BehaviorPack'; RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
OLD=['霧銀の旅装','深影の黒曜甲','紅蓮の守護装','大地の古代装','雷光の紫電装','星輝の白銀装','夢幻の藤霞装','翠風の森装','蒼海の潮騎装','天空の白翼装','時環の覇者装']
FAMILIES=['霧銀装','深影装','紅蓮装','大地装','雷光装']
EN=['Mist Silver','Deep Shadow','Crimson','Ancient Earth','Thunderlight']
ROMAN=['I','II','III']; MATERIAL=[10,6,2,3,4]
NAMES=[f'{FAMILIES[i%5]} {ROMAN[i//5]}' for i in range(11)]
def read(path): return path.read_bytes().decode('utf8')
def write(path,s):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(s.encode('utf8'))
def dump(path,obj):write(path,json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
# Named series follow the existing equipment progression, not a new ID scheme.
for path in [BP/'scripts/main.js',BP/'scripts/armor_series.js',ROOT/'tools/create_series_armor.py']:
 text=read(path)
 for a,b in zip(OLD,NAMES):text=text.replace(a,b)
 write(path,text)
# Text and catalog labels use the same names as the set pages and progression.
names={};english={}
for i,title in enumerate(NAMES):
 for offset,part,enpart in [(10,'鎧','Chestplate'),(11,'兜','Helmet'),(12,'靴','Boots')]:
  ident=f'gear_{offset+16*i:03}';names[ident]=f'{title}の{part}';english[ident]=f'{EN[i%5]} {ROMAN[i//5]} {enpart}'
 ident=f'series_leggings_{i:02}';names[ident]=f'{title}のレギンス';english[ident]=f'{EN[i%5]} {ROMAN[i//5]} Leggings'
names.update({'gear_186':'夜渡り装・終章の鎧','gear_187':'夜渡り装・覚醒の鎧','gear_212':'八界統合装・風記の継承鎧','gear_213':'八界統合装・風記の永劫鎧'})
english.update({'gear_186':'Nightwalker Final Chapter Chestplate','gear_187':'Nightwalker Awakened Chestplate','gear_212':'Eight Realms United Legacy Chestplate','gear_213':'Eight Realms United Eternal Chestplate'})
for language,translated in [('ja_JP',names),('en_US',english)]:
 p=RP/'texts'/f'{language}.lang';text=read(p)
 for id,label in translated.items():
  pattern=rf'^item\.hakkai:{id}\.name=.*$';text,n=re.subn(pattern,lambda m:f'item.hakkai:{id}.name={label}',text,flags=re.MULTILINE);assert n==1,(id,n)
 groups=[(f'hakkai:armor_family_{i}',f'{FAMILIES[i]} 系列' if language=='ja_JP' else f'{EN[i]} Armor') for i in range(5)]
 groups += [('hakkai:armor_nightwalker','夜渡りの鎧' if language=='ja_JP' else 'Nightwalker Armor')]
 realms=['草原','霧の森','砂の回廊','氷の鏡湖','雷の断崖','地下庭園','空の浮島','時の終着駅']
 groups += [(f'hakkai:armor_guardian_{i}',f'{realm}の覚醒鎧' if language=='ja_JP' else f'Guardian Armor {i+1}') for i,realm in enumerate(realms)]
 groups += [('hakkai:armor_united','八界統合の鎧' if language=='ja_JP' else 'United Realm Armor'),('hakkai:armor_ultimate','終刻の防具' if language=='ja_JP' else 'Final Hour Armor'),('hakkai:combat_aids','戦闘補助道具' if language=='ja_JP' else 'Combat Aids')]
 for key,value in groups:
  pattern=rf'^{re.escape(key)}=.*$'
  if re.search(pattern,text,re.MULTILINE):text=re.sub(pattern,lambda m:f'{key}={value}',text,flags=re.MULTILINE)
  else:text=text.rstrip('\r\n')+'\n'+f'{key}={value}'+'\n'
 write(p,text)
p=BP/'scripts/data.js';text=read(p);m=re.search(r'^export const catalog=(\[.*\]);\r?$',text,re.MULTILINE);assert m
catalog=json.loads(m.group(1))
for row in catalog:
 if row['id'] in names:row['name']=row['label']=names[row['id']]
text=text[:m.start(1)]+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+text[m.end(1):];write(p,text)
weapon_groups=organize_weapons()
# Each family shares one crystal and shard. Rank I starts with iron armor;
# higher ranks use the matching previous piece. Enchantments do not transfer.
for i in range(11):
 for part in ('head','chest','legs','feet'):
  offset={'head':11,'chest':10,'feet':12}.get(part)
  ident=f'gear_{offset+16*i:03}' if offset else f'series_leggings_{i:02}'
  prev=(f'gear_{offset+16*(i-5):03}' if offset else f'series_leggings_{i-5:02}') if i>=5 else None
  vanilla={'head':'iron_helmet','chest':'iron_chestplate','legs':'iron_leggings','feet':'iron_boots'}[part]
  material=MATERIAL[i%5];ingredient=f'hakkai:{prev}' if prev else f'minecraft:{vanilla}'
  ingredients=with_tier_material([ingredient,f'hakkai:crystal_{material}',f'hakkai:shard_{material}'],i//5+1)
  recipe={'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+ident},'tags':['crafting_table'],'ingredients':[{'item':item} for item in ingredients],'result':{'item':'hakkai:'+ident,'count':1}}}
  dump(BP/'recipes'/f'{ident}.json',recipe)
# Make the normal Nightwalker chest recipe follow its existing predecessor and
# awakening materials. Trial reward and awakening requirements are unchanged.
dump(BP/'recipes/gear_186.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:gear_186'},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ['hakkai:gear_106','hakkai:crystal_6','hakkai:shard_18','minecraft:emerald','minecraft:netherite_scrap']],'result':{'item':'hakkai:gear_186','count':1}}})
# Place 106 wearable items, 3 combat aids and 141 held weapons/tools in equipment.
groups=[]
def group(key,icon,ids):groups.append({'group_identifier':{'name':'hakkai:'+key,'icon':'hakkai:'+icon},'items':['hakkai:'+x for x in ids]})
for family in range(5):
 ids=[]
 for i in range(family,11,5):ids += [f'gear_{11+16*i:03}',f'gear_{10+16*i:03}',f'series_leggings_{i:02}',f'gear_{12+16*i:03}']
 group(f'armor_family_{family}',f'gear_{10+16*family:03}',ids)
group('armor_nightwalker','gear_186',['nightwalker_armor_helmet','gear_186','gear_187','nightwalker_armor_leggings','nightwalker_armor_boots'])
for i in range(8):
 ids=[f'gear_{188+i}',f'gear_{196+i}',f'gear_{204+i}']
 ids += [f'guardian_armor_{i}_{p}' for p in ('helmet','leggings','boots')]
 group(f'armor_guardian_{i}',f'gear_{188+i}',ids)
group('armor_united','gear_212',['united_armor_helmet','gear_212','gear_213','united_armor_leggings','united_armor_boots'])
group('armor_ultimate','ult_chest',['ult_helmet','ult_chest','ult_leggings','ult_boots'])
group('combat_aids','dodge_scroll',['dodge_scroll','taunt_scroll','war_horn'])
for key,icon,ids in weapon_groups:group(key,icon,ids)
flat=[x for g in groups for x in g['items']];assert len(flat)==len(set(flat))==250
for id in flat:
 path=BP/'items'/f'{id.split(":",1)[1]}.json';raw=read(path);d=json.loads(raw);d['minecraft:item']['description'].pop('menu_category',None)
 formatted=json.dumps(d,ensure_ascii=False,indent=2)+'\n'
 if '\r\n' in raw:formatted=formatted.replace('\n','\r\n')
 write(path,formatted)
dump(BP/'item_catalog/crafting_item_catalog.json',{'format_version':'1.21.60','minecraft:crafting_items_catalog':{'categories':[{'category_name':'equipment','groups':groups}]}})
subprocess.run([sys.executable,str(ROOT/'tools/generate_recipe_index.py')],check=True)
print('11 original armor sets and 106 armor, 3 combat aids, 95 weapons and 46 held magical tools organised')
