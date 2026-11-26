#!/usr/bin/env python3
"""Generate an early, explicitly incomplete time-warden encounter and items."""
from mob_experience import experience_reward
import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
def write(path,obj):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for name in ('fushi_totem','warden_sigil','warden_core'):
 components={'minecraft:display_name':{'value':f'item.hakkai:{name}.name'},'minecraft:icon':f'hakkai_{name}','minecraft:max_stack_size':1 if name!='warden_core' else 64,'minecraft:glint':True}
 if name!='warden_core':components.update({'hakkai:use':{},'minecraft:interact_button':'action.interact.hakkai.use'})
 write(bp/f'items/{name}.json',{'format_version':'1.26.0','minecraft:item':{'description':{'identifier':f'hakkai:{name}','menu_category':{'category':'items'}},'components':components}})
write(bp/'recipes/warden_sigil.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:warden_sigil'},'tags':['crafting_table'],'ingredients':[{'item':f'hakkai:pearl_{i}'} for i in range(8)]+[{'item':'hakkai:fushi_totem'}],'result':{'item':'hakkai:warden_sigil','count':1}}})
write(bp/'recipes/warden_core_exchange.json',{'format_version':'1.21.90','minecraft:recipe_shapeless':{'description':{'identifier':'hakkai:warden_core_exchange'},'tags':['crafting_table'],'ingredients':[{'item':'hakkai:warden_core'}],'result':{'item':'hakkai:shard_9','count':8}}})
write(bp/'dimensions/warden_arena.json',{'format_version':'1.26.50','minecraft:dimension':{'description':{'identifier':'hakkai:warden_arena'},'components':{'minecraft:dimension_height':{'min_y':-64,'height_range':384},'minecraft:generation':{'generator_type':'void'},'minecraft:default_biome':{'biome':'hakkai:realm_time'},'minecraft:clouds':{'height':68}}}})
components={'minecraft:type_family':{'family':['mob','hakkai_boss','hakkai_warden']},'minecraft:health':{'value':5000,'max':5000},'minecraft:collision_box':{'width':1,'height':2.75},'minecraft:physics':{},'minecraft:movement':{'value':.18},'minecraft:movement.basic':{},'minecraft:jump.static':{},'minecraft:navigation.walk':{'avoid_water':True,'avoid_damage_blocks':True},'minecraft:knockback_resistance':{'value':1.0},'minecraft:pushable':{'is_pushable':False,'is_pushable_by_piston':False},'minecraft:boss':{'name':'時空の管理者','hud_range':60,'should_darken_sky':True},'minecraft:behavior.float':{'priority':0},'minecraft:behavior.look_at_player':{'priority':7,'look_distance':20,'probability':.1},'minecraft:behavior.random_look_around':{'priority':8},'minecraft:persistent':{},'minecraft:nameable':{}}
components['minecraft:experience_reward']=experience_reward('time_warden')
write(bp/'entities/time_warden.json',{'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':'hakkai:time_warden','is_spawnable':True,'is_summonable':True},'components':components}})
# Give the warden its own mesh, headpiece and UV atlas. This is intentionally
# a prototype and is not presented as final bespoke 512px art.
geo=json.loads((rp/'models/entity/realm_ender.geo.json').read_text(encoding='utf8'))
geo['minecraft:geometry'][0]['description']['identifier']='geometry.hakkai.time_warden'
uv={face:{'uv':[256,0],'uv_size':[96,96]} for face in ('north','south','east','west','up','down')}
geo['minecraft:geometry'][0]['bones'].append({'name':'crown','pivot':[0,44,0],'cubes':[{'origin':[-5,43,-5],'size':[10,2,10],'uv':uv},{'origin':[-5,45,-5],'size':[2,4,10],'uv':uv},{'origin':[3,45,-5],'size':[2,4,10],'uv':uv}]})
write(rp/'models/entity/time_warden.geo.json',geo)
write(rp/'entity/time_warden.entity.json',{'format_version':'1.10.0','minecraft:client_entity':{'description':{'identifier':'hakkai:time_warden','materials':{'default':'entity_alphatest'},'textures':{'default':'textures/entity/hakkai_time_warden'},'geometry':{'default':'geometry.hakkai.time_warden'},'render_controllers':['controller.render.hakkai.beast'],'spawn_egg':{'base_color':'#24395e','overlay_color':'#e3be5c'},'animations':{'walk':'animation.hakkai.realm_ender.walk','warning':'animation.hakkai.warden_warning',**{k:'animation.hakkai.warden_'+k for k in ('slash','sky_cast','slam','thunder_cast','moon_cast','transform','recoil')}},'scripts':{'animate':[{'walk':'query.modified_move_speed > 0.01'}]}}}})
image=Image.open(rp/'textures/entity/hakkai_ender_r7.png').convert('RGBA');d=ImageDraw.Draw(image)
d.rectangle((256,0,352,96),fill=(106,76,40,255));d.rectangle((263,6,345,88),outline=(235,194,91,255),width=5)
d.polygon([(304,16),(327,42),(304,70),(281,42)],outline=(246,222,150,255),width=5)
d.line([(64,155),(90,191),(64,226),(38,191),(64,155)],fill=(245,204,97,255),width=5)
image.save(rp/'textures/entity/hakkai_time_warden.png')
Image.new('RGBA',(512,512),(128,128,255,255)).save(rp/'textures/entity/hakkai_time_warden_n.png')
mer=Image.open(rp/'textures/entity/hakkai_ender_r7_mer.png').copy();md=ImageDraw.Draw(mer);md.line([(64,155),(90,191),(64,226),(38,191),(64,155)],fill=(0,150,200,255),width=5);mer.save(rp/'textures/entity/hakkai_time_warden_mer.png')
write(rp/'textures/entity/hakkai_time_warden.texture_set.json',{'format_version':'1.16.100','minecraft:texture_set':{'color':'hakkai_time_warden','normal':'hakkai_time_warden_n','metalness_emissive_roughness':'hakkai_time_warden_mer'}})
langs={'ja_JP':{'fushi_totem':'FUSHIのトーテム（復活未実装）','warden_sigil':'時空の挑戦印','warden_core':'時空の管理者の核','entity':'時空の管理者'},'en_US':{'fushi_totem':'FUSHI Totem (revival not yet implemented)','warden_sigil':'Time Warden Challenge Sigil','warden_core':'Time Warden Core','entity':'The Time Warden'}}
for lang,values in langs.items():
 path=rp/f'texts/{lang}.lang';s=path.read_text(encoding='utf8');lines=[]
 for k in ('fushi_totem','warden_sigil','warden_core','entity'):
  key='entity.hakkai:time_warden.name' if k=='entity' else f'item.hakkai:{k}.name'
  if not any(line.startswith(key+'=') for line in s.splitlines()):lines.append(key+'='+values[k])
 egg='item.spawn_egg.entity.hakkai:time_warden.name'
 if not any(line.startswith(egg+'=') for line in s.splitlines()):lines.append(egg+'='+('時空の管理者のスポーンエッグ' if lang=='ja_JP' else 'Time Warden Spawn Egg'))
 if lines:path.write_text(s.rstrip()+'\n'+'\n'.join(lines)+'\n',encoding='utf8')
# Reapply the maintained five-form humanoid model and entity properties.
import runpy
runpy.run_path(str(Path(__file__).with_name('create_warden_visual_model.py')),run_name='__main__')
print('Generated prototype time warden, arena dimension, items and 9-ingredient challenge recipe')
