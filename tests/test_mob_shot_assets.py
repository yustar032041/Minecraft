"""Moving shot asset regeneration and palette; static, not Bedrock rendering."""
import json, subprocess, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
particles=root/'Hakkai_v7.1.0/ResourcePack/particles'
subprocess.run([sys.executable,str(root/'tools/build_mob_shot_particles.py'),'--check'],check=True)
colors=('impact','spore','frost','spark','shadow','sand','wind','time')
for color in colors:
 shot=json.loads((particles/f'shot_{color}.json').read_text())['particle_effect']
 source=json.loads((particles/f'mob_{color}.json').read_text())['particle_effect']
 assert shot['description']['identifier']==f'hakkai:shot_{color}'
 assert shot['description']['basic_render_parameters']==source['description']['basic_render_parameters']
 assert shot['components']['minecraft:particle_lifetime_expression']['max_lifetime']==.1
 assert shot['components']['minecraft:particle_appearance_billboard']['size']==[.4,.4]
print('Moving shot sprites, dimensions and short lifetime verified (static only)')
