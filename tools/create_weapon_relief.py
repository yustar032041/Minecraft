#!/usr/bin/env python3
"""Derive layered held models for the 95 catalog weapons.

The existing 256px per-item textures and all animations are retained. Each
weapon receives a geometry derived from its kind, rank and attribute; the
assets remain procedural prototypes requiring Bedrock UV and rendering tests.
"""
from pathlib import Path
import copy,json,re
ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'Hakkai_v7.1.0/ResourcePack'
catalog=json.loads(re.search(r'export const catalog=(\[.*?\]);',(ROOT/'Hakkai_v7.1.0/BehaviorPack/scripts/data.js').read_text(encoding='utf8')).group(1))
base={x['description']['identifier']:x for x in json.loads((RP/'models/entity/equipment.geo.json').read_text())['minecraft:geometry']}
# Each little piece reuses a face map from an existing part. This maintains the
# existing palette/atlas and avoids changing inventory icons or other gear.
kinds={'剣':0,'斧':1,'弓':2,'杖':3,'ハンマー':4,'槍':5,'盾':6,'扇':7}
# (texture cube, origin, size) Accent positions are in the original prop space.
extras={
 0:[(3,[-.25,16.5,-1.2],[.5,8,.3]),(5,[-4.7,13,-.8],[1.4,1,1.6]),(5,[3.3,13,-.8],[1.4,1,1.6]),(2,[-1.4,4.3,-1.4],[2.8,.7,2.8])],
 1:[(4,[.2,16.5,-1.25],[4.8,.7,2.5]),(5,[4.8,18,-.9],[1,4,1.8]),(2,[-1.2,7,-1.2],[2.4,.5,2.4]),(3,[-1.2,14,-1.2],[2.4,.5,2.4])],
 2:[(1,[-3.1,8,-1],[.55,2,.4]),(2,[-3.1,21,-1],[.55,2,.4]),(4,[-5.1,24,-.7],[.6,2,1.4]),(3,[-5.1,3,-.7],[.6,2,1.4])],
 3:[(1,[-3.5,22.4,-1],[7,.6,2]),(2,[-.8,24,-2.3],[1.6,4,.4]),(2,[-.8,24,1.9],[1.6,4,.4]),(0,[-1.1,5,-1.1],[2.2,.6,2.2])],
 4:[(4,[-4.5,20,-3.35],[9,.6,.35]),(4,[-4.5,22,-3.35],[9,.6,.35]),(5,[-6.3,20.5,-2],[.4,2,4]),(6,[5.9,20.5,-2],[.4,2,4])],
 5:[(1,[-1.7,24,-.4],[.35,5,.8]),(1,[1.35,24,-.4],[.35,5,.8]),(2,[-.35,30.3,-.6],[.7,1.5,.2]),(0,[-.9,3,-.9],[1.8,.6,1.8])],
 6:[(1,[-6,6,-3.15],[.65,13,.35]),(1,[5.35,6,-3.15],[.65,13,.35]),(1,[-5.4,18.3,-3.15],[10.8,.7,.35]),(2,[-4,4,-3.05],[8,.6,.35]),(3,[-2.5,9.5,-4.3],[5,5,.35])],
 7:[(3,[-.4,18,-1.05],[.8,5,.4]),(4,[-3.2,18,-.7],[.55,4,.4]),(8,[2.6,18,-.7],[.55,4,.4]),(2,[-1.4,5.7,-1.4],[2.8,.65,2.8])]
}
def save(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
models=[]
for kind,index in kinds.items():
 for rank in (1,2,3):
  g=copy.deepcopy(base[f'geometry.hakkai.held_{index}']);g['description']['identifier']=f'geometry.hakkai.weapon_relief_{index}_{rank}'
  cubes=g['bones'][0]['cubes'];source=copy.deepcopy(cubes)
  for n,origin,size in extras[index]:
   cube={'origin':origin,'size':size,'uv':copy.deepcopy(source[n]['uv'])};cubes.append(cube)
  if rank>=2:
   cubes.append({'origin':[-1.2,11,-1.3],'size':[2.4,.55,.3],'uv':copy.deepcopy(source[0]['uv'])})
  if rank>=3:
   cubes.append({'origin':[-1.2,9.5,-1.3],'size':[2.4,.55,.3],'uv':copy.deepcopy(source[0]['uv'])})
  models.append(g)
# Attribute-dependent inlays on top of the kind/rank relief. These are small
# cubes in the visible front face, not new texture atlases or hand-made art.
variant_anchors={0:(-1.4,16,-1.35),1:(.9,19,-1.65),2:(-4.8,13,-.48),3:(-1,25,-2.35),4:(-3,20,-3.7),5:(-.9,26,-.95),6:(-3.8,11,-4.35),7:(-2.1,19,-1.1)}
shared={g['description']['identifier']:g for g in models}
count=0
for gear in catalog:
 if gear['kind'] not in kinds:continue
 path=RP/'attachables'/f"{gear['id']}.json";a=json.loads(path.read_text(encoding='utf8'))
 index=kinds[gear['kind']];key=f"geometry.hakkai.weapon_relief_{index}_{gear['rank']}"
 g=copy.deepcopy(shared[key]);g['description']['identifier']='geometry.hakkai.weapon_'+gear['id']
 cubes=g['bones'][0]['cubes'];uv=copy.deepcopy(base[f'geometry.hakkai.held_{index}']['bones'][0]['cubes'][0]['uv'])
 x,y,z=variant_anchors[index]
 # Paired relief bars and a central stud vary in width, height and spacing by
 # the two attribute indices.  The item's original texture colors remain.
 attr,m=gear['a'],gear['modifier'];spacing=.35+(attr%4)*.18;height=1.2+(m%4)*.3
 for dx in (-spacing,spacing):
  cubes.append({'origin':[round(x+dx,3),y,z],'size':[.22,round(height,3),.24],'uv':copy.deepcopy(uv)})
 cubes.append({'origin':[round(x-.35,3),round(y+.25+(attr%3)*.2,3),round(z-.12,3)],'size':[.7,.4,.36],'uv':copy.deepcopy(uv)})
 if (attr+m)%2:cubes.append({'origin':[round(x-.18,3),round(y+height,3),round(z-.12,3)],'size':[.36,.36,.36],'uv':copy.deepcopy(uv)})
 models.append(g);a['minecraft:attachable']['description']['geometry']['default']=g['description']['identifier']
 save(path,a);count+=1
save(RP/'models/entity/hakkai_weapon_relief.geo.json',{'format_version':'1.16.0','minecraft:geometry':models})
print(f'{count} catalog weapons: individual procedural relief meshes; original 256px textures retained')
