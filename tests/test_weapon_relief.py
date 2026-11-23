"""Static geometry and coverage checks; not a visual or gameplay test."""
import json,re,struct
from PIL import Image, ImageChops
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack'
catalog=json.loads(re.search(r'export const catalog=(\[.*?\]);',(root/'BehaviorPack/scripts/data.js').read_text()).group(1))
kinds={'剣':0,'斧':1,'弓':2,'杖':3,'ハンマー':4,'槍':5,'盾':6,'扇':7}
weapons=[x for x in catalog if x['kind'] in kinds];assert len(weapons)==95
original={g['description']['identifier']:g for g in json.loads((rp/'models/entity/equipment.geo.json').read_text())['minecraft:geometry']}
geo=json.loads((rp/'models/entity/hakkai_weapon_relief.geo.json').read_text())['minecraft:geometry'];models={g['description']['identifier']:g for g in geo};assert len(models)==24+95
for item in weapons:
 desc=json.loads((rp/'attachables'/f"{item['id']}.json").read_text())['minecraft:attachable']['description']
 expected=f"geometry.hakkai.weapon_{item['id']}"
 assert desc['identifier']=='hakkai:'+item['id'] and desc['geometry']['default']==expected
 g=models[expected];base=original[f"geometry.hakkai.held_{kinds[item['kind']]}"]
 assert g['bones'][0]['binding']=='q.item_slot_to_bone_name(c.item_slot)'
 assert len(g['bones'][0]['cubes'])>=len(base['bones'][0]['cubes'])+7
 assert desc['textures']['default']==f"textures/hakkai/weapon_detail/{item['id']}"
 path=rp/(desc['textures']['default']+'.png');assert struct.unpack('>II',path.read_bytes()[16:24])==(512,512)
 original_path=rp/f"textures/hakkai/equipment/{item['id']}.png"
 assert struct.unpack('>II',original_path.read_bytes()[16:24])==(256,256)
 alpha=Image.open(path).getchannel('A');old=Image.open(original_path).getchannel('A').resize((512,512),Image.Resampling.NEAREST)
 assert ImageChops.difference(alpha,old).getbbox() is None, f"{item['id']}: alpha footprint changed"
 for suffix in ('_n','_mer'):
  img=path.with_name(path.stem+suffix+'.png');assert struct.unpack('>II',img.read_bytes()[16:24])==(512,512)
 texture_set=json.loads(path.with_suffix('.texture_set.json').read_text())['minecraft:texture_set']
 assert texture_set=={'color':item['id'],'normal':item['id']+'_n','metalness_emissive_roughness':item['id']+'_mer'}
 assert {'first','third'} <= set(desc['animations'])
for g in geo:
 for bone in g['bones']:
  for cube in bone.get('cubes',[]):
   assert all(n>0 for n in cube['size'])
   for uv in cube['uv'].values():
    for start,size,limit in zip(uv['uv'],uv['uv_size'],(512,512)):
     assert 0<=start<=limit and 0<=start+size<=limit
print('95 catalog weapons: geometry coverage, individual attribute variants, UV, 512px atlases, alpha, maps and animation references (static only)')
