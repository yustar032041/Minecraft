"""Static checks only: the particle's appearance still needs a Bedrock client."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack';bp=root/'BehaviorPack'
particle=json.loads((rp/'particles/warning_marker.json').read_text())['particle_effect']
assert particle['description']['identifier']=='hakkai:warning_marker'
c=particle['components']
assert c['minecraft:emitter_shape_point']['offset']==[0,0,0]
assert c['minecraft:emitter_rate_instant']['num_particles']==1
assert c['minecraft:particle_initial_speed']==0
assert c['minecraft:particle_lifetime_expression']['max_lifetime']>=2
assert c['minecraft:particle_motion_dynamic']['linear_acceleration']==[0,0,0]
assert (rp/(particle['description']['basic_render_parameters']['texture']+'.png')).exists()
for name in ('warden_boss.js','realm_ender.js','fushi_system.js'):
 assert 'hakkai:warning_marker' in (bp/'scripts'/name).read_text()
print('Fixed-position warning marker particle and combat hooks OK (static only)')
