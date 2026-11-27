#!/usr/bin/env python3
"""Create final sword/axe using the existing template-derived inventory icons."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack';rp=root/'Hakkai_v7.1.0/ResourcePack'
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for part,damage in [('sword',29),('axe',30)]:
 name='ult_'+part;ident='hakkai:'+name
 components={'minecraft:display_name':{'value':'item.'+ident+'.name'},'minecraft:icon':'hakkai_'+name,'minecraft:max_stack_size':1,'minecraft:damage':damage,'minecraft:hand_equipped':True,'minecraft:durability':{'max_durability':5000},'minecraft:use_modifiers':{'use_duration':15.0,'movement_modifier':0.85},'hakkai:use':{},'minecraft:interact_button':'action.interact.hakkai.use','minecraft:enchantable':{'slot':part,'value':15},'minecraft:tags':{'tags':['minecraft:is_'+part,'minecraft:is_tool','minecraft:netherite_tier']+(['minecraft:digger'] if part=='axe' else [])}}
 if part=='axe':components['minecraft:digger']={'use_efficiency':True,'destroy_speeds':[{'block':{'tags':"q.any_tag('minecraft:is_axe_item_destructible')"},'speed':10}]}
 write(bp/'items'/f'{name}.json',{'format_version':'1.26.60','minecraft:item':{'description':{'identifier':ident,'menu_category':{'category':'equipment','group':'minecraft:itemGroup.name.'+part}},'components':components}})
 write(bp/'recipes'/f'{name}.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':ident},'tags':['crafting_table'],'ingredients':[{'item':x} for x in ['minecraft:netherite_'+part,'hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9']],'result':{'item':ident,'count':1}}})
 for lang,label in [('ja_JP',{'sword':'終刻の剣','axe':'終刻の斧'}[part]),('en_US',{'sword':'Final Hour Sword','axe':'Final Hour Axe'}[part])]:
  p=rp/'texts'/f'{lang}.lang';key=f'item.{ident}.name=';lines=p.read_text(encoding='utf8').splitlines();p.write_text('\n'.join([x for x in lines if not x.startswith(key)]+[key+label])+'\n',encoding='utf8')
p=root/'texture_progress.json';progress=json.loads(p.read_text())
for name in ('ult_sword','ult_axe'):
 if name in progress['planned_art_only']:progress['planned_art_only'].remove(name)
 if name not in progress['derived_extra_existing']:progress['derived_extra_existing'].append(name)
write(p,progress)
print('Final sword and axe definitions, recipes and names created; existing planned icons reused')
