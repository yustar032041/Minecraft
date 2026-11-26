#!/usr/bin/env python3
"""Organize 95 combat weapons and 46 held magical tools without changing combat stats.

Called by organize_armor_series.py so the shared creative catalog isn't
silently replaced by another generator.
"""
import json,re
from material_progression import with_tier_material
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BP=ROOT/'Hakkai_v7.1.0/BehaviorPack';RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
KINDS=['剣','斧','弓','杖','ハンマー','槍','盾','扇','指輪','首飾り','本','石']
KEYS=['sword','axe','bow','staff','hammer','spear','shield','fan','ring','necklace','book','stone']
EN=['Sword','Axe','Bow','Staff','Hammer','Spear','Shield','Fan','Arcane Ring','Arcane Pendant','Arcane Book','Arcane Stone']
JA_DISPLAY={'指輪':'魔環','首飾り':'魔飾','本':'魔術書','石':'魔石'}
ATTRS=['風','水','火','土','雷','光','闇','時','星','虹','霧','雪','砂','森','海','空','夢','音','港','湖']
EN_ATTR=['Wind','Water','Fire','Earth','Thunder','Light','Shadow','Time','Star','Rainbow','Mist','Snow','Sand','Forest','Sea','Sky','Dream','Sound','Harbor','Lake']
BASE={'剣':['minecraft:iron_sword'],'斧':['minecraft:iron_axe'],'弓':['minecraft:bow'],'杖':['minecraft:stick'],'ハンマー':['minecraft:iron_pickaxe'],'槍':['minecraft:stick','minecraft:flint'],'盾':['minecraft:shield'],'扇':['minecraft:feather'],'指輪':['minecraft:gold_nugget'],'首飾り':['minecraft:string'],'本':['minecraft:book'],'石':['minecraft:stone']}
ROMAN=['I','II','III']
def organize_weapons():
 p=BP/'scripts/data.js';raw=p.read_bytes().decode('utf8');match=re.search(r'^export const catalog=(\[.*\]);\r?$',raw,re.M);assert match
 catalog=json.loads(match.group(1));weapons=[g for g in catalog if g['kind'] in KINDS];assert len(weapons)==141
 translations={'ja_JP':{},'en_US':{}}
 for g in weapons:
  kind=g['kind'];rank=g['rank'];assert rank in (1,2,3)
  title=f"{ATTRS[g['a']]}の{JA_DISPLAY.get(kind,kind)}・{ATTRS[g['modifier']]}型 {ROMAN[rank-1]}"
  english=f"{EN_ATTR[g['a']]} {EN[KINDS.index(kind)]} · {EN_ATTR[g['modifier']]} {ROMAN[rank-1]}"
  g['name']=g['label']=title;translations['ja_JP'][g['id']]=title;translations['en_US'][g['id']]=english
  inputs=([f"hakkai:{g['prev']}"] if g['prev'] else BASE[kind])+[f"hakkai:crystal_{g['a']}",f"hakkai:shard_{g['modifier']}"]
  inputs=with_tier_material(inputs,rank)
  r={'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:'+g['id']},'tags':['crafting_table'],'ingredients':[{'item':i} for i in inputs],'result':{'item':'hakkai:'+g['id'],'count':1}}}
  (BP/'recipes'/f"{g['id']}.json").write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
 raw=raw[:match.start(1)]+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+raw[match.end(1):];p.write_bytes(raw.encode('utf8'))
 for lang,labels in translations.items():
  p=RP/'texts'/f'{lang}.lang';text=p.read_text()
  for id,label in labels.items():
   text,n=re.subn(rf'^item\.hakkai:{id}\.name=.*$',lambda m:f'item.hakkai:{id}.name={label}',text,flags=re.M);assert n==1
  for k,key,en in zip(KINDS,KEYS,EN):
   group=f'hakkai:weapons_{key}';label=f'{JA_DISPLAY.get(k,k)}の系列' if lang=='ja_JP' else f'{en} Families'
   if re.search(rf'^{re.escape(group)}=',text,re.M):text=re.sub(rf'^{re.escape(group)}=.*$',lambda m:f'{group}={label}',text,flags=re.M)
   else:text=text.rstrip('\n')+'\n'+f'{group}={label}'+'\n'
  p.write_text(text)
 # Group by kind, then by initial ID and progression rank; keep all unrelated
 # and separately crafted ultimate equipment outside these 141.
 result=[]
 for kind,key in zip(KINDS,KEYS):
  members=[g for g in weapons if g['kind']==kind];members.sort(key=lambda g:((int(g['number'])-1)%80,g['rank']))
  result.append((f'weapons_{key}',members[0]['id'],[g['id'] for g in members]))
 assert sum(len(x[2]) for x in result)==141
 return result
