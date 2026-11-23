"""Static visual asset linkage; actual appearance must be checked in Bedrock."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0'
rp=root/'ResourcePack';bp=root/'BehaviorPack'
def load(p):return json.loads(p.read_text(encoding='utf8'))
animations=load(rp/'animations/time_warden.animation.json')['animations']
client=load(rp/'entity/time_warden.entity.json')['minecraft:client_entity']['description']['animations']
bones={b['name'] for b in load(rp/'models/entity/time_warden.geo.json')['minecraft:geometry'][0]['bones']}
for name in ('warning','slash','sky_cast','slam','thunder_cast','moon_cast','transform','recoil'):
 identifier='animation.hakkai.warden_'+name
 assert client[name]==identifier and identifier in animations
 assert set(animations[identifier]['bones']).issubset(bones)
 assert 0<animations[identifier]['animation_length']<=1
for name in ('time','sky','earth','thunder','moon'):
 e=load(rp/f'particles/warden_{name}.json')['particle_effect'];assert e['description']['identifier']=='hakkai:warden_'+name
 c=e['components'];assert c['minecraft:emitter_rate_instant']['num_particles']==1
 assert 0<c['minecraft:particle_lifetime_expression']['max_lifetime']<2
 assert (rp/(e['description']['basic_render_parameters']['texture']+'.png')).exists()
assert "import { wardenTransition,wardenCharge,wardenImpact,wardenParried,wardenStrikePose,wardenFlightAura }" in (bp/'scripts/warden_boss.js').read_text()
print('Warden visual particle, animation, geometry and script links OK (static only)')
