import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack';rp=root/'Hakkai_v7.1.0/ResourcePack'
progress=json.loads((root/'texture_progress.json').read_text());atlas=json.loads((rp/'textures/item_texture.json').read_text())['texture_data']
for part,damage in [('sword',29),('axe',30)]:
 name='ult_'+part;ident='hakkai:'+name;item=json.loads((bp/'items'/f'{name}.json').read_text())['minecraft:item'];c=item['components']
 assert item['description']['identifier']==ident and c['minecraft:damage']==damage
 assert c['minecraft:durability']['max_durability']==2500 and c['minecraft:enchantable']['slot']==part
 assert c['minecraft:use_modifiers']['use_duration']==15 and 'hakkai:use' in c
 assert {'minecraft:is_'+part,'minecraft:is_tool','minecraft:netherite_tier'}<=set(c['minecraft:tags']['tags'])
 if part=='axe':assert c['minecraft:digger']['destroy_speeds'][0]['block']['tags']=="q.any_tag('minecraft:is_axe_item_destructible')"
 r=json.loads((bp/'recipes'/f'{name}.json').read_text())['minecraft:recipe_shapeless']
 assert {i['item'] for i in r['ingredients']}=={'minecraft:netherite_'+part,'hakkai:warden_core','hakkai:crystal_7','hakkai:shard_9'} and r['result']['item']==ident
 assert name not in progress['planned_art_only'] and name in progress['derived_extra_existing']
 assert atlas['hakkai_'+name]['textures']=='textures/items/hakkai_'+name
 for suffix in ('','_normal','_mer'):assert Image.open(rp/f'textures/items/hakkai_{name}{suffix}.png').size==(128,128)
 for lang in ['ja_JP','en_US']:assert f'item.{ident}.name=' in (rp/'texts'/f'{lang}.lang').read_text()
for n in (144,145):
 assert (rp/f'particles/gear_{n}.json').exists()
 anim=json.loads((rp/'animations/cast_skills.animation.json').read_text())['animations'];assert f'animation.hakkai.cast.gear_{n}' in anim
print('Final sword/axe definitions, ingredients, tools, images and visual fallbacks (static only)')
