"""Static linkage checks; particles, blocks and timing require Bedrock testing."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack';bp=root/'BehaviorPack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
for name in ('time','sky','earth','thunder','moon'):
 e=load(rp/f'particles/warden_front_{name}.json')['particle_effect']
 assert e['description']['identifier']=='hakkai:warden_front_'+name
 c=e['components'];assert c['minecraft:emitter_rate_instant']['num_particles']==1
 assert 0<c['minecraft:particle_lifetime_expression']['max_lifetime']<=.2
 assert (rp/(e['description']['basic_render_parameters']['texture']+'.png')).is_file()
s=(bp/'scripts/warden_boss.js').read_text(encoding='utf8')
for part in ('WARDEN_MOVING','startMoving','advanceMoving','s.active=undefined','telegraph(e.dimension,aim,attack)'):assert part in s
assert load(rp/'particles/warning_marker.json')['particle_effect']['components']['minecraft:particle_lifetime_expression']['max_lifetime']>=2
print('Moving warden attack front particles, warnings and script hooks OK (static only)')
