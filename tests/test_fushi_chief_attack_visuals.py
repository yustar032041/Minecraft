"""Non-destructive FUSHI attack pose tests; not a Bedrock render test."""
import hashlib,json,math,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp=root/'Hakkai_v7.1.0/ResourcePack';geo=rp/'models/entity/fushi_chief.geo.json';texture=rp/'textures/entity/hakkai_fushi_chief.png'
before=[hashlib.sha256(p.read_bytes()).hexdigest() for p in (geo,texture)]
subprocess.run([sys.executable,str(root/'tools/sync_fushi_chief_attack_visuals.py'),'--check'],cwd=root,check=True)
assert before==[hashlib.sha256(p.read_bytes()).hexdigest() for p in (geo,texture)]
model=json.loads(geo.read_text())['minecraft:geometry'][0];bones={b['name'] for b in model['bones']}
a=json.loads((rp/'animations/fushi_chief_attacks.animation.json').read_text())['animations']
d=json.loads((rp/'entity/fushi_chief.entity.json').read_text())['minecraft:client_entity']['description']
assert len(a)==6 and {'idle','creature_windup','creature_strike'}<=d['animations'].keys()
for style in ('impact','moon','mist'):
 wind=a[f'animation.hakkai.fushi_chief_{style}_windup'];strike=a[f'animation.hakkai.fushi_chief_{style}_strike']
 assert (wind['animation_length'],strike['animation_length'])==(1.9,.38)
 for phase in ('windup','strike'):assert d['animations'][f'chief_{style}_{phase}']==f'animation.hakkai.fushi_chief_{style}_{phase}'
 assert set(wind['bones'])==set(strike['bones'])==bones=={'body','head','crown'}
 for bone in bones:
  w=wind['bones'][bone]['rotation'];s=strike['bones'][bone]['rotation']
  assert w['0.0']==[0,0,0] and w['1.9']==s['0.0'] and s['0.38']==[0,0,0]
  assert max(abs(n) for v in (w['1.9'],s['0.12']) for n in v)<=6
 for anim,t in ((wind,1.9),(strike,.12)):
  pts=[v for quad,_ in collect(posed(model,anim,t)) for v in quad]
  assert pts and all(math.isfinite(n) and abs(n)<256 for p in pts for n in p)
print('FUSHI chief: check does not alter model/texture, 6 poses, aliases and aligned keys (static only)')
