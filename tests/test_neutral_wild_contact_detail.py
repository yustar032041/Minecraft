"""Neutral wild native-contact rigs: static, not an engine animation test."""
import json, math, sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root/'tools'))
from preview_mob_pose import posed
from preview_mob_geometry import collect
rp = root/'Hakkai_v7.1.0/ResourcePack'
files = ['grassland','forest','desert','ice_storm','ice_storm','underworld','sky','clockwork']
for realm, filename in enumerate(files):
    name = f'wild_{realm}_1'; aid = f'animation.hakkai.{name}'
    anims = json.loads((rp/f'animations/{filename}_wild_individual.animation.json').read_text())['animations']
    model = json.loads((rp/f'models/entity/{name}.geo.json').read_text())['minecraft:geometry'][0]
    bones = {bone['name'] for bone in model['bones']}
    desc = json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
    assert desc['animations']['native_contact'] == aid+'_contact'
    strike, contact = anims[aid+'_strike'], anims[aid+'_contact']
    assert strike['animation_length'] == contact['animation_length'] == .38
    assert set(contact['bones']) <= bones
    for bone, track in contact['bones'].items():
        rot = track['rotation']; assert rot['0.0'] == rot['0.38'] == [0,0,0]
        if bone in strike['bones']:
            old = strike['bones'][bone]['rotation']
            assert rot['0.12'] == old['0.12'] and rot['0.38'] == old['0.38']
        else:
            assert max(map(abs,rot['0.12'])) <= 6
    for time in (0,.12,.38):
        vertices = [p for quad,_ in collect(posed(model,contact,time)) for p in quad]
        assert vertices and all(math.isfinite(v) and abs(v)<256 for p in vertices for v in p), (name,time)
print('8 neutral wildlife contacts: aliases, neutral starts, preserved peaks, joints and 24 pose samples (static only)')
