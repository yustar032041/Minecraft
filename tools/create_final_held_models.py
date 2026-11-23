#!/usr/bin/env python3
"""Make distinct final equipment geometry, reusing existing gear UV and textures.

The in-hand presentation is a prototype; it needs Bedrock perspective, UV and
animation verification. Existing source textures and controllers stay untouched.
"""
import copy,json
from pathlib import Path
RP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
def write(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
sources=json.loads((RP/'models/entity/equipment.geo.json').read_text())['minecraft:geometry']
base={g['description']['identifier']:g for g in sources}
models=[]
for name,src,gear in [('sword','held_0',144),('axe','held_1',145),('pickaxe','held_1',145)]:
 model=copy.deepcopy(base['geometry.hakkai.'+src]);model['description']['identifier']='geometry.hakkai.final_'+name
 cubes=model['bones'][0]['cubes']
 def extra(template,origin,size):
  cube=copy.deepcopy(cubes[template]);cube['origin']=origin;cube['size']=size;cubes.append(cube)
 if name=='sword':
  extra(3,[-.35,17,-1.05],[.7,9,.35]);extra(5,[-5,13.5,-.8],[2,1,1.6]);extra(5,[3,13.5,-.8],[2,1,1.6]);extra(2,[-1.4,5,-1.4],[2.8,.6,2.8]);extra(3,[-.3,18,.8],[.6,7,.3])
 elif name=='axe':
  extra(4,[.5,17,-1.4],[4.5,1,2.8]);extra(5,[6.5,18,-.5],[1,4,1]);extra(2,[-1.4,7,-1.4],[2.8,.6,2.8]);extra(4,[.5,19,-1.55],[4.5,.6,.3])
 else:
  # Retain the UV face maps and handle, replacing the axe blade with a
  # pick head and two slimmer pointed-looking end pieces.
  cubes[:]=cubes[:4]
  uv=copy.deepcopy(base['geometry.hakkai.held_1']['bones'][0]['cubes'][4]['uv'])
  for origin,size in [([-6,21,-.8],[12,2,1.6]),([-7,18,-.7],[2,4,1.4]),([5,18,-.7],[2,4,1.4]),([-1,20,-1],[2,4,2])]:
   cubes.append({'origin':origin,'size':size,'uv':copy.deepcopy(uv)})
 if name=='pickaxe':
  extra(4,[-4,21,-1.1],[8,.6,.3]);extra(2,[-1.3,8,-1.3],[2.6,.6,2.6])
 models.append(model)
 source=json.loads((RP/'attachables'/f'gear_{gear:03}.json').read_text());desc=source['minecraft:attachable']['description']
 desc['identifier']='hakkai:ult_'+name;desc['geometry']['default']='geometry.hakkai.final_'+name
 desc['textures']['default']=f'textures/hakkai/weapon_detail/gear_{gear:03}'
 write(RP/'attachables'/f'ult_{name}.json',source)
write(RP/'models/entity/hakkai_final_tools.geo.json',{'format_version':'1.16.0','minecraft:geometry':models})
print('Final sword, axe, pickaxe held geometry: derived models and existing textures')
