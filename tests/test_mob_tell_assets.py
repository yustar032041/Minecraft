"""Source tell particles use existing sprites; check regeneration and lifespan."""
import json, subprocess, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
particles=root/'Hakkai_v7.1.0/ResourcePack/particles'
subprocess.run([sys.executable,str(root/'tools/build_mob_tell_particles.py'),'--check'],check=True)
for color in ('impact','spore','frost','spark','shadow','sand','wind','time','ward'):
 tell=json.loads((particles/f'tell_{color}.json').read_text())['particle_effect']
 original=json.loads((particles/f'mob_{color}.json').read_text())['particle_effect']
 assert tell['description']['identifier']==f'hakkai:tell_{color}'
 assert tell['description']['basic_render_parameters']==original['description']['basic_render_parameters']
 assert tell['components']['minecraft:particle_lifetime_expression']['max_lifetime']==.6
print('Source tell assets regenerate and use existing sprites (static only)')
