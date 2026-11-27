"""FUSHI walk and chief crown topology, static rather than a Bedrock render test."""
import json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];rp=root/'Hakkai_v7.1.0/ResourcePack'
subprocess.run([sys.executable,str(root/'tools/sync_fushi_movement.py'),'--check'],cwd=root,check=True)
subprocess.run([sys.executable,str(root/'tools/sync_fushi_chief_attack_visuals.py'),'--check'],cwd=root,check=True)
anim=json.loads((rp/'animations/fushi.animation.json').read_text())['animations']
walk=anim['animation.hakkai.fushi.walk'];assert walk['loop'] and walk['animation_length']==.5
assert set(walk['bones'])=={'body','head'}
for name in ('fushi','fushi_chief'):
 desc=json.loads((rp/f'entity/{name}.entity.json').read_text())['minecraft:client_entity']['description']
 assert desc['animations']['walk']=='animation.hakkai.fushi.walk'
 assert {'walk':'query.modified_move_speed > 0.01'} in desc['scripts']['animate']
 assert 'idle' in desc['scripts']['animate']
model=json.loads((rp/'models/entity/fushi_chief.geo.json').read_text())['minecraft:geometry'][0]
bones={b['name']:b for b in model['bones']};assert bones['crown']['parent']=='head'
tracks=json.loads((rp/'animations/fushi_chief_attacks.animation.json').read_text())['animations']
for track in tracks.values():
 for key in track['bones']['crown']['rotation'].values():assert key==[0,0,0]
print('FUSHI walk tracks and crown hierarchy verified (static only)')
