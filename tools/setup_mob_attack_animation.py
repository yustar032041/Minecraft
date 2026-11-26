#!/usr/bin/env python3
"""Install cosmetic attack aliases; guardians retain their individual rigs."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack'
animations={
 'animation.hakkai.creature_windup':{'animation_length':1.9,'bones':{'body':{'rotation':{'0.0':[0,0,0],'0.45':[-6,0,0],'1.9':[-13,0,0]}},'head':{'rotation':{'0.0':[0,0,0],'0.45':[-5,0,0],'1.9':[-9,0,0]}}}},
 'animation.hakkai.creature_strike':{'animation_length':.38,'bones':{'body':{'rotation':{'0.0':[-12,0,0],'0.12':[18,0,0],'0.38':[0,0,0]}},'head':{'rotation':{'0.0':[-9,0,0],'0.12':[22,0,0],'0.38':[0,0,0]}}}}
}
(root/'animations/creature_attacks.animation.json').write_text(json.dumps({'format_version':'1.8.0','animations':animations},ensure_ascii=False,indent=2)+'\n')
names=[f'wild_{r}_{v}' for r in range(8) for v in range(3)]+[f'foe_{r}_{v}' for r in range(8) for v in range(12)]+[f'guardian_{r}' for r in range(8)]+[f'ender_{r}' for r in range(8)]+['fushi_chief','eclipse_colossus']
for name in names:
 path=root/'entity'/f'{name}.entity.json';raw=path.read_bytes();v=json.loads(raw);desc=v['minecraft:client_entity']['description']
 prefix=f'animation.hakkai.{name}' if name.startswith(('guardian_','ender_','foe_0_')) or name in tuple(f'foe_1_{i}' for i in range(12)) or name in tuple(f'foe_2_{i}' for i in range(12)) or name in tuple(f'foe_3_{i}' for i in range(12)) or name in tuple(f'foe_4_{i}' for i in range(12)) or name in tuple(f'foe_5_{i}' for i in range(12)) or name in tuple(f'foe_6_{i}' for i in range(12)) or name in tuple(f'foe_7_{i}' for i in range(12)) or name in tuple(f'wild_{r}_{i}' for r in range(8) for i in range(3)) else 'animation.hakkai.creature'
 desc.setdefault('animations',{}).update({'creature_windup':prefix+'_windup','creature_strike':prefix+'_strike'})
 content=json.dumps(v,ensure_ascii=False,indent=2)+'\n'
 if b'\r\n' in raw:content=content.replace('\n','\r\n')
 path.write_bytes(content.encode())
print(f'Installed attack aliases on {len(names)} client entities (guardian, traveler and grassland foe rigs preserved)')
