"""Curated initial tuning regressions. Not a substitute for Bedrock testing."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0';bp=root/'BehaviorPack';rp=root/'ResourcePack'
settings={
 'foe_2_0':(.72,.53,.18,.9),'foe_6_8':(.68,.98,.24,1.0),
 'foe_7_0':(.55,.76,.28,1.1),'foe_7_1':(.66,.96,.24,1.0),
 'foe_7_9':(.53,.88,.3,1.1),'foe_7_10':(.70,.90,.2,.9),
 'foe_0_8':(.72,1.0,.24,.9),'foe_0_9':(.55,.84,.26,1.0),
 'foe_4_10':(.76,1.26,.2,.9),'foe_7_11':(.53,.8,.22,1.0)}
for name,(width,height,speed,melee) in settings.items():
 c=json.loads((bp/f'entities/{name}.json').read_text())['minecraft:entity']['components']
 assert c['minecraft:collision_box']=={'width':width,'height':height}
 assert c['minecraft:movement']['value']==speed and c['minecraft:behavior.melee_attack']['speed_multiplier']==melee
 # No untested flying AI, family rewriting or disappearance of ground physics.
 assert 'minecraft:physics' in c and 'minecraft:navigation.walk' in c and 'minecraft:can_fly' not in c
 assert 'hakkai_wildlife' in c['minecraft:type_family']['family']
tracks={}
for f in ('desert_foe_individual.animation.json','sky_foe_individual.animation.json','clockwork_foe_individual.animation.json','storm_foe_individual.animation.json'):
 tracks.update(json.loads((rp/'animations'/f).read_text())['animations'])
details={
 'foe_2_0':['shell_l','shell_r','drill'],
 'foe_6_8':['arm_l','arm_r','wing_l_tip','wing_r_tip'],
 'foe_7_0':['clock_back','piston_0','piston_1'],
 'foe_7_1':['station_clock','hand_l','hand_r'],
 'foe_7_9':['hourglass','ear_l','ear_r'],
 'foe_7_10':['clock_hand','piston_0','piston_1'],
 'foe_7_11':['clock_crest','wing_l_tip','wing_r_tip'],
 'foe_4_10':['shield','forearm_l','forearm_r'],
}
for name,bones in details.items():
 _,realm,index=name.split('_');prefix=f'f{realm}_{index}_'
 wind=tracks[f'animation.hakkai.{name}_windup'];strike=tracks[f'animation.hakkai.{name}_strike']
 assert (wind['animation_length'],strike['animation_length'])==(1.9,.38)
 for bone in bones:
  first=wind['bones'][prefix+bone]['rotation'];second=strike['bones'][prefix+bone]['rotation']
  assert first['1.9']==second['0.0'] and second['0.38']==[0,0,0],(name,bone)
assert all(f'f7_9_hock_{n}' in tracks['animation.hakkai.foe_7_9_walk']['bones'] for n in range(4))
print('10 curated hitbox/ground AI prototypes and 8 secondary attack rigs OK (static only)')
