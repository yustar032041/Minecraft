"""Verify visual aliases and bone tracks; no in-game render/timing claim."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
client=json.loads((root/'entity/time_warden.entity.json').read_text())['minecraft:client_entity']['description']
animations=json.loads((root/'animations/time_warden.animation.json').read_text())['animations']
bones={b['name'] for b in json.loads((root/'models/entity/time_warden.geo.json').read_text())['minecraft:geometry'][0]['bones']}
for short in ('blade_ready','blade_cut','blade_reverse','blade_aerial'):
 name='animation.hakkai.warden_'+short
 assert client['animations'][short]==name
 a=animations[name]
 assert {'right_arm','held_sword'} <= set(a['bones']) <= bones
 assert a['animation_length'] in (0.5,1.0)
 assert len(a['bones']['right_arm']['rotation'])>=3
print('Warden sword-specific animation aliases and bone tracks verified (static only)')
