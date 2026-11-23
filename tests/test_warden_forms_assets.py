"""Static asset invariants only; actual Bedrock model and physics need testing."""
import hashlib,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';rp=root/'ResourcePack';bp=root/'BehaviorPack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
e=load(bp/'entities/time_warden.json')['minecraft:entity'];props=e['description']['properties']
assert props['hakkai:form']=={'type':'int','range':[0,4],'default':0,'client_sync':True}
assert props['hakkai:flying']=={'type':'bool','default':False,'client_sync':True}
assert e['components']['minecraft:damage_sensor']['triggers']=={'cause':'fall','deals_damage':'no'}
coll=e['components']['minecraft:collision_box'];assert .8<=coll['width']<=1 and 2.1<=coll['height']<=2.4
geo=load(rp/'models/entity/time_warden.geo.json')['minecraft:geometry'][0];bones={b['name']:b for b in geo['bones']}
for name in ('body','head','right_arm','left_arm','right_leg','left_leg','crown','form_time','form_sky','form_earth','form_thunder','form_true','wing_left','wing_right','wing_true_left','wing_true_right','halo_true'):assert name in bones
assert min(c['origin'][1] for b in geo['bones'] for c in b.get('cubes',[]))==0
head_top=max(c['origin'][1]+c['size'][1] for n in ('body','head','right_arm','left_arm','right_leg','left_leg','crown') for c in bones[n]['cubes'])
assert 34<=head_top<=38 and abs(head_top/16-coll['height'])<.1
for b in geo['bones']:
 for c in b.get('cubes',[]):
  assert all(v>0 for v in c['size'])
  for u in c['uv'].values():assert 0<=u['uv'][0]<=384 and 0<=u['uv'][1]<=384 and u['uv_size']==[128,128]
client=load(rp/'entity/time_warden.entity.json')['minecraft:client_entity']['description'];assert client['render_controllers']==['controller.render.hakkai.warden']
render=load(rp/'render_controllers/time_warden.render_controllers.json')['render_controllers']['controller.render.hakkai.warden']
assert render['textures']==["Array.forms[query.property('hakkai:form')]"]
assert render['arrays']['textures']['Array.forms']==[f'Texture.form{i}' for i in range(5)]
visibility={k:v for p in render['part_visibility'] for k,v in p.items()}
for i,n in enumerate(('time','sky','earth','thunder','true')):assert visibility['form_'+n]==f"query.property('hakkai:form') == {i}"
for n in ('wing_left','wing_right'):assert visibility[n]=="query.property('hakkai:flying')"
for n in ('wing_true_left','wing_true_right'):assert visibility[n]=="query.property('hakkai:flying') && query.property('hakkai:form') == 4"
assert visibility['halo_true']=="query.property('hakkai:form') == 4"
assert {'wing_flight':"query.property('hakkai:flying')"} in client['scripts']['animate']
anim=load(rp/'animations/time_warden.animation.json')['animations'];assert set(anim['animation.hakkai.warden_wing_flight']['bones'])=={'wing_left','wing_right','wing_true_left','wing_true_right'}
assert set(anim['animation.hakkai.warden_halo']['bones'])=={'halo_true'}
for name in ('wing_flight','hover','idle','halo'):assert client['animations'][name] in anim
for animation in anim.values():assert set(animation.get('bones',{}))<=set(bones)
hashes=[]
for i in range(5):
 name=f'hakkai_time_warden_form{i}';assert client['textures'][f'form{i}']==f'textures/entity/{name}'
 texture=rp/f'textures/entity/{name}.png';hashes.append(hashlib.sha256(texture.read_bytes()).digest())
 for suffix in ('','_n','_mer'):
  with Image.open(rp/f'textures/entity/{name}{suffix}.png') as image:assert image.size==(512,512) and image.mode=='RGBA'
 ts=load(rp/f'textures/entity/{name}.texture_set.json')['minecraft:texture_set'];assert ts['color']==name and ts['normal']==name+'_n' and ts['metalness_emissive_roughness']==name+'_mer'
assert len(set(hashes))==5
print('Warden 5-form humanoid geometry, colour atlases, sync, wing visibility, flight animation and fall protection OK (static only)')
