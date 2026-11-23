import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
model=json.loads((root/'models/entity/hakkai_final_tools.geo.json').read_text())
models={g['description']['identifier']:g for g in model['minecraft:geometry']}
assert len(models)==3
for name in ('sword','axe','pickaxe'):
 desc=json.loads((root/'attachables'/f'ult_{name}.json').read_text())['minecraft:attachable']['description']
 assert desc['identifier']=='hakkai:ult_'+name
 g=models[desc['geometry']['default']];assert g['description']['identifier']=='geometry.hakkai.final_'+name
 assert g['bones'][0]['binding']=='q.item_slot_to_bone_name(c.item_slot)' and len(g['bones'][0]['cubes'])>=7
 assert desc['textures']['default']==('textures/hakkai/weapon_detail/gear_144' if name=='sword' else 'textures/hakkai/weapon_detail/gear_145')
 assert (root/(desc['textures']['default']+'.png')).exists()
 assert {'first','third'} <= set(desc['animations'])
 for cube in g['bones'][0]['cubes']:
  assert all(n>0 for n in cube['size'])
  for uv in cube['uv'].values():
   for offset,length,limit in zip(uv['uv'],uv['uv_size'],(1024,1024)):
    assert 0<=offset<=limit and 0<=offset+length<=limit
print('Final held tools: independent geometry, UV bounds, textures and perspective animation references (static only)')
