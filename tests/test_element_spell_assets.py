"""Eight elemental visuals are connected and reproducible, not rendered in Bedrock."""
import json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
for script in ('build_element_particles.py','build_element_cast_animations.py','render_factory_machine_panels.py'):
 subprocess.run([sys.executable,str(root/'tools'/script),'--check'],check=True)
a=json.loads((rp/'animations/element_cast.animation.json').read_text())['animations']
assert len(a)==8
colors=set()
for i in range(8):
 assert {'rightarm','leftarm','body'}<=set(a[f'animation.hakkai.element_cast_{i}']['bones'])
 p=json.loads((rp/f'particles/element_spell_{i}.json').read_text())['particle_effect']
 assert p['description']['identifier']==f'hakkai:element_spell_{i}'
 colors.add(tuple(p['components']['minecraft:particle_appearance_tinting']['color']))
assert len(colors)==8
geo=json.loads((rp/'models/blocks/factory_frame.geo.json').read_text())['minecraft:geometry'][0]
assert any(c['size']==[14,12,1] and c['origin']==[-7,2,7] for c in geo['bones'][0]['cubes'])
print('Eight spell visuals and seven machine panel families connected (static only)')
